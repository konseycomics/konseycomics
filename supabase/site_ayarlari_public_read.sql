-- Public-safe read access for selected site settings used by the storefront.
-- Run this in Supabase SQL editor after verifying the keys you want public.

alter table if exists public.site_ayarlari enable row level security;

drop policy if exists "public safe site settings read" on public.site_ayarlari;

create policy "public safe site settings read"
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
