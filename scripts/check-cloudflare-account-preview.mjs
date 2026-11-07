import assert from 'node:assert/strict'

const base = process.env.AUDIT_BASE || 'https://konseycomics-free-preview.konseycomics.workers.dev'
const checks = [
  ['/giris', 'GET', 200],
  ['/api/auth/login', 'POST', 400],
  ['/api/auth/sync-profile', 'POST', 400],
  ['/api/auth/sync-profile', 'POST', 401, { accessToken: 'invalid-preview-test-token' }],
  ['/api/media/upload', 'POST', 401],
  ['/api/preview/series', 'POST', 401],
  ['/api/preview/chapters', 'POST', 401],
  ['/api/preview/refresh', 'GET', 401],
  ['/api/preview/refresh', 'POST', 401],
  ['/api/community/topics', 'POST', 401],
  ['/api/community/replies', 'POST', 401],
  ['/api/community/reactions/toggle', 'POST', 401],
  ['/api/community/polls/vote', 'POST', 401],
  ['/api/community/reports', 'POST', 401],
  ['/api/community/topics/manage', 'POST', 401],
  ['/api/community/moderation', 'GET', 401],
  ['/api/community/moderation', 'POST', 401],
  ['/api/comments/delete', 'POST', 401],
  ['/api/notifications/new-chapter', 'POST', 401],
  ['/api/leaderboard/sync', 'POST', 401],
  ['/api/instagram/process', 'POST', 403],
  ['/_vinext/static-cache/public-pages.json', 'GET', 404],
]
for (const [path, method, expected, body = {}] of checks) {
  const response = await fetch(base + path, {
    method,
    ...(method === 'POST' ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  })
  assert.equal(response.status, expected, `${method} ${path}`)
  assert.match(response.headers.get('x-robots-tag'), /noindex/)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  if (path === '/giris') {
    assert.match(await response.text(), /Bu form spam koruması/, 'Login HTML must include the configured CAPTCHA widget')
  } else {
    await response.body?.cancel()
  }
  console.log(`${method} ${path}: ${response.status}`)
}
console.log('Unauthenticated boundaries passed. Real sign-in and uploads are NOT verified by this check.')
