begin;

create table if not exists public.konsey_planet_yazilari (
  id uuid primary key default gen_random_uuid(),
  baslik text not null,
  slug text unique,
  ozet text,
  icerik text not null,
  kapak_url text,
  tip text not null default 'manset' check (tip in ('manset', 'duyuru', 'editor', 'secki')),
  one_cikan boolean not null default false,
  yayinlandi boolean not null default true,
  created_by uuid references public.profiller(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.konsey_planet_yazilari
  add column if not exists slug text;

alter table public.konsey_planet_yazilari
  add column if not exists ozet text;

alter table public.konsey_planet_yazilari
  add column if not exists kapak_url text;

alter table public.konsey_planet_yazilari
  add column if not exists tip text not null default 'manset';

alter table public.konsey_planet_yazilari
  add column if not exists one_cikan boolean not null default false;

alter table public.konsey_planet_yazilari
  add column if not exists yayinlandi boolean not null default true;

alter table public.konsey_planet_yazilari
  add column if not exists created_by uuid references public.profiller(id) on delete set null;

alter table public.konsey_planet_yazilari
  add column if not exists created_at timestamptz not null default now();

alter table public.konsey_planet_yazilari
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_konsey_planet_slug
  on public.konsey_planet_yazilari (slug);

create index if not exists idx_konsey_planet_yayin_tarihi
  on public.konsey_planet_yazilari (yayinlandi, one_cikan desc, created_at desc);

create or replace function public.set_konsey_planet_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_konsey_planet_updated_at on public.konsey_planet_yazilari;
create trigger trg_konsey_planet_updated_at
before update on public.konsey_planet_yazilari
for each row
execute function public.set_konsey_planet_updated_at();

alter table public.konsey_planet_yazilari enable row level security;

drop policy if exists "konsey planet public read" on public.konsey_planet_yazilari;
create policy "konsey planet public read"
on public.konsey_planet_yazilari
for select
to anon, authenticated
using (yayinlandi = true or public.is_admin_user());

drop policy if exists "konsey planet admin insert" on public.konsey_planet_yazilari;
create policy "konsey planet admin insert"
on public.konsey_planet_yazilari
for insert
to authenticated
with check (public.is_admin_user());

drop policy if exists "konsey planet admin update" on public.konsey_planet_yazilari;
create policy "konsey planet admin update"
on public.konsey_planet_yazilari
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "konsey planet admin delete" on public.konsey_planet_yazilari;
create policy "konsey planet admin delete"
on public.konsey_planet_yazilari
for delete
to authenticated
using (public.is_admin_user());

commit;
