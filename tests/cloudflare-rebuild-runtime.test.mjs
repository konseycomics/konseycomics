import test from 'node:test'
import assert from 'node:assert/strict'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'

test('actual Workers runtime rejects redirect:error but accepts manual without network I/O', async () => {
  const runtime = new Miniflare(convertV4MiniflareOptions({
    modules: true,
    compatibilityDate: '2026-11-05',
    script: `export default { fetch(request) {
      try {
        const outbound = new Request('https://example.invalid/', { redirect: new URL(request.url).searchParams.get('mode') });
        return Response.json({ redirect: outbound.redirect });
      } catch (error) { return Response.json({ name: error.name }, { status: 400 }); }
    } }`,
  }))
  try {
    const unsupported = await runtime.dispatchFetch('http://local.invalid/?mode=error')
    assert.equal(unsupported.status, 400)
    assert.equal((await unsupported.json()).name, 'TypeError')
    const supported = await runtime.dispatchFetch('http://local.invalid/?mode=manual')
    assert.equal(supported.status, 200)
    assert.deepEqual(await supported.json(), { redirect: 'manual' })
  } finally { await runtime.dispose() }
})
