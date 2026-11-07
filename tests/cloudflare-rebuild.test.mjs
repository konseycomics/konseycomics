import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runPreviewRebuild, previewRebuildRoute } from '../cloudflare/free-preview/rebuild.js'
import { getContentRevision } from '../cloudflare/free-preview/content-revision.mjs'

function fixture({ claim = { lease_id: 'lease', revision: '2' }, role = 'kurucu', run = {}, githubStatus = 200 } = {}) {
  const calls = []
  const env = { KONSEY_PREVIEW_REBUILD: '1', NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'database-private', GITHUB_PREVIEW_ACTIONS_TOKEN: 'github-private', ASSETS: { fetch: async () => Response.json({ contentRevision: '1' }) } }
  const fetcher = async (url, options = {}) => {
    calls.push({ url, options, body: options.body ? JSON.parse(options.body) : null })
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: '00000000-0000-4000-8000-000000000001' })
    if (url.includes('/profiller?')) return Response.json([{ rol: role, askiya_alindi: false }])
    if (url.endsWith('/konsey_preview_claim_rebuild')) return Response.json(claim)
    if (url.endsWith('/konsey_preview_finish_rebuild')) return new Response(null, { status: 204 })
    if (url.endsWith('/konsey_preview_request_rebuild')) return Response.json('2')
    if (url.includes('/konsey_preview_rebuild?')) return Response.json([{ revision: 1, status: 'queued', deployed_revision: 0 }])
    if (url.includes('/actions/workflows/')) return Response.json({ workflow_runs: [{ id: 123, path: '.github/workflows/cloudflare-free-preview.yml', head_branch: 'codex/cloudflare-free-preview', head_repository: { full_name: 'konseycomics/konseycomics' }, event: 'push', status: 'completed', created_at: new Date().toISOString(), ...run }] }, { status: githubStatus })
    if (url.endsWith('/rerun')) return new Response(null, { status: 201 })
    throw new Error('Unexpected fetch')
  }
  return { env, fetcher, calls }
}

test('only the trusted preview workflow can be rerun and each service receives only its own credential', async () => {
  const { env, fetcher, calls } = fixture()
  assert.deepEqual(await runPreviewRebuild(env, true, fetcher), { state: 'queued', runId: 123 })
  const claim = calls.find(c => c.url.endsWith('/konsey_preview_claim_rebuild'))
  assert.deepEqual(claim.body, { p_deployed_revision: '1', p_force: true })
  assert.equal(calls.filter(c => c.url.endsWith('/rerun')).length, 1)
  for (const call of calls) {
    assert.equal(call.options.redirect, 'manual')
    assert.equal(call.options.headers.Authorization, call.url.startsWith('https://api.github.com/') ? 'Bearer github-private' : 'Bearer database-private')
  }
  assert.equal(calls.at(-1).body.p_result, 'queued')
})

test('a durable denied claim means no GitHub calls, covering concurrent leases and daily cap', async () => {
  const { env, fetcher, calls } = fixture({ claim: null })
  assert.deepEqual(await runPreviewRebuild(env, false, fetcher), { state: 'idle' })
  assert.equal(calls.length, 1)
})

test('active runs are not duplicated and invalid workflow identities fail closed', async () => {
  const busy = fixture({ run: { status: 'in_progress' } })
  assert.equal((await runPreviewRebuild(busy.env, false, busy.fetcher)).state, 'busy')
  assert.equal(busy.calls.at(-1).body.p_result, 'busy')
  for (const run of [{ head_branch: 'main' }, { path: '.github/workflows/other.yml' }, { head_repository: { full_name: 'attacker/repo' } }, { event: 'pull_request' }]) {
    const { env, fetcher, calls } = fixture({ run })
    assert.equal((await runPreviewRebuild(env, false, fetcher)).state, 'failed')
    assert.equal(calls.some(c => c.url.endsWith('/rerun')), false)
  }
})

test('old runs and API failures do not report successful queueing', async () => {
  const old = fixture({ run: { created_at: '2000-01-01T00:00:00Z' } })
  assert.equal((await runPreviewRebuild(old.env, false, old.fetcher)).state, 'new_code_push_required')
  const failed = fixture({ githubStatus: 403 })
  assert.equal((await runPreviewRebuild(failed.env, false, failed.fetcher)).state, 'failed')
  assert.equal(failed.calls.at(-1).body.p_result, 'error')
  const exhausted = fixture({ run: { run_attempt: 49 } })
  assert.equal((await runPreviewRebuild(exhausted.env, false, exhausted.fetcher)).state, 'new_code_push_required')
})

test('staff-only refresh endpoints retain user RLS and never expose credentials', async () => {
  const noAuth = new Request('https://preview.invalid/api/preview/refresh')
  assert.equal((await previewRebuildRoute(noAuth, {})).status, 401)
  const reader = fixture({ role: 'okuyucu' })
  const request = method => new Request('https://preview.invalid/api/preview/refresh', { method, headers: { Authorization: 'Bearer user-session' }, ...(method === 'POST' ? { body: '{}' } : {}) })
  assert.equal((await previewRebuildRoute(request('POST'), reader.env, reader.fetcher)).status, 403)
  const staff = fixture()
  const post = await previewRebuildRoute(request('POST'), staff.env, staff.fetcher)
  assert.equal(post.status, 202)
  assert.equal(staff.calls.find(c => c.url.endsWith('/konsey_preview_request_rebuild')).options.headers.Authorization, 'Bearer user-session')
  assert.equal((await post.text()).includes('private'), false)
  const get = await previewRebuildRoute(request('GET'), staff.env, staff.fetcher)
  assert.equal((await get.json()).status, 'current')
})

test('build revision reads only the anonymous RPC and fails on broken refresh', async () => {
  const { env } = fixture()
  assert.equal(await getContentRevision(env, async (url, options) => {
    assert.ok(url.endsWith('/konsey_preview_revision'))
    assert.equal(options.headers.Authorization, 'Bearer anon')
    assert.equal(options.redirect, 'manual')
    return Response.json('42')
  }), '42')
  await assert.rejects(getContentRevision(env, async () => new Response('', { status: 503 })))
  await assert.rejects(getContentRevision(env, async () => Response.json('invalid')))
})

test('redirect responses are rejected, not followed or reported as a queued build', async () => {
  const { env, fetcher, calls } = fixture()
  const result = await runPreviewRebuild(env, false, async (url, options) => {
    if (url.startsWith('https://api.github.com/')) return new Response(null, { status: 302, headers: { Location: 'https://other.invalid/' } })
    return fetcher(url, options)
  })
  assert.equal(result.state, 'failed')
  assert.equal(calls.at(-1).body.p_result, 'error')
  assert.equal(calls.some(c => c.url.startsWith('https://other.invalid/')), false)
})

test('refresh failures identify their phase without exposing error details or credentials', async () => {
  const { env, fetcher } = fixture()
  const request = new Request('https://preview.invalid/api/preview/refresh', { headers: { Authorization: 'Bearer session' } })
  const result = await previewRebuildRoute(request, { ...env, ASSETS: { fetch() { throw new TypeError('sensitive diagnostic must not escape') } } }, fetcher)
  const payload = await result.json()
  assert.equal(result.status, 503)
  assert.equal(payload.code, 'REFRESH_SNAPSHOT_STATUS')
  assert.equal(JSON.stringify(payload).includes('sensitive'), false)
})

test('SQL queue has durable locking, a six-per-day cap, narrow grants and metric/draft exclusions', async () => {
  const sql = await readFile(new URL('../supabase/preview_rebuild_v1.sql', import.meta.url), 'utf8')
  assert.match(sql, /enable row level security/)
  assert.match(sql, /where id for update/)
  assert.match(sql, /state.attempts >= 6/)
  assert.match(sql, /interval '20 minutes'/)
  assert.match(sql, /interval '2 minutes'/)
  assert.match(sql, /goruntuleme_sayisi/)
  assert.match(sql, /'taslak'/)
  assert.match(sql, /yayin_durumu = 'planlandi'/)
  assert.match(sql, /konsey_preview_claim_rebuild\(bigint, boolean\) from public, anon, authenticated/)
  assert.doesNotMatch(sql, /execute .*anon.*konsey_preview_claim_rebuild/)
})
