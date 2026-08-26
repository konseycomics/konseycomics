import { Suspense } from 'react'
import KategoriSayfasiClient from '../kategori/[slug]/page-client'
import { absoluteUrl, buildMetadata, jsonLdScript } from '../lib/seo'

const PAGE_PATH = '/yerli-eserler'
const DESCRIPTION = 'Türkiye’den bağımsız üreticilerin yerli çizgi romanlarını keşfet ve Konsey Comics üzerinde oku.'

export const metadata = buildMetadata({
  title: 'Yerli Çizgi Romanlar',
  description: DESCRIPTION,
  path: PAGE_PATH,
  keywords: ['yerli çizgi roman', 'Türk çizgi romanı', 'bağımsız çizgi roman', 'çizgi roman yayınlatmak', 'KonseyComics'],
})

export default function YerliEserlerPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Yerli Çizgi Romanlar',
    url: absoluteUrl(PAGE_PATH),
    description: DESCRIPTION,
    inLanguage: 'tr-TR',
    isPartOf: { '@type': 'WebSite', name: 'KonseyComics', url: absoluteUrl('/') },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(structuredData)} />
      <Suspense fallback={null}><KategoriSayfasiClient categorySlug="yerli-eserler" /></Suspense>
    </>
  )
}
