-- KonseyComics RLS hardening
-- Bu dosya 2026-03-22 tarihli audit bulgularina gore hazirlandi.
-- Once staging/proje yedegi alip daha sonra SQL Editor'de calistir.

begin;

-- 1) Kullanici mahremiyeti: okuma listesi public olmamali.
drop policy if exists "herkes okuma listesi okuyabilir" on public.okuma_listesi;

create policy "kullanici kendi okuma listesini okur"
on public.okuma_listesi
for select
to authenticated
using (auth.uid() = kullanici_id);

-- 2) Public profil alanlari ile ozel alanlari ayirmak icin gorunum.
-- Not: Uygulama ileride public profil ekranlarini bu view uzerinden okuyabilir.
create or replace view public.public_profiller as
select
  id,
  kullanici_adi,
  avatar_url,
  bio,
  rol,
  seviye,
  xp,
  takipci_sayisi,
  takip_sayisi,
  created_at
from public.profiller
where askiya_alindi = false;

grant select on public.public_profiller to anon, authenticated;

-- 3) Istersen bir sonraki asamada daha da sertlestir:
-- revoke select on public.profiller from anon;
-- Bunun oncesinde uygulamadaki public profil/join sorgularini
-- public_profiller view'una tasiman gerekir.

commit;
