import test from 'node:test'
import assert from 'node:assert/strict'
import { publicLeaderboard } from '../cloudflare/free-preview/public-leaderboard.js'

test('public ranking exposes only five public profiles and counts, ignoring caller identity', async () => {
  const jobs = []
  let stored
  const response = await publicLeaderboard(new Request('https://www.konseycomics.com/api/public/leaderboard?anything=1', {
    headers: { Authorization: 'Bearer private-user-token', Cookie: 'session=private' },
  }), {}, { waitUntil(job) { jobs.push(job) } }, {
    cache: { async match() { return null }, async put(key, value) { stored = { key, value } } },
    load: async () => ({ tum: Array.from({ length: 8 }, (_, id) => ({ id, kullanici_adi: `reader${id}`, okumaSayisi: 42, email: 'private@example.com', secret: 'hidden' })) }),
  })
  await Promise.all(jobs)
  const body = await response.json()
  assert.equal(response.status, 200)
  assert.equal(body.tum.length, 5)
  assert.equal(body.tum[0].okumaSayisi, 42)
  assert.equal(JSON.stringify(body).includes('private'), false)
  assert.equal(JSON.stringify(body).includes('hidden'), false)
  assert.equal(stored.key.headers.has('authorization'), false)
  assert.equal(stored.key.headers.has('cookie'), false)
  assert.equal(new URL(stored.key.url).search, '?version=1')
  assert.equal(stored.value.headers.get('cache-control'), 'public, max-age=300')
})

test('cached ranking avoids database work and retains noindex', async () => {
  const response = await publicLeaderboard(new Request('https://www.konseycomics.com/api/public/leaderboard'), {}, {}, {
    cache: { async match() { return Response.json({ tum: [{ kullanici_adi: 'reader', okumaSayisi: 8 }] }) } },
    load() { throw new Error('Must not run') },
  })
  assert.equal(response.status, 200)
  assert.match(response.headers.get('x-robots-tag'), /noindex/)
  assert.equal((await response.json()).tum[0].okumaSayisi, 8)
})

test('missing credentials and database failures never become cached empty rankings', async () => {
  for (const options of [{}, { load: async () => { throw new Error('private upstream error') } }]) {
    const response = await publicLeaderboard(new Request('https://www.konseycomics.com/api/public/leaderboard'), {}, {}, options)
    assert.equal(response.status, 503)
    assert.equal((await response.text()).includes('private'), false)
  }
})

test('public leaderboard permits no mutations or server actions', async () => {
  for (const options of [{ method: 'POST' }, { headers: { 'next-action': 'test' } }]) {
    const response = await publicLeaderboard(new Request('https://www.konseycomics.com/api/public/leaderboard', options), {}, {})
    assert.equal(response.status, 405)
  }
})
