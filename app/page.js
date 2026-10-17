import HomeClient from './page-client'
import { cache } from 'react'
import { absoluteUrl, buildMetadata, createSeoDescription, createSupabaseServerClient, jsonLdScript } from './lib/seo'
import { getPublicLeaderboards } from './lib/publicLeaderboard'
import { getCommunityTopics } from './lib/communityData'
import { unstable_cache } from 'next/cache'
import { isPublished } from './lib/seoRules'

export const dynamic = 'force-dynamic'

const HOME_DATA_TIMEOUT_MS = 4500

async function withTimeout(promise, fallback) {
  let timer
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Home data timeout')), HOME_DATA_TIMEOUT_MS) }),
    ])
  } catch {
    console.warn('[home-data] Public data unavailable; using page fallback')
    return fallback
  } finally {
    clearTimeout(timer)
  }
}

const getHomeCatalog = unstable_cache(async () => {
  const supabase = createSupabaseServerClient()
  const results = await Promise.all([
    supabase.from('seriler').select('*, kategoriler(isim)').order('created_at', { ascending: false }),
    supabase.from('bolumler')
      .select('id, baslik, sayi, kapak_url, created_at, seri_id, yayin_durumu, yayin_tarihi, seriler(baslik, slug, kapak_url)')
      .order('created_at', { ascending: false }).limit(10),
    supabase.from('site_ayarlari').select('anahtar, deger').in('anahtar', ['anasayfa_hero_slider', 'meta_baslik', 'meta_aciklama', 'anahtar_kelimeler']),
  ])
  // Throw on failed refresh so a valid cache entry is not replaced by empty data.
  for (const result of results) if (result.error) throw result.error
  return { seriler: results[0].data || [], bolumler: results[1].data || [], ayarlar: results[2].data || [] }
}, ['home-public-catalog-v1'], { revalidate: 60 })

const getHomeTopics = unstable_cache(
  () => getCommunityTopics({ limit: 16 }), ['home-forum-topics-v1'], { revalidate: 60 }
)

const getHomePageData = cache(async function getHomePageData() {
  const [catalog, liderlik, forumData] = await Promise.all([
    withTimeout(getHomeCatalog(), { seriler: [], bolumler: [], ayarlar: [] }),
    withTimeout(getPublicLeaderboards(), {}),
    withTimeout(getHomeTopics(), { topics: [] }),
  ])
  const { seriler, bolumler, ayarlar: ayarData } = catalog

  const siteAyarlari = {}
  ayarData?.forEach((item) => {
    siteAyarlari[item.anahtar] = item.deger
  })

  const gizliKategoriler = new Set(['manga', 'webtoon'])
  const gorunenSeriler = (seriler || []).filter((seri) => isPublished(seri) && !gizliKategoriler.has(String(seri.kategoriler?.isim || seri.kategori || '').toLocaleLowerCase('tr-TR')))
  const gorunenSeriIdleri = new Set(gorunenSeriler.map((seri) => String(seri.id)))

  return {
    renderedAt: Date.now(),
    seriler: gorunenSeriler,
    bolumler: (bolumler || []).filter((bolum) => isPublished(bolum) && gorunenSeriIdleri.has(String(bolum.seri_id))),
    siteAyarlari,
    liderlik,
    forumTopics: forumData.topics || [],
  }
})

export async function generateMetadata() {
  const { siteAyarlari } = await getHomePageData()
  const title = siteAyarlari.meta_baslik || 'Türkçe Çizgi Roman Oku | KonseyComics'
  const description = createSeoDescription(
    siteAyarlari.meta_aciklama,
    'Türkçe çizgi roman arşivini keşfet. Marvel, DC ve bağımsız serileri KonseyComics üzerinde tek yerde bul.'
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
      'çizgi roman forumu',
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
      'Türkçe çizgi roman oku, arşivi keşfet ve Konsey Forum tartışmalarına katıl.'
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
