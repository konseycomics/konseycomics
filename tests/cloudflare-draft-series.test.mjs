import test from 'node:test'
import assert from 'node:assert/strict'
import { createPreviewSeries } from '../cloudflare/free-preview/draft-series.js'

const env = { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_KEY: 'public', SUPABASE_SERVICE_ROLE_KEY: 'private' }
function request(form = { baslik: 'Deneme' }, token = 'session') {
  return new Request('https://preview.invalid/api/preview/series', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(form) })
}
function fixture(role = 'kurucu', suspended = false, status = 201) {
  const writes = []
  const fetcher = async (url, options) => {
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: '00000000-0000-4000-8000-000000000001' })
    if (url.includes('/profiller?')) return Response.json([{ rol: role, askiya_alindi: suspended }])
    writes.push({ url, options, payload: JSON.parse(options.body) })
    return status === 201 ? Response.json([{ id: 123, ...JSON.parse(options.body) }], { status }) : new Response('', { status })
  }
  return { fetcher, writes }
}

test('new series always becomes an isolated unpublished test draft using caller RLS', async () => {
  const { fetcher, writes } = fixture()
  const result = await createPreviewSeries(request({ baslik: 'Deneme', slug: 'existing-series', yayin_durumu: 'yayinda', yayin_tarihi: '2020-01-01', one_cikan: true, yazar_ids: [1] }), env, fetcher)
  assert.equal(result.status, 201)
  assert.equal(writes.length, 1)
  assert.match(writes[0].url, /\/rest\/v1\/seriler\?select=/)
  assert.equal(writes[0].options.method, 'POST')
  assert.equal(writes[0].options.headers.Authorization, 'Bearer session')
  assert.equal(writes[0].options.headers.apikey, 'public')
  assert.deepEqual({ status: writes[0].payload.yayin_durumu, date: writes[0].payload.yayin_tarihi, featured: writes[0].payload.one_cikan }, { status: 'taslak', date: null, featured: false })
  assert.match(writes[0].payload.slug, /^preview-test-[a-f0-9-]+$/)
  assert.equal(writes[0].payload.baslik, '[TEST] Deneme')
  assert.equal(writes[0].payload.yazar_ids, undefined)
})

test('nonstaff, suspended users and missing auth cannot create drafts', async () => {
  for (const [role, suspended] of [['okuyucu', false], ['cevirmeni', false], ['kurucu', true]]) {
    const { fetcher, writes } = fixture(role, suspended)
    assert.equal((await createPreviewSeries(request(), env, fetcher)).status, 403)
    assert.equal(writes.length, 0)
  }
  assert.equal((await createPreviewSeries(request({}, ''), env)).status, 401)
})

test('existing IDs, invalid fields, oversized forms and production cover URLs cannot be forwarded', async () => {
  const { fetcher, writes } = fixture()
  for (const form of [{ id: 1, baslik: 'Edit' }, { baslik: '' }, { baslik: 'x'.repeat(121) }, { baslik: 'X', kategori_id: '../other' }, { baslik: 'X', kapak_url: 'https://cdn.konseycomics.com/kapaklar/real.webp' }]) {
    assert.equal((await createPreviewSeries(request(form), env, fetcher)).status, 400)
  }
  assert.equal((await createPreviewSeries(request({ baslik: 'X', extra: 'x'.repeat(17000) }), env, fetcher)).status, 413)
  assert.equal(writes.length, 0)
})

test('database permission errors remain errors rather than success', async () => {
  const { fetcher } = fixture('yonetici', false, 403)
  assert.equal((await createPreviewSeries(request(), env, fetcher)).status, 403)
})
