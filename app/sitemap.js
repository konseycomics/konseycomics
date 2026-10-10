import { createSupabaseServerClient, absoluteUrl } from './lib/seo'
import { fetchAllRows, isPublished, validDate } from './lib/seoRules'

export const revalidate = 300

export default async function sitemap() {
  const db = createSupabaseServerClient()
  const [series, chapters, topics, forums, articles] = await Promise.all([
    fetchAllRows(db.from('seriler').select('id, slug, created_at, yayin_durumu, yayin_tarihi').order('id')),
    fetchAllRows(db.from('bolumler').select('seri_id, sayi, created_at, yayin_durumu, yayin_tarihi').order('id')),
    fetchAllRows(db.from('topluluk_konulari').select('slug, created_at, updated_at').eq('aktif', true).order('id')),
    fetchAllRows(db.from('topluluk_forumlari').select('slug, created_at, updated_at').eq('aktif', true).order('id')),
    fetchAllRows(db.from('konsey_planet_yazilari').select('slug, created_at, updated_at').eq('yayinlandi', true).order('id')),
  ])
  const publishedSeries = new Map(series.filter(row => isPublished(row) && row.slug).map(row => [row.id, row]))
  const publishedChapters = chapters.filter(row => isPublished(row) && publishedSeries.has(row.seri_id))
  const entries = ['/', '/seriler', '/yerli-eserler', '/forum', '/hakkimizda', '/iletisim', '/gizlilik-politikasi', '/kullanim-kosullari'].map(path => ({ url: absoluteUrl(path) }))
  for (const row of publishedSeries.values()) {
    const dates = [row.created_at, row.yayin_tarihi, ...publishedChapters.filter(chapter => chapter.seri_id === row.id).flatMap(chapter => [chapter.created_at, chapter.yayin_tarihi])].map(validDate).filter(Boolean)
    entries.push({ url: absoluteUrl(`/seri/${encodeURIComponent(row.slug)}`), lastModified: dates.length ? new Date(Math.max(...dates.map(date => date.getTime()))) : undefined })
  }
  for (const row of publishedChapters) {
    entries.push({ url: absoluteUrl(`/oku/${encodeURIComponent(publishedSeries.get(row.seri_id).slug)}/${row.sayi}`), lastModified: validDate(row.yayin_tarihi || row.created_at) })
  }
  for (const [rows, prefix] of [[forums, '/forum/'], [topics, '/forum/konu/'], [articles, '/forum/planet/']]) {
    for (const row of rows.filter(row => row.slug)) entries.push({ url: absoluteUrl(`${prefix}${encodeURIComponent(row.slug)}`), lastModified: validDate(row.updated_at || row.created_at) })
  }
  return [...new Map(entries.map(entry => [entry.url, entry])).values()]
}
