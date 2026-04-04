-- KonseyComics yorumlar: kullanicinin kendi yorumunu duzenleme/silme hakki
-- SQL Editor'de bir kez calistir.

begin;

alter table if exists public.yorumlar
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_yorumlar_updated_at on public.yorumlar;
create trigger trg_yorumlar_updated_at
before update on public.yorumlar
for each row
execute function public.set_updated_at();

drop policy if exists "yorumlar self update" on public.yorumlar;
create policy "yorumlar self update"
on public.yorumlar
for update
to authenticated
using (auth.uid() = kullanici_id)
with check (auth.uid() = kullanici_id);

commit;
