import { createSupabaseAdminClient, getLeaderboards } from '../../app/lib/leaderboardData.js'

const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' }

export async function publicLeaderboard(request, env, ctx, { cache, load } = {}) {
  if (request.method !== 'GET' || request.headers.has('next-action')) {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { ...headers, Allow: 'GET' } })
  }
  const key = new Request(new URL('/api/public/leaderboard?version=1', request.url))
  try {
    const cached = await cache?.match(key)
    if (cached) return new Response(cached.body, { headers: { 'Content-Type': 'application/json', ...headers } })
    const admin = load ? null : createSupabaseAdminClient(env)
    if (!load && !admin) throw new Error('Leaderboard unavailable')
    const result = await (load ? load() : getLeaderboards(admin))
    // Never expose raw reads, credentials, private profiles or arbitrary loader fields.
    const tum = (result.tum || []).slice(0, 5).map(row => ({
      id: row.id,
      kullanici_adi: row.kullanici_adi,
      avatar_url: row.avatar_url || '',
      unvan: row.unvan || '',
      ekip_uyesi: Boolean(row.ekip_uyesi),
      ekip_rolu: row.ekip_rolu || '',
      okumaSayisi: Math.max(0, Number(row.okumaSayisi) || 0),
    }))
    const body = JSON.stringify({ tum })
    if (cache) ctx.waitUntil(cache.put(key, new Response(body, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    })).catch(() => {}))
    return new Response(body, { headers: { 'Content-Type': 'application/json', ...headers } })
  } catch {
    return Response.json({ error: 'Siralama su anda yuklenemedi.' }, { status: 503, headers })
  }
}
