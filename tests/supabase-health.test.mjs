import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const source = await readFile(new URL('../app/lib/supabaseHealth.js', import.meta.url), 'utf8')
const { checkSupabaseHealth } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const config = { url: 'https://example.test', key: 'test-only-key' }

test('healthy database does not issue a second request', async () => {
  let calls = 0
  assert.equal(await checkSupabaseHealth({ ...config, fetchImpl: async () => { calls++; return { ok: true } } }), true)
  assert.equal(calls, 1)
})
test('one transient network or server failure is confirmed before maintenance', async () => {
  for (const failure of ['network', 'server']) {
    let calls = 0
    const fetchImpl = async () => {
      calls++
      if (calls === 1 && failure === 'network') throw new Error('temporary failure')
      return calls === 1 ? { ok: false, status: 503 } : { ok: true }
    }
    assert.equal(await checkSupabaseHealth({ ...config, fetchImpl }), true)
    assert.equal(calls, 2)
  }
})
test('quota/auth/rate-limit restrictions trigger maintenance without retry', async () => {
  for (const status of [401, 402, 403, 429]) {
    let calls = 0
    assert.equal(await checkSupabaseHealth({ ...config, fetchImpl: async () => { calls++; return { ok: false, status } } }), false)
    assert.equal(calls, 1)
  }
})
test('persistent server failure and missing configuration remain unhealthy', async () => {
  let calls = 0
  assert.equal(await checkSupabaseHealth({ ...config, fetchImpl: async () => { calls++; return { ok: false, status: 503 } } }), false)
  assert.equal(calls, 2)
  assert.equal(await checkSupabaseHealth({}), false)
  assert.equal(await checkSupabaseHealth({ url: 'invalid', key: 'test' }), false)
})
test('both attempts have bounded timeouts', async () => {
  let calls = 0
  const fetchImpl = (_, { signal }) => new Promise((_, reject) => {
    calls++
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
  })
  assert.equal(await checkSupabaseHealth({ ...config, timeoutMs: 5, fetchImpl }), false)
  assert.equal(calls, 2)
})
