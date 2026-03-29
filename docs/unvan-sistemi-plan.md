# Unvan Sistemi Planı

Bu dokuman, Konsey Comics icin dusunulen unvan sistemini mevcut proje yapisina uyarlanmis teknik plana donusturur.

Amac:

- kullanici aksiyonlarini anlamli hale getirmek
- okuma davranisini oyunlastirilmis bir ilerleme hissine cevirmek
- profil sayfasini kimlik + basari vitrini haline getirmek
- yeni unvan eklemeyi deploy gerektirmeyen bir yapiya yaklastirmak

Temel akis:

`Action -> Event -> Rule Check -> Unlock -> UI Notify`

## 1. Mevcut Konsey Tabaninda Kullanacagimiz Varliklar

Kod tabaninda halihazirda kullanilan ana tablolar:

- `profiller`
- `public_profiller`
- `seriler`
- `bolumler`
- `okuma_gecmisi`
- `okuma_listesi`
- `kullanici_rozetleri`
- `rozet_tanimlari`
- `takipler`

Etkilesim verisi icin zaten sahip oldugumuz seyler:

- okuma listesi durumlari: `okunuyor`, `okundu`, `okumak_istiyorum`
- profil XP / seviye alanlari
- kullanici rozetleri
- seri bazli puan ve goruntulenme alanlari

Eksik olan alanlar:

- gercek bolum tamamlama kaydi
- seri bazli ilerleme ozeti
- unvan tanimlari
- unvan kurallari
- kullanici-unvan eslesmesi
- event/unlock loglari

## 2. Terminoloji Eslesmesi

Kullanici tarafinda dusunulen veri modeli ile mevcut proje adlari arasindaki eslesme:

- `users` -> `profiller`
- `series` -> `seriler`
- `issues` -> `bolumler`
- `user issue reads` -> yeni tablo
- `user series progress` -> yeni tablo
- `titles` -> `unvan_tanimlari`
- `title_rules` -> `unvan_kurallari`
- `user_titles` -> `kullanici_unvanlari`

## 3. Sistem Hedefleri

Unvan sistemi su tip aksiyonlari takip edecek:

- bolum tamamlama
- seride yuzdesel ilerleme
- seri tamamlama
- ayni `character_group` altinda birden fazla seri tamamlama
- seri puanlama
- favoriye ekleme

Ornek:

- Daredevil (2022) %100 -> `Korkusu Olmayan Adam`
- Spider-Man grubunda 3 seri bitir -> `Mahallenizin Dostu Orumcek Adam`
- Ghost Rider serisinin %50'si -> `Alevlerin Hakimi`

## 4. Character Group Mantigi

Bu sistemin buyuk farki, unvanlari sadece tek seriyle sinirlamamasi olacak.

Bu nedenle `seriler` tablosunda bir `character_group` alani gerekir.

Ornekler:

- `daredevil`
- `spider-man`
- `thor`
- `ghost-rider`
- `deathstroke`
- `punisher`

Bu alan sayesinde:

- tek seri bazli unvanlar
- karakter evreni uzmanlik unvanlari
- ayni karakterin yan serileriyle ilgili unvanlar

tek sistemde yonetilebilir.

## 5. MVP Veri Modeli

Ilk surumde yeni eklenmesi gereken ana tablolar:

### 5.1 `kullanici_bolum_okumalari`

Gercek okuma tamamlamasini takip eder.

Alanlar:

- `id`
- `kullanici_id`
- `bolum_id`
- `seri_id`
- `okundu_at`
- `completion_ratio`
- `okuma_suresi_sec`
- `created_at`

Amac:

- ayni bolumu ikinci kez saymamak
- sadece tiklama ile unvan acilmasini engellemek
- minimum sure / minimum tamamlama filtresi koymak

### 5.2 `kullanici_seri_ilerleme`

Kullanicinin bir serideki ozet ilerlemesini tutar.

Alanlar:

- `id`
- `kullanici_id`
- `seri_id`
- `okunan_bolum_sayisi`
- `toplam_bolum_sayisi`
- `ilerleme_yuzdesi`
- `tamamlandi`
- `ilk_okuma_at`
- `son_okuma_at`
- `created_at`
- `updated_at`

Amac:

- her eventte yeniden sayim yapmak yerine hazir ozet tutmak
- seri tamamlama ve yuzdesel kural kontrolunu hizlandirmak

### 5.3 `unvan_tanimlari`

Unvanin kendisini tanimlar.

Alanlar:

- `id`
- `kod`
- `isim`
- `aciklama`
- `seri_id`
- `character_group`
- `kategori`
- `nadirlik`
- `ikon_url`
- `aktif`
- `siralama`
- `created_at`

Not:

- `seri_id` veya `character_group` null olabilir
- ikisinden biri doluysa kapsam daha net olur

### 5.4 `unvan_kurallari`

Unvani acan kosullar burada tutulur.

Alanlar:

- `id`
- `unvan_id`
- `event_tipi`
- `kural_tipi`
- `kural_config`
- `oncelik`
- `aktif`
- `created_at`

Ornek `kural_tipi` degerleri:

- `series_progress`
- `series_completed`
- `character_series_completed_count`
- `rate_count_in_group`
- `favorite_count_in_group`

Ornek `kural_config`:

```json
{
  "series_id": 12,
  "min_progress_percent": 100
}
```

veya:

```json
{
  "character_group": "spider-man",
  "min_completed_series": 3
}
```

### 5.5 `kullanici_unvanlari`

Kullaniciya acilan unvanlar burada tutulur.

Alanlar:

- `id`
- `kullanici_id`
- `unvan_id`
- `acildi_at`
- `acilma_nedeni`
- `one_cikarildi`
- `created_at`

Kritik kural:

- `(kullanici_id, unvan_id)` unique olmali

### 5.6 `unvan_olay_loglari`

Ilk surumde opsiyonel ama tavsiye edilir.

Alanlar:

- `id`
- `kullanici_id`
- `event_tipi`
- `seri_id`
- `bolum_id`
- `payload`
- `created_at`

Amac:

- debug
- neden unlock olmadigini analiz etme
- abuse incelemesi

## 6. Mevcut Tablolarda Gerekli Alanlar

### 6.1 `seriler`

Eklenmesi tavsiye edilen alanlar:

- `character_group`
- `toplam_bolum_sayisi` (ister fiziksel kolon, ister view/rpc ile hesap)

### 6.2 `profiller`

Bu surumde unvan sistemini profile yansitmak icin daha sonra eklenebilecek alanlar:

- `gosterilen_unvan_id`
- `unvan_gorunurluk`

Ilk surumde zorunlu degil.

## 7. Event Tabanli Akis

Ilk surumde sistemin takip edecegi eventler:

- `ISSUE_READ_COMPLETED`
- `SERIES_PROGRESS_UPDATED`
- `SERIES_COMPLETED`
- `SERIES_RATED`
- `SERIES_FAVORITED`

Ornek payload:

```json
{
  "event_type": "SERIES_COMPLETED",
  "user_id": "uuid",
  "series_id": "uuid",
  "character_group": "daredevil",
  "completed_at": "2026-03-29T19:00:00Z"
}
```

## 8. Rule Engine Mantigi

Akis:

1. kullanici aksiyon yapar
2. ilgili veri tablolari guncellenir
3. uygun event uretilir
4. bu event icin aday kurallar cekilir
5. kullanici unvani zaten acmis mi kontrol edilir
6. kural gecerse `kullanici_unvanlari`na kayit atilir
7. frontend'e unlock bildirimi dondurulur

Pseudo:

```ts
async function handleTitleEvent(event) {
  const rules = await getRulesForEvent(event.event_type)

  for (const rule of rules) {
    const unlocked = await hasUserUnlockedTitle(event.user_id, rule.unvan_id)
    if (unlocked) continue

    const passed = await evaluateRule(rule, event)
    if (!passed) continue

    await unlockTitle({
      kullaniciId: event.user_id,
      unvanId: rule.unvan_id,
      reason: buildUnlockReason(rule, event),
    })
  }
}
```

## 9. Ilk MVP Kural Tipleri

Ilk surumde sadece bu 4 kural tipiyle baslamak en sagliklisi:

### 9.1 `series_progress`

Belirli bir seride yuzde kosulu saglanirsa acilir.

Ornek:

- Daredevil %100 -> `Korkusu Olmayan Adam`

### 9.2 `series_completed`

Belirli seri tamamen bittiyse acilir.

Ornek:

- Daredevil: The Target tamamlandi -> `Hedefin Kendisi`

### 9.3 `character_series_completed_count`

Ayni karakter grubunda tamamlanan seri sayisina gore acilir.

Ornek:

- 1 Spider-Man serisi -> `Spidey`
- 3 Spider-Man serisi -> `Mahallenizin Dostu Orumcek Adam`

### 9.4 `rate_count_in_group`

Belirli karakter grubunda kullanicinin verdigi puan sayisina gore acilir.

Ornek:

- 3 Spider-Man puani -> `Ag Kafa`

### 9.5 Ikinci turda eklenebilir

- `favorite_count_in_group`
- `one_shot_completed`
- `secret_condition`
- `streak`

## 10. Ilk Seriler Icin Ornek Unvan Seti

### Daredevil

- `Hell's Kitchen Seytani`
  - `character_group = daredevil`
  - `min_completed_series = 1`

- `Korkusu Olmayan Adam`
  - Daredevil (2022) %100

### Ghost Rider: Return of Vengeance

- `Alevlerin Hakimi`
  - %50 ilerleme

- `Gunahlarin Yargici`
  - %100 tamamlama

### Thor: Lightning and Lament

- `Odin'in Oglu`
  - %25 ilerleme

- `Gok Gurultusu Tanrisi`
  - %75 ilerleme

- `Kirilma Noktasi`
  - %100 tamamlama

### Spider-Man grubu

- `Orumcek`
  - ilk Spider-Man serisini baslat

- `Spidey`
  - 1 Spider-Man serisi tamamla

- `Ag Kafa`
  - 3 Spider-Man serisine puan ver

- `Mahallenizin Dostu Orumcek Adam`
  - 3 Spider-Man serisi tamamla

## 11. Abuse Koruma

Bu sistemde tiklama = okuma sayilmamali.

Ilk surum icin minimum kosullar:

- ayni bolum ikinci kez okunmussa yeniden sayma
- `completion_ratio >= 0.70`
- `okuma_suresi_sec >= 15`

Bu kosullar ilk surum icin yeterli bir koruma saglar.

## 12. Backend Uygulama Katmanlari

Bu projede su katman yapisi mantikli:

- `ReadingService`
- `ProgressService`
- `TitleEngine`
- `RuleEvaluator`
- `TitleUnlockService`

Ilk etapta API route yerine client action + RPC veya server route dusunulebilir. Ama orta vadede su yapi daha temiz:

- `POST /api/reading/complete-issue`
- `GET /api/series/:id/titles`
- `GET /api/profile/:username/titles`

## 13. Frontend Yansimasi

### Profil sayfasi

Gosterilecek:

- one cikarilan unvanlar
- tum unvanlari gor butonu
- unvan acilis tarihleri
- nadirlik renkleri

### Seri detayi

Gosterilebilir:

- bu seriden acilabilir unvanlar
- acilmis olanlar aktif, kilitli olanlar pasif

### Unlock modal

Yeni unvan acildiginda:

- kisa bir popup
- unvan ismi
- acilma nedeni

Bu his cok onemli; kullanici fark etmeli.

## 14. MVP Uygulama Sirasi

### Adim 1

SQL tablolarini ekle:

- `kullanici_bolum_okumalari`
- `kullanici_seri_ilerleme`
- `unvan_tanimlari`
- `unvan_kurallari`
- `kullanici_unvanlari`
- opsiyonel `unvan_olay_loglari`

### Adim 2

`seriler.character_group` alanini ekle ve doldur.

### Adim 3

Bolum tamamlaninca calisacak bir servis yaz:

- duplicate check
- read kaydi
- progress update
- event olusturma

### Adim 4

Title engine yaz:

- event -> rule sec
- rule evaluate
- unlock

### Adim 5

Profil sayfasina unvan vitrini ekle.

### Adim 6

Unlock modal / toast ekle.

### Adim 7

Seri detay sayfasina "bu serinin unvanlari" alani ekle.

## 15. Konsey Kod Tabanina Gore Ilk Teknik Karar

Mevcut yapi client-heavy calisiyor. Bu yuzden ilk surum icin en mantikli yol:

- veri modeli SQL ile eklenir
- title evaluation icin kucuk server route veya Supabase function mantigi kullanilir
- client tarafindan dogrudan karmasik title logic calistirilmaz

Neden:

- duplicate ve unlock guvenligi saglanir
- abuse kontrolu merkezilesir
- ileride notification sistemiyle kolay entegre edilir

## 16. Ilk Surumde Disarida Birakilacaklar

Asagidakileri ilk MVP'ye almamak daha dogru:

- gizli gorevler
- event bazli ozel sezon unvanlari
- gece/gunduz okuma patterni
- coklu kural kombinasyonlari
- admin panelinden tam rule editor

Bunlar ikinci fazda gelir.

## 17. Sonuc

Bu sistemin cekirdegi su:

- her unvan bir kuraldir
- her kullanici hareketi bir eventtir
- uygun event gelince aday kurallar calisir
- kosul saglandiysa unvan acilir
- kullanici profilinde ve UI'da gorunur hale gelir

Bu model:

- buyuyebilir
- yeni unvan eklemeyi kolaylastirir
- deploy bagimliligini azaltir
- Konsey profil sistemini rakiplerden ayirir

Bu dokuman, bir sonraki adim olarak MVP SQL semasi ve ilk evaluator implementasyonuna temel olur.
