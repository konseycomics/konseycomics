import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const source = await readFile(new URL('../app/lib/roles.js', import.meta.url), 'utf8')
const roles = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

test('Six roles; only founder and manager enter panel', () => {
  assert.equal(roles.ROLES.length, 6)
  for (const { value } of roles.ROLES) {
    assert.equal(roles.canAccessPanel(value), ['kurucu', 'yonetici'].includes(value))
    assert.equal(roles.isTeamRole(value), value !== 'okuyucu')
  }
  for (const value of ['admin', 'editor', 'grafik', 'moderator', null]) {
    assert.equal(roles.canAccessPanel(value), false)
    assert.equal(roles.isTeamRole(value), false)
  }
})
test('Manager cannot manage accounts, global settings or Instagram', () => {
  for (const section of ['kullanicilar', 'anasayfa', 'sayfalar', 'sosyalmedya', 'istatistik']) {
    assert.equal(roles.canManageSection('yonetici', section), false)
    assert.equal(roles.canManageSection('kurucu', section), true)
  }
  for (const section of ['yayin', 'seriler', 'bolumler', 'forum', 'unvanlar']) {
    assert.equal(roles.canManageSection('yonetici', section), true)
  }
  assert.equal(roles.canUseStaffPrivileges({ rol: 'kurucu', askiya_alindi: true }), false)
  assert.equal(roles.canUseStaffPrivileges({ rol: 'yonetici', askiya_alindi: false }), true)
})
