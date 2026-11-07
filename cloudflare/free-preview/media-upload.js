import { canUseStaffPrivileges } from '../../app/lib/roles.js'

const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const MAX_BODY_BYTES = MAX_IMAGE_BYTES + 65536
const BUCKETS = new Set(['kapaklar', 'bolum-kapaklari', 'site', 'avatarlar', 'forum'])
const reply = (error, status) => Response.json({ error }, { status })

async function boundedBody(request) {
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) throw new RangeError()
  const reader = request.body?.getReader()
  if (!reader) return new Uint8Array()
  const parts = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new RangeError() }
      parts.push(value)
    }
  } finally { reader.releaseLock() }
  const body = new Uint8Array(size)
  let offset = 0
  for (const part of parts) { body.set(part, offset); offset += part.length }
  return body
}

function imageType(bytes) {
  if (bytes.length >= 12 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg'
  if (bytes.length >= 16 && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF'
    && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP') return 'image/webp'
  return null
}

export async function uploadPreviewImage(request, env, fetcher = fetch) {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1]
  if (!token) return reply('Oturum bulunamadi.', 401)
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return reply('Gecersiz kaynak.', 403)
  if (!env.MEDIA_PREVIEW || !env.SUPABASE_SERVICE_ROLE_KEY || !env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_KEY) return reply('Test yukleme ayarlari hazir degil.', 503)
  try {
    const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')
    const auth = await fetcher(`${base}/auth/v1/user`, { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_KEY, Authorization: `Bearer ${token}` } })
    if (auth.status === 401 || auth.status === 403) return reply('Oturum gecersiz.', 401)
    if (!auth.ok) return reply('Oturum kontrol edilemedi.', 503)
    const user = await auth.json()
    if (!/^[a-f0-9-]{36}$/i.test(user.id || '')) return reply('Oturum gecersiz.', 401)
    const query = new URLSearchParams({ select: 'rol,askiya_alindi', id: `eq.${user.id}` })
    const profile = await fetcher(`${base}/rest/v1/profiller?${query}`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } })
    if (!profile.ok) return reply('Yetki kontrol edilemedi.', 503)
    const rows = await profile.json()
    if (rows.length !== 1 || !canUseStaffPrivileges(rows[0])) return reply('Yalnizca kurucu ve yonetici yukleyebilir.', 403)
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) return reply('Gecersiz yukleme.', 400)
    const body = await boundedBody(request)
    const form = await new Response(body, { headers: { 'Content-Type': request.headers.get('content-type') } }).formData()
    const file = form.get('file')
    if (!BUCKETS.has(String(form.get('bucket')))) return reply('Gecersiz gorsel kategorisi.', 400)
    if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) return reply('Gorsel bulunamadi.', 400)
    if (file.size > MAX_IMAGE_BYTES) return reply('Islenmis gorsel en fazla 4 MB olabilir.', 413)
    const bytes = new Uint8Array(await file.arrayBuffer())
    const type = imageType(bytes)
    if (!type || type !== file.type) return reply('Yalnizca JPEG ve WebP gorseller yuklenebilir.', 400)
    // Test uploads cannot target or overwrite production keys, even with crafted input.
    const key = `preview-uploads/${crypto.randomUUID()}.${type === 'image/webp' ? 'webp' : 'jpg'}`
    const stored = await env.MEDIA_PREVIEW.put(key, bytes, {
      onlyIf: { etagDoesNotMatch: '*' },
      httpMetadata: { contentType: type, cacheControl: 'public, max-age=86400' },
      customMetadata: { purpose: 'free-preview-upload-test', uploader: user.id },
    })
    if (!stored) return reply('Dosya kaydedilemedi; tekrar dene.', 409)
    return Response.json({ ok: true, url: `https://cdn.konseycomics.com/${key}`, key, optimizedBytes: bytes.length, preview: true })
  } catch (error) {
    if (error instanceof RangeError) return reply('Yukleme boyutu siniri asildi.', 413)
    return reply('Gorsel yuklenemedi. Lutfen tekrar dene.', 500)
  }
}
