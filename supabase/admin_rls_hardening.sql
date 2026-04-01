-- KonseyComics admin/security hardening
-- Amac:
-- 1) Admin panelinin dokundugu tablolari RLS ile netlestirmek
-- 2) Public vitrinin ihtiyac duydugu okumalari acik tutarken yazmayi adminle sinirlamak
-- 3) Onceki genis policy kalintilarini temizleyip tek bir guvenli politika setine gecmek
--
-- Uyarı:
-- - SQL Editor'de once staging/yedek alip calistir.
-- - Bu dosya storage bucket policy'lerini kapsamaz; avatar/content upload bucket'lari ayrica kontrol edilmelidir.

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

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array [
    'profiller',
    'site_ayarlari',
    'ekip',
    'seriler',
    'bolumler',
    'yazarlar',
    'cizerler',
    'kategoriler',
    'turler',
    'seri_yazarlar',
    'seri_cizerler',
    'yorumlar',
    'bildirimler'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', table_name);

    for policy_name in
      select p.policyname
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = table_name
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    end loop;
  end loop;
end $$;

-- Profiller: kullanici kendi kaydini yonetsin, admin tum profilleri gorebilsin.
create policy "profiles self select"
on public.profiller
for select
to authenticated
using (auth.uid() = id);

create policy "profiles self insert"
on public.profiller
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles self update"
on public.profiller
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "profiles admin read all"
on public.profiller
for select
to authenticated
using (public.is_admin_user());

create policy "profiles admin update all"
on public.profiller
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

-- Site ayarlari: public sadece guvenli anahtarlar, yazma sadece admin.
create policy "site settings public safe read"
on public.site_ayarlari
for select
to anon, authenticated
using (
  anahtar in (
    'site_adi',
    'site_slogan',
    'logo_url',
    'meta_baslik',
    'meta_aciklama',
    'anahtar_kelimeler',
    'og_image',
    'sosyal_medya',
    'anasayfa_hero_slider',
    'seri_detay_vitrin',
    'bolum_okuma_sayfalari'
  )
  or anahtar like 'sayfa_%'
);

create policy "site settings admin insert"
on public.site_ayarlari
for insert
to authenticated
with check (public.is_admin_user());

create policy "site settings admin update"
on public.site_ayarlari
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "site settings admin delete"
on public.site_ayarlari
for delete
to authenticated
using (public.is_admin_user());

-- Vitrin verileri: herkes okuyabilir, yazma sadece admin.
create policy "ekip public read"
on public.ekip
for select
to anon, authenticated
using (true);

create policy "ekip admin insert"
on public.ekip
for insert
to authenticated
with check (public.is_admin_user());

create policy "ekip admin update"
on public.ekip
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "ekip admin delete"
on public.ekip
for delete
to authenticated
using (public.is_admin_user());

create policy "seriler public read"
on public.seriler
for select
to anon, authenticated
using (true);

create policy "seriler admin insert"
on public.seriler
for insert
to authenticated
with check (public.is_admin_user());

create policy "seriler admin update"
on public.seriler
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "seriler admin delete"
on public.seriler
for delete
to authenticated
using (public.is_admin_user());

create policy "bolumler public read"
on public.bolumler
for select
to anon, authenticated
using (true);

create policy "bolumler admin insert"
on public.bolumler
for insert
to authenticated
with check (public.is_admin_user());

create policy "bolumler admin update"
on public.bolumler
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "bolumler admin delete"
on public.bolumler
for delete
to authenticated
using (public.is_admin_user());

create policy "yazarlar public read"
on public.yazarlar
for select
to anon, authenticated
using (true);

create policy "yazarlar admin manage"
on public.yazarlar
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "cizerler public read"
on public.cizerler
for select
to anon, authenticated
using (true);

create policy "cizerler admin manage"
on public.cizerler
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "kategoriler public read"
on public.kategoriler
for select
to anon, authenticated
using (true);

create policy "kategoriler admin manage"
on public.kategoriler
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "turler public read"
on public.turler
for select
to anon, authenticated
using (true);

create policy "turler admin manage"
on public.turler
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "seri_yazarlar public read"
on public.seri_yazarlar
for select
to anon, authenticated
using (true);

create policy "seri_yazarlar admin manage"
on public.seri_yazarlar
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "seri_cizerler public read"
on public.seri_cizerler
for select
to anon, authenticated
using (true);

create policy "seri_cizerler admin manage"
on public.seri_cizerler
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

-- Yorumlar: herkese okuma, authenticated kendi adina yazabilsin, admin moderasyon yapabilsin.
create policy "yorumlar public read active"
on public.yorumlar
for select
to anon, authenticated
using (coalesce(silindi, false) = false);

create policy "yorumlar self insert"
on public.yorumlar
for insert
to authenticated
with check (
  auth.uid() = kullanici_id
  and coalesce(silindi, false) = false
);

create policy "yorumlar admin update"
on public.yorumlar
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "yorumlar admin delete"
on public.yorumlar
for delete
to authenticated
using (public.is_admin_user());

-- Bildirimler: kullanici kendi bildirimlerini gorur/okur, admin panel global liste okuyabilir.
create policy "bildirimler owner read"
on public.bildirimler
for select
to authenticated
using (auth.uid() = alici_id or public.is_admin_user());

create policy "bildirimler owner update"
on public.bildirimler
for update
to authenticated
using (auth.uid() = alici_id or public.is_admin_user())
with check (auth.uid() = alici_id or public.is_admin_user());

create policy "bildirimler admin insert"
on public.bildirimler
for insert
to authenticated
with check (public.is_admin_user());

create policy "bildirimler admin delete"
on public.bildirimler
for delete
to authenticated
using (public.is_admin_user());

commit;
