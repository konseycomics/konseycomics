-- Gecis oncesi korumali teknik yedek. Public API'ye acilmaz.
begin;
create schema if not exists konsey_gecis_yedek;
revoke all on schema konsey_gecis_yedek from public, anon, authenticated;
create table if not exists konsey_gecis_yedek.unvan_xp (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  veri jsonb not null
);
alter table konsey_gecis_yedek.unvan_xp enable row level security;
revoke all on konsey_gecis_yedek.unvan_xp from public, anon, authenticated;
insert into konsey_gecis_yedek.unvan_xp(veri)
select jsonb_build_object(
  'unvan_tanimlari', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.unvan_tanimlari t),
  'unvan_kurallari', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.unvan_kurallari t),
  'kullanici_unvanlari', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.kullanici_unvanlari t),
  'profil_xp', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'xp', xp, 'seviye', seviye)), '[]'::jsonb) from public.profiller),
  'fonksiyonlar', (select coalesce(jsonb_agg(jsonb_build_object('ad', p.proname, 'tanim', pg_get_functiondef(p.oid), 'acl', p.proacl)), '[]'::jsonb)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and (p.proname ~* 'xp|seviye|unvan' or p.oid in (select tgfoid from pg_trigger where not tgisinternal))),
  'profil_tablo_izinleri', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from information_schema.role_table_grants t where table_schema = 'public' and table_name = 'profiller'),
  'profil_kolon_izinleri', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from information_schema.column_privileges t where table_schema = 'public' and table_name = 'profiller')
);
commit;
select id, created_at, jsonb_array_length(veri->'kullanici_unvanlari') as kazanilmis_unvan,
  jsonb_array_length(veri->'profil_xp') as profil_sayisi
from konsey_gecis_yedek.unvan_xp order by created_at desc limit 1;
