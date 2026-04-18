-- Seri goruntulenmelerini gunluk IP hash mantigina gecirir ve mevcut seri sayaçlarini sifirlar.
-- SQL Editor'de bir kez calistir.

begin;

create table if not exists public.seri_goruntuleme_kayitlari (
  id bigserial primary key,
  seri_id uuid not null references public.seriler(id) on delete cascade,
  ip_hash text not null,
  goruntulenme_gunu date not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_seri_goruntuleme_kayitlari_unique
  on public.seri_goruntuleme_kayitlari (seri_id, ip_hash, goruntulenme_gunu);

create index if not exists idx_seri_goruntuleme_kayitlari_seri
  on public.seri_goruntuleme_kayitlari (seri_id, goruntulenme_gunu desc);

truncate table public.seri_goruntuleme_kayitlari;

update public.seriler
set goruntuleme_sayisi = 0;

commit;
