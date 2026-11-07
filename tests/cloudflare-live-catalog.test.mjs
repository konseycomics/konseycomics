import test from 'node:test'
import assert from 'node:assert/strict'
import { loadLiveCatalog, loadLiveHome } from '../app/lib/liveCatalog.js'

function database(tables, failingTable) {
  return { from(table) {
    const query = {
      select() { return query }, order() { return query }, in() { return query },
      async range(start, end) {
        if (table === failingTable) return { error: { code: 'unavailable' } }
        return { data: (tables[table] || []).slice(start, end + 1) }
      },
    }
    return query
  } }
}

const series = [
  { id: 1, slug: 'published', yayin_durumu: 'yayinda' },
  { id: 2, slug: 'draft', yayin_durumu: 'taslak' },
  { id: 3, slug: 'future', yayin_durumu: 'planlandi', yayin_tarihi: '2099-01-01' },
  { id: 4, slug: 'due', yayin_durumu: 'planlandi', yayin_tarihi: '2020-01-01' },
]

test('live archive includes new publications and due schedules, not drafts or future schedules', async () => {
  const tables = { seriler: [...series], turler: [{ id: 1, isim: 'Test' }] }
  const db = database(tables)
  assert.deepEqual((await loadLiveCatalog(db)).series.map(row => row.id), [1, 4])
  tables.seriler.push({ id: 5, yayin_durumu: 'yayinda' })
  assert.deepEqual((await loadLiveCatalog(db)).series.map(row => row.id), [1, 4, 5])
})

test('home filters before limiting latest chapters and hides unpublished parents', async () => {
  const drafts = Array.from({ length: 12 }, (_, id) => ({ id, seri_id: 1, yayin_durumu: 'taslak' }))
  const db = database({ seriler: series, bolumler: [
    ...drafts,
    { id: 20, seri_id: 2, yayin_durumu: 'yayinda' },
    { id: 21, seri_id: 1, yayin_durumu: 'yayinda' },
    { id: 22, seri_id: 4, yayin_durumu: 'planlandi', yayin_tarihi: '2020-01-01' },
  ], site_ayarlari: [{ anahtar: 'anasayfa_hero_slider', deger: [{ seri_id: 1 }] }] })
  const home = await loadLiveHome(db)
  assert.deepEqual(home.bolumler.map(row => row.id), [21, 22])
  assert.deepEqual(home.siteAyarlari.anasayfa_hero_slider, [{ seri_id: 1 }])
})

test('live lists paginate beyond the Supabase row limit', async () => {
  const db = database({ seriler: Array.from({ length: 1001 }, (_, id) => ({ id, yayin_durumu: 'yayinda' })) })
  assert.equal((await loadLiveCatalog(db)).series.length, 1001)
})

test('refresh errors reject rather than replacing the usable snapshot with an empty list', async () => {
  for (const table of ['seriler', 'bolumler', 'site_ayarlari']) {
    await assert.rejects(loadLiveHome(database({}, table)), /Public content query failed/)
  }
  await assert.rejects(loadLiveCatalog(database({}, 'turler')), /Public content query failed/)
})
