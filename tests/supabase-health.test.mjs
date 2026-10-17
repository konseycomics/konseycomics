import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const source = await readFile(new URL('../app/lib/supabaseHealth.js', import.meta.url), 'utf8')
const { checkSupabaseHealth, probeSupabaseHealth, createHealthMonitor } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
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
test('quota/auth restrictions trigger maintenance without retry', async () => {
  for (const status of [401, 402, 403]) {
    let calls = 0
    assert.equal(await checkSupabaseHealth({ ...config, fetchImpl: async () => { calls++; return { ok: false, status } } }), false)
    assert.equal(calls, 1)
  }
})

test('rate limits are transient, response bodies are released', async () => {
  let calls = 0
  let canceled = 0
  const result = await probeSupabaseHealth({ ...config, fetchImpl: async () => {
    calls++
    return { ok: false, status: 429, body: { cancel: async () => { canceled++ } } }
  } })
  assert.deepEqual(result, { healthy: false, definitive: false, reason: 'http_error', status: 429 })
  assert.equal(calls, 2)
  assert.equal(canceled, 2)
})

test('recent healthy state tolerates two failures, sustained outage blocks, recovery is checked in 10 seconds', async () => {
  let time = 0
  let calls = 0
  let result = { healthy: true }
  const failures = []
  const health = createHealthMonitor({ now: () => time, probe: async () => { calls++; return result }, onFailure: item => failures.push(item) })
  assert.equal(await health(), true)
  result = { healthy: false, definitive: false, reason: 'timeout' }
  time = 60000
  assert.equal(await health(), true)
  time += 10000
  assert.equal(await health(), true)
  time += 10000
  assert.equal(await health(), false)
  result = { healthy: true }
  time += 9999
  assert.equal(await health(), false)
  assert.equal(calls, 4)
  time++
  assert.equal(await health(), true)
  assert.deepEqual(failures.map(f => f.maintenance), [false, false, true])
})

test('cold start and quota failures never use a grace period', async () => {
  for (const definitive of [true, false]) {
    const health = createHealthMonitor({ probe: async () => ({ healthy: false, definitive, reason: 'http_error' }) })
    assert.equal(await health(), false)
  }
  let time = 0
  let result = { healthy: true }
  const health = createHealthMonitor({ now: () => time, probe: async () => result })
  await health()
  time = 60000
  result = { healthy: false, definitive: true, status: 402 }
  assert.equal(await health(), false)
})

test('grace period expires even with fewer than three failed rounds', async () => {
  let time = 0
  let result = { healthy: true }
  const health = createHealthMonitor({ now: () => time, probe: async () => result })
  await health()
  time = 120000
  result = { healthy: false, definitive: false }
  assert.equal(await health(), false)
})

test('concurrent health checks share one pending probe', async () => {
  let calls = 0
  let resolve
  const health = createHealthMonitor({ probe: () => { calls++; return new Promise(done => { resolve = done }) } })
  const first = health()
  const second = health()
  assert.equal(calls, 1)
  resolve({ healthy: true })
  assert.deepEqual(await Promise.all([first, second]), [true, true])
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
