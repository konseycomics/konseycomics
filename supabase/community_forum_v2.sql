-- Konsey Forum V2
-- Forum bolumleri, abonelik, sikayet ve moderasyon altyapisi.
-- Tekrar calistirilabilir.

begin;

create extension if not exists pgcrypto;

create table if not exists public.topluluk_forumlari (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  isim text not null,
  aciklama text not null default '',
  grup text not null default 'Topluluk',
  ikon text not null default 'message',
  renk text not null default 'gold',
  siralama integer not null default 0,
  aktif boolean not null default true,
  sadece_yonetim boolean not null default false,
  konu_sayisi integer not null default 0,
  yanit_sayisi integer not null default 0,
  son_aktivite_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.topluluk_forumlari (slug, isim, aciklama, grup, ikon, renk, siralama, sadece_yonetim)
values
  ('duyurular', 'Duyurular ve Kurallar', 'Yonetim duyurulari, forum kurallari ve onemli bilgilendirmeler.', 'Konsey', 'megaphone', 'gold', 10, true),
  ('cizgi-roman', 'Cizgi Roman', 'Marvel, DC ve bagimsiz cizgi roman evrenleri uzerine tartismalar.', 'Okuma Evrenleri', 'panels', 'red', 20, false),
  ('manga-webtoon', 'Manga ve Webtoon', 'Manga serileri, webtoon bolumleri, teoriler ve okur onerileri.', 'Okuma Evrenleri', 'book', 'violet', 30, false),
  ('dizi-film', 'Dizi & Film Sohbet', 'Diziler, filmler, uyarlamalar, fragmanlar ve ekran dunyasindan gelismeler.', 'Ekran Dunyasi', 'film', 'cyan', 40, false),
  ('genel-sohbet', 'Genel Sohbet', 'Gundem, tanisma, serbest sohbet ve toplulugun ortak masasi.', 'Topluluk', 'message', 'gold', 50, false),
  ('oneriler-istekler', 'Oneriler ve Istekler', 'Site, ceviri ve forum icin goruslerini Konsey ekibiyle paylas.', 'Topluluk', 'help', 'white', 60, false),
  ('cizim-koleksiyon', 'Cizim ve Koleksiyonlar', 'Cizimlerini, rafini ve koleksiyon parcalarini toplulukla paylas.', 'Topluluk', 'pen', 'orange', 70, false)
on conflict (slug) do update set
  isim = excluded.isim,
  aciklama = excluded.aciklama,
  grup = excluded.grup,
  ikon = excluded.ikon,
  renk = excluded.renk,
  siralama = excluded.siralama,
  sadece_yonetim = excluded.sadece_yonetim,
  aktif = true,
  updated_at = now();

alter table public.topluluk_konulari
  add column if not exists forum_id uuid references public.topluluk_forumlari(id) on delete restrict,
  add column if not exists kilitli boolean not null default false,
  add column if not exists one_cikan boolean not null default false,
  add column if not exists son_yanit_id uuid,
  add column if not exists son_yanit_kullanici_id uuid references public.profiller(id) on delete set null,
  add column if not exists duzenlendi_at timestamptz;

alter table public.topluluk_yanitlari
  add column if not exists duzenlendi_at timestamptz;

update public.topluluk_konulari k
set forum_id = f.id
from public.topluluk_forumlari f
where k.forum_id is null
  and f.slug = case
    when lower(k.kategori) in ('duyurular', 'duyurular ve kurallar') then 'duyurular'
    when lower(k.kategori) in ('marvel', 'dc comics', 'bagimsiz cizgi romanlar', 'bağımsız çizgi romanlar', 'cizgi roman', 'çizgi roman') then 'cizgi-roman'
    when lower(k.kategori) in ('manga', 'webtoon', 'manga ve webtoon') then 'manga-webtoon'
    when lower(k.kategori) in ('dizi & film sohbet', 'dizi ve film', 'dizi & film') then 'dizi-film'
    when lower(k.kategori) in ('oneriler ve istekler', 'öneriler ve istekler') then 'oneriler-istekler'
    when lower(k.kategori) in ('cizim ve koleksiyonlar', 'çizim ve koleksiyonlar') then 'cizim-koleksiyon'
    else 'genel-sohbet'
  end;

update public.topluluk_konulari
set
  kategori = 'Dizi & Film Sohbet',
  forum_id = (select id from public.topluluk_forumlari where slug = 'dizi-film'),
  updated_at = now()
where slug in (
  'daredevil-son-sezon-hakk-nda',
  'the-batman-part-de-sizce-kimleri-goruruz'
);

update public.topluluk_konulari
set
  kategori = 'Genel Sohbet',
  forum_id = (select id from public.topluluk_forumlari where slug = 'genel-sohbet'),
  updated_at = now()
where slug in (
  'bir-dc-sehri-olsayd-n-hangisi-olurdun',
  'sitedeki-en-sevdiginiz-seri'
);

create table if not exists public.topluluk_abonelikleri (
  id uuid primary key default gen_random_uuid(),
  konu_id uuid not null references public.topluluk_konulari(id) on delete cascade,
  kullanici_id uuid not null references public.profiller(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (konu_id, kullanici_id)
);

create table if not exists public.topluluk_sikayetleri (
  id uuid primary key default gen_random_uuid(),
  konu_id uuid references public.topluluk_konulari(id) on delete cascade,
  yanit_id uuid references public.topluluk_yanitlari(id) on delete cascade,
  bildiren_id uuid not null references public.profiller(id) on delete cascade,
  neden text not null,
  aciklama text not null default '',
  durum text not null default 'acik' check (durum in ('acik', 'inceleniyor', 'cozuldu', 'reddedildi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (konu_id is not null or yanit_id is not null)
);

create index if not exists idx_topluluk_forumlari_siralama on public.topluluk_forumlari (aktif, siralama);
create index if not exists idx_topluluk_konulari_forum_aktivite on public.topluluk_konulari (forum_id, aktif, sabitlendi desc, son_aktivite_at desc);
create index if not exists idx_topluluk_abonelikleri_kullanici on public.topluluk_abonelikleri (kullanici_id, created_at desc);
create index if not exists idx_topluluk_sikayetleri_durum on public.topluluk_sikayetleri (durum, created_at desc);

create or replace function public.sync_topluluk_forum_stats(target_forum uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_forum is null then return; end if;
  update public.topluluk_forumlari f
  set
    konu_sayisi = (select count(*) from public.topluluk_konulari k where k.forum_id = target_forum and k.aktif = true),
    yanit_sayisi = (
      select count(*)
      from public.topluluk_yanitlari y
      join public.topluluk_konulari k on k.id = y.konu_id
      where k.forum_id = target_forum and k.aktif = true and y.aktif = true
    ),
    son_aktivite_at = (select max(k.son_aktivite_at) from public.topluluk_konulari k where k.forum_id = target_forum and k.aktif = true),
    updated_at = now()
  where f.id = target_forum;
end;
$$;

create or replace function public.sync_topluluk_forum_stats_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_forum uuid;
  new_forum uuid;
begin
  if tg_table_name = 'topluluk_konulari' then
    old_forum = case when tg_op <> 'INSERT' then old.forum_id else null end;
    new_forum = case when tg_op <> 'DELETE' then new.forum_id else null end;
  else
    if tg_op <> 'INSERT' then select forum_id into old_forum from public.topluluk_konulari where id = old.konu_id; end if;
    if tg_op <> 'DELETE' then select forum_id into new_forum from public.topluluk_konulari where id = new.konu_id; end if;
  end if;
  perform public.sync_topluluk_forum_stats(old_forum);
  if new_forum is distinct from old_forum then perform public.sync_topluluk_forum_stats(new_forum); end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trigger_sync_forum_after_topic on public.topluluk_konulari;
create trigger trigger_sync_forum_after_topic after insert or update or delete on public.topluluk_konulari
for each row execute function public.sync_topluluk_forum_stats_trigger();

drop trigger if exists trigger_sync_forum_after_reply on public.topluluk_yanitlari;
create trigger trigger_sync_forum_after_reply after insert or update or delete on public.topluluk_yanitlari
for each row execute function public.sync_topluluk_forum_stats_trigger();

create or replace function public.sync_topluluk_konu_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_konu uuid;
begin
  target_konu = coalesce(new.konu_id, old.konu_id);
  update public.topluluk_konulari
  set
    yanit_sayisi = (select count(*) from public.topluluk_yanitlari y where y.konu_id = target_konu and y.aktif = true),
    son_aktivite_at = coalesce((select max(y.created_at) from public.topluluk_yanitlari y where y.konu_id = target_konu and y.aktif = true), created_at),
    son_yanit_id = (select y.id from public.topluluk_yanitlari y where y.konu_id = target_konu and y.aktif = true order by y.created_at desc limit 1),
    son_yanit_kullanici_id = (select y.kullanici_id from public.topluluk_yanitlari y where y.konu_id = target_konu and y.aktif = true order by y.created_at desc limit 1)
  where id = target_konu;
  return coalesce(new, old);
end;
$$;

do $$
declare forum_row record;
begin
  for forum_row in select id from public.topluluk_forumlari loop
    perform public.sync_topluluk_forum_stats(forum_row.id);
  end loop;
end $$;

alter table public.topluluk_forumlari enable row level security;
alter table public.topluluk_abonelikleri enable row level security;
alter table public.topluluk_sikayetleri enable row level security;

drop policy if exists "topluluk forumlari public okur" on public.topluluk_forumlari;
create policy "topluluk forumlari public okur" on public.topluluk_forumlari for select to anon, authenticated using (aktif = true);

drop policy if exists "topluluk abonelikleri sahibi okur" on public.topluluk_abonelikleri;
create policy "topluluk abonelikleri sahibi okur" on public.topluluk_abonelikleri for select to authenticated using (auth.uid() = kullanici_id or public.is_admin_user());
drop policy if exists "topluluk abonelikleri sahibi ekler" on public.topluluk_abonelikleri;
create policy "topluluk abonelikleri sahibi ekler" on public.topluluk_abonelikleri for insert to authenticated with check (auth.uid() = kullanici_id);
drop policy if exists "topluluk abonelikleri sahibi siler" on public.topluluk_abonelikleri;
create policy "topluluk abonelikleri sahibi siler" on public.topluluk_abonelikleri for delete to authenticated using (auth.uid() = kullanici_id or public.is_admin_user());

drop policy if exists "topluluk sikayetleri sahibi okur" on public.topluluk_sikayetleri;
create policy "topluluk sikayetleri sahibi okur" on public.topluluk_sikayetleri for select to authenticated using (auth.uid() = bildiren_id or public.is_admin_user());
drop policy if exists "topluluk sikayetleri auth ekler" on public.topluluk_sikayetleri;
create policy "topluluk sikayetleri auth ekler" on public.topluluk_sikayetleri for insert to authenticated with check (auth.uid() = bildiren_id);
drop policy if exists "topluluk sikayetleri admin gunceller" on public.topluluk_sikayetleri;
create policy "topluluk sikayetleri admin gunceller" on public.topluluk_sikayetleri for update to authenticated using (public.is_admin_user()) with check (public.is_admin_user());

commit;
