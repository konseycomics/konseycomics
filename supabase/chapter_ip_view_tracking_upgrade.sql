-- Bolum goruntulenmelerini gunluk IP hash mantigina gecirir.
-- SQL Editor'de bir kez calistir.

begin;

create table if not exists public.bolum_goruntuleme_kayitlari (
  id bigserial primary key,
  bolum_id uuid not null references public.bolumler(id) on delete cascade,
  ip_hash text not null,
  goruntulenme_gunu date not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_bolum_goruntuleme_kayitlari_unique
  on public.bolum_goruntuleme_kayitlari (bolum_id, ip_hash, goruntulenme_gunu);

create index if not exists idx_bolum_goruntuleme_kayitlari_bolum
  on public.bolum_goruntuleme_kayitlari (bolum_id, goruntulenme_gunu desc);

commit;
