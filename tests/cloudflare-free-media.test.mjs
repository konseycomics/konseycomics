import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { storeFreeMedia } from '../cloudflare/free-preview/free-media-storage.js'
import { mergeMediaInventory } from '../scripts/prepare-free-media.mjs'

const env = { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'private', MEDIA_PREVIEW: { put() { throw new Error('Paid R2 must never be called') } } }

test('static builder verifies hashes, rejects immutable key conflicts and merges without duplicates', () => {
  const item = { key: 'a.webp', size: 3, sha256: 'a'.repeat(64) }
  assert.equal(mergeMediaInventory([item], [item]).length, 1)
  assert.throws(() => mergeMediaInventory([item], [{ ...item, sha256: 'b'.repeat(64) }]), /Conflicting/)
  assert.throws(() => mergeMediaInventory([{ ...item, sha256: '' }], []), /checksum/)
})

test('free storage refuses uploads at reservation cap without touching object storage', async () => {
  const calls = []
  const result = await storeFreeMedia(new Uint8Array([1, 2, 3]), 'image/webp', env, async url => { calls.push(url); return Response.json(false) })
  assert.equal(result.status, 507)
  assert.equal(calls.length, 1)
})

test('free storage reserves bytes atomically, cannot overwrite, then queues publication without leaking credentials', async () => {
  const calls = []
  const result = await storeFreeMedia(new Uint8Array([1, 2, 3]), 'image/webp', env, async (url, init) => {
    calls.push({ url, init })
    return Response.json(true)
  })
  const body = await result.text()
  assert.equal(result.status, 200)
  assert.equal(JSON.parse(body).pendingPublication, true)
  assert.doesNotMatch(body, /private|supabase\.co/)
  assert.equal(calls.length, 3)
  assert.equal(JSON.parse(calls[0].init.body).p_size, 3)
  assert.match(JSON.parse(calls[0].init.body).p_sha256, /^[a-f0-9]{64}$/)
  assert.equal(calls[1].init.headers['x-upsert'], 'false')
  for (const call of calls) assert.equal(call.init.redirect, 'manual')
})

test('free storage failures do not fall back to paid R2 or queue invalid uploads', async () => {
  let calls = 0
  const result = await storeFreeMedia(new Uint8Array([1]), 'image/webp', env, async () => ++calls === 1 ? Response.json(true) : new Response('', { status: 503 }))
  assert.equal(result.status, 503)
  assert.equal(calls, 2)
})

test('staging SQL restricts private counters and RPCs while exposing only ready public media metadata', async () => {
  const sql = await readFile(new URL('../supabase/free_media_staging_v1.sql', import.meta.url), 'utf8')
  assert.match(sql, /for update/)
  assert.match(sql, /262144000/)
  assert.match(sql, /where ready/)
  assert.match(sql, /revoke all on function public.konsey_reserve_free_media\(text, integer, text\) from public, anon, authenticated/)
  assert.doesNotMatch(sql, /grant.*(?:insert|update).*to (?:anon|authenticated)/i)
  assert.doesNotMatch(sql, /delete from|drop table|alter table storage/i)
})
