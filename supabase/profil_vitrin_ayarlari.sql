begin;

alter table public.profiller
  add column if not exists one_cikan_seri_ids uuid[] not null default '{}'::uuid[],
  add column if not exists profil_vitrin_ayarlari jsonb not null default '{}'::jsonb;

update public.profiller
set
  one_cikan_seri_ids = coalesce(one_cikan_seri_ids, '{}'::uuid[]),
  profil_vitrin_ayarlari = coalesce(profil_vitrin_ayarlari, '{}'::jsonb)
where one_cikan_seri_ids is null
   or profil_vitrin_ayarlari is null;

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
  created_at,
  banner_url,
  favori_turler,
  one_cikan_seri_ids,
  profil_vitrin_ayarlari
from public.profiller
where askiya_alindi = false;

grant select on public.public_profiller to anon, authenticated;

commit;
