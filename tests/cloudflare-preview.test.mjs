import { test } from 'node:test'
import assert from 'node:assert/strict'
import worker from '../cloudflare/free-preview/entry.js'

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
