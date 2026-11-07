import { authorizePreviewStaff, boundedBody } from './staff-request.js'

const ROOT = 'https://api.github.com/repos/konseycomics/konseycomics'
const BRANCH = 'codex/cloudflare-free-preview'
const WORKFLOW = '.github/workflows/cloudflare-free-preview.yml'
const reply = (error, status) => Response.json({ error }, { status })

async function rpc(env, name, args, fetcher) {
  const response = await fetcher(`${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${name}`, {
    method: 'POST', redirect: 'error', headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    }, body: JSON.stringify(args),
  })
  if (!response.ok) throw new Error('Rebuild database request failed')
  return response.status === 204 ? null : response.json()
}

export async function runPreviewRebuild(env, force = false, fetcher = fetch) {
  if (env.KONSEY_PREVIEW_REBUILD !== '1' || !env.GITHUB_PREVIEW_ACTIONS_TOKEN || !env.SUPABASE_SERVICE_ROLE_KEY || !env.ASSETS) return { state: 'not_configured' }
  let claim
  const finish = (result, runId = null) => rpc(env, 'konsey_preview_finish_rebuild', { p_lease_id: claim.lease_id, p_run_id: runId, p_result: result }, fetcher)
  try {
    const asset = await env.ASSETS.fetch('https://vinext.invalid/_vinext/static-cache/public-pages.json')
    if (!asset.ok) return { state: 'snapshot_unavailable' }
    const manifest = await asset.json()
    const revision = /^\d+$/.test(String(manifest.contentRevision || '')) ? String(manifest.contentRevision) : null
    claim = await rpc(env, 'konsey_preview_claim_rebuild', { p_deployed_revision: revision, p_force: force }, fetcher)
    if (!claim) return { state: 'idle' }
    const headers = { Authorization: `Bearer ${env.GITHUB_PREVIEW_ACTIONS_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10', 'User-Agent': 'KonseyComics-preview-rebuild' }
    const listing = await fetcher(`${ROOT}/actions/workflows/cloudflare-free-preview.yml/runs?branch=${encodeURIComponent(BRANCH)}&event=push&per_page=1`, { headers, redirect: 'error' })
    if (!listing.ok) throw new Error('Workflow lookup failed')
    const run = (await listing.json()).workflow_runs?.[0]
    const trustedPaths = [WORKFLOW, `${WORKFLOW}@${BRANCH}`, `${WORKFLOW}@refs/heads/${BRANCH}`]
    if (!run || !Number.isSafeInteger(run.id) || run.id <= 0 || run.head_branch !== BRANCH || !trustedPaths.includes(run.path)
      || run.head_repository?.full_name !== 'konseycomics/konseycomics' || run.event !== 'push') throw new Error('Untrusted workflow run')
    if (run.status !== 'completed') { await finish('busy', run.id); return { state: 'busy', runId: run.id } }
    // GitHub only permits reruns within 30 days of the original run.
    if (!Number.isFinite(Date.parse(run.created_at)) || Date.now() - Date.parse(run.created_at) > 29 * 86400000 || Number(run.run_attempt || 1) >= 49) {
      await finish('error', run.id)
      return { state: 'new_code_push_required' }
    }
    const response = await fetcher(`${ROOT}/actions/runs/${run.id}/rerun`, { method: 'POST', headers, redirect: 'error' })
    if (!response.ok) throw new Error('Workflow trigger failed')
    await response.body?.cancel()
    await finish('queued', run.id)
    return { state: 'queued', runId: run.id }
  } catch {
    if (claim) { try { await finish('error') } catch {} }
    console.warn('[preview-rebuild] Request failed; durable retry and daily limit remain in effect.')
    return { state: 'failed' }
  }
}

export async function previewRebuildRoute(request, env, fetcher = fetch) {
  try {
    const access = await authorizePreviewStaff(request, env, fetcher)
    if (access.error) return access.error
    if (env.KONSEY_PREVIEW_REBUILD !== '1' || !env.GITHUB_PREVIEW_ACTIONS_TOKEN) return reply('Yenileme kurulumu hazir degil.', 503)
    if (request.method === 'POST') {
      await boundedBody(request, 1024)
      const response = await fetcher(`${access.base}/rest/v1/rpc/konsey_preview_request_rebuild`, {
        method: 'POST', redirect: 'error', headers: { ...access.headers, 'Content-Type': 'application/json' }, body: '{}',
      })
      if (!response.ok) return reply('Yenileme istegi kaydedilemedi.', 503)
      await response.body?.cancel()
      const result = await runPreviewRebuild(env, true, fetcher)
      return Response.json(result, { status: 202 })
    }
    const response = await fetcher(`${access.base}/rest/v1/konsey_preview_rebuild?id=eq.true&select=revision,deployed_revision,status,attempts,last_run_id,last_error`, {
      redirect: 'error', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    })
    if (!response.ok) return reply('Yenileme durumu okunamadi.', 503)
    const state = (await response.json())[0] || {}
    const asset = await env.ASSETS?.fetch('https://vinext.invalid/_vinext/static-cache/public-pages.json')
    if (asset?.ok) {
      const manifest = await asset.json()
      if (manifest.contentRevision && String(manifest.contentRevision) === String(state.revision)) {
        state.status = 'current'
        state.deployed_revision = manifest.contentRevision
      }
    }
    return Response.json(state)
  } catch (error) { return reply(error instanceof RangeError ? 'Istek cok buyuk.' : 'Yenileme islemi tamamlanamadi.', error instanceof RangeError ? 413 : 503) }
}
