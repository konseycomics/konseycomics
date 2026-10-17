import test from 'node:test'
import assert from 'node:assert/strict'
import { relativeTime } from '../app/lib/relativeTime.js'

test('timestamps without timezone represent the same UTC instant across server/browser timezones', () => {
  const original = process.env.TZ
  try {
    for (const tz of ['UTC', 'Europe/Istanbul', 'America/New_York']) {
      process.env.TZ = tz
      assert.equal(relativeTime('2026-10-16T18:00:00', Date.parse('2026-10-17T08:00:00Z')), '14s önce')
      assert.equal(relativeTime('2026-10-16T18:00:00Z', Date.parse('2026-10-17T08:00:00Z')), '14s önce')
      assert.equal(relativeTime('2026-10-16T21:00:00+03:00', Date.parse('2026-10-17T08:00:00Z')), '14s önce')
    }
  } finally {
    if (original === undefined) delete process.env.TZ
    else process.env.TZ = original
  }
})

test('relative labels use the shared render timestamp and clamp future dates', () => {
  const now = Date.parse('2026-10-17T08:00:00Z')
  assert.equal(relativeTime('2026-10-17T08:01:00Z', now), 'Az önce')
  assert.equal(relativeTime('2026-10-17T07:58:00Z', now), '2dk önce')
  assert.equal(relativeTime('2026-10-15T08:00:00Z', now), '2g önce')
  assert.equal(relativeTime('bad', now), '')
  assert.equal(relativeTime('2026-10-17T08:00:00Z', null), '')
})

test('older dates use a fixed Turkish timezone', () => {
  assert.equal(relativeTime('2026-09-01T23:30:00Z', Date.parse('2026-10-17T08:00:00Z')), '2 Eyl')
})
