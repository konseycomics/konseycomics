import HomeClient from './page-client'
import { absoluteUrl, buildMetadata, createSeoDescription, createSupabaseServerClient, jsonLdScript } from './lib/seo'
import { unstable_noStore as noStore } from 'next/cache'

async function getHomePageData() {
  noStore()
  const supabase = createSupabaseServerClient()

  const [{ data: seriler }, { data: bolumler }, { data: ayarData }] = await Promise.all([
    supabase.from('seriler').select('*, kategoriler(isim)').order('created_at', { ascending: false }),
    supabase
      .from('bolumler')
      .select('id, baslik, sayi, kapak_url, created_at, seri_id, seriler(baslik, slug, kapak_url)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('site_ayarlari').select('anahtar, deger').in('anahtar', ['anasayfa_hero_slider', 'meta_baslik', 'meta_aciklama', 'anahtar_kelimeler']),
  ])

  const siteAyarlari = {}
  ayarData?.forEach((item) => {
    siteAyarlari[item.anahtar] = item.deger
  })

  return {
    seriler: seriler || [],
    bolumler: bolumler || [],
    siteAyarlari,
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
