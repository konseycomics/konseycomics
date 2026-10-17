import { isPublished } from './seoRules.js'

export async function loadPublicReaderData(db, payload, number) {
  const summary = payload?.chapters.find(row => String(row.sayi) === String(number))
  if (!summary || !isPublished(payload.series) || !isPublished(summary)) return null
  const [chapterResult, pagesResult, settingsResult] = await Promise.all([
    db.from('bolumler').select('*, cevirmen:ekip!cevirmen_id(isim), balonlama:ekip!balonlama_id(isim), grafik:ekip!grafik_id(isim)').eq('id', summary.id).maybeSingle(),
    db.from('bolum_sayfalari').select('gorsel_url').eq('bolum_id', summary.id).order('sira', { ascending: true }),
    db.from('site_ayarlari').select('deger').eq('anahtar', 'seri_detay_vitrin').maybeSingle(),
  ])
  if (chapterResult.error || pagesResult.error || settingsResult.error) throw new Error('Public reader query failed')
  if (!chapterResult.data || !isPublished(chapterResult.data)) return null
  return {
    series: payload.series,
    chapter: { ...chapterResult.data, seriBaslik: payload.series.baslik },
    chapters: payload.chapters,
    pages: (pagesResult.data || []).map(row => row.gorsel_url).filter(Boolean),
    settings: settingsResult.data?.deger?.[String(payload.series.id)] || {},
  }
}
