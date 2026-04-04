-- KonseyComics unvan sistemi admin yonetim policy'leri
-- SQL Editor'de bir kez calistir.

begin;

create or replace function public.is_admin_user(target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiller
    where id = target_user
      and rol in ('admin', 'yonetici')
      and coalesce(askiya_alindi, false) = false
  );
$$;

grant execute on function public.is_admin_user(uuid) to anon, authenticated;

alter table if exists public.unvan_tanimlari enable row level security;
alter table if exists public.unvan_kurallari enable row level security;

drop policy if exists "unvan tanimlari admin tumunu okur" on public.unvan_tanimlari;
create policy "unvan tanimlari admin tumunu okur"
on public.unvan_tanimlari
for select
to authenticated
using (public.is_admin_user());

drop policy if exists "unvan tanimlari admin ekler" on public.unvan_tanimlari;
create policy "unvan tanimlari admin ekler"
on public.unvan_tanimlari
for insert
to authenticated
with check (public.is_admin_user());

drop policy if exists "unvan tanimlari admin gunceller" on public.unvan_tanimlari;
create policy "unvan tanimlari admin gunceller"
on public.unvan_tanimlari
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "unvan tanimlari admin siler" on public.unvan_tanimlari;
create policy "unvan tanimlari admin siler"
on public.unvan_tanimlari
for delete
to authenticated
using (public.is_admin_user());

drop policy if exists "unvan kurallari admin tumunu okur" on public.unvan_kurallari;
create policy "unvan kurallari admin tumunu okur"
on public.unvan_kurallari
for select
to authenticated
using (public.is_admin_user());

drop policy if exists "unvan kurallari admin ekler" on public.unvan_kurallari;
create policy "unvan kurallari admin ekler"
on public.unvan_kurallari
for insert
to authenticated
with check (public.is_admin_user());

drop policy if exists "unvan kurallari admin gunceller" on public.unvan_kurallari;
create policy "unvan kurallari admin gunceller"
on public.unvan_kurallari
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "unvan kurallari admin siler" on public.unvan_kurallari;
create policy "unvan kurallari admin siler"
on public.unvan_kurallari
for delete
to authenticated
using (public.is_admin_user());

commit;
