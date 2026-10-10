import SeriDetayClient from './page-client'
import { notFound } from 'next/navigation'
import { absoluteUrl, buildMetadata, createSeoDescription, jsonLdScript } from '../../lib/seo'
import { getPublicSeries } from '../../lib/publicCatalog'
import { ratingSchema } from '../../lib/seoRules'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const payload = await getPublicSeries(slug)
  const seri = payload?.series

  if (!seri) {
    return buildMetadata({
      title: 'Seri Bulunamadı',
      description: 'Aradığın seri KonseyComics arşivinde bulunamadı.',
      path: `/seri/${slug}`,
      type: 'article',
    })
  }

  const category = seri.kategoriler?.isim || 'Çizgi Roman'
  const description = createSeoDescription(
    seri.ozet,
    `${seri.baslik} serisini KonseyComics arşivinde incele. ${category} kategorisinde bölümler, puanlar ve okuma detayları seni bekliyor.`
  )

  return buildMetadata({
    title: `${seri.baslik} Oku`,
    description,
    path: `/seri/${seri.slug}`,
    image: seri.arkaplan_url || seri.kapak_url,
    type: 'article',
    keywords: [seri.baslik, category, seri.durum, 'cizgi roman'].filter(Boolean),
  })
}

export default async function SeriDetayPage({ params }) {
  const { slug } = await params
  const payload = await getPublicSeries(slug)
  if (!payload) notFound()
  const seri = payload.series

  const structuredData = seri
    ? {
        '@context': 'https://schema.org',
        '@type': 'BookSeries',
        name: seri.baslik,
        description: createSeoDescription(seri.ozet, `${seri.baslik} KonseyComics arşivinde yer alıyor.`),
        genre: seri.kategoriler?.isim || undefined,
        url: absoluteUrl(`/seri/${seri.slug}`),
        image: seri.kapak_url || seri.arkaplan_url || undefined,
        inLanguage: 'tr-TR',
        aggregateRating: ratingSchema(seri),
        author: payload.authors.map(name => ({ '@type': 'Person', name })),
        contributor: payload.artists.map(name => ({ '@type': 'Person', name })),
        creator: payload.owner ? { '@type': 'Person', name: payload.owner.kullanici_adi, url: absoluteUrl(`/profil/${encodeURIComponent(payload.owner.kullanici_adi)}`) } : undefined,
        isPartOf: { '@type': 'CollectionPage', name: 'KonseyComics Arşivi', url: absoluteUrl('/seriler') },
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
      <SeriDetayClient key={seri.id} initialData={payload} />
    </>
  )
}
