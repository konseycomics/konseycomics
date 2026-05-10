-- KonseyComics topluluk konusu V1
-- SQL Editor'de bir kez calistir.

begin;

create extension if not exists pgcrypto;

create table if not exists public.topluluk_konulari (
  id uuid primary key default gen_random_uuid(),
  kullanici_id uuid not null references public.profiller(id) on delete cascade,
  slug text not null unique,
  baslik text not null,
  icerik text not null,
  kategori text not null default 'Genel Sohbet',
  etiketler text[] not null default '{}',
  anket_aktif boolean not null default false,
  anket_sorusu text,
  anket_secenekleri jsonb not null default '[]'::jsonb,
  aktif boolean not null default true,
  sabitlendi boolean not null default false,
  yanit_sayisi integer not null default 0,
  begeni_sayisi integer not null default 0,
  goruntulenme_sayisi integer not null default 0,
  son_aktivite_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.topluluk_konulari
  add column if not exists anket_aktif boolean not null default false;

alter table if exists public.topluluk_konulari
  add column if not exists anket_sorusu text;

alter table if exists public.topluluk_konulari
  add column if not exists anket_secenekleri jsonb not null default '[]'::jsonb;

create table if not exists public.topluluk_yanitlari (
  id uuid primary key default gen_random_uuid(),
  konu_id uuid not null references public.topluluk_konulari(id) on delete cascade,
  kullanici_id uuid not null references public.profiller(id) on delete cascade,
  parent_yanit_id uuid references public.topluluk_yanitlari(id) on delete cascade,
  icerik text not null,
  spoiler boolean not null default false,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.topluluk_yanitlari
  add column if not exists parent_yanit_id uuid references public.topluluk_yanitlari(id) on delete cascade;

create table if not exists public.topluluk_begenileri (
  id uuid primary key default gen_random_uuid(),
  konu_id uuid not null references public.topluluk_konulari(id) on delete cascade,
  kullanici_id uuid not null references public.profiller(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (konu_id, kullanici_id)
);

create table if not exists public.topluluk_yer_imleri (
  id uuid primary key default gen_random_uuid(),
  konu_id uuid not null references public.topluluk_konulari(id) on delete cascade,
  kullanici_id uuid not null references public.profiller(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (konu_id, kullanici_id)
);

create table if not exists public.topluluk_anket_oylari (
  id uuid primary key default gen_random_uuid(),
  konu_id uuid not null references public.topluluk_konulari(id) on delete cascade,
  kullanici_id uuid not null references public.profiller(id) on delete cascade,
  secenek_index integer not null check (secenek_index >= 0),
  created_at timestamptz not null default now(),
  unique (konu_id, kullanici_id)
);

create index if not exists idx_topluluk_konulari_aktif_son_aktivite
  on public.topluluk_konulari (aktif, son_aktivite_at desc);

create index if not exists idx_topluluk_konulari_kullanici
  on public.topluluk_konulari (kullanici_id, created_at desc);

create index if not exists idx_topluluk_yanitlari_konu
  on public.topluluk_yanitlari (konu_id, created_at asc);

create index if not exists idx_topluluk_yanitlari_kullanici
  on public.topluluk_yanitlari (kullanici_id, created_at desc);

create index if not exists idx_topluluk_yanitlari_parent
  on public.topluluk_yanitlari (parent_yanit_id, created_at asc);

create index if not exists idx_topluluk_begenileri_kullanici
  on public.topluluk_begenileri (kullanici_id, created_at desc);

create index if not exists idx_topluluk_yer_imleri_kullanici
  on public.topluluk_yer_imleri (kullanici_id, created_at desc);

create index if not exists idx_topluluk_anket_oylari_konu
  on public.topluluk_anket_oylari (konu_id, created_at desc);

create index if not exists idx_topluluk_anket_oylari_kullanici
  on public.topluluk_anket_oylari (kullanici_id, created_at desc);

create or replace function public.touch_topluluk_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_touch_topluluk_konulari_updated_at on public.topluluk_konulari;
create trigger trigger_touch_topluluk_konulari_updated_at
before update on public.topluluk_konulari
for each row
execute function public.touch_topluluk_updated_at();

drop trigger if exists trigger_touch_topluluk_yanitlari_updated_at on public.topluluk_yanitlari;
create trigger trigger_touch_topluluk_yanitlari_updated_at
before update on public.topluluk_yanitlari
for each row
execute function public.touch_topluluk_updated_at();

create or replace function public.sync_topluluk_konu_stats()
returns trigger
language plpgsql
as $$
declare
  target_konu uuid;
begin
  target_konu = coalesce(new.konu_id, old.konu_id);

  update public.topluluk_konulari
  set
    yanit_sayisi = (
      select count(*)
      from public.topluluk_yanitlari y
      where y.konu_id = target_konu
        and y.aktif = true
    ),
    son_aktivite_at = coalesce(
      (
        select max(y.created_at)
        from public.topluluk_yanitlari y
        where y.konu_id = target_konu
          and y.aktif = true
      ),
      created_at
    )
  where id = target_konu;

  return coalesce(new, old);
end;
$$;

create or replace function public.sync_topluluk_like_stats()
returns trigger
language plpgsql
as $$
declare
  target_konu uuid;
begin
  target_konu = coalesce(new.konu_id, old.konu_id);

  update public.topluluk_konulari
  set begeni_sayisi = (
    select count(*)
    from public.topluluk_begenileri b
    where b.konu_id = target_konu
  )
  where id = target_konu;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trigger_sync_topluluk_stats_after_insert on public.topluluk_yanitlari;
create trigger trigger_sync_topluluk_stats_after_insert
after insert on public.topluluk_yanitlari
for each row
execute function public.sync_topluluk_konu_stats();

drop trigger if exists trigger_sync_topluluk_stats_after_update on public.topluluk_yanitlari;
create trigger trigger_sync_topluluk_stats_after_update
after update on public.topluluk_yanitlari
for each row
execute function public.sync_topluluk_konu_stats();

drop trigger if exists trigger_sync_topluluk_stats_after_delete on public.topluluk_yanitlari;
create trigger trigger_sync_topluluk_stats_after_delete
after delete on public.topluluk_yanitlari
for each row
execute function public.sync_topluluk_konu_stats();

drop trigger if exists trigger_sync_topluluk_likes_after_insert on public.topluluk_begenileri;
create trigger trigger_sync_topluluk_likes_after_insert
after insert on public.topluluk_begenileri
for each row
execute function public.sync_topluluk_like_stats();

drop trigger if exists trigger_sync_topluluk_likes_after_delete on public.topluluk_begenileri;
create trigger trigger_sync_topluluk_likes_after_delete
after delete on public.topluluk_begenileri
for each row
execute function public.sync_topluluk_like_stats();

alter table public.topluluk_konulari enable row level security;
alter table public.topluluk_yanitlari enable row level security;
alter table public.topluluk_begenileri enable row level security;
alter table public.topluluk_yer_imleri enable row level security;
alter table public.topluluk_anket_oylari enable row level security;

drop policy if exists "topluluk konulari public okur" on public.topluluk_konulari;
create policy "topluluk konulari public okur"
on public.topluluk_konulari
for select
to anon, authenticated
using (aktif = true);

drop policy if exists "topluluk konulari auth ekler" on public.topluluk_konulari;
create policy "topluluk konulari auth ekler"
on public.topluluk_konulari
for insert
to authenticated
with check (auth.uid() = kullanici_id);

drop policy if exists "topluluk konulari sahibi gunceller" on public.topluluk_konulari;
create policy "topluluk konulari sahibi gunceller"
on public.topluluk_konulari
for update
to authenticated
using (auth.uid() = kullanici_id or public.is_admin_user())
with check (auth.uid() = kullanici_id or public.is_admin_user());

drop policy if exists "topluluk yanitlari public okur" on public.topluluk_yanitlari;
create policy "topluluk yanitlari public okur"
on public.topluluk_yanitlari
for select
to anon, authenticated
using (aktif = true);

drop policy if exists "topluluk yanitlari auth ekler" on public.topluluk_yanitlari;
create policy "topluluk yanitlari auth ekler"
on public.topluluk_yanitlari
for insert
to authenticated
with check (auth.uid() = kullanici_id);

drop policy if exists "topluluk yanitlari sahibi gunceller" on public.topluluk_yanitlari;
create policy "topluluk yanitlari sahibi gunceller"
on public.topluluk_yanitlari
for update
to authenticated
using (auth.uid() = kullanici_id or public.is_admin_user())
with check (auth.uid() = kullanici_id or public.is_admin_user());

drop policy if exists "topluluk begenileri sahibi okur" on public.topluluk_begenileri;
create policy "topluluk begenileri sahibi okur"
on public.topluluk_begenileri
for select
to authenticated
using (auth.uid() = kullanici_id or public.is_admin_user());

drop policy if exists "topluluk begenileri sahibi ekler" on public.topluluk_begenileri;
create policy "topluluk begenileri sahibi ekler"
on public.topluluk_begenileri
for insert
to authenticated
with check (auth.uid() = kullanici_id or public.is_admin_user());

drop policy if exists "topluluk begenileri sahibi siler" on public.topluluk_begenileri;
create policy "topluluk begenileri sahibi siler"
on public.topluluk_begenileri
for delete
to authenticated
using (auth.uid() = kullanici_id or public.is_admin_user());

drop policy if exists "topluluk yer imleri sahibi okur" on public.topluluk_yer_imleri;
create policy "topluluk yer imleri sahibi okur"
on public.topluluk_yer_imleri
for select
to authenticated
using (auth.uid() = kullanici_id or public.is_admin_user());

drop policy if exists "topluluk yer imleri sahibi ekler" on public.topluluk_yer_imleri;
create policy "topluluk yer imleri sahibi ekler"
on public.topluluk_yer_imleri
for insert
to authenticated
with check (auth.uid() = kullanici_id or public.is_admin_user());

drop policy if exists "topluluk yer imleri sahibi siler" on public.topluluk_yer_imleri;
create policy "topluluk yer imleri sahibi siler"
on public.topluluk_yer_imleri
for delete
to authenticated
using (auth.uid() = kullanici_id or public.is_admin_user());

drop policy if exists "topluluk anket oylari sahibi okur" on public.topluluk_anket_oylari;
create policy "topluluk anket oylari sahibi okur"
on public.topluluk_anket_oylari
for select
to authenticated
using (auth.uid() = kullanici_id or public.is_admin_user());

drop policy if exists "topluluk anket oylari sahibi ekler" on public.topluluk_anket_oylari;
create policy "topluluk anket oylari sahibi ekler"
on public.topluluk_anket_oylari
for insert
to authenticated
with check (auth.uid() = kullanici_id or public.is_admin_user());

drop policy if exists "topluluk anket oylari sahibi gunceller" on public.topluluk_anket_oylari;
create policy "topluluk anket oylari sahibi gunceller"
on public.topluluk_anket_oylari
for update
to authenticated
using (auth.uid() = kullanici_id or public.is_admin_user())
with check (auth.uid() = kullanici_id or public.is_admin_user());

drop policy if exists "topluluk anket oylari sahibi siler" on public.topluluk_anket_oylari;
create policy "topluluk anket oylari sahibi siler"
on public.topluluk_anket_oylari
for delete
to authenticated
using (auth.uid() = kullanici_id or public.is_admin_user());

commit;
