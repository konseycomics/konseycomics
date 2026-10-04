-- Once proje yedegi alin. MVP ve planli yayin tablolari bulunmalidir.
-- Kazanilmis unvanlar, XP ve seviyeler silinmez.
begin;

alter table public.unvan_tanimlari
  add column if not exists kazanma_tipi text not null default 'legacy',
  add column if not exists gereken_seviye integer;
alter table public.unvan_tanimlari drop constraint if exists unvan_sade_kosul;
alter table public.unvan_tanimlari add constraint unvan_sade_kosul check (
  (kazanma_tipi = 'legacy') or
  (kazanma_tipi = 'level' and gereken_seviye >= 1 and gereken_seviye is not null and seri_id is null) or
  (kazanma_tipi = 'series' and seri_id is not null and gereken_seviye is null)
);

-- Eski kurallar silinmez; artik kazanma kaynagi degildir.
update public.unvan_kurallari set aktif = false where aktif;
-- Her seri icin bir mevcut unvan korunarak yeni tamamlama kuralina tasinir.
with adaylar as (
  select id, row_number() over (partition by seri_id order by siralama, created_at, id) as sira
  from public.unvan_tanimlari where seri_id is not null and aktif and kazanma_tipi = 'legacy'
)
update public.unvan_tanimlari u set kazanma_tipi = 'series', gereken_seviye = null,
  aciklama = 'Yayimlanmis tum bolumleri okuyarak kazanilir.'
from adaylar a where u.id = a.id and a.sira = 1
  and not exists (select 1 from public.unvan_tanimlari t where t.seri_id = u.seri_id and t.kazanma_tipi = 'series');

create unique index if not exists unvan_bir_seri
  on public.unvan_tanimlari(seri_id) where kazanma_tipi = 'series';

insert into public.unvan_tanimlari (kod, isim, kazanma_tipi, gereken_seviye, siralama)
values ('seviye_yeni_okur', 'Yeni Okur', 'level', 1, 1),
  ('seviye_merakli_okur', 'Meraklı Okur', 'level', 5, 5),
  ('seviye_cizgi_roman_tutkunu', 'Çizgi Roman Tutkunu', 'level', 10, 10),
  ('seviye_arsiv_gezgini', 'Arşiv Gezgini', 'level', 20, 20),
  ('seviye_konsey_mudavimi', 'Konsey Müdavimi', 'level', 35, 35),
  ('seviye_konsey_efsanesi', 'Konsey Efsanesi', 'level', 50, 50)
on conflict (kod) do nothing;

-- Tek aktif unvan, eski cift secimler de veri kaybi olmadan duzeltilir.
with secimler as (
  select id, row_number() over (partition by kullanici_id order by acildi_at desc, id) as sira
  from public.kullanici_unvanlari where one_cikarildi
)
update public.kullanici_unvanlari u set one_cikarildi = false
from secimler s where u.id = s.id and s.sira > 1;
create unique index if not exists kullanici_tek_aktif_unvan
  on public.kullanici_unvanlari(kullanici_id) where one_cikarildi;

create or replace function public.unvan_v2_kazan(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare sonuc jsonb; secim uuid;
begin
  perform 1 from public.profiller where id = p_user and not coalesce(askiya_alindi, false) for update;
  if not found then return '[]'::jsonb; end if;
  with yeni as (
    insert into public.kullanici_unvanlari(kullanici_id, unvan_id, acilma_nedeni)
    select p_user, u.id, jsonb_build_object('kaynak', 'unvan_v2', 'tip', u.kazanma_tipi)
    from public.unvan_tanimlari u
    where u.aktif and (
      (u.kazanma_tipi = 'level' and u.gereken_seviye <= (select coalesce(seviye, 1) from public.profiller where id = p_user))
      or (u.kazanma_tipi = 'series'
        and exists (select 1 from public.seriler s where s.id = u.seri_id and (s.yayin_durumu = 'yayinda' or (s.yayin_durumu = 'planlandi' and s.yayin_tarihi <= now())))
        and exists (select 1 from public.bolumler b where b.seri_id = u.seri_id and (b.yayin_durumu = 'yayinda' or (b.yayin_durumu = 'planlandi' and b.yayin_tarihi <= now())))
        and not exists (
          select 1 from public.bolumler b where b.seri_id = u.seri_id
          and (b.yayin_durumu = 'yayinda' or (b.yayin_durumu = 'planlandi' and b.yayin_tarihi <= now()))
          and not exists (select 1 from public.kullanici_bolum_okumalari o
            where o.kullanici_id = p_user and o.bolum_id = b.id and o.seri_id = b.seri_id
            and o.completion_ratio >= 0.7 and o.okuma_suresi_sec >= 15)
        ))
    ) on conflict (kullanici_id, unvan_id) do nothing returning unvan_id
  )
  select coalesce(jsonb_agg(jsonb_build_object('unvanId', u.id, 'kod', u.kod, 'isim', u.isim, 'aciklama', u.aciklama)
    order by u.gereken_seviye nulls first, u.siralama, u.id), '[]'::jsonb)
  into sonuc from yeni n join public.unvan_tanimlari u on u.id = n.unvan_id;
  if jsonb_array_length(sonuc) > 0 then
    secim := (sonuc -> (jsonb_array_length(sonuc) - 1) ->> 'unvanId')::uuid;
    update public.kullanici_unvanlari set one_cikarildi = false where kullanici_id = p_user and one_cikarildi;
    update public.kullanici_unvanlari set one_cikarildi = true where kullanici_id = p_user and unvan_id = secim;
  end if;
  return sonuc;
end; $$;
revoke all on function public.unvan_v2_kazan(uuid) from public, anon, authenticated;
grant execute on function public.unvan_v2_kazan(uuid) to service_role;

create or replace function public.unvan_v2_senkron()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  return public.unvan_v2_kazan(auth.uid());
end; $$;
revoke all on function public.unvan_v2_senkron() from public, anon;
grant execute on function public.unvan_v2_senkron() to authenticated;

create or replace function public.unvan_v2_sec(p_unvan uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform 1 from public.profiller where id = auth.uid() and not coalesce(askiya_alindi, false) for update;
  if not found then raise exception 'Oturum gerekli'; end if;
  if p_unvan is not null and not exists (select 1 from public.kullanici_unvanlari where kullanici_id = auth.uid() and unvan_id = p_unvan) then
    raise exception 'Bu unvan kazanilmamis';
  end if;
  update public.kullanici_unvanlari set one_cikarildi = false where kullanici_id = auth.uid() and one_cikarildi;
  update public.kullanici_unvanlari set one_cikarildi = true where kullanici_id = auth.uid() and unvan_id = p_unvan;
end; $$;
revoke all on function public.unvan_v2_sec(uuid) from public, anon;
grant execute on function public.unvan_v2_sec(uuid) to authenticated;

create or replace function public.unvan_v2_okuma(p_bolum uuid, p_oran numeric, p_sure integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare seri uuid; toplam integer; okunan integer;
begin
  perform 1 from public.profiller where id = auth.uid() and not coalesce(askiya_alindi, false) for update;
  if not found then raise exception 'Oturum gerekli'; end if;
  if p_oran is null or p_oran < 0.7 or p_oran > 1 or p_sure is null or p_sure < 15 or p_sure > 86400 then
    raise exception 'Gecersiz okuma';
  end if;
  select b.seri_id into seri from public.bolumler b join public.seriler s on s.id = b.seri_id
  where b.id = p_bolum
    and (b.yayin_durumu = 'yayinda' or (b.yayin_durumu = 'planlandi' and b.yayin_tarihi <= now()))
    and (s.yayin_durumu = 'yayinda' or (s.yayin_durumu = 'planlandi' and s.yayin_tarihi <= now()));
  if seri is null then raise exception 'Bolum yayinda degil'; end if;
  insert into public.kullanici_bolum_okumalari(kullanici_id, bolum_id, seri_id, completion_ratio, okuma_suresi_sec)
  values(auth.uid(), p_bolum, seri, p_oran, p_sure)
  on conflict (kullanici_id, bolum_id) do update set
    completion_ratio = greatest(kullanici_bolum_okumalari.completion_ratio, excluded.completion_ratio),
    okuma_suresi_sec = greatest(kullanici_bolum_okumalari.okuma_suresi_sec, excluded.okuma_suresi_sec);
  select count(*), count(o.id) into toplam, okunan
  from public.bolumler b left join public.kullanici_bolum_okumalari o on o.bolum_id = b.id
    and o.kullanici_id = auth.uid() and o.seri_id = b.seri_id and o.completion_ratio >= 0.7 and o.okuma_suresi_sec >= 15
  where b.seri_id = seri and (b.yayin_durumu = 'yayinda' or (b.yayin_durumu = 'planlandi' and b.yayin_tarihi <= now()));
  insert into public.kullanici_seri_ilerleme(kullanici_id, seri_id, okunan_bolum_sayisi, toplam_bolum_sayisi,
    ilerleme_yuzdesi, tamamlandi, ilk_okuma_at, son_okuma_at)
  values(auth.uid(), seri, okunan, toplam, case when toplam > 0 then 100.0 * okunan / toplam else 0 end,
    toplam > 0 and okunan = toplam, now(), now())
  on conflict(kullanici_id, seri_id) do update set okunan_bolum_sayisi = excluded.okunan_bolum_sayisi,
    toplam_bolum_sayisi = excluded.toplam_bolum_sayisi, ilerleme_yuzdesi = excluded.ilerleme_yuzdesi,
    tamamlandi = excluded.tamamlandi, son_okuma_at = excluded.son_okuma_at;
  return public.unvan_v2_kazan(auth.uid());
end; $$;
revoke all on function public.unvan_v2_okuma(uuid, numeric, integer) from public, anon;
grant execute on function public.unvan_v2_okuma(uuid, numeric, integer) to authenticated;
revoke insert, update, delete on public.kullanici_bolum_okumalari, public.kullanici_seri_ilerleme from public, anon, authenticated;

-- Tarayici kazanilmis unvan uyduramaz veya baska unvani satin almis gibi degistiremez.
revoke insert, update, delete on public.kullanici_unvanlari from public, anon, authenticated;

create or replace function public.unvan_v2_seviye_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.seviye is distinct from old.seviye then
    perform public.unvan_v2_kazan(new.id);
  end if;
  return new;
end; $$;
revoke all on function public.unvan_v2_seviye_trigger() from public, anon, authenticated;
drop trigger if exists unvan_v2_seviye on public.profiller;
create trigger unvan_v2_seviye after insert or update of seviye on public.profiller
for each row execute function public.unvan_v2_seviye_trigger();

commit;

-- XP ayarindan once canli tetikleyicileri kontrol etmek icin:
select c.relname as tablo, t.tgname as tetikleyici, pg_get_functiondef(t.tgfoid) as fonksiyon
from pg_trigger t join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and not t.tgisinternal
  and c.relname in ('profiller', 'yorumlar', 'seri_puanlari', 'kullanici_bolum_okumalari', 'topluluk_konulari', 'topluluk_yorumlari');
