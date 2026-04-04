-- KonseyComics ziyaretci takibini sekme bazindan tekil ziyaretci bazina yaklastirir.
-- SQL Editor'de bir kez calistir.

begin;

alter table if exists public.ziyaretler
  add column if not exists ziyaretci_id text;

create index if not exists idx_ziyaretler_created_at on public.ziyaretler (created_at desc);
create index if not exists idx_ziyaretler_ziyaretci_id on public.ziyaretler (ziyaretci_id);
create index if not exists idx_ziyaretler_kullanici_id on public.ziyaretler (kullanici_id);

commit;
