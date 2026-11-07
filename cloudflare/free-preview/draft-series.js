import { authorizePreviewStaff, boundedBody } from './staff-request.js'

const reply = (error, status) => Response.json({ error }, { status })
const testCover = /^https:\/\/cdn\.konseycomics\.com\/preview-uploads\/[a-f0-9-]+\.(webp|jpg)$/

export async function createPreviewSeries(request, env, fetcher = fetch) {
  try {
    const access = await authorizePreviewStaff(request, env, fetcher)
    if (access.error) return access.error
    if (!request.headers.get('content-type')?.startsWith('application/json')) return reply('Gecersiz istek.', 400)
    let form
    try { form = JSON.parse(new TextDecoder().decode(await boundedBody(request, 16384))) }
    catch (error) { if (error instanceof RangeError) throw error; return reply('Gecersiz form.', 400) }
    if (!form || typeof form !== 'object' || Array.isArray(form) || form.id) return reply('Yalnizca yeni test serisi eklenebilir.', 400)
    const title = String(form.baslik || '').trim()
    if (!title || title.length > 120 || String(form.ozet || '').length > 3000) return reply('Baslik veya ozet uzunlugu gecersiz.', 400)
    if (form.kapak_url && !testCover.test(form.kapak_url)) return reply('Test icin yeni bir kapak yukle.', 400)
    const categoryId = form.kategori_id || null
    if (categoryId !== null && !/^(\d{1,10}|[a-f0-9-]{36})$/i.test(String(categoryId))) return reply('Kategori gecersiz.', 400)
    // No caller-supplied slug, publication flags, IDs or relationships are forwarded.
    const payload = {
      baslik: `[TEST] ${title}`, slug: `preview-test-${crypto.randomUUID()}`,
      ozet: String(form.ozet || ''), kapak_url: form.kapak_url || '',
      tur: form.tur === 'tek' ? 'tek' : 'seri', kategori_id: categoryId,
      kategori: String(form.kategori || 'Çizgi Roman').slice(0, 80),
      durum: form.tur === 'tek' ? 'Tek Sayılık' : 'Devam Eden',
      one_cikan: false, yayin_durumu: 'taslak', yayin_tarihi: null,
    }
    const response = await fetcher(`${access.base}/rest/v1/seriler?select=id,baslik,slug,yayin_durumu`, {
      method: 'POST', headers: { ...access.headers, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(payload),
    })
    if (!response.ok) return reply('Test taslagi kaydedilemedi. Veritabani yazma izinlerini kontrol etmeliyiz.', response.status === 401 || response.status === 403 ? 403 : 502)
    const rows = await response.json()
    if (rows.length !== 1 || !rows[0].id) return reply('Kayit sonucu dogrulanamadi; tekrar kaydetmeden once seri listesini kontrol et.', 502)
    return Response.json({ ok: true, series: rows[0], preview: true }, { status: 201 })
  } catch (error) {
    return reply(error instanceof RangeError ? 'Form boyutu siniri asildi.' : 'Test taslagi kaydedilemedi.', error instanceof RangeError ? 413 : 500)
  }
}
