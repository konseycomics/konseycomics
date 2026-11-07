import { fetchAllRows, isPublished } from './seoRules.js'
import { isArchiveSeries } from './seriesArchive.js'

export const LIVE_SERIES_FIELDS = 'id, baslik, slug, ozet, kapak_url, tur, turler, kategori, kategori_id, durum, yil, created_at, ortalama_puan, puan_sayisi, goruntuleme_sayisi, one_cikan, arkaplan_url, arkaplan_pozisyon, eser_sahibi_id, yayin_durumu, yayin_tarihi, kategoriler(isim), bolumler(count)'

export async function loadLiveCatalog(db) {
  const [series, genres] = await Promise.all([
    fetchAllRows(db.from('seriler').select(LIVE_SERIES_FIELDS).order('created_at', { ascending: false }).order('id')),
    fetchAllRows(db.from('turler').select('id, isim').order('isim').order('id')),
  ])
  return { series: series.filter(row => isPublished(row) && isArchiveSeries(row)), genres }
}

export async function loadLiveHome(db) {
  const [series, chapters, settings] = await Promise.all([
    fetchAllRows(db.from('seriler').select('*, kategoriler(isim)').order('created_at', { ascending: false }).order('id')),
    fetchAllRows(db.from('bolumler').select('id, baslik, sayi, kapak_url, created_at, seri_id, yayin_durumu, yayin_tarihi, seriler(baslik, slug, kapak_url)').order('created_at', { ascending: false }).order('id')),
    fetchAllRows(db.from('site_ayarlari').select('anahtar, deger').in('anahtar', ['anasayfa_hero_slider', 'meta_baslik', 'meta_aciklama', 'anahtar_kelimeler']).order('anahtar')),
  ])
  const published = series.filter(row => isPublished(row) && isArchiveSeries(row))
  const ids = new Set(published.map(row => String(row.id)))
  return {
    seriler: published,
    bolumler: chapters.filter(row => isPublished(row) && ids.has(String(row.seri_id))).slice(0, 10),
    siteAyarlari: Object.fromEntries(settings.map(row => [row.anahtar, row.deger])),
  }
}
