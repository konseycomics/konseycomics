import { test } from 'node:test'
import assert from 'node:assert/strict'
import worker from '../cloudflare/free-preview/entry.js'
import { blocksPreviewWrite } from '../cloudflare/free-preview/browser-read-only.js'

test('account trial blocks accidental database edits, not auth or production traffic', () => {
  const preview = 'konseycomics-free-preview.konseycomics.workers.dev'
  const database = 'https://example.supabase.co/rest/v1/seriler'
  for (const method of ['POST', 'PATCH', 'DELETE']) assert.equal(blocksPreviewWrite(preview, database, method), true)
  for (const method of ['GET', 'HEAD']) assert.equal(blocksPreviewWrite(preview, database, method), false)
  assert.equal(blocksPreviewWrite(preview, 'https://example.supabase.co/auth/v1/token', 'POST'), false)
  assert.equal(blocksPreviewWrite('www.konseycomics.com', database, 'POST'), false)
})

test('enabling account tests does not enable media uploads or forum publishing', async () => {
  for (const path of ['/api/media/upload', '/api/community/topics', '/api/community/replies']) {
    const result = await worker.fetch(new Request(`https://preview.invalid${path}`, { method: 'POST' }), { KONSEY_PREVIEW_ACCOUNTS: '1' }, {})
    assert.equal(result.status, 403)
  }
})

test('preview rejects writes, account routes and direct snapshot access before loading the app', async () => {
  for (const [path, method, expected] of [['/api/media/upload', 'POST', 403], ['/admin', 'GET', 403], ['/giris', 'GET', 403], ['/_vinext/static-cache/public-pages.json', 'GET', 404], ['/seriler', 'POST', 403]]) {
    const result = await worker.fetch(new Request(`https://preview.invalid${path}`, { method }), {}, {})
    assert.equal(result.status, expected)
    assert.match(result.headers.get('x-robots-tag'), /noindex/)
  }
})

test('public HTML streams from assets without importing the renderer', async () => {
  const calls = []
  const env = { ASSETS: { async fetch(url) {
    calls.push(url)
    return url.endsWith('public-pages.json')
      ? Response.json({ routes: { '/seriler': { asset: '/_vinext/static-cache/test.html', status: 200 } }, headers: { 'X-Content-Type-Options': 'nosniff' } })
      : new Response('<h1>Seriler</h1>')
  } } }
  const result = await worker.fetch(new Request('https://preview.invalid/seriler?q=Daredevil'), env, {})
  assert.equal(await result.text(), '<h1>Seriler</h1>')
  assert.equal(result.headers.get('x-konsey-delivery'), 'static-html')
  assert.equal(result.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(result.headers.get('cache-control'), 'no-store')
  assert.equal(calls.length, 2)
  const head = await worker.fetch(new Request('https://preview.invalid/seriler', { method: 'HEAD' }), env, {})
  assert.equal(await head.text(), '')
})
