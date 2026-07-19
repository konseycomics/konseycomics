-- Resmi, giris yapilamayan topluluk profilleri icin guvenli sema.
-- auth.users tablosuna dokunmaz ve tekrar calistirilabilir.

begin;

create table if not exists public.topluluk_sistem_profilleri (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  kullanici_adi text not null unique,
  gorunen_ad text not null,
  avatar_url text not null default '',
  bio text not null default '',
  ekip_rolu text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.topluluk_konulari
  add column if not exists sistem_profil_id uuid
  references public.topluluk_sistem_profilleri(id) on delete set null;

create index if not exists topluluk_konulari_sistem_profil_idx
  on public.topluluk_konulari (sistem_profil_id)
  where sistem_profil_id is not null;

alter table public.topluluk_sistem_profilleri enable row level security;

drop policy if exists "Sistem profilleri herkese acik" on public.topluluk_sistem_profilleri;
create policy "Sistem profilleri herkese acik"
  on public.topluluk_sistem_profilleri for select
  using (true);

revoke all on public.topluluk_sistem_profilleri from anon, authenticated;
grant select on public.topluluk_sistem_profilleri to anon, authenticated;

insert into public.topluluk_sistem_profilleri
  (id, slug, kullanici_adi, gorunen_ad, bio, ekip_rolu)
values (
  'c3e53992-cbad-41d4-98f4-6c0045b6b33f'::uuid,
  'peter-parker',
  'Peter Parker',
  'Peter Parker',
  'Konsey Forum topluluk yöneticisi. Dost canlısı mahalle moderatörünüz.',
  'Topluluk Yöneticisi'
)
on conflict (id) do update set
  slug = excluded.slug,
  kullanici_adi = excluded.kullanici_adi,
  gorunen_ad = excluded.gorunen_ad,
  bio = excluded.bio,
  ekip_rolu = excluded.ekip_rolu,
  updated_at = now();

commit;
