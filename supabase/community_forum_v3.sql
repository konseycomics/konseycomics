-- Konsey Forum V3
-- Tekil goruntulenme, rapor tekilligi ve moderasyon kaydi.

begin;

create table if not exists public.topluluk_konu_goruntulemeleri (
  id uuid primary key default gen_random_uuid(),
  konu_id uuid not null references public.topluluk_konulari(id) on delete cascade,
  ziyaretci_hash text not null,
  goruntulendi_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (konu_id, ziyaretci_hash, goruntulendi_on)
);

create index if not exists idx_topluluk_goruntuleme_tarih
on public.topluluk_konu_goruntulemeleri (goruntulendi_on desc, konu_id);

create or replace function public.register_topluluk_view(target_konu uuid, visitor_hash text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
  current_count integer;
begin
  if target_konu is null or length(trim(visitor_hash)) < 16 then
    raise exception 'invalid view identity';
  end if;

  insert into public.topluluk_konu_goruntulemeleri (konu_id, ziyaretci_hash)
  select target_konu, visitor_hash
  where exists (select 1 from public.topluluk_konulari where id = target_konu and aktif = true)
  on conflict (konu_id, ziyaretci_hash, goruntulendi_on) do nothing;

  get diagnostics inserted_count = row_count;

  if inserted_count = 1 then
    update public.topluluk_konulari
    set goruntulenme_sayisi = goruntulenme_sayisi + 1
    where id = target_konu
    returning goruntulenme_sayisi into current_count;
  else
    select goruntulenme_sayisi into current_count
    from public.topluluk_konulari
    where id = target_konu;
  end if;

  return coalesce(current_count, 0);
end;
$$;

revoke all on function public.register_topluluk_view(uuid, text) from public;
revoke execute on function public.register_topluluk_view(uuid, text) from anon, authenticated;

alter table public.topluluk_sikayetleri
  add column if not exists inceleyen_id uuid references public.profiller(id) on delete set null,
  add column if not exists cozuldu_at timestamptz;

create unique index if not exists idx_topluluk_acik_sikayet_tekil
on public.topluluk_sikayetleri (
  bildiren_id,
  coalesce(konu_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(yanit_id, '00000000-0000-0000-0000-000000000000'::uuid)
)
where durum in ('acik', 'inceleniyor');

create table if not exists public.topluluk_moderasyon_loglari (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references public.profiller(id) on delete restrict,
  eylem text not null,
  konu_id uuid references public.topluluk_konulari(id) on delete set null,
  yanit_id uuid references public.topluluk_yanitlari(id) on delete set null,
  sikayet_id uuid references public.topluluk_sikayetleri(id) on delete set null,
  detay jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_topluluk_moderasyon_log_tarih
on public.topluluk_moderasyon_loglari (created_at desc);

alter table public.topluluk_konu_goruntulemeleri enable row level security;
alter table public.topluluk_moderasyon_loglari enable row level security;

drop policy if exists "topluluk moderasyon log admin okur" on public.topluluk_moderasyon_loglari;
create policy "topluluk moderasyon log admin okur"
on public.topluluk_moderasyon_loglari for select to authenticated
using (public.is_admin_user());

commit;
