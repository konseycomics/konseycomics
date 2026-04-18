-- KonseyComics okuyucu liderlik odulleri
-- SQL Editor'de bir kez calistir.

begin;

create table if not exists public.rozet_tanimlari (
  id uuid primary key default gen_random_uuid(),
  kod text not null unique,
  isim text not null,
  aciklama text,
  ikon text,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

alter table if exists public.rozet_tanimlari
  add column if not exists kod text,
  add column if not exists isim text,
  add column if not exists aciklama text,
  add column if not exists ikon text,
  add column if not exists aktif boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists idx_rozet_tanimlari_kod
  on public.rozet_tanimlari (kod);

create table if not exists public.kullanici_rozetleri (
  id uuid primary key default gen_random_uuid(),
  kullanici_id uuid not null references public.profiller(id) on delete cascade,
  rozet_id uuid not null references public.rozet_tanimlari(id) on delete cascade,
  kazanildi_at timestamptz not null default now(),
  acilma_nedeni jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (kullanici_id, rozet_id)
);

alter table if exists public.kullanici_rozetleri
  add column if not exists kullanici_id uuid references public.profiller(id) on delete cascade,
  add column if not exists rozet_id uuid references public.rozet_tanimlari(id) on delete cascade,
  add column if not exists kazanildi_at timestamptz not null default now(),
  add column if not exists acilma_nedeni jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_kullanici_rozetleri_kullanici
  on public.kullanici_rozetleri (kullanici_id, kazanildi_at desc);

create unique index if not exists idx_kullanici_rozetleri_unique_pair
  on public.kullanici_rozetleri (kullanici_id, rozet_id);

create table if not exists public.okuyucu_liderlik_odulleri (
  id uuid primary key default gen_random_uuid(),
  donem_tipi text not null,
  donem_anahtari text not null,
  kullanici_id uuid not null references public.profiller(id) on delete cascade,
  okuma_sayisi integer not null default 0,
  rozet_id uuid references public.rozet_tanimlari(id) on delete set null,
  unvan_id uuid references public.unvan_tanimlari(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (donem_tipi, donem_anahtari)
);

create index if not exists idx_okuyucu_liderlik_odulleri_kullanici
  on public.okuyucu_liderlik_odulleri (kullanici_id, created_at desc);

alter table public.rozet_tanimlari enable row level security;
alter table public.kullanici_rozetleri enable row level security;
alter table public.okuyucu_liderlik_odulleri enable row level security;

drop policy if exists "rozet tanimlari herkese acik" on public.rozet_tanimlari;
create policy "rozet tanimlari herkese acik"
on public.rozet_tanimlari
for select
to anon, authenticated
using (aktif = true);

drop policy if exists "kullanici rozetleri herkese acik" on public.kullanici_rozetleri;
create policy "kullanici rozetleri herkese acik"
on public.kullanici_rozetleri
for select
to anon, authenticated
using (true);

drop policy if exists "liderlik odulleri admin okur" on public.okuyucu_liderlik_odulleri;
create policy "liderlik odulleri admin okur"
on public.okuyucu_liderlik_odulleri
for select
to authenticated
using (public.is_admin_user());

insert into public.rozet_tanimlari (kod, isim, aciklama, ikon, aktif)
select 'gunun_en_iyi_okuyucusu', 'Günün En İyi Okuyucusu', 'Bir gün içinde en çok sayılan bölümü okuyarak zirveye çıktın.', '🥇', true
where not exists (
  select 1 from public.rozet_tanimlari where kod = 'gunun_en_iyi_okuyucusu'
);

insert into public.rozet_tanimlari (kod, isim, aciklama, ikon, aktif)
select 'haftanin_en_iyi_okuyucusu', 'Haftanın En İyi Okuyucusu', 'Haftalık okuyucu liderliğinde ilk sıraya yerleşerek haftanın okuyucusu oldun.', '🏆', true
where not exists (
  select 1 from public.rozet_tanimlari where kod = 'haftanin_en_iyi_okuyucusu'
);

insert into public.rozet_tanimlari (kod, isim, aciklama, ikon, aktif)
select 'tum_zamanlarin_en_iyi_okuyucusu', 'Tüm Zamanların En İyi Okuyucusu', 'KonseyComics tarihinde en çok okuyan kullanıcı olarak zirveye çıktın.', '👑', true
where not exists (
  select 1 from public.rozet_tanimlari where kod = 'tum_zamanlarin_en_iyi_okuyucusu'
);

insert into public.unvan_tanimlari (kod, isim, aciklama, kategori, nadirlik, aktif, siralama)
select 'konsey_maratoncusu', 'Konsey Maratoncusu', 'Haftalık liderliği kazanarak Konsey okuma maratonunun zirvesine çıktın.', 'engagement', 'epic', true, 8
where not exists (
  select 1 from public.unvan_tanimlari where kod = 'konsey_maratoncusu'
);

insert into public.unvan_tanimlari (kod, isim, aciklama, kategori, nadirlik, aktif, siralama)
select 'konsey_efsanesi', 'Konsey Efsanesi', 'Tüm zamanlar okuyucu liderliğinde zirveye çıkarak Konsey efsaneleri arasına girdin.', 'engagement', 'legendary', true, 9
where not exists (
  select 1 from public.unvan_tanimlari where kod = 'konsey_efsanesi'
);

commit;
