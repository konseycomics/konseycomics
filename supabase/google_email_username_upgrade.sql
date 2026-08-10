-- Google ile kaydolan kullanicilar icin e-posta on ekinden profil adi uretir.
-- Mevcut uye_<kimlik> profillerini guvenli sekilde geri doldurur.

begin;

create or replace function public.normalize_username(input text)
returns text
language sql
immutable
as $$
  with normalized as (
    select trim(both '_' from regexp_replace(
      translate(lower(coalesce(input, '')), 'çğıöşü', 'cgiosu'),
      '[^a-z0-9_]+',
      '_',
      'g'
    )) as value
  )
  select case
    when value = '' then null
    when length(value) < 3 then rpad(value, 3, '_')
    else left(value, 24)
  end
  from normalized;
$$;

create or replace function public.available_profile_username(input text, user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate text;
  id_part text;
begin
  base_username := public.normalize_username(input);
  id_part := replace(user_id::text, '-', '');

  if base_username is null then
    return 'uye_' || left(id_part, 8);
  end if;

  candidate := base_username;
  if exists (
    select 1 from public.profiller
    where lower(kullanici_adi) = lower(candidate) and id <> user_id
  ) then
    candidate := rtrim(left(base_username, 15), '_') || '_' || left(id_part, 8);
  end if;

  if exists (
    select 1 from public.profiller
    where lower(kullanici_adi) = lower(candidate) and id <> user_id
  ) then
    candidate := rtrim(left(base_username, 11), '_') || '_' || left(id_part, 12);
  end if;

  return candidate;
end;
$$;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  preferred_username text;
  chosen_username text;
begin
  preferred_username := coalesce(
    public.normalize_username(new.raw_user_meta_data->>'kullanici_adi'),
    public.normalize_username(split_part(new.email, '@', 1))
  );
  chosen_username := public.available_profile_username(preferred_username, new.id);

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

with generated_profiles as (
  select
    u.id,
    public.normalize_username(coalesce(
      u.raw_user_meta_data->>'kullanici_adi',
      split_part(u.email, '@', 1)
    )) as base_username
  from auth.users u
  join public.profiller p on p.id = u.id
  where p.kullanici_adi ~* '^uye_[a-f0-9]{8}$'
), ranked_profiles as (
  select
    id,
    base_username,
    row_number() over (partition by lower(base_username) order by id) as username_rank
  from generated_profiles
  where base_username is not null
), resolved_profiles as (
  select
    id,
    public.available_profile_username(
      case
        when username_rank = 1 then base_username
        else rtrim(left(base_username, 15), '_') || '_' || left(replace(id::text, '-', ''), 8)
      end,
      id
    ) as kullanici_adi
  from ranked_profiles
)
update public.profiller p
set kullanici_adi = r.kullanici_adi
from resolved_profiles r
where p.id = r.id
  and p.kullanici_adi is distinct from r.kullanici_adi;

-- Bu fonksiyonlar yalnizca veritabani tetikleyicisi ve yonetim islemleri icindir.
revoke all on function public.normalize_username(text) from public, anon, authenticated;
revoke all on function public.available_profile_username(text, uuid) from public, anon, authenticated;
revoke all on function public.handle_new_user_profile() from public, anon, authenticated;

commit;
