-- Canli audit ciktisindaki fonksiyonlar; yalnizca test veritabanina yuklenir.
CREATE OR REPLACE FUNCTION public.xp_ekle(kullanici uuid, miktar integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  yeni_xp integer;
  yeni_seviye integer;
  eski_seviye integer;
BEGIN
  SELECT xp, seviye INTO yeni_xp, eski_seviye FROM public.profiller WHERE id = kullanici;
  yeni_xp := COALESCE(yeni_xp, 0) + miktar;
  yeni_seviye := LEAST(100, GREATEST(1, FLOOR(yeni_xp / 100) + 1));

  UPDATE public.profiller SET xp = yeni_xp, seviye = yeni_seviye WHERE id = kullanici;

  IF yeni_seviye > eski_seviye THEN
    INSERT INTO public.bildirimler (alici_id, tip, baslik, mesaj, link)
    VALUES (kullanici, 'seviye_atlandi', 'Seviye Atladın! 🎉', 'Seviye ' || yeni_seviye || ' oldun!', '/profil');
    INSERT INTO public.aktiviteler (kullanici_id, tip, meta)
    VALUES (kullanici, 'seviye_atladi', jsonb_build_object('seviye', yeni_seviye));
  END IF;
END;
$function$;


CREATE OR REPLACE FUNCTION public.yorum_xp_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.xp_ekle(NEW.kullanici_id, 5);
  INSERT INTO public.aktiviteler (kullanici_id, tip, seri_id, bolum_id, meta)
  VALUES (NEW.kullanici_id, 'yorum_yapti', NEW.seri_id, NEW.bolum_id, '{}');
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.okuma_xp_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s_id uuid;
BEGIN
  SELECT seri_id INTO s_id FROM public.bolumler WHERE id = NEW.bolum_id;
  PERFORM public.xp_ekle(NEW.kullanici_id, 10);
  INSERT INTO public.aktiviteler (kullanici_id, tip, seri_id, bolum_id)
  VALUES (NEW.kullanici_id, 'okumaya_basladi', s_id, NEW.bolum_id);
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.takip_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiller SET takipci_sayisi = takipci_sayisi + 1 WHERE id = NEW.takip_edilen;
    UPDATE public.profiller SET takip_sayisi = takip_sayisi + 1 WHERE id = NEW.takip_eden;
    INSERT INTO public.bildirimler (alici_id, gonderen_id, tip, baslik, link)
    SELECT NEW.takip_edilen, NEW.takip_eden, 'yeni_takipci',
      p.kullanici_adi || ' seni takip etmeye başladı!',
      '/profil/' || p.kullanici_adi
    FROM public.profiller p WHERE p.id = NEW.takip_eden;
    PERFORM public.xp_ekle(NEW.takip_eden, 2);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiller SET takipci_sayisi = GREATEST(0, takipci_sayisi - 1) WHERE id = OLD.takip_edilen;
    UPDATE public.profiller SET takip_sayisi = GREATEST(0, takip_sayisi - 1) WHERE id = OLD.takip_eden;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;


CREATE OR REPLACE FUNCTION public.yorum_begeni_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  yorum_sahibi uuid;
  yorum_icerik text;
BEGIN
  SELECT kullanici_id, LEFT(icerik, 50) INTO yorum_sahibi, yorum_icerik FROM public.yorumlar WHERE id = NEW.yorum_id;
  UPDATE public.yorumlar SET begeni_sayisi = begeni_sayisi + 1 WHERE id = NEW.yorum_id;
  IF yorum_sahibi != NEW.kullanici_id THEN
    INSERT INTO public.bildirimler (alici_id, gonderen_id, tip, baslik, mesaj)
    SELECT yorum_sahibi, NEW.kullanici_id, 'yorum_begeni',
      p.kullanici_adi || ' yorumunu beğendi',
      '"' || yorum_icerik || '..."'
    FROM public.profiller p WHERE p.id = NEW.kullanici_id;
    PERFORM public.xp_ekle(yorum_sahibi, 1);
  END IF;
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.seri_puan_guncelle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s_id uuid;
BEGIN
  s_id := COALESCE(NEW.seri_id, OLD.seri_id);
  UPDATE public.seriler SET
    ortalama_puan = (SELECT ROUND(AVG(puan)::numeric, 1) FROM public.seri_puanlari WHERE seri_id = s_id),
    puan_sayisi = (SELECT COUNT(*) FROM public.seri_puanlari WHERE seri_id = s_id)
  WHERE id = s_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.xp_ekle(NEW.kullanici_id, 3);
    INSERT INTO public.aktiviteler (kullanici_id, tip, seri_id, meta)
    VALUES (NEW.kullanici_id, 'puan_verdi', NEW.seri_id, jsonb_build_object('puan', NEW.puan));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;


CREATE OR REPLACE FUNCTION public.seviye_rozet_kontrol(kullanici uuid, seviye integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF seviye >= 10 THEN
    INSERT INTO public.kullanici_rozetleri (kullanici_id, rozet_id)
    SELECT kullanici, id FROM public.rozet_tanimlari WHERE kod = 'level_10'
    ON CONFLICT DO NOTHING;
  END IF;
  IF seviye >= 25 THEN
    INSERT INTO public.kullanici_rozetleri (kullanici_id, rozet_id)
    SELECT kullanici, id FROM public.rozet_tanimlari WHERE kod = 'level_25'
    ON CONFLICT DO NOTHING;
  END IF;
  IF seviye >= 50 THEN
    INSERT INTO public.kullanici_rozetleri (kullanici_id, rozet_id)
    SELECT kullanici, id FROM public.rozet_tanimlari WHERE kod = 'level_50'
    ON CONFLICT DO NOTHING;
  END IF;
END;
$function$;
