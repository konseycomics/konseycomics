# Supabase Security Audit

Tarih: 2026-03-22

## Ozet

Canli anon/public yuzey testinde asagidaki tablolarin kimlik dogrulama olmadan okunabildigi goruldu:

- `profiller`
- `okuma_listesi`
- `yorumlar`
- `kullanici_rozetleri`
- `takipler`
- `yorum_begenileri`

Icerik tablolarinin public okunmasi beklenen bir davranis olabilir, ancak kullaniciya ait davranis ve tercih verilerinin public olmasi gizlilik riski olusturur.

## Oncelikli Riskler

1. `okuma_listesi` public `SELECT`
Kullanicilarin ne okudugu ve ne okumak istedigi disariya acik.

2. `profiller` public `SELECT`
Tablo icinde bugun veya gelecekte eklenecek ozel alanlar sizabilir.

3. `takipler`, `yorum_begenileri`, `kullanici_rozetleri`
Kullanici davranisi ve sosyal grafik cikarimi yapilabilir.

## Bu Repodaki Degisiklikler

- Public profil sayfasinda okuma listesi yalnizca hesap sahibine gosterilecek sekilde daraltildi.
- `supabase/rls_hardening.sql` dosyasi eklendi.
- Public profil sorgulari icin `public_profiller` view kullanimina gecis baslatildi.
- Yorumlar ve bildirimler, public profil verisini dogrudan `profiller` tablosu yerine view tabanli olarak tuketmeye hazirlandi.
- `supabase/rls_lockdown_phase2.sql` dosyasi eklendi.

## Uygulama Adimlari

1. Supabase SQL Editor'de `supabase/rls_hardening.sql` dosyasini calistir.
2. Supabase SQL Editor'de `supabase/rls_lockdown_phase2.sql` dosyasini calistir.
3. Profil sayfasinda public olarak gostermek istedigin alanlari netlestir.
4. Gerekirse `public_profiller` view alanlarini buna gore guncelle.

## Sonraki Sertlestirme Adaylari

- `takipler` icin public `SELECT` gerekip gerekmedigini yeniden degerlendir.
- `yorum_begenileri` tablosunu owner-only veya aggregate tabanli bir modele gecir.
- `kullanici_rozetleri` tablosunda public okumayi sadece profil sayfasinda gerekli goruluyorsa koru.
- `aktiviteler` tablosu kullaniliyorsa public `SELECT` politikasini sinirla.
