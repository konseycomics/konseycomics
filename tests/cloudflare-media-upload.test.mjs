import test from 'node:test'
import assert from 'node:assert/strict'
import { uploadPreviewImage } from '../cloudflare/free-preview/media-upload.js'

const user = '00000000-0000-4000-8000-000000000001'
function fixture(role = 'kurucu', suspended = false) {
  const writes = []
  const env = { KONSEY_FREE_MEDIA: '0', NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'private', MEDIA_PREVIEW: { async put(...args) { writes.push(args); return { key: args[0] } } } }
  const fetcher = async url => url.endsWith('/auth/v1/user') ? Response.json({ id: user }) : Response.json([{ rol: role, askiya_alindi: suspended }])
  return { env, fetcher, writes }
}
function request({ token = 'test-session', bucket = 'kapaklar', bytes = new Uint8Array([255,216,255,224,0,0,0,0,0,0,255,217]), type = 'image/jpeg', origin } = {}) {
  const body = new FormData()
  body.set('bucket', bucket)
  body.set('prefix', '../../production')
  body.set('file', new File([bytes], 'image.jpg', { type }))
  return new Request('https://preview.invalid/api/media/upload', { method: 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(origin ? { Origin: origin } : {}) }, body })
}

test('only active founders and managers can upload to the isolated prefix', async () => {
  for (const role of ['kurucu', 'yonetici']) {
    const { env, fetcher, writes } = fixture(role)
    const response = await uploadPreviewImage(request(), env, fetcher)
    assert.equal(response.status, 200)
    const payload = await response.json()
    assert.match(payload.key, /^preview-uploads\/[a-f0-9-]+\.jpg$/)
    assert.equal(payload.url, `https://cdn.konseycomics.com/${payload.key}`)
    assert.equal(writes.length, 1)
    assert.deepEqual(writes[0][2].onlyIf, { etagDoesNotMatch: '*' })
  }
})

test('readers, team-only roles and suspended staff cannot write', async () => {
  for (const [role, suspended] of [['okuyucu', false], ['cevirmeni', false], ['kurucu', true]]) {
    const { env, fetcher, writes } = fixture(role, suspended)
    assert.equal((await uploadPreviewImage(request(), env, fetcher)).status, 403)
    assert.equal(writes.length, 0)
  }
})

test('missing or invalid authentication cannot write', async () => {
  const { env, writes } = fixture()
  assert.equal((await uploadPreviewImage(request({ token: '' }), env)).status, 401)
  assert.equal((await uploadPreviewImage(request(), env, async () => new Response('', { status: 401 }))).status, 401)
  assert.equal(writes.length, 0)
})

test('interactive members can upload forum images but never staff covers, and suspended users stay blocked', async () => {
  for (const [role, suspended, bucket, expected] of [
    ['okuyucu', false, 'forum', 200], ['cevirmeni', false, 'forum', 200],
    ['okuyucu', false, 'kapaklar', 403], ['okuyucu', true, 'forum', 403],
    ['kurucu', true, 'forum', 403],
  ]) {
    const { env, fetcher, writes } = fixture(role, suspended)
    env.KONSEY_PREVIEW_INTERACTIVE = '1'
    const response = await uploadPreviewImage(request({ bucket }), env, fetcher)
    assert.equal(response.status, expected)
    assert.equal(writes.length, expected === 200 ? 1 : 0)
  }
})

test('invalid MIME, forged content, bucket and origin are rejected', async () => {
  const { env, fetcher, writes } = fixture()
  for (const options of [{ type: 'image/svg+xml' }, { bytes: new TextEncoder().encode('<svg>bad</svg>') }, { bucket: '../site' }]) {
    assert.equal((await uploadPreviewImage(request(options), env, fetcher)).status, 400)
  }
  assert.equal((await uploadPreviewImage(request({ origin: 'https://other.invalid' }), env, fetcher)).status, 403)
  assert.equal(writes.length, 0)
})

test('oversized images and upstream errors fail closed without writes', async () => {
  const { env, fetcher, writes } = fixture()
  assert.equal((await uploadPreviewImage(request({ bytes: new Uint8Array(4 * 1024 * 1024 + 1) }), env, fetcher)).status, 413)
  assert.equal((await uploadPreviewImage(request(), env, async () => new Response('', { status: 503 }))).status, 503)
  assert.equal(writes.length, 0)
})
