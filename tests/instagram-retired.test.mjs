import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8')
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}

test('retired Instagram APIs return 410 without database or external requests', async () => {
  const original = globalThis.fetch
  globalThis.fetch = () => { throw new Error('Unexpected outgoing request') }
  try {
    for (const path of ['process', 'posts', 'status']) {
      const route = await load(`../app/api/instagram/${path}/route.js`)
      for (const method of ['GET', 'POST']) {
        if (route[method]) assert.equal((await route[method]()).status, 410)
      }
    }
    const { default: worker } = await load('../cloudflare/instagram-scheduler/src/index.js')
    await worker.scheduled()
    assert.equal((await worker.fetch()).status, 410)
  } finally { globalThis.fetch = original }
})

test('publishing retains comic scheduling but has no Instagram controls or calls', async () => {
  const source = await readFile(new URL('../app/admin/sections/publishing.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /instagram/i)
  assert.match(source, /yayin_sekli/)
  assert.match(source, /bildirimHazirla/)
  const config = JSON.parse(await readFile(new URL('../cloudflare/instagram-scheduler/wrangler.jsonc', import.meta.url), 'utf8'))
  assert.deepEqual(config.triggers.crons, [])
})
