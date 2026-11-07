export async function getContentRevision(env, fetcher = fetch) {
  const response = await fetcher(`${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/konsey_preview_revision`, {
    method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(10000),
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_KEY}`, 'Content-Type': 'application/json' }, body: '{}',
  })
  if (!response.ok) throw new Error('Content revision is unavailable; do not deploy stale snapshots.')
  const revision = await response.json()
  if (!/^\d+$/.test(String(revision))) throw new Error('Invalid public content revision')
  return String(revision)
}
