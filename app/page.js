import HomeClient from './page-client'
import { absoluteUrl, buildMetadata, createSeoDescription, createSupabaseServerClient, jsonLdScript } from './lib/seo'
import { unstable_noStore as noStore } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function fetchAllRows(queryBuilderFactory) {
  const rows = []
  const pageSize = 1000
  let offset = 0

  while (true) {
    const query = queryBuilderFactory().range(offset, offset + pageSize - 1)
    const { data, error } = await query

    if (error || !data?.length) break
    rows.push(...data)
    if (data.length < pageSize) break
    offset += pageSize
  }

  return rows
}

function getDateKey(date) {
  const d = new Date(date)
  const yil = d.getFullYear()
  const ay = String(d.getMonth() + 1).padStart(2, '0')
  const gun = String(d.getDate()).padStart(2, '0')
  return `${yil}-${ay}-${gun}`
}

function mapProfileToLeaderboardRow(profil, okumaSayisi = 0) {
  if (!profil?.kullanici_adi) return null

  return {
    id: profil.id,
    kullanici_adi: profil.kullanici_adi,
    avatar_url: profil.avatar_url || '',
    unvan: profil.secili_unvan || '',
    okumaSayisi,
  }
}

function buildLeaderboardRows(reads, profiles, startDate = null) {
  const counts = new Map()

  ;(reads || []).forEach((item) => {
    const kullaniciId = item?.kullanici_id
    const okunduAt = item?.okundu_at
    if (!kullaniciId || !okunduAt) return
    if (startDate && new Date(okunduAt) < startDate) return
    counts.set(kullaniciId, (counts.get(kullaniciId) || 0) + 1)
  })

  const siraliOkuyanlar = [...counts.entries()]
    .map(([kullaniciId, okumaSayisi]) => mapProfileToLeaderboardRow(profiles.get(kullaniciId), okumaSayisi))
    .filter(Boolean)
    .sort((a, b) => b.okumaSayisi - a.okumaSayisi || a.kullanici_adi.localeCompare(b.kullanici_adi, 'tr'))

  const sifirOkuyanlar = [...profiles.values()]
    .filter((profil) => profil?.kullanici_adi && !counts.has(profil.id))
    .map((profil) => mapProfileToLeaderboardRow(profil, 0))
    .filter(Boolean)
    .sort((a, b) => a.kullanici_adi.localeCompare(b.kullanici_adi, 'tr'))

  return [...siraliOkuyanlar, ...sifirOkuyanlar]
    .slice(0, 5)
}

async function getLeaderboards() {
  const admin = createSupabaseAdminClient()
  if (!admin) {
    return { gunluk: [], haftalik: [], aylik: [] }
  }

  const bugun = new Date()
  bugun.setHours(0, 0, 0, 0)
  const hafta = new Date(bugun)
  hafta.setDate(hafta.getDate() - 6)
  const ay = new Date(bugun)
  ay.setDate(ay.getDate() - 29)

  const [reads, profiles, activeTitles] = await Promise.all([
    fetchAllRows(() =>
      admin
        .from('kullanici_bolum_okumalari')
        .select('kullanici_id, okundu_at')
        .gte('completion_ratio', 0.7)
        .gte('okundu_at', ay.toISOString())
        .order('okundu_at', { ascending: false })
    ),
    fetchAllRows(() =>
      admin
        .from('public_profiller')
        .select('id, kullanici_adi, avatar_url')
    ),
    fetchAllRows(() =>
      admin
        .from('kullanici_unvanlari')
        .select('kullanici_id, one_cikarildi, unvan_tanimlari(isim)')
        .eq('one_cikarildi', true)
    ),
  ])

  const activeTitleMap = new Map(
    (activeTitles || []).map((item) => {
      const title = Array.isArray(item.unvan_tanimlari) ? item.unvan_tanimlari[0]?.isim : item.unvan_tanimlari?.isim
      return [item.kullanici_id, title || '']
    })
  )
  const profileMap = new Map(
    (profiles || []).map((profil) => [
      profil.id,
      {
        ...profil,
        secili_unvan: activeTitleMap.get(profil.id) || '',
      },
    ])
  )

  return {
    gunluk: buildLeaderboardRows(reads, profileMap, bugun),
    haftalik: buildLeaderboardRows(reads, profileMap, hafta),
    tum: buildLeaderboardRows(reads, profileMap, null),
    trendEtiket: getDateKey(new Date()),
  }
}

async function getHomePageData() {
  noStore()
  const supabase = createSupabaseServerClient()

  const [{ data: seriler }, { data: bolumler }, { data: ayarData }, liderlik] = await Promise.all([
    supabase.from('seriler').select('*, kategoriler(isim)').order('created_at', { ascending: false }),
    supabase
      .from('bolumler')
      .select('id, baslik, sayi, kapak_url, created_at, seri_id, seriler(baslik, slug, kapak_url)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('site_ayarlari').select('anahtar, deger').in('anahtar', ['anasayfa_hero_slider', 'meta_baslik', 'meta_aciklama', 'anahtar_kelimeler']),
    getLeaderboards(),
  ])

  const siteAyarlari = {}
  ayarData?.forEach((item) => {
    siteAyarlari[item.anahtar] = item.deger
  })

  return {
    seriler: seriler || [],
    bolumler: bolumler || [],
    siteAyarlari,
    liderlik,
  }
}

export async function generateMetadata() {
  const { siteAyarlari } = await getHomePageData()
  const title = siteAyarlari.meta_baslik || 'Türkçe Çizgi Roman Oku | KonseyComics'
  const description = createSeoDescription(
    siteAyarlari.meta_aciklama,
    'Türkçe çizgi roman oku, manga ve webtoon arşivini keşfet. Marvel, DC ve bağımsız serileri KonseyComics üzerinde tek yerde bul.'
  )
  const extraKeywords = String(siteAyarlari.anahtar_kelimeler || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)

  return buildMetadata({
    title,
    description,
    path: '/',
    type: 'website',
    keywords: [
      'çizgi roman oku',
      'türkçe çizgi roman oku',
      'çizgi roman arşivi',
      'manga oku',
      'webtoon oku',
      'KonseyComics',
      ...extraKeywords,
    ],
  })
}

export default async function HomePage() {
  const initialData = await getHomePageData()
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'KonseyComics',
    url: absoluteUrl('/'),
    description: createSeoDescription(
      initialData.siteAyarlari.meta_aciklama,
      'Türkçe çizgi roman oku, manga ve webtoon arşivini keşfet.'
    ),
    potentialAction: {
      '@type': 'SearchAction',
      target: `${absoluteUrl('/seriler')}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(structuredData)} />
      <HomeClient {...initialData} />
    </>
  )
}
