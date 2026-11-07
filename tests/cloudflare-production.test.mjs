import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../cloudflare/free-preview/entry.js'
import { siteResponseHeaders, productionRedirect } from '../cloudflare/free-preview/site-policy.js'

const env = { KONSEY_PRODUCTION: '1' }

test('only the explicit live www host is indexable and private routes stay noindex', () => {
  for (const host of ['konseycomics-free-preview.konseycomics.workers.dev', 'attacker.invalid']) {
    assert.match(siteResponseHeaders(new Request(`https://${host}/seriler`), env)['X-Robots-Tag'], /noindex/)
  }
  assert.equal(siteResponseHeaders(new Request('https://www.konseycomics.com/seriler'), env)['X-Robots-Tag'], undefined)
  for (const path of ['/api/media/upload', '/admin', '/auth/callback', '/giris', '/profil/duzenle', '/_vinext/static-cache/public-pages.json', '/_konsey_media/index.json']) {
    assert.match(siteResponseHeaders(new Request(`https://www.konseycomics.com${path}`), env)['X-Robots-Tag'], /noindex/)
  }
})

test('apex redirects canonically without losing paths or query strings', () => {
  const result = productionRedirect(new Request('https://konseycomics.com/seriler?q=dc'), env)
  assert.equal(result.status, 308)
  assert.equal(result.headers.get('location'), 'https://www.konseycomics.com/seriler?q=dc')
  assert.equal(productionRedirect(new Request('https://www.konseycomics.com/seriler'), env), null)
  assert.equal(productionRedirect(new Request('http://www.konseycomics.com/giris'), env).headers.get('location'), 'https://www.konseycomics.com/giris')
})

test('live robots allows public crawling while trial robots stays closed', async () => {
  const live = await worker.fetch(new Request('https://www.konseycomics.com/robots.txt'), env, {})
  assert.equal(live.status, 200)
  const body = await live.text()
  assert.match(body, /Allow: \/\n/)
  assert.match(body, /Disallow: \/admin/)
  assert.match(body, /Sitemap: https:\/\/www.konseycomics.com\/sitemap.xml/)
  assert.equal(live.headers.get('x-robots-tag'), null)
  const preview = await worker.fetch(new Request('https://konseycomics-free-preview.konseycomics.workers.dev/robots.txt'), env, {})
  assert.match(await preview.text(), /Disallow: \/\n/)
})

test('live public HTML removes the wrapper noindex header from stored snapshots', async () => {
  const response = await worker.fetch(new Request('https://www.konseycomics.com/seriler'), {
    ...env, ASSETS: { fetch: async url => url.endsWith('public-pages.json')
      ? Response.json({ routes: { '/seriler': { asset: '/test.html', status: 200, headers: { 'X-Robots-Tag': 'noindex' } } }, headers: {} })
      : new Response('<h1>Seriler</h1>') },
  }, {})
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('x-robots-tag'), null)
  assert.equal(response.headers.get('x-konsey-delivery'), 'static-html')
  const returningVisitor = await worker.fetch(new Request('https://www.konseycomics.com/seriler', { headers: { Cookie: 'konsey_forum_visitor=public-visitor' } }), { ...env, ASSETS: { fetch: async () => new Response('<h1>Seriler</h1>') } }, {})
  assert.equal(returningVisitor.headers.get('x-konsey-delivery'), 'static-html')
})
