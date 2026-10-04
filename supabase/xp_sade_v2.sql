-- unvan_sade_v2.sql SONRASINDA, ayni bakim penceresinde calistirin.
-- Mevcut XP, seviye, rozet ve unvan kazanimi sifirlanmaz.
begin;

create table if not exists public.xp_kazanimlari (
  id bigint generated always as identity primary key,
  kullanici_id uuid not null references public.profiller(id) on delete cascade,
  olay text not null,
  kaynak text not null,
  gun date not null default (now() at time zone 'Europe/Istanbul')::date,
  miktar integer not null check (miktar >= 0),
  created_at timestamptz not null default now(),
  unique(kullanici_id, olay, kaynak)
);
create index if not exists xp_gunluk on public.xp_kazanimlari(kullanici_id, gun);
alter table public.xp_kazanimlari enable row level security;
revoke all on public.xp_kazanimlari from public, anon, authenticated;
grant select on public.xp_kazanimlari to authenticated;
drop policy if exists xp_kendi_kazanimlari on public.xp_kazanimlari;
create policy xp_kendi_kazanimlari on public.xp_kazanimlari for select to authenticated using (auth.uid() = kullanici_id);

-- Gecmis islemlerin silinip yeniden eklenmesi ikinci kez XP kazandirmasin.
-- 0 miktarli kayitlar gecmis XP'yi degistirmez ve bugunun limitini tuketmez.
insert into public.xp_kazanimlari(kullanici_id, olay, kaynak, miktar)
select kullanici_id, 'puan', seri_id::text, 0 from public.seri_puanlari
on conflict(kullanici_id, olay, kaynak) do nothing;
insert into public.xp_kazanimlari(kullanici_id, olay, kaynak, miktar)
select kullanici_id, 'yorum', md5(lower(regexp_replace(trim(icerik), '\s+', ' ', 'g'))), 0 from public.yorumlar
where length(trim(icerik)) >= 20
on conflict(kullanici_id, olay, kaynak) do nothing;
insert into public.xp_kazanimlari(kullanici_id, olay, kaynak, miktar)
select kullanici_id, 'okuma', bolum_id::text, 0 from public.okuma_gecmisi
on conflict(kullanici_id, olay, kaynak) do nothing;

create or replace function public.xp_v2_kazan(p_user uuid, p_olay text, p_kaynak text)
returns integer language plpgsql security definer set search_path = public as $$
declare miktar integer; sinir integer; kullanilan integer; toplam integer; mevcut integer; onceki integer; yeni integer; kayit bigint;
begin
  select xp, seviye into mevcut, onceki from public.profiller
  where id = p_user and not coalesce(askiya_alindi, false) for update;
  if not found then return 0; end if;
  case p_olay
    when 'okuma' then miktar := 10; sinir := 100;
    when 'yorum' then miktar := 5; sinir := 15;
    when 'puan' then miktar := 3; sinir := 15;
    when 'forum_konu' then miktar := 5; sinir := 10;
    when 'forum_yanit' then miktar := 3; sinir := 15;
    else raise exception 'Gecersiz XP olayi';
  end case;
  if p_kaynak is null or p_kaynak = '' then raise exception 'XP kaynagi gerekli'; end if;
  select coalesce(sum(k.miktar), 0), coalesce(sum(k.miktar) filter (where k.olay = p_olay), 0)
    into toplam, kullanilan from public.xp_kazanimlari k
    where k.kullanici_id = p_user and k.gun = (now() at time zone 'Europe/Istanbul')::date;
  if toplam + miktar > 120 or kullanilan + miktar > sinir then miktar := 0; end if;
  insert into public.xp_kazanimlari(kullanici_id, olay, kaynak, miktar)
  values(p_user, p_olay, p_kaynak, miktar)
  on conflict(kullanici_id, olay, kaynak) do nothing returning id into kayit;
  if kayit is null or miktar = 0 then return 0; end if;
  mevcut := greatest(0, coalesce(mevcut, 0)) + miktar;
  yeni := greatest(coalesce(onceki, 1), least(100, greatest(1, floor(mevcut / 100.0)::integer + 1)));
  update public.profiller set xp = mevcut, seviye = yeni where id = p_user;
  if yeni > coalesce(onceki, 1) then
    insert into public.bildirimler(alici_id, tip, baslik, mesaj, link)
    values(p_user, 'seviye_atlandi', 'Seviye Atladin!', 'Seviye ' || yeni || ' oldun!', '/profil/duzenle');
    insert into public.aktiviteler(kullanici_id, tip, meta)
    values(p_user, 'seviye_atladi', jsonb_build_object('seviye', yeni));
    perform public.seviye_rozet_kontrol(p_user, yeni);
  end if;
  return miktar;
end; $$;
revoke all on function public.xp_v2_kazan(uuid, text, text) from public, anon, authenticated, service_role;

-- Eski RPC ve dolayli cagrilar artik miktar belirleyemez.
create or replace function public.xp_ekle(kullanici uuid, miktar integer)
returns void language plpgsql security definer set search_path = public as $$
begin return; end; $$;
revoke all on function public.xp_ekle(uuid, integer) from public, anon, authenticated, service_role;
revoke all on function public.seviye_rozet_kontrol(uuid, integer) from public, anon, authenticated, service_role;

-- Mevcut tetikleyicilerin istatistik/bildirim/aktivite davranisi korunur.
-- Yalnizca gozlemlenen eski XP cagrilari degistirilir; beklenmeyen semada islem durur.
do $$
declare r record; tanim text;
begin
  for r in select * from (values
    ('yorum_xp_trigger', 'PERFORM public.xp_ekle(NEW.kullanici_id, 5);',
      'IF length(trim(NEW.icerik)) >= 20 AND NOT coalesce(NEW.silindi, false) THEN PERFORM public.xp_v2_kazan(NEW.kullanici_id, ''yorum'', md5(lower(regexp_replace(trim(NEW.icerik), ''\s+'', '' '', ''g'')))); END IF;'),
    ('okuma_xp_trigger', 'PERFORM public.xp_ekle(NEW.kullanici_id, 10);', 'NULL;'),
    ('takip_trigger', 'PERFORM public.xp_ekle(NEW.takip_eden, 2);', 'NULL;'),
    ('yorum_begeni_trigger', 'PERFORM public.xp_ekle(yorum_sahibi, 1);', 'NULL;'),
    ('seri_puan_guncelle', 'PERFORM public.xp_ekle(NEW.kullanici_id, 3);',
      'PERFORM public.xp_v2_kazan(NEW.kullanici_id, ''puan'', NEW.seri_id::text);')
  ) as degisim(ad, eski, yeni)
  loop
    select pg_get_functiondef(p.oid) into tanim from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = r.ad and p.pronargs = 0;
    if tanim is null then raise exception 'Eksik tetikleyici: %', r.ad; end if;
    -- Migration yeniden calistirilabilir.
    if position(r.eski in tanim) > 0 then
      execute replace(tanim, r.eski, r.yeni);
    elsif position(r.yeni in tanim) = 0 then
      raise exception 'Beklenmeyen tetikleyici tanimi: %', r.ad;
    end if;
  end loop;
end; $$;

create or replace function public.xp_v2_okuma_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.completion_ratio >= 0.7 and new.okuma_suresi_sec >= 15 then
    perform public.xp_v2_kazan(new.kullanici_id, 'okuma', new.bolum_id::text);
  end if;
  return new;
end; $$;
revoke all on function public.xp_v2_okuma_trigger() from public, anon, authenticated;
drop trigger if exists xp_v2_okuma on public.kullanici_bolum_okumalari;
create trigger xp_v2_okuma after insert or update on public.kullanici_bolum_okumalari
for each row execute function public.xp_v2_okuma_trigger();

create or replace function public.xp_v2_forum_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.aktif and length(trim(new.icerik)) >= 20 then
    perform public.xp_v2_kazan(new.kullanici_id,
      case when tg_table_name = 'topluluk_konulari' then 'forum_konu' else 'forum_yanit' end,
      md5(lower(regexp_replace(trim(new.icerik), '\s+', ' ', 'g'))));
  end if;
  return new;
end; $$;
revoke all on function public.xp_v2_forum_trigger() from public, anon, authenticated;
drop trigger if exists xp_v2_forum_konu on public.topluluk_konulari;
create trigger xp_v2_forum_konu after insert on public.topluluk_konulari
for each row execute function public.xp_v2_forum_trigger();
drop trigger if exists xp_v2_forum_yanit on public.topluluk_yanitlari;
create trigger xp_v2_forum_yanit after insert on public.topluluk_yanitlari
for each row execute function public.xp_v2_forum_trigger();

-- Tablo seviyesindeki UPDATE yetkisi varken kolon REVOKE tek basina yeterli degildir.
revoke insert, update on public.profiller from public, anon, authenticated;
revoke insert(xp, seviye), update(xp, seviye) on public.profiller from public, anon, authenticated;
revoke insert(rol) on public.profiller from public, anon, authenticated;
do $$
declare kolonlar text;
begin
  select string_agg(quote_ident(column_name), ', ') into kolonlar
  from information_schema.columns where table_schema = 'public' and table_name = 'profiller'
    and column_name not in ('xp', 'seviye', 'rol');
  execute 'grant insert (' || kolonlar || ') on public.profiller to authenticated';
  select string_agg(quote_ident(column_name), ', ') into kolonlar
  from information_schema.columns where table_schema = 'public' and table_name = 'profiller'
    and column_name not in ('xp', 'seviye');
  execute 'grant update (' || kolonlar || ') on public.profiller to authenticated';
end; $$;

commit;
