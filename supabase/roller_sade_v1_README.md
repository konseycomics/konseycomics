# Rol gecisi

Bu SQL, ayni degisikligi iceren uygulama yayiniyla birlikte uygulanmalidir.
Eski uygulamayla yeni veritabani veya yeni uygulamayla eski veritabani panel
yetkilerini yanlis yorumlar. Canli gecis onaydan sonra bakim modunda yapilmalidir.

## Roller

- Kurucu: tum panel ve kullanici/rol yonetimi.
- Yonetici: yayin merkezi, seri, bolum, kategori, tur, yazar/cizer, forum,
  yorum, Planet ve unvan tanimi yonetimi. Genel ayarlar, kullanici/rol yonetimi,
  Instagram ve liderlik odulu senkronizasyonu yok.
- Cevirmen, Balonlamaci, Cizer: ekip rozetleri ve Hakkimizda & Ekip gorunurlugu;
  panel veya moderasyon yetkisi yok.
- Okuyucu: mevcut normal kullanici yetkileri korunur.

Eski `yonetici` enum degeri `kurucu`, `editor` degeri `balonlamaci` olarak
yeniden adlandirilir; profil ID'leri, XP ve kazanilmis unvanlar degismez.
Yeni sinirli `yonetici` ayri enum degeridir. Kullanilmayan eski enum degerleri
bagimliliklari bozmamak icin fiziksel olarak tutulur, ancak profil CHECK
kisitlamasi ile atanmalari engellenir ve arayuzde gosterilmez.

## Guvenlik

Eski genis `is_admin_user()` ve `is_admin()` kontrolleri sadece aktif Kurucuyu
kabul eder. Yoneticiye yalnizca izin verilen icerik tablolari ve slider/yayin
anahtarlari icin ek RLS politikasi verilir. Forum moderasyonu sunucu API'sinde
kimligi dogrulanmis ozel profil uzerinden kontrol edilir. Askiya alinmis
hesaplar ekip yetkilerini kullanamaz; son aktif Kurucu indirilemez.

Profil rolleri/durumlari, eski yetki fonksiyonlari ve politika tanimlari
`konsey_gecis_yedek.roller_v1*` tablolarinda saklanir. Bu, tam veritabani
yedegi degildir. Anonim ve normal kullanicilar yedek semaya erisemez.

SQL Editor'de rol/durum degisiklikleri mevcut rol koruma trigger'i nedeniyle
reddedilebilir. Normal rol degisiklikleri Kurucu hesabiyla panelden yapilir.

## Dogrulama

```sh
PGLITE_MODULE=/tmp/konsey-title-tests/node_modules/@electric-sql/pglite/dist/index.js node --test tests/*.test.mjs
npm run build
```

Gecisten sonra beklenen mevcut hesaplar: 2 Kurucu, 2 Balonlamaci, 4 Cevirmen,
1 Cizer, 141 Okuyucu. Yeni Yonetici atamasi otomatik yapilmaz.
Panelde mevcut iki Kurucunun tam erisimi ve ekip sayfasi kontrol edilmelidir.
