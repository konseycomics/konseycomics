import { authorizePreviewStaff, boundedBody } from './staff-request.js'

const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const MAX_BODY_BYTES = MAX_IMAGE_BYTES + 65536
const BUCKETS = new Set(['kapaklar', 'bolum-kapaklari', 'site', 'avatarlar', 'forum'])
const reply = (error, status) => Response.json({ error }, { status })

function imageType(bytes) {
  if (bytes.length >= 12 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg'
  if (bytes.length >= 16 && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF'
    && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP') return 'image/webp'
  return null
}

export async function uploadPreviewImage(request, env, fetcher = fetch) {
  try {
    const access = await authorizePreviewStaff(request, env, fetcher)
    if (access.error) return access.error
    const { user } = access
    if (!env.MEDIA_PREVIEW) return reply('Test yukleme ayarlari hazir degil.', 503)
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) return reply('Gecersiz yukleme.', 400)
    const body = await boundedBody(request, MAX_BODY_BYTES)
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
