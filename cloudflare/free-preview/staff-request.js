import { canUseStaffPrivileges } from '../../app/lib/roles.js'

const reply = (error, status) => Response.json({ error }, { status })

export async function authorizePreviewStaff(request, env, fetcher = fetch) {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1]
  if (!token) return { error: reply('Oturum bulunamadi.', 401) }
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return { error: reply('Gecersiz kaynak.', 403) }
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_KEY) return { error: reply('Test ayarlari hazir degil.', 503) }
  const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')
  const auth = await fetcher(`${base}/auth/v1/user`, { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_KEY, Authorization: `Bearer ${token}` } })
  if (auth.status === 401 || auth.status === 403) return { error: reply('Oturum gecersiz.', 401) }
  if (!auth.ok) return { error: reply('Oturum kontrol edilemedi.', 503) }
  const user = await auth.json()
  if (!/^[a-f0-9-]{36}$/i.test(user.id || '')) return { error: reply('Oturum gecersiz.', 401) }
  const query = new URLSearchParams({ select: 'rol,askiya_alindi', id: `eq.${user.id}` })
  const profile = await fetcher(`${base}/rest/v1/profiller?${query}`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } })
  if (!profile.ok) return { error: reply('Yetki kontrol edilemedi.', 503) }
  const rows = await profile.json()
  if (rows.length !== 1 || !canUseStaffPrivileges(rows[0])) return { error: reply('Yalnizca kurucu ve yonetici islem yapabilir.', 403) }
  return { user, base, headers: { apikey: env.NEXT_PUBLIC_SUPABASE_KEY, Authorization: `Bearer ${token}` } }
}

export async function boundedBody(request, limit) {
  if (Number(request.headers.get('content-length')) > limit) throw new RangeError()
  const reader = request.body?.getReader()
  if (!reader) return new Uint8Array()
  const parts = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) { await reader.cancel(); throw new RangeError() }
      parts.push(value)
    }
  } finally { reader.releaseLock() }
  const body = new Uint8Array(size)
  let offset = 0
  for (const part of parts) { body.set(part, offset); offset += part.length }
  return body
}
