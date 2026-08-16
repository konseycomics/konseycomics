-- KonseyComics planli yayin ve guvenli bolum sayfalari altyapisi.
-- Mevcut icerikleri yayinda tutar; gelecekteki seri/bolumleri yayin saatine kadar gizler.

begin;

alter table public.seriler
  add column if not exists yayin_durumu text not null default 'yayinda',
  add column if not exists yayin_tarihi timestamptz;

alter table public.bolumler
  add column if not exists yayin_durumu text not null default 'yayinda',
  add column if not exists yayin_tarihi timestamptz,
  add column if not exists bildirim_gonderildi_at timestamptz;

alter table public.bildirimler
  add column if not exists gorunur_at timestamptz not null default now();

update public.seriler
set yayin_tarihi = coalesce(yayin_tarihi, created_at, now())
where yayin_durumu = 'yayinda' and yayin_tarihi is null;

update public.bolumler
set yayin_tarihi = coalesce(yayin_tarihi, created_at, now())
where yayin_durumu = 'yayinda' and yayin_tarihi is null;

alter table public.seriler
  drop constraint if exists seriler_yayin_durumu_check;
alter table public.seriler
  add constraint seriler_yayin_durumu_check
  check (yayin_durumu in ('taslak', 'planlandi', 'yayinda'));

alter table public.bolumler
  drop constraint if exists bolumler_yayin_durumu_check;
alter table public.bolumler
  add constraint bolumler_yayin_durumu_check
  check (yayin_durumu in ('taslak', 'planlandi', 'yayinda'));

create index if not exists idx_seriler_yayin
  on public.seriler (yayin_durumu, yayin_tarihi);
create index if not exists idx_bolumler_yayin
  on public.bolumler (yayin_durumu, yayin_tarihi);
create index if not exists idx_bildirimler_gorunur_at
  on public.bildirimler (alici_id, gorunur_at desc);

create table if not exists public.bolum_sayfalari (
  id uuid primary key default gen_random_uuid(),
  bolum_id uuid not null references public.bolumler(id) on delete cascade,
  sira integer not null check (sira > 0),
  gorsel_url text not null,
  created_at timestamptz not null default now(),
  unique (bolum_id, sira)
);

create index if not exists idx_bolum_sayfalari_bolum_sira
  on public.bolum_sayfalari (bolum_id, sira);

alter table public.bolum_sayfalari enable row level security;

-- Eski JSON sayfa haritasini yeni tabloya bir kez aktar.
insert into public.bolum_sayfalari (bolum_id, sira, gorsel_url)
select
  pages.key::uuid,
  page.ordinality::integer,
  page.value #>> '{}'
from public.site_ayarlari settings
cross join lateral jsonb_each(settings.deger) as pages(key, value)
cross join lateral jsonb_array_elements(pages.value) with ordinality as page(value, ordinality)
where settings.anahtar = 'bolum_okuma_sayfalari'
  and jsonb_typeof(pages.value) = 'array'
  and pages.key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and exists (select 1 from public.bolumler b where b.id = pages.key::uuid)
on conflict (bolum_id, sira) do update
set gorsel_url = excluded.gorsel_url;

drop policy if exists "seriler public read" on public.seriler;
drop policy if exists "seriler published read" on public.seriler;
create policy "seriler published read"
on public.seriler
for select
to anon, authenticated
using (
  public.is_admin_user()
  or yayin_durumu = 'yayinda'
  or (yayin_durumu = 'planlandi' and yayin_tarihi <= now())
);

drop policy if exists "bolumler public read" on public.bolumler;
drop policy if exists "bolumler published read" on public.bolumler;
create policy "bolumler published read"
on public.bolumler
for select
to anon, authenticated
using (
  public.is_admin_user()
  or yayin_durumu = 'yayinda'
  or (yayin_durumu = 'planlandi' and yayin_tarihi <= now())
);

drop policy if exists "bolum sayfalari published read" on public.bolum_sayfalari;
create policy "bolum sayfalari published read"
on public.bolum_sayfalari
for select
to anon, authenticated
using (
  public.is_admin_user()
  or exists (
    select 1
    from public.bolumler b
    where b.id = bolum_sayfalari.bolum_id
      and (
        b.yayin_durumu = 'yayinda'
        or (b.yayin_durumu = 'planlandi' and b.yayin_tarihi <= now())
      )
  )
);

drop policy if exists "bolum sayfalari admin insert" on public.bolum_sayfalari;
create policy "bolum sayfalari admin insert"
on public.bolum_sayfalari
for insert
to authenticated
with check (public.is_admin_user());

drop policy if exists "bolum sayfalari admin update" on public.bolum_sayfalari;
create policy "bolum sayfalari admin update"
on public.bolum_sayfalari
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "bolum sayfalari admin delete" on public.bolum_sayfalari;
create policy "bolum sayfalari admin delete"
on public.bolum_sayfalari
for delete
to authenticated
using (public.is_admin_user());

drop policy if exists "bildirimler owner read" on public.bildirimler;
drop policy if exists "bildirimler visible owner read" on public.bildirimler;
create policy "bildirimler visible owner read"
on public.bildirimler
for select
to authenticated
using (
  public.is_admin_user()
  or (auth.uid() = alici_id and gorunur_at <= now())
);

drop policy if exists "bildirimler owner update" on public.bildirimler;
drop policy if exists "bildirimler visible owner update" on public.bildirimler;
create policy "bildirimler visible owner update"
on public.bildirimler
for update
to authenticated
using (
  public.is_admin_user()
  or (auth.uid() = alici_id and gorunur_at <= now())
)
with check (auth.uid() = alici_id or public.is_admin_user());

-- Okuyucu artik sayfalari bolum_sayfalari tablosundan alir.
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
    'seri_detay_vitrin'
  )
  or anahtar like 'sayfa_%'
);

commit;
