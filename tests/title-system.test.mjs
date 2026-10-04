import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// PGLITE_MODULE: yerel/CI Postgres test runtime'i; uygulama bagimliligi degildir.
test('Sade unvan sistemi: SQL entegrasyonu', { skip: !process.env.PGLITE_MODULE }, async t => {
  const { PGlite } = await import(process.env.PGLITE_MODULE)
  const db = new PGlite()
  const user = '00000000-0000-0000-0000-000000000001'
  const series = '00000000-0000-0000-0000-000000000002'
  const chapter = '00000000-0000-0000-0000-000000000003'
  const legacy = '00000000-0000-0000-0000-000000000004'
  const title = '00000000-0000-0000-0000-000000000005'
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth;
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.user', true), '')::uuid $$;
      create table profiller(id uuid primary key, seviye integer default 1, askiya_alindi boolean default false);
      create table seriler(id uuid primary key, yayin_durumu text default 'yayinda', yayin_tarihi timestamptz);
      create table bolumler(id uuid primary key, seri_id uuid references seriler, yayin_durumu text default 'yayinda', yayin_tarihi timestamptz);
      insert into profiller(id, seviye) values('${user}', 10);
      insert into seriler(id) values('${series}');
      insert into bolumler(id, seri_id) values('${chapter}', '${series}');`)
    await db.exec(await readFile(new URL('../supabase/unvan_sistemi_mvp.sql', import.meta.url), 'utf8'))
    await db.exec('grant all on all tables in schema public to anon, authenticated; grant usage on schema auth to anon, authenticated;')
    await db.exec(`insert into unvan_tanimlari(id, kod, isim) values('${legacy}', 'eski', 'Eski Unvan');
      insert into unvan_tanimlari(id, kod, isim, seri_id) values('${title}', 'seri', 'Seri Unvani', '${series}');
      insert into kullanici_unvanlari(kullanici_id, unvan_id, one_cikarildi) values('${user}', '${legacy}', true);
      insert into unvan_kurallari(unvan_id, event_tipi, kural_tipi) values('${legacy}', 'SERIES_RATED', 'series_rated');`)
    const migration = await readFile(new URL('../supabase/unvan_sade_v2.sql', import.meta.url), 'utf8')
    await db.exec(migration)
    await db.exec(migration)
    await db.query("select set_config('request.user', $1, false)", [user])
    const rpc = async (sql, params = []) => {
      await db.exec('set role authenticated')
      try { return await db.query(sql, params) } finally { await db.exec('reset role') }
    }

    await t.test('Yeniden calistirma verileri ve eski kazanimi korur', async () => {
      assert.equal((await db.query('select count(*)::int as n from unvan_tanimlari')).rows[0].n, 8)
      assert.equal((await db.query('select count(*)::int as n from kullanici_unvanlari')).rows[0].n, 1)
      assert.equal((await db.query('select aktif from unvan_kurallari')).rows[0].aktif, false)
    })
    await t.test('Seviye esikleri, tekrar kazanma ve tek aktif secim', async () => {
      const r = await rpc('select unvan_v2_senkron() as titles')
      assert.equal(r.rows[0].titles.length, 3)
      assert.equal((await rpc('select unvan_v2_senkron() as titles')).rows[0].titles.length, 0)
      assert.equal((await db.query('select count(*)::int as n from kullanici_unvanlari where one_cikarildi')).rows[0].n, 1)
      await rpc('select unvan_v2_sec($1)', [legacy])
      await rpc('select unvan_v2_senkron()')
      assert.equal((await db.query('select unvan_id from kullanici_unvanlari where one_cikarildi')).rows[0].unvan_id, legacy)
    })
    await t.test('Kazanilmayan unvan secilemez ve dogrudan kazanma yazilamaz', async () => {
      await assert.rejects(rpc('select unvan_v2_sec($1)', [title]), /kazanilmamis/)
      await assert.rejects(rpc('insert into kullanici_unvanlari(kullanici_id, unvan_id) values($1, $2)', [user, title]), /permission denied/)
      await assert.rejects(rpc('select unvan_v2_kazan($1)', [user]), /permission denied/)
    })
    await t.test('Dusuk oran/sure ve yayinda olmayan bolum reddedilir', async () => {
      await assert.rejects(rpc('select unvan_v2_okuma($1, 0.5, 20)', [chapter]), /Gecersiz/)
      await assert.rejects(rpc('select unvan_v2_okuma($1, 1, 1)', [chapter]), /Gecersiz/)
      await db.query("update bolumler set yayin_durumu = 'taslak' where id = $1", [chapter])
      await assert.rejects(rpc('select unvan_v2_okuma($1, 1, 20)', [chapter]), /yayinda degil/)
      await db.query("update bolumler set yayin_durumu = 'yayinda' where id = $1", [chapter])
    })
    await t.test('Tum yayimlanmis bolumler gerekli; taslaklar sayilmaz', async () => {
      await db.query("insert into bolumler(id, seri_id, yayin_durumu) values(gen_random_uuid(), $1, 'taslak')", [series])
      await db.query("insert into bolumler(id, seri_id, yayin_durumu, yayin_tarihi) values(gen_random_uuid(), $1, 'planlandi', now() + interval '1 day')", [series])
      const second = '00000000-0000-0000-0000-000000000006'
      await db.query('insert into bolumler(id, seri_id) values($1, $2)', [second, series])
      assert.equal((await rpc('select unvan_v2_okuma($1, 1, 20) as titles', [chapter])).rows[0].titles.length, 0)
      const r = await rpc('select unvan_v2_okuma($1, 1, 20) as titles', [second])
      assert.equal(r.rows[0].titles.length, 1)
      assert.equal(r.rows[0].titles[0].unvanId, title)
      assert.equal((await rpc('select unvan_v2_okuma($1, 1, 20) as titles', [chapter])).rows[0].titles.length, 0)
    })
    await t.test('Yeni bolum yayinlaninca kazanilmis unvan geri alinmaz', async () => {
      await db.query("insert into bolumler(id, seri_id) values(gen_random_uuid(), $1)", [series])
      await rpc('select unvan_v2_senkron()')
      assert.equal((await db.query('select count(*)::int as n from kullanici_unvanlari where unvan_id = $1', [title])).rows[0].n, 1)
    })
    await t.test('Seviye artisi otomatik acar; dususu kazanimi silmez', async () => {
      await db.query('update profiller set seviye = 20 where id = $1', [user])
      assert.equal((await db.query("select count(*)::int as n from kullanici_unvanlari k join unvan_tanimlari u on u.id = k.unvan_id where gereken_seviye = 20")).rows[0].n, 1)
      await db.query('update profiller set seviye = 1 where id = $1', [user])
      assert.equal((await db.query('select count(*)::int as n from kullanici_unvanlari')).rows[0].n, 6)
    })
    await t.test('Oturumsuz ve askiya alinmis hesaplar kazanamaz', async () => {
      await db.exec("select set_config('request.user', '', false)")
      await assert.rejects(rpc('select unvan_v2_senkron()'), /Oturum/)
      await db.query("select set_config('request.user', $1, false)", [user])
      await db.query('update profiller set askiya_alindi = true where id = $1', [user])
      await assert.rejects(rpc('select unvan_v2_okuma($1, 1, 20)', [chapter]), /Oturum/)
    })
  } finally { await db.close() }
})
