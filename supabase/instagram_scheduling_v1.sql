-- Instagram planlama kuyrugu. Yalnizca Konsey yoneticileri gorebilir ve yonetebilir.

begin;

create table if not exists public.instagram_gonderileri (
  id uuid primary key default gen_random_uuid(),
  bolum_id uuid references public.bolumler(id) on delete set null,
  aciklama text not null default '',
  gorseller jsonb not null default '[]'::jsonb,
  yayin_tarihi timestamptz not null,
  durum text not null default 'planlandi',
  instagram_media_id text,
  instagram_permalink text,
  hata_mesaji text,
  deneme_sayisi integer not null default 0,
  son_deneme_at timestamptz,
  yayinlandi_at timestamptz,
  olusturan_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint instagram_gonderileri_durum_check
    check (durum in ('taslak', 'planlandi', 'isleniyor', 'yayinlandi', 'hata')),
  constraint instagram_gonderileri_gorseller_check
    check (jsonb_typeof(gorseller) = 'array' and jsonb_array_length(gorseller) between 1 and 10)
);

create index if not exists idx_instagram_gonderileri_kuyruk
  on public.instagram_gonderileri (durum, yayin_tarihi);

alter table public.instagram_gonderileri enable row level security;

drop policy if exists "instagram posts admin read" on public.instagram_gonderileri;
create policy "instagram posts admin read"
on public.instagram_gonderileri for select to authenticated
using (public.is_admin_user());

drop policy if exists "instagram posts admin insert" on public.instagram_gonderileri;
create policy "instagram posts admin insert"
on public.instagram_gonderileri for insert to authenticated
with check (public.is_admin_user());

drop policy if exists "instagram posts admin update" on public.instagram_gonderileri;
create policy "instagram posts admin update"
on public.instagram_gonderileri for update to authenticated
using (public.is_admin_user()) with check (public.is_admin_user());

drop policy if exists "instagram posts admin delete" on public.instagram_gonderileri;
create policy "instagram posts admin delete"
on public.instagram_gonderileri for delete to authenticated
using (public.is_admin_user());

commit;
