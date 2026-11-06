import assert from 'node:assert/strict'

const base = process.env.AUDIT_BASE || 'https://konseycomics-free-preview.konseycomics.workers.dev'
const checks = [
  ['/giris', 'GET', 200],
  ['/api/auth/login', 'POST', 400],
  ['/api/auth/sync-profile', 'POST', 400],
  ['/api/auth/sync-profile', 'POST', 401, { accessToken: 'invalid-preview-test-token' }],
  ['/api/media/upload', 'POST', 403],
  ['/api/community/topics', 'POST', 403],
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
