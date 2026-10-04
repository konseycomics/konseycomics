import { test } from 'node:test'
import assert from 'node:assert/strict'
import { saveSeriesTitle, validateSeriesTitle } from '../app/lib/seriesTitle.js'

function mockClient(existing = null, error = null) {
  const writes = []
  const query = {
    select() { return this }, eq() { return this },
    async maybeSingle() { return { data: existing, error: null } },
    insert(payload) { writes.push(['insert', payload]); return this },
    update(payload) { writes.push(['update', payload]); return this },
    async single() { return { data: error ? null : { id: existing?.id || 'new' }, error } },
  }
  return { from: () => query, writes }
}

test('Optional series title: disabled means no insert', async () => {
  const client = mockClient()
  assert.equal(await saveSeriesTitle(client, 'series', false, ''), null)
  assert.deepEqual(client.writes, [])
})
test('Series title has a fixed completion rule and no level threshold', async () => {
  const client = mockClient()
  await saveSeriesTitle(client, 'series', true, '  Kahraman  ')
  const [method, payload] = client.writes[0]
  assert.equal(method, 'insert')
  assert.equal(payload.isim, 'Kahraman')
  assert.equal(payload.seri_id, 'series')
  assert.equal(payload.kazanma_tipi, 'series')
  assert.equal(payload.gereken_seviye, null)
  assert.equal(payload.kod, 'seri_series')
})
test('Editing or retrying updates the same definition; disabling preserves it', async () => {
  const client = mockClient({ id: 'existing' })
  await saveSeriesTitle(client, 'series', true, 'Yeni Ad')
  await saveSeriesTitle(client, 'series', false, 'Yeni Ad')
  assert.equal(client.writes[0][0], 'update')
  assert.deepEqual(client.writes[1], ['update', { aktif: false }])
})
test('Invalid names and denied writes are not reported as success', async () => {
  assert.throws(() => validateSeriesTitle(true, '  '))
  assert.throws(() => validateSeriesTitle(true, 'x'.repeat(81)))
  assert.doesNotThrow(() => validateSeriesTitle(false, ''))
  await assert.rejects(saveSeriesTitle(mockClient(null, new Error('Denied')), 's', true, 'Ad'), /Denied/)
})
