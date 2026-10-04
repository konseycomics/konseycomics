-- Run together with the matching application deployment, not independently.
BEGIN;

CREATE SCHEMA IF NOT EXISTS konsey_gecis_yedek;
REVOKE ALL ON SCHEMA konsey_gecis_yedek FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS konsey_gecis_yedek.roller_v1 AS
SELECT id, rol::text AS eski_rol, askiya_alindi, now() AS yedek_zamani
FROM public.profiller;
REVOKE ALL ON konsey_gecis_yedek.roller_v1 FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS konsey_gecis_yedek.roller_v1_fonksiyonlar AS
SELECT p.oid::regprocedure::text AS fonksiyon, pg_get_functiondef(p.oid) AS tanim
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('is_admin_user', 'is_admin', 'profil_rol_koruma');
CREATE TABLE IF NOT EXISTS konsey_gecis_yedek.roller_v1_politikalar AS
SELECT * FROM pg_policies WHERE schemaname = 'public';
REVOKE ALL ON konsey_gecis_yedek.roller_v1_fonksiyonlar, konsey_gecis_yedek.roller_v1_politikalar FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.kullanici_rol'::regtype AND enumlabel = 'editor') THEN
    ALTER TYPE public.kullanici_rol RENAME VALUE 'editor' TO 'balonlamaci';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.kullanici_rol'::regtype AND enumlabel = 'kurucu') THEN
    ALTER TYPE public.kullanici_rol RENAME VALUE 'yonetici' TO 'kurucu';
  END IF;
END $$;
ALTER TYPE public.kullanici_rol ADD VALUE IF NOT EXISTS 'yonetici';

-- Old unused enum labels remain for dependency compatibility, but cannot be assigned.
ALTER TABLE public.profiller DROP CONSTRAINT IF EXISTS profiller_roller_v1;
ALTER TABLE public.profiller ADD CONSTRAINT profiller_roller_v1 CHECK
  (rol::text IN ('kurucu', 'yonetici', 'cevirmeni', 'balonlamaci', 'cizer', 'okuyucu'));

CREATE OR REPLACE FUNCTION public.is_admin_user(target_user uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiller WHERE id = target_user
    AND rol::text = 'kurucu' AND NOT coalesce(askiya_alindi, false));
$$;
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN public.is_admin_user(auth.uid()); END;
$$;
CREATE OR REPLACE FUNCTION public.is_content_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiller WHERE id = auth.uid()
    AND rol::text IN ('kurucu', 'yonetici') AND NOT coalesce(askiya_alindi, false));
$$;
REVOKE ALL ON FUNCTION public.is_content_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_content_manager() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.profil_rol_koruma()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.rol IS DISTINCT FROM OLD.rol
     OR NEW.askiya_alindi IS DISTINCT FROM OLD.askiya_alindi THEN
    IF NOT public.is_admin_user(auth.uid()) THEN
      RAISE EXCEPTION 'Rol ve hesap durumu degistirme yetkisi yok.';
    END IF;
    IF OLD.rol::text = 'kurucu' AND NOT coalesce(OLD.askiya_alindi, false)
       AND (NEW.rol::text <> 'kurucu' OR coalesce(NEW.askiya_alindi, false)) THEN
      PERFORM pg_advisory_xact_lock(9040417);
      IF NOT EXISTS (SELECT 1 FROM public.profiller WHERE id <> OLD.id
        AND rol::text = 'kurucu' AND NOT coalesce(askiya_alindi, false)) THEN
        RAISE EXCEPTION 'Son aktif Kurucu kaldirilamaz.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
-- Existing trigger is retained; this additional guard also protects account status.
DROP TRIGGER IF EXISTS profiller_roller_v1_koruma ON public.profiller;
CREATE TRIGGER profiller_roller_v1_koruma BEFORE UPDATE ON public.profiller
FOR EACH ROW EXECUTE FUNCTION public.profil_rol_koruma();

DO $$
DECLARE tablo text;
BEGIN
  FOREACH tablo IN ARRAY ARRAY['seriler', 'bolumler', 'bolum_sayfalari', 'yazarlar',
    'cizerler', 'kategoriler', 'turler', 'seri_yazarlar', 'seri_cizerler', 'seri_ekip',
    'unvan_tanimlari', 'konsey_planet_yazilari'] LOOP
    IF to_regclass('public.' || tablo) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS roller_v1_icerik ON public.%I', tablo);
      EXECUTE format('CREATE POLICY roller_v1_icerik ON public.%I FOR ALL TO authenticated USING (public.is_content_manager()) WITH CHECK (public.is_content_manager())', tablo);
    END IF;
  END LOOP;
  IF to_regclass('public.yorumlar') IS NOT NULL THEN
    DROP POLICY IF EXISTS roller_v1_yorum_update ON public.yorumlar;
    DROP POLICY IF EXISTS roller_v1_yorum_delete ON public.yorumlar;
    CREATE POLICY roller_v1_yorum_update ON public.yorumlar FOR UPDATE TO authenticated
      USING (public.is_content_manager()) WITH CHECK (public.is_content_manager());
    CREATE POLICY roller_v1_yorum_delete ON public.yorumlar FOR DELETE TO authenticated
      USING (public.is_content_manager());
  END IF;
END $$;

DROP POLICY IF EXISTS roller_v1_yayin_ayar_insert ON public.site_ayarlari;
DROP POLICY IF EXISTS roller_v1_yayin_ayar_update ON public.site_ayarlari;
CREATE POLICY roller_v1_yayin_ayar_insert ON public.site_ayarlari FOR INSERT TO authenticated
WITH CHECK (public.is_content_manager() AND anahtar IN ('anasayfa_hero_slider', 'seri_detay_vitrin', 'bolum_okuma_sayfalari'));
CREATE POLICY roller_v1_yayin_ayar_update ON public.site_ayarlari FOR UPDATE TO authenticated
USING (public.is_content_manager() AND anahtar IN ('anasayfa_hero_slider', 'seri_detay_vitrin', 'bolum_okuma_sayfalari'))
WITH CHECK (public.is_content_manager() AND anahtar IN ('anasayfa_hero_slider', 'seri_detay_vitrin', 'bolum_okuma_sayfalari'));

COMMIT;

SELECT rol::text AS rol, count(*) AS hesap_sayisi FROM public.profiller GROUP BY rol ORDER BY rol;
