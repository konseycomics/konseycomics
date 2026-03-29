import SeriDetayClient from './page-client'
import { absoluteUrl, buildMetadata, createSeoDescription, createSupabaseServerClient, getSiteUrl, jsonLdScript } from '../../lib/seo'

async function getSeriesSeoData(slug) {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('seriler')
    .select('id, baslik, slug, aciklama, kapak_url, hero_gorsel_url, arkaplan_url, durum, yil, ortalama_puan, goruntuleme_sayisi, kategoriler(isim)')
    .eq('slug', slug)
    .maybeSingle()

  return data
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const seri = await getSeriesSeoData(slug)

  if (!seri) {
    return buildMetadata({
      title: 'Seri Bulunamadi',
      description: 'Aradigin seri KonseyComics arsivinde bulunamadi.',
      path: `/seri/${slug}`,
      type: 'article',
    })
  }

  const category = seri.kategoriler?.isim || 'Cizgi Roman'
  const description = createSeoDescription(
    seri.aciklama,
    `${seri.baslik} serisini KonseyComics arsivinde incele. ${category} kategorisinde bolumler, puanlar ve okuma detaylari seni bekliyor.`
  )

  return buildMetadata({
    title: `${seri.baslik} Oku`,
    description,
    path: `/seri/${seri.slug}`,
    image: seri.hero_gorsel_url || seri.arkaplan_url || seri.kapak_url,
    type: 'article',
    keywords: [seri.baslik, category, seri.durum, 'cizgi roman', 'manga', 'webtoon'].filter(Boolean),
  })
}

export default async function SeriDetayPage({ params }) {
  const { slug } = await params
  const seri = await getSeriesSeoData(slug)

  const structuredData = seri
    ? {
        '@context': 'https://schema.org',
        '@type': 'BookSeries',
        name: seri.baslik,
        description: createSeoDescription(seri.aciklama, `${seri.baslik} KonseyComics arşivinde yer alıyor.`),
        genre: seri.kategoriler?.isim || undefined,
        url: absoluteUrl(`/seri/${seri.slug}`),
        image: seri.kapak_url || seri.hero_gorsel_url || undefined,
        aggregateRating: Number(seri.ortalama_puan || 0) > 0
          ? {
              '@type': 'AggregateRating',
              ratingValue: Number(seri.ortalama_puan || 0).toFixed(1),
              bestRating: '10',
              ratingCount: Math.max(1, Number(seri.goruntuleme_sayisi || 1)),
            }
          : undefined,
        publisher: {
          '@type': 'Organization',
          name: 'KonseyComics',
          url: getSiteUrl(),
        },
      }
    : null

  return (
    <>
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript(structuredData)}
        />
      ) : null}
      <SeriDetayClient />
    </>
  )
}
