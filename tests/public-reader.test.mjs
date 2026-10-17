import test from 'node:test'
import assert from 'node:assert/strict'
import { loadPublicReaderData } from '../app/lib/publicReaderData.js'

const chapter = { id: 'chapter-1', sayi: 1, yayin_durumu: 'yayinda', drive_link: 'https://drive.google.com/file/d/example/preview', pdf_indirme_link: '/file.pdf' }
const payload = { series: { id: 'series-1', baslik: 'Example', yayin_durumu: 'yayinda' }, chapters: [chapter] }

function database(results = {}) {
  const calls = []
  const defaults = {
    bolumler: { data: chapter },
    bolum_sayfalari: { data: [{ gorsel_url: 'https://cdn.konseycomics.com/original-1.webp' }, { gorsel_url: null }, { gorsel_url: 'https://cdn.konseycomics.com/original-2.webp' }] },
    site_ayarlari: { data: { deger: { 'series-1': { arka_plan_url: '/background.webp' }, other: { private: 'not returned' } } } },
  }
  return { calls, from(table) {
    const call = { table, filters: [] }
    calls.push(call)
    const query = {
      select(fields) { call.fields = fields; return query },
      eq(key, value) { call.filters.push([key, value]); return query },
      order(key, options) { call.order = [key, options]; return query },
      maybeSingle() { return query },
      then(resolve, reject) { return Promise.resolve(results[table] || defaults[table]).then(resolve, reject) },
    }
    return query
  } }
}

test('reader payload keeps original page URLs, downloads and only this series settings', async () => {
  const db = database()
  const data = await loadPublicReaderData(db, payload, '1')
  assert.deepEqual(data.pages, ['https://cdn.konseycomics.com/original-1.webp', 'https://cdn.konseycomics.com/original-2.webp'])
  assert.equal(data.chapter.pdf_indirme_link, '/file.pdf')
  assert.equal(data.chapter.drive_link, chapter.drive_link)
  assert.equal(data.chapter.seriBaslik, 'Example')
  assert.deepEqual(data.settings, { arka_plan_url: '/background.webp' })
  assert.deepEqual(db.calls[0].filters, [['id', chapter.id]])
  assert.deepEqual(db.calls[1].filters, [['bolum_id', chapter.id]])
  assert.deepEqual(db.calls[1].order, ['sira', { ascending: true }])
})

test('missing, draft and future chapters never load page media', async () => {
  for (const input of [null, { ...payload, chapters: [] }, { ...payload, chapters: [{ ...chapter, yayin_durumu: 'taslak' }] }, { ...payload, chapters: [{ ...chapter, yayin_durumu: 'planlandi', yayin_tarihi: '2099-01-01T00:00:00Z' }] }]) {
    const db = database()
    assert.equal(await loadPublicReaderData(db, input, 1), null)
    assert.equal(db.calls.length, 0)
  }
})

test('a chapter unpublished since catalog caching does not expose pages', async () => {
  const db = database({ bolumler: { data: { ...chapter, yayin_durumu: 'taslak' } } })
  assert.equal(await loadPublicReaderData(db, payload, 1), null)
})

test('database errors throw so a failed refresh cannot cache empty reader content', async () => {
  for (const table of ['bolumler', 'bolum_sayfalari', 'site_ayarlari']) {
    await assert.rejects(loadPublicReaderData(database({ [table]: { data: null, error: { message: 'timeout' } } }), payload, 1), /Public reader query failed/)
  }
})

test('chapters without pages retain their legacy embed and tolerate missing display settings', async () => {
  const data = await loadPublicReaderData(database({ bolum_sayfalari: { data: [] }, site_ayarlari: { data: null } }), payload, 1)
  assert.deepEqual(data.pages, [])
  assert.deepEqual(data.settings, {})
  assert.equal(data.chapter.drive_link, chapter.drive_link)
})
