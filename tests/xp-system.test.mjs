import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('XP sistemi: gercek audit fonksiyonlariyla entegrasyon', { skip: !process.env.PGLITE_MODULE }, async t => {
  const { PGlite } = await import(process.env.PGLITE_MODULE)
  const db = new PGlite()
  const user = '00000000-0000-0000-0000-000000000001'
  const series = '00000000-0000-0000-0000-000000000002'
  const chapter = '00000000-0000-0000-0000-000000000003'
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth;
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.user', true), '')::uuid $$;
      create table profiller(id uuid primary key, xp integer default 0, seviye integer default 1, askiya_alindi boolean default false, rol text default 'uye', bio text, takipci_sayisi integer default 0, takip_sayisi integer default 0);
      create table seriler(id uuid primary key, yayin_durumu text default 'yayinda', yayin_tarihi timestamptz, ortalama_puan numeric, puan_sayisi integer);
      create table bolumler(id uuid primary key, seri_id uuid references seriler, yayin_durumu text default 'yayinda', yayin_tarihi timestamptz);
      create table bildirimler(alici_id uuid, gonderen_id uuid, tip text, baslik text, mesaj text, link text);
      create table aktiviteler(kullanici_id uuid, tip text, seri_id uuid, bolum_id uuid, meta jsonb);
      create table rozet_tanimlari(id uuid primary key default gen_random_uuid(), kod text);
      create table kullanici_rozetleri(kullanici_id uuid, rozet_id uuid, unique(kullanici_id, rozet_id));
      create table yorumlar(id uuid primary key default gen_random_uuid(), kullanici_id uuid, seri_id uuid, bolum_id uuid, icerik text, silindi boolean default false, begeni_sayisi integer default 0);
      create table okuma_gecmisi(kullanici_id uuid, bolum_id uuid);
      create table seri_puanlari(kullanici_id uuid, seri_id uuid, puan integer, primary key(kullanici_id, seri_id));
      create table topluluk_konulari(id uuid primary key default gen_random_uuid(), kullanici_id uuid, icerik text, aktif boolean default true);
      create table topluluk_yanitlari(id uuid primary key default gen_random_uuid(), kullanici_id uuid, icerik text, aktif boolean default true);
      insert into profiller(id, xp) values('${user}', 95);
      insert into seriler(id) values('${series}'); insert into bolumler(id, seri_id) values('${chapter}', '${series}');
      insert into okuma_gecmisi(kullanici_id, bolum_id) values('${user}', '00000000-0000-0000-0000-000000000099');
      insert into yorumlar(kullanici_id, icerik) values('${user}', 'Bu eski yorum zaten XP kazandirdi');
      insert into rozet_tanimlari(kod) values('level_10');
      grant all on all tables in schema public to anon, authenticated;`)
    await db.exec('grant update(xp, seviye), insert(xp, seviye) on profiller to authenticated;')
    await db.exec(await readFile(new URL('../supabase/unvan_sistemi_mvp.sql', import.meta.url), 'utf8'))
    await db.exec(await readFile(new URL('./fixtures/xp-existing.sql', import.meta.url), 'utf8'))
    await db.exec(`create trigger eski_yorum after insert on yorumlar for each row execute function yorum_xp_trigger();
      create trigger eski_puan after insert or update or delete on seri_puanlari for each row execute function seri_puan_guncelle();`)
    await db.exec(await readFile(new URL('../supabase/unvan_sade_v2.sql', import.meta.url), 'utf8'))
    const migration = await readFile(new URL('../supabase/xp_sade_v2.sql', import.meta.url), 'utf8')
    await db.exec(migration)
    await db.exec(migration)
    await db.query("select set_config('request.user', $1, false)", [user])
    const xp = async () => (await db.query('select xp from profiller where id = $1', [user])).rows[0].xp
    const rpc = async (sql, params = []) => {
      await db.exec('set role authenticated')
      try { return await db.query(sql, params) } finally { await db.exec('reset role') }
    }

    await t.test('Gecis XP sifirlamaz; profil duzenleme korunur', async () => {
      assert.equal(await xp(), 95)
      await rpc("update profiller set bio = 'Merhaba' where id = $1", [user])
      await assert.rejects(rpc('update profiller set xp = 99999 where id = $1', [user]), /permission denied/)
      await assert.rejects(rpc('update profiller set seviye = 100 where id = $1', [user]), /permission denied/)
      await assert.rejects(rpc('select xp_ekle($1, 10000)', [user]), /permission denied/)
      await assert.rejects(rpc("select xp_v2_kazan($1, 'okuma', 'fake')", [user]), /permission denied/)
      await assert.rejects(rpc('select seviye_rozet_kontrol($1, 100)', [user]), /permission denied/)
    })
    await t.test('Gecmis yorum/okuma yeniden eklenince XP verilmez', async () => {
      await db.query("select xp_v2_kazan($1, 'okuma', '00000000-0000-0000-0000-000000000099')", [user])
      await db.query("insert into yorumlar(kullanici_id, icerik) values($1, 'Bu eski yorum zaten XP kazandirdi')", [user])
      assert.equal(await xp(), 95)
    })
    await t.test('Tamamlanan bolum 10 XP verir, tekrar/F5 vermez, seviye unvani acar', async () => {
      await rpc('select unvan_v2_okuma($1, 1, 20)', [chapter])
      assert.equal(await xp(), 105)
      await rpc('select unvan_v2_okuma($1, 1, 20)', [chapter])
      assert.equal(await xp(), 105)
      assert.equal((await db.query('select seviye from profiller where id = $1', [user])).rows[0].seviye, 2)
    })
    await t.test('Yorum: kisa/tekrar 0, gunluk en fazla 15 XP', async () => {
      await db.query("insert into yorumlar(kullanici_id, icerik) values($1, 'kisa')", [user])
      assert.equal(await xp(), 105)
      for (let i = 0; i < 5; i++) await db.query('insert into yorumlar(kullanici_id, icerik) values($1, $2)', [user, `Bu serinin hikayesini cok begendim ${i}`])
      assert.equal(await xp(), 120)
      await db.query('insert into yorumlar(kullanici_id, icerik) values($1, $2)', [user, 'Bu serinin hikayesini cok begendim 0'])
      assert.equal(await xp(), 120)
    })
    await t.test('Puan silip tekrar verilse bile tek odul, ortalama istatistigi korunur', async () => {
      await db.query('insert into seri_puanlari values($1, $2, 8)', [user, series])
      assert.equal(await xp(), 123)
      await db.query('delete from seri_puanlari where kullanici_id = $1', [user])
      await db.query('insert into seri_puanlari values($1, $2, 10)', [user, series])
      assert.equal(await xp(), 123)
      assert.equal(Number((await db.query('select ortalama_puan from seriler where id = $1', [series])).rows[0].ortalama_puan), 10)
    })
    await t.test('Forum konu ve yanit kendi gunluk sinirlarina uyar', async () => {
      for (let i = 0; i < 5; i++) await db.query('insert into topluluk_konulari(kullanici_id, icerik) values($1, $2)', [user, `Forumda bu bolumu tartismak istiyorum ${i}`])
      assert.equal(await xp(), 133)
      for (let i = 0; i < 8; i++) await db.query('insert into topluluk_yanitlari(kullanici_id, icerik) values($1, $2)', [user, `Ben de bu bolumdeki karaktere katiliyorum ${i}`])
      assert.equal(await xp(), 148)
    })
    await t.test('Toplam gunluk 120 XP ust siniri, yeni gun ve askida hesap', async () => {
      for (let i = 0; i < 20; i++) await db.query("select xp_v2_kazan($1, 'okuma', $2)", [user, `test-bolum-${i}`])
      assert.ok((await xp()) - 95 <= 120)
      await db.exec("update xp_kazanimlari set gun = gun - 1")
      await db.query("select xp_v2_kazan($1, 'yorum', 'yeni-yorum')", [user])
      const before = await xp()
      await db.query('update profiller set askiya_alindi = true where id = $1', [user])
      await db.query("select xp_v2_kazan($1, 'yorum', 'baska-yorum')", [user])
      assert.equal(await xp(), before)
    })
  } finally { await db.close() }
})
