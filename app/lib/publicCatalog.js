import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createSupabaseServerClient } from './seo'
import { fetchAllRows, isPublished } from './seoRules'
import { isArchiveSeries } from './seriesArchive'
import { loadPublicReaderData } from './publicReaderData'

const SERIES_FIELDS = 'id, baslik, slug, ozet, kapak_url, tur, turler, kategori, kategori_id, durum, yil, created_at, ortalama_puan, puan_sayisi, goruntuleme_sayisi, arkaplan_url, arkaplan_pozisyon, eser_sahibi_id, yayin_durumu, yayin_tarihi, kategoriler(isim), bolumler(count)'

export const getPublicCatalog = unstable_cache(async () => {
  const db = createSupabaseServerClient()
  const [series, genres] = await Promise.all([
    fetchAllRows(db.from('seriler').select(SERIES_FIELDS).order('created_at', { ascending: false }).order('id')),
    fetchAllRows(db.from('turler').select('id, isim').order('isim').order('id')),
  ])
  return { series: series.filter(row => isPublished(row) && isArchiveSeries(row)), genres }
}, ['public-series-catalog-v1'], { revalidate: 60 })

export const getPublicSeries = cache(unstable_cache(async (slug) => {
  const db = createSupabaseServerClient()
  const { data: series, error } = await db.from('seriler').select(SERIES_FIELDS).eq('slug', slug).maybeSingle()
  if (error) throw new Error(`Public series query failed: ${error.code}`)
  if (!series || !isPublished(series)) return null
  const [chapters, authors, artists, genres, { data: owner, error: ownerError }] = await Promise.all([
    fetchAllRows(db.from('bolumler').select('id, seri_id, sayi, baslik, kapak_url, created_at, yayin_durumu, yayin_tarihi, cevirmen:ekip!cevirmen_id(isim), balonlama:ekip!balonlama_id(isim), grafik:ekip!grafik_id(isim)').eq('seri_id', series.id).order('sayi').order('id')),
    fetchAllRows(db.from('seri_yazarlar').select('yazarlar(isim)').eq('seri_id', series.id).order('yazar_id')),
    fetchAllRows(db.from('seri_cizerler').select('cizerler(isim)').eq('seri_id', series.id).order('cizer_id')),
    series.turler?.length ? fetchAllRows(db.from('turler').select('id, isim').in('id', series.turler).order('id')) : Promise.resolve([]),
    series.eser_sahibi_id ? db.from('public_profiller').select('id, kullanici_adi, avatar_url, rol').eq('id', series.eser_sahibi_id).maybeSingle() : Promise.resolve({ data: null }),
  ])
  if (ownerError) throw new Error(`Public creator query failed: ${ownerError.code}`)
  return { series, chapters: chapters.filter(row => isPublished(row)), authors: authors.map(row => row.yazarlar?.isim).filter(Boolean), artists: artists.map(row => row.cizerler?.isim).filter(Boolean), genres: genres.map(row => row.isim), owner }
}, ['public-series-detail-v1'], { revalidate: 60 }))

export const getPublicReader = cache(unstable_cache(async (slug, number) => {
  const payload = await getPublicSeries(slug)
  return loadPublicReaderData(createSupabaseServerClient(), payload, number)
}, ['public-reader-v1'], { revalidate: 60 }))
