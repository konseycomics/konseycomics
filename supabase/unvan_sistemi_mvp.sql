-- Konsey Comics - Unvan Sistemi MVP
-- Bu dosya ilk MVP veri modelini olusturur.
-- Not: Mevcut proje yapisina gore tablo isimleri Turkce tutulmustur.

begin;

-- 1) Serilere karakter grubu ekle
alter table if exists public.seriler
  add column if not exists character_group text;

create index if not exists idx_seriler_character_group
  on public.seriler (character_group);

-- 2) Gercek bolum tamamlama kaydi
create table if not exists public.kullanici_bolum_okumalari (
  id uuid primary key default gen_random_uuid(),
  kullanici_id uuid not null references public.profiller(id) on delete cascade,
  bolum_id uuid not null references public.bolumler(id) on delete cascade,
  seri_id uuid not null references public.seriler(id) on delete cascade,
  completion_ratio numeric(5,2) not null default 0,
  okuma_suresi_sec integer not null default 0,
  okundu_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (kullanici_id, bolum_id)
);

create index if not exists idx_kullanici_bolum_okumalari_kullanici
  on public.kullanici_bolum_okumalari (kullanici_id, okundu_at desc);

create index if not exists idx_kullanici_bolum_okumalari_seri
  on public.kullanici_bolum_okumalari (seri_id, kullanici_id);

-- 3) Seri bazli ilerleme ozeti
create table if not exists public.kullanici_seri_ilerleme (
  id uuid primary key default gen_random_uuid(),
  kullanici_id uuid not null references public.profiller(id) on delete cascade,
  seri_id uuid not null references public.seriler(id) on delete cascade,
  okunan_bolum_sayisi integer not null default 0,
  toplam_bolum_sayisi integer not null default 0,
  ilerleme_yuzdesi numeric(5,2) not null default 0,
  tamamlandi boolean not null default false,
  ilk_okuma_at timestamptz,
  son_okuma_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kullanici_id, seri_id)
);

create index if not exists idx_kullanici_seri_ilerleme_kullanici
  on public.kullanici_seri_ilerleme (kullanici_id, updated_at desc);

create index if not exists idx_kullanici_seri_ilerleme_seri
  on public.kullanici_seri_ilerleme (seri_id, kullanici_id);

create index if not exists idx_kullanici_seri_ilerleme_tamamlandi
  on public.kullanici_seri_ilerleme (kullanici_id, tamamlandi);

-- 4) Unvan tanimlari
create table if not exists public.unvan_tanimlari (
  id uuid primary key default gen_random_uuid(),
  kod text not null unique,
  isim text not null,
  aciklama text,
  seri_id uuid references public.seriler(id) on delete set null,
  character_group text,
  kategori text not null default 'progress',
  nadirlik text not null default 'common',
  ikon_url text,
  aktif boolean not null default true,
  siralama integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_unvan_tanimlari_seri
  on public.unvan_tanimlari (seri_id);

create index if not exists idx_unvan_tanimlari_character_group
  on public.unvan_tanimlari (character_group);

-- 5) Unvan kurallari
create table if not exists public.unvan_kurallari (
  id uuid primary key default gen_random_uuid(),
  unvan_id uuid not null references public.unvan_tanimlari(id) on delete cascade,
  event_tipi text not null,
  kural_tipi text not null,
  kural_config jsonb not null default '{}'::jsonb,
  oncelik integer not null default 100,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_unvan_kurallari_event
  on public.unvan_kurallari (event_tipi, aktif, oncelik);

create index if not exists idx_unvan_kurallari_config
  on public.unvan_kurallari using gin (kural_config);

-- 6) Kullanici-unvan iliskisi
create table if not exists public.kullanici_unvanlari (
  id uuid primary key default gen_random_uuid(),
  kullanici_id uuid not null references public.profiller(id) on delete cascade,
  unvan_id uuid not null references public.unvan_tanimlari(id) on delete cascade,
  acildi_at timestamptz not null default now(),
  acilma_nedeni jsonb not null default '{}'::jsonb,
  one_cikarildi boolean not null default false,
  created_at timestamptz not null default now(),
  unique (kullanici_id, unvan_id)
);

create index if not exists idx_kullanici_unvanlari_kullanici
  on public.kullanici_unvanlari (kullanici_id, acildi_at desc);

create index if not exists idx_kullanici_unvanlari_one_cikarilanlar
  on public.kullanici_unvanlari (kullanici_id, one_cikarildi)
  where one_cikarildi = true;

-- 7) Event / debug logu
create table if not exists public.unvan_olay_loglari (
  id uuid primary key default gen_random_uuid(),
  kullanici_id uuid references public.profiller(id) on delete cascade,
  event_tipi text not null,
  seri_id uuid references public.seriler(id) on delete set null,
  bolum_id uuid references public.bolumler(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_unvan_olay_loglari_kullanici
  on public.unvan_olay_loglari (kullanici_id, created_at desc);

create index if not exists idx_unvan_olay_loglari_event
  on public.unvan_olay_loglari (event_tipi, created_at desc);

-- 8) Guncellenme trigger'i
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_kullanici_seri_ilerleme_updated_at on public.kullanici_seri_ilerleme;
create trigger trg_kullanici_seri_ilerleme_updated_at
before update on public.kullanici_seri_ilerleme
for each row
execute function public.set_updated_at();

-- 9) RLS
alter table public.kullanici_bolum_okumalari enable row level security;
alter table public.kullanici_seri_ilerleme enable row level security;
alter table public.unvan_tanimlari enable row level security;
alter table public.unvan_kurallari enable row level security;
alter table public.kullanici_unvanlari enable row level security;
alter table public.unvan_olay_loglari enable row level security;

drop policy if exists "kullanici kendi bolum okumalarini okur" on public.kullanici_bolum_okumalari;
create policy "kullanici kendi bolum okumalarini okur"
on public.kullanici_bolum_okumalari for select
to authenticated
using (auth.uid() = kullanici_id);

drop policy if exists "kullanici kendi bolum okumasini yazar" on public.kullanici_bolum_okumalari;
create policy "kullanici kendi bolum okumasini yazar"
on public.kullanici_bolum_okumalari for insert
to authenticated
with check (auth.uid() = kullanici_id);

drop policy if exists "kullanici kendi bolum okumasini gunceller" on public.kullanici_bolum_okumalari;
create policy "kullanici kendi bolum okumasini gunceller"
on public.kullanici_bolum_okumalari for update
to authenticated
using (auth.uid() = kullanici_id)
with check (auth.uid() = kullanici_id);

drop policy if exists "kullanici kendi seri ilerlemesini okur" on public.kullanici_seri_ilerleme;
create policy "kullanici kendi seri ilerlemesini okur"
on public.kullanici_seri_ilerleme for select
to authenticated
using (auth.uid() = kullanici_id);

drop policy if exists "kullanici kendi seri ilerlemesini yazar" on public.kullanici_seri_ilerleme;
create policy "kullanici kendi seri ilerlemesini yazar"
on public.kullanici_seri_ilerleme for insert
to authenticated
with check (auth.uid() = kullanici_id);

drop policy if exists "kullanici kendi seri ilerlemesini gunceller" on public.kullanici_seri_ilerleme;
create policy "kullanici kendi seri ilerlemesini gunceller"
on public.kullanici_seri_ilerleme for update
to authenticated
using (auth.uid() = kullanici_id)
with check (auth.uid() = kullanici_id);

drop policy if exists "unvan tanimlari herkese acik" on public.unvan_tanimlari;
create policy "unvan tanimlari herkese acik"
on public.unvan_tanimlari for select
to anon, authenticated
using (aktif = true);

drop policy if exists "unvan kurallari sadece authenticated okur" on public.unvan_kurallari;
create policy "unvan kurallari sadece authenticated okur"
on public.unvan_kurallari for select
to authenticated
using (aktif = true);

drop policy if exists "kullanici unvanlari herkese acik" on public.kullanici_unvanlari;
create policy "kullanici unvanlari herkese acik"
on public.kullanici_unvanlari for select
to anon, authenticated
using (true);

drop policy if exists "kullanici kendi unvanini yazar" on public.kullanici_unvanlari;
create policy "kullanici kendi unvanini yazar"
on public.kullanici_unvanlari for insert
to authenticated
with check (auth.uid() = kullanici_id);

drop policy if exists "kullanici kendi unvanini gunceller" on public.kullanici_unvanlari;
create policy "kullanici kendi unvanini gunceller"
on public.kullanici_unvanlari for update
to authenticated
using (auth.uid() = kullanici_id)
with check (auth.uid() = kullanici_id);

drop policy if exists "kullanici kendi olay logunu okur" on public.unvan_olay_loglari;
create policy "kullanici kendi olay logunu okur"
on public.unvan_olay_loglari for select
to authenticated
using (auth.uid() = kullanici_id);

drop policy if exists "kullanici kendi olay logunu yazar" on public.unvan_olay_loglari;
create policy "kullanici kendi olay logunu yazar"
on public.unvan_olay_loglari for insert
to authenticated
with check (auth.uid() = kullanici_id);

commit;

-- Sonraki adim:
-- 1) seriler.character_group alanlarini doldur
-- 2) ilk unvan seedlerini ekle
-- 3) evaluator fonksiyonunu server route ya da edge function tarafinda yaz
