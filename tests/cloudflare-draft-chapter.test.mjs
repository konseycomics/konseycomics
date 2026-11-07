import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createPreviewChapter } from '../cloudflare/free-preview/draft-chapter.js'

const id = '00000000-0000-4000-8000-000000000001'
const cover = 'https://cdn.konseycomics.com/preview-uploads/abcdef.webp'
const env = { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_KEY: 'public', SUPABASE_SERVICE_ROLE_KEY: 'private' }
const form = { request_id: id, seri_id: id, sayi: 1, baslik: 'Test', kapak_url: cover, sayfalar: [cover, cover] }
function request(overrides = {}, token = 'session') {
  return new Request('https://preview.invalid/api/preview/chapters', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ ...form, ...overrides }) })
}
function fixture(role = 'kurucu', status = 200, data = { id, yayin_durumu: 'taslak' }) {
  const writes = []
  const fetcher = async (url, options) => {
    if (url.endsWith('/auth/v1/user')) return Response.json({ id })
    if (url.includes('/profiller?')) return Response.json([{ rol: role, askiya_alindi: false }])
    writes.push({ url, options })
    return Response.json(data, { status })
  }
  return { fetcher, writes }
}

test('chapter and ordered pages use exactly one caller-authorized transaction RPC', async () => {
  const { fetcher, writes } = fixture()
  assert.equal((await createPreviewChapter(request({ yayin_durumu: 'yayinda', drive_link: 'ignored' }), env, fetcher)).status, 201)
  assert.equal(writes.length, 1)
  assert.match(writes[0].url, /\/rpc\/konsey_preview_chapter_draft$/)
  assert.equal(writes[0].options.headers.Authorization, 'Bearer session')
  assert.equal(writes[0].options.headers.apikey, 'public')
  assert.deepEqual(JSON.parse(writes[0].options.body), { p_id: id, p_seri_id: id, p_sayi: 1, p_baslik: 'Test', p_kapak_url: cover, p_sayfalar: [cover, cover] })
})

test('missing auth, readers, invalid numbers, production URLs and oversized bodies cannot save', async () => {
  assert.equal((await createPreviewChapter(request({}, ''), env)).status, 401)
  const reader = fixture('okuyucu')
  assert.equal((await createPreviewChapter(request(), env, reader.fetcher)).status, 403)
  assert.equal(reader.writes.length, 0)
  const { fetcher, writes } = fixture()
  for (const input of [{ sayi: 0 }, { sayi: 1.5 }, { seri_id: 'other' }, { sayfalar: [] }, { sayfalar: ['https://cdn.konseycomics.com/real.jpg'] }, { sayfalar: Array(51).fill(cover) }]) {
    assert.equal((await createPreviewChapter(request(input), env, fetcher)).status, 400)
  }
  assert.equal((await createPreviewChapter(request({ extra: 'x'.repeat(17000) }), env, fetcher)).status, 413)
  assert.equal(writes.length, 0)
})

test('missing SQL setup and database failures do not report success', async () => {
  const missing = fixture('kurucu', 404, { code: 'PGRST202' })
  assert.equal((await createPreviewChapter(request(), env, missing.fetcher)).status, 503)
  const forbidden = fixture('kurucu', 403, {})
  assert.equal((await createPreviewChapter(request(), env, forbidden.fetcher)).status, 403)
})

test('migration keeps invoker RLS, test-parent locks, retry guard and draft-only atomic inserts', async () => {
  const sql = await readFile(new URL('../supabase/preview_chapter_draft_v1.sql', import.meta.url), 'utf8')
  assert.match(sql, /security invoker set search_path = ''/)
  assert.doesNotMatch(sql, /security definer/i)
  assert.match(sql, /slug ~ '\^preview-test-/)
  assert.match(sql, /for update;/)
  assert.match(sql, /select \* into chapter from public.bolumler where id = p_id/)
  assert.match(sql, /'taslak', null/)
  assert.match(sql, /with ordinality/)
  assert.match(sql, /from public, anon;/)
})
