import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Role migration and RLS permissions', { skip: !process.env.PGLITE_MODULE }, async t => {
  const { PGlite } = await import(process.env.PGLITE_MODULE)
  const db = new PGlite()
  const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.user', true), '')::uuid $$;
      CREATE TYPE kullanici_rol AS ENUM ('okuyucu','yonetici','editor','cevirmeni','cizer','grafik','moderator','admin');
      CREATE TABLE profiller (id uuid PRIMARY KEY, rol kullanici_rol DEFAULT 'okuyucu', askiya_alindi boolean DEFAULT false, xp int DEFAULT 10, bio text);
      CREATE TABLE seriler (id int PRIMARY KEY, baslik text);
      CREATE TABLE site_ayarlari (anahtar text PRIMARY KEY, deger text);
      CREATE TABLE instagram_gonderileri (id int PRIMARY KEY);
      CREATE FUNCTION is_admin_user(target_user uuid DEFAULT auth.uid()) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM profiller WHERE id=target_user AND rol::text IN ('admin','yonetici')) $$;
      ALTER TABLE profiller ENABLE ROW LEVEL SECURITY;
      ALTER TABLE seriler ENABLE ROW LEVEL SECURITY;
      ALTER TABLE site_ayarlari ENABLE ROW LEVEL SECURITY;
      ALTER TABLE instagram_gonderileri ENABLE ROW LEVEL SECURITY;
      CREATE POLICY self_read ON profiller FOR SELECT USING (id=auth.uid() OR is_admin_user());
      CREATE POLICY self_edit ON profiller FOR UPDATE USING (id=auth.uid() OR is_admin_user()) WITH CHECK (id=auth.uid() OR is_admin_user());
      CREATE POLICY staff ON seriler FOR ALL USING(is_admin_user()) WITH CHECK(is_admin_user());
      CREATE POLICY safe_read ON site_ayarlari FOR SELECT USING(anahtar='anasayfa_hero_slider' OR is_admin_user());
      CREATE POLICY staff ON site_ayarlari FOR ALL USING(is_admin_user()) WITH CHECK(is_admin_user());
      CREATE POLICY staff ON instagram_gonderileri FOR ALL USING(is_admin_user()) WITH CHECK(is_admin_user());
      GRANT USAGE ON SCHEMA auth TO authenticated;
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
      GRANT UPDATE(rol,askiya_alindi,bio) ON profiller TO authenticated;
      GRANT INSERT,UPDATE,DELETE ON seriler,site_ayarlari,instagram_gonderileri TO authenticated;
      INSERT INTO profiller(id,rol) VALUES ('${id(1)}','yonetici'),('${id(2)}','yonetici'),('${id(3)}','editor'),('${id(4)}','okuyucu');
      INSERT INTO site_ayarlari VALUES('anasayfa_hero_slider','[]'),('instagram_token','secret');`)
    const sql = await readFile(new URL('../supabase/roller_sade_v1.sql', import.meta.url), 'utf8')
    await db.exec(sql)
    await db.exec(sql)
    await db.exec(`INSERT INTO profiller(id,rol) VALUES('${id(5)}','yonetici'),('${id(6)}','cevirmeni'),('${id(7)}','cizer')`)
    const asUser = async (n, query) => {
      await db.query("SELECT set_config('request.user',$1,false)", [id(n)])
      await db.exec('SET ROLE authenticated')
      try { return await db.query(query) } finally { await db.exec('RESET ROLE') }
    }
    await t.test('Existing founders, editors and XP preserved; rerun safe', async () => {
      const { rows } = await db.query('SELECT rol::text AS rol,xp FROM profiller ORDER BY id')
      assert.deepEqual(rows.slice(0,4).map(r=>r.rol), ['kurucu','kurucu','balonlamaci','okuyucu'])
      assert.ok(rows.every(r=>r.xp===10))
      assert.equal((await db.query('SELECT count(*)::int n FROM konsey_gecis_yedek.roller_v1')).rows[0].n,4)
    })
    await t.test('Manager content allowed; secrets and accounts blocked', async () => {
      assert.equal((await asUser(5,'SELECT is_admin_user() founder,is_content_manager() manager')).rows[0].founder,false)
      await asUser(5,"INSERT INTO seriler VALUES(1,'Test')")
      await asUser(5,"UPDATE site_ayarlari SET deger='updated' WHERE anahtar='anasayfa_hero_slider'")
      assert.equal((await asUser(5,"SELECT * FROM site_ayarlari WHERE anahtar='instagram_token'")).rows.length,0)
      await assert.rejects(asUser(5,"INSERT INTO site_ayarlari VALUES('secret2','x')"),/row-level security/)
      await assert.rejects(asUser(5,'INSERT INTO instagram_gonderileri VALUES(1)'),/row-level security/)
      await assert.rejects(asUser(5,`UPDATE profiller SET rol='kurucu' WHERE id='${id(5)}'`),/yetkisi yok/)
      assert.equal((await asUser(5,`UPDATE profiller SET bio='hacked' WHERE id='${id(4)}' RETURNING id`)).rows.length,0)
    })
    await t.test('Team and reader cannot publish or directly change XP', async () => {
      for (const n of [3,4,6,7]) {
        await assert.rejects(asUser(n,`INSERT INTO seriler VALUES(${n},'Denied')`),/row-level security/)
        await assert.rejects(asUser(n,`UPDATE profiller SET xp=999 WHERE id='${id(n)}'`),/permission denied/)
      }
      await asUser(4,`UPDATE profiller SET bio='Reader bio' WHERE id='${id(4)}'`)
      await assert.rejects(asUser(4,`UPDATE profiller SET askiya_alindi=true WHERE id='${id(4)}'`),/yetkisi yok/)
    })
    await t.test('Founder manages roles but cannot remove last active founder', async () => {
      await asUser(1,`UPDATE profiller SET rol='okuyucu' WHERE id='${id(2)}'`)
      await assert.rejects(asUser(1,`UPDATE profiller SET rol='okuyucu' WHERE id='${id(1)}'`),/Son aktif/)
      await assert.rejects(asUser(1,`UPDATE profiller SET rol='grafik' WHERE id='${id(4)}'`),/check constraint/)
      await asUser(1,`UPDATE profiller SET askiya_alindi=true WHERE id='${id(5)}'`)
      await assert.rejects(asUser(5,"INSERT INTO seriler VALUES(8,'Suspended')"),/row-level security/)
    })
  } finally { await db.close() }
})
