import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../app/lib/seoRules.js', import.meta.url), 'utf8')
const { fetchAllRows, isPublished, ratingSchema, safeJsonLd, validDate } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

test('published content excludes drafts and future schedules, includes due schedules', () => {
  const now = Date.parse('2026-10-10T12:00:00Z')
  assert.equal(isPublished({ yayin_durumu: 'yayinda' }, now), true)
  assert.equal(isPublished({ yayin_durumu: 'taslak' }, now), false)
  assert.equal(isPublished({ yayin_durumu: 'planlandi', yayin_tarihi: '2026-10-10T12:00:00Z' }, now), true)
  assert.equal(isPublished({ yayin_durumu: 'planlandi', yayin_tarihi: '2026-10-10T12:00:01Z' }, now), false)
  assert.equal(isPublished({ yayin_durumu: 'planlandi', yayin_tarihi: 'invalid' }, now), false)
})

test('pagination fetches content beyond database default row limit', async () => {
  const rows = Array.from({ length: 1203 }, (_, id) => ({ id }))
  const query = { range: async (start, end) => ({ data: rows.slice(start, end + 1) }) }
  assert.deepEqual(await fetchAllRows(query), rows)
})

test('failed public queries do not masquerade as empty successful content', async () => {
  await assert.rejects(fetchAllRows({ range: async () => ({ error: { code: '42703' } }) }), /42703/)
})

test('rating count is actual votes, never views or a fabricated vote', () => {
  assert.equal(ratingSchema({ ortalama_puan: 8.2, puan_sayisi: 7, goruntuleme_sayisi: 8000 }).ratingCount, 7)
  assert.equal(ratingSchema({ ortalama_puan: 10, puan_sayisi: 0 }), undefined)
  assert.equal(ratingSchema({ ortalama_puan: 11, puan_sayisi: 1 }), undefined)
})

test('JSON-LD cannot terminate its script and still round-trips correctly', () => {
  const value = { text: '</script><script>alert(1)</script>\u2028\u2029' }
  const encoded = safeJsonLd(value)
  assert.equal(encoded.includes('<'), false)
  assert.deepEqual(JSON.parse(encoded), value)
})

test('invalid or missing modification dates are not replaced with today', () => {
  assert.equal(validDate(null), undefined)
  assert.equal(validDate('invalid'), undefined)
  assert.equal(validDate('2026-10-10').toISOString(), '2026-10-10T00:00:00.000Z')
})
