import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import worker from '../cloudflare/free-preview/entry.js'
import { allowsInteractiveApi, isLiveForum } from '../cloudflare/free-preview/interactive-policy.js'
import { blocksPreviewWrite } from '../cloudflare/free-preview/browser-read-only.js'

const env = { KONSEY_PREVIEW_ACCOUNTS: '1', KONSEY_PREVIEW_INTERACTIVE: '1' }

test('interactive routes require both flags and never enable arbitrary APIs or server actions', () => {
  for (const path of ['/api/community/topics', '/api/community/replies', '/api/community/reactions/toggle', '/api/notifications/new-chapter']) {
    assert.equal(allowsInteractiveApi(path, 'POST', env), true)
    assert.equal(allowsInteractiveApi(path, 'POST', {}), false)
    assert.equal(allowsInteractiveApi(path, 'POST', { KONSEY_PREVIEW_ACCOUNTS: '1' }), false)
    assert.equal(allowsInteractiveApi(path, 'DELETE', env), false)
  }
  assert.equal(allowsInteractiveApi('/api/instagram/process', 'POST', env), false)
  assert.equal(allowsInteractiveApi('/api/unknown', 'POST', env), false)
  assert.equal(isLiveForum('/forum/konu/test', env), true)
  assert.equal(isLiveForum('/seriler', env), false)
})

test('interactive browser writes retain caller RLS while read-only builds stay blocked', () => {
  const host = 'konseycomics-free-preview.konseycomics.workers.dev'
  const url = 'https://example.supabase.co/rest/v1/seriler'
  assert.equal(blocksPreviewWrite(host, url, 'POST', '1'), false)
  assert.equal(blocksPreviewWrite(host, url, 'POST', '0'), true)
})

test('interactive member endpoints reject missing auth, cross-origin and server actions before rendering', async () => {
  for (const path of ['/api/community/topics', '/api/community/replies', '/api/community/moderation', '/api/notifications/new-chapter']) {
    for (const [headers, status] of [[{}, 401], [{ origin: 'https://evil.invalid' }, 403], [{ 'next-action': 'anything' }, 403]]) {
      const response = await worker.fetch(new Request(`https://preview.invalid${path}`, { method: 'POST', headers }), env, {})
      assert.equal(response.status, status)
      assert.equal(response.headers.get('cache-control'), 'no-store')
      assert.match(response.headers.get('x-robots-tag'), /noindex/)
    }
  }
})

test('interactive panel uses normal content flow rather than silently forcing test drafts', async () => {
  const source = await readFile(new URL('../app/admin/page.js', import.meta.url), 'utf8')
  assert.equal(source.match(/hostname === 'konseycomics-free-preview.konseycomics.workers.dev' && process.env.NEXT_PUBLIC_PREVIEW_INTERACTIVE !== '1'/g)?.length, 2)
  const config = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8')
  assert.match(config, /NEXT_PUBLIC_PREVIEW_INTERACTIVE/)
})
