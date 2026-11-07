import { authorizePreviewStaff, boundedBody } from './staff-request.js'

const reply = (error, status) => Response.json({ error }, { status })
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const image = /^https:\/\/cdn\.konseycomics\.com\/preview-uploads\/[a-f0-9-]+\.(webp|jpg)$/

export async function createPreviewChapter(request, env, fetcher = fetch) {
  try {
    const access = await authorizePreviewStaff(request, env, fetcher)
    if (access.error) return access.error
    if (!request.headers.get('content-type')?.startsWith('application/json')) return reply('Gecersiz istek.', 400)
    let form
    try { form = JSON.parse(new TextDecoder().decode(await boundedBody(request, 16384))) }
    catch (error) { if (error instanceof RangeError) throw error; return reply('Gecersiz form.', 400) }
    if (!form || !uuid.test(form.request_id || '') || !uuid.test(form.seri_id || '')
      || !Number.isInteger(form.sayi) || form.sayi < 1 || form.sayi > 9999
      || typeof form.baslik !== 'string' || !form.baslik.trim() || form.baslik.length > 120
      || !Array.isArray(form.sayfalar) || form.sayfalar.length < 1 || form.sayfalar.length > 50
      || form.sayfalar.some(url => typeof url !== 'string' || !image.test(url))
      || (form.kapak_url && !image.test(form.kapak_url))) return reply('Test bolumu bilgilerini ve gorsellerini kontrol et.', 400)
    // One database transaction creates both chapter and ordered pages under caller RLS.
    const response = await fetcher(`${access.base}/rest/v1/rpc/konsey_preview_chapter_draft`, {
      method: 'POST', headers: { ...access.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_id: form.request_id, p_seri_id: form.seri_id, p_sayi: form.sayi, p_baslik: form.baslik.trim(), p_kapak_url: form.kapak_url || '', p_sayfalar: form.sayfalar }),
    })
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}))
      if (detail.code === 'PGRST202') return reply('Bolum testi icin SQL kurulumu once calistirilmali.', 503)
      return reply('Test bolumu kaydedilemedi. Test serisini, bolum numarasini ve veritabani izinlerini kontrol et.', response.status === 401 || response.status === 403 ? 403 : 409)
    }
    const chapter = await response.json()
    if (chapter?.id !== form.request_id || chapter?.yayin_durumu !== 'taslak') return reply('Kayit sonucu dogrulanamadi; bolum listesini kontrol et.', 502)
    return Response.json({ ok: true, chapter, preview: true }, { status: 201 })
  } catch (error) {
    return reply(error instanceof RangeError ? 'Form boyutu siniri asildi.' : 'Test bolumu kaydedilemedi.', error instanceof RangeError ? 413 : 500)
  }
}
