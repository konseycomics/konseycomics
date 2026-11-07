import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { safeAssetPath, validateStaticInventory, verifyObjectBytes } from '../scripts/r2-static-archive.mjs'

test('static media inventory rejects path traversal, oversize files and non-image content', () => {
  for (const key of ['../secret.jpg', '/secret.jpg', 'a/../secret.jpg', 'a\\secret.jpg', 'a//secret.jpg']) assert.throws(() => safeAssetPath('/archive', key))
  assert.equal(safeAssetPath('/archive', 'kapaklar/test.webp'), '/archive/kapaklar/test.webp')
  assert.throws(() => validateStaticInventory([{ key: 'a.webp', size: 25 * 1024 * 1024 + 1 }]))
  assert.throws(() => validateStaticInventory([{ key: 'a.html', size: 1 }]))
  assert.throws(() => validateStaticInventory([{ key: 'a.webp', size: 1 }, { key: 'a.webp', size: 1 }]))
  assert.equal(validateStaticInventory([{ key: 'a.webp', size: 10 }, { key: 'b.jpg', size: 20 }]), 30)
})

test('backup verification rejects same-length corruption against the source ETag', () => {
  const item = { size: 3, etag: '&quot;900150983cd24fb0d6963f7d28e17f72&quot;' }
  assert.doesNotThrow(() => verifyObjectBytes(Buffer.from('abc'), item))
  assert.throws(() => verifyObjectBytes(Buffer.from('abd'), item), /checksum/)
  assert.throws(() => verifyObjectBytes(Buffer.from('a'), item), /size/)
})

test('media candidate is assets-only, without R2, compute entrypoint, production domains or paid bindings', async () => {
  const config = JSON.parse(await readFile(new URL('../cloudflare/media-static/wrangler.jsonc', import.meta.url), 'utf8'))
  assert.equal(config.name, 'konseycomics-media-free')
  assert.equal(config.main, undefined)
  assert.equal(config.routes, undefined)
  assert.equal(config.r2_buckets, undefined)
  assert.equal(config.assets.run_worker_first, undefined)
})
