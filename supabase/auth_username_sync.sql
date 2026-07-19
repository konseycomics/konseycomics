-- KonseyComics username auth fix
-- Amac:
-- 1) auth.users olusunca public.profiller kaydini otomatik acmak
-- 2) kullanici_adi bilgisini raw_user_meta_data'dan garanti tasimak
-- 3) eski kullanicilari backfill etmek
-- 4) yanlislikla e-posta on eki gibi dusen kullanici adlarini duzeltmek

begin;

create or replace function public.normalize_username(input text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(
      regexp_replace(
        lower(coalesce(input, '')),
        '[^a-z0-9_]+',
        '_',
        'g'
      )
    ),
    ''
  );
$$;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_username text;
begin
  chosen_username := public.normalize_username(new.raw_user_meta_data->>'kullanici_adi');

  if chosen_username is null then
    chosen_username := 'uye_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  insert into public.profiller (id, kullanici_adi)
  values (new.id, chosen_username)
  on conflict (id) do update
  set kullanici_adi = excluded.kullanici_adi;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

insert into public.profiller (id, kullanici_adi)
select
  u.id,
  coalesce(
    public.normalize_username(u.raw_user_meta_data->>'kullanici_adi'),
    'uye_' || substr(replace(u.id::text, '-', ''), 1, 8)
  ) as kullanici_adi
from auth.users u
left join public.profiller p on p.id = u.id
where p.id is null
on conflict (id) do update
set kullanici_adi = excluded.kullanici_adi;

update public.profiller p
set kullanici_adi = public.normalize_username(u.raw_user_meta_data->>'kullanici_adi')
from auth.users u
where p.id = u.id
  and public.normalize_username(u.raw_user_meta_data->>'kullanici_adi') is not null
  and p.kullanici_adi is distinct from public.normalize_username(u.raw_user_meta_data->>'kullanici_adi');

create unique index if not exists profiller_kullanici_adi_unique_idx
on public.profiller (lower(kullanici_adi));

commit;
