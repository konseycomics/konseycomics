# Unvan Sistemi Kurulum

Supabase SQL Editor'da su sirayla calistir:

1. `supabase/unvan_sistemi_mvp.sql`
2. `supabase/unvan_seed_mvp.sql`

Bu iki dosya calistiktan sonra:

- yeni tablolar olusur
- `seriler.character_group` alanlari dolar
- ilk unvanlar ve kurallar eklenir
- uygulamadaki unlock akisi gercek veri uretmeye baslar

Not:

- `unvan_sistemi_mvp.sql` once calismalidir
- `unvan_seed_mvp.sql` ikinci sirada calismalidir
- mevcut kod, bu tablolar yoksa fail-safe davranir ama unvan acmaz
