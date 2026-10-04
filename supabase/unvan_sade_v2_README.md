# Sade Unvan Sistemi

## Gecis Sirasi

1. Proje/veritabani yedegi alin.
2. `unvan_sade_v2.sql` dosyasini Supabase SQL Editor'de calistirin.
3. `xp_sade_v2.sql` dosyasini calistirin. Canli audit fonksiyonlarina gore hazirlanmistir; mevcut XP/seviye sifirlanmaz.
4. Yeni uygulama surumunu yayinlayin. Eski uygulama SQL sonrasi unvan/okuma yazamaz; bu iki adimi bakim penceresinde uygulayin.
5. Gerekirse sunucu ortam degiskenleriyle `npm run titles:backfill` calistirin. Tekrar calistirilabilir; mevcut kazanimi silmez. Yeni kazanilan unvan otomatik secilir.

## Kazanma

- Seviye: mevcut seviye yeterli olunca kazanilir. Seviye degisikligi DB trigger'iyle, profil acilisi RPC ile kontrol edilir.
- Seri: en az bir yayimlanmis bolum olmali, yayimlanmis tum bolumlerde en az yuzde 70 okuma ve 15 saniye kaydi bulunmali. Taslak ve gelecege planlanmis bolumler sayilmaz.
- Yeni bolum eklenmesi veya seviye dusmesi kazanimi geri almaz.
- Yorum, puan, favori, indirme, onboarding ve liderlik artik unvan kazandirmaz. Liderlik rozetleri korunur.
- Her seri icin tek unvan tanimi bulunur. Eski seri unvanlarindan siralama/olusturulma onceligindeki bir tanesi yeni sisteme tasinir; diger tanimlar ve tum kazanilmis unvanlar arsivde korunur.
- Yeni unvan otomatik secilir; tekrar kontrol kullanicinin secimini degistirmez.

## Guvenlik Ve Sinirlar

Unvan secimi atomiktir; veritabani tek aktif unvana izin verir. RPC kimligi `auth.uid()` ile belirler; tarayici baska kullanici icin kazanma/okuma yazamaz. Dogrudan kazanma ve okuma tablosu yazma yetkileri kaldirilir.

Okuyucu gorulen farkli sayfalari ve sekmenin gorunur kaldigi sureyi takip eder. Salt sayfayi acip beklemek cok sayfali bir bolumu tamamlamaz. Eski iframe okuyucusunda ilerleme olculemedigi icin otomatik tamamlama yoktur.

Okuma orani/suresi istemci sinyalleridir, gercek dikkat veya okumayi sunucuda kanitlamaz. XP migration'i tekrar kazanmayi ve gunluk miktari sinirlar; bu sinyalleri insanin gercekten okudugunun kaniti olarak kullanmaz.

## XP Kurallari

Mevcut her 100 XP'de bir seviye ve en fazla 100 seviye mantigi korunur. Eski XP/seviye geriye dusurulmez.

| Islem | XP | Gunluk XP siniri |
| --- | --- | --- |
| Bolum tamamlama | 10 | 100 |
| Yorum (en az 20 karakter) | 5 | 15 |
| Seri puani | 3 | 15 |
| Forum konusu (en az 20 karakter) | 5 | 10 |
| Forum yaniti (en az 20 karakter) | 3 | 15 |

Tum kaynaklarin toplami gunde en fazla 120 XP'dir; gun Europe/Istanbul saatine gore belirlenir. Limit disindaki islem yine kaydedilir ve o islem icin sonradan tekrar XP alinmaz. Ayni bolum/seri puani tek seferliktir; ayni normalize yorum/konu/yanit metni tekrar XP vermez. Takip ve begeni XP vermez; bildirim ve istatistikleri korunur.

Kullanici profilini duzenleyebilir, fakat XP/seviyeyi dogrudan yazamaz. Eski miktar kabul eden XP RPC'sinin cagrilma yetkisi kaldirilir. Yeni XP fonksiyonu sadece DB tetikleyicileri tarafindan cagrilir. Gecmis okuma, yorum ve puanlara sifir miktarli tekillik kayitlari eklenir; eski islemleri silip yeniden eklemek ek XP vermez.

SQL `unvan_sistemi_mvp.sql` ve planli yayin kolonlarinin daha once kuruldugunu varsayar. Service-role anahtari sadece sunucu ortaminda tutulur.

## Test

Postgres tabanli entegrasyon testi PGlite runtime'i ile:

```sh
PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node --test tests/title-system.test.mjs
```

Test veritabani bellek icindedir; canli veriye dokunmaz.
