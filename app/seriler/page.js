import { Suspense } from 'react'
import { buildMetadata, absoluteUrl, jsonLdScript } from '../lib/seo'
import SeriesArchive from './series-archive'
import { getPublicCatalog } from '../lib/publicCatalog'
import { archiveFilters, filterArchive } from '../lib/seriesArchive'

export const dynamic = 'force-dynamic'

export const metadata = buildMetadata({
  title: 'Seriler ve Tek Sayılıklar',
  description: 'Marvel, DC, bağımsız ve yerli çizgi romanlar. Türkçe serileri ve tek sayılık eserleri türüne ve yayın durumuna göre keşfet.',
  path: '/seriler',
  keywords: ['Türkçe çizgi roman', 'seriler', 'tek sayılıklar', 'yerli çizgi roman'],
})

export default async function SerilerPage({ searchParams }) {
  const initialData = await getPublicCatalog()
  const params = await searchParams
  const query = new URLSearchParams(Object.entries(params || {}).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]))
  const visibleSeries = filterArchive(initialData.series, archiveFilters(query)).slice(0, 24)
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript({
      '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Seriler', url: absoluteUrl('/seriler'), inLanguage: 'tr-TR',
      mainEntity: { '@type': 'ItemList', itemListElement: visibleSeries.map((series, index) => ({ '@type': 'ListItem', position: index + 1, name: series.baslik, url: absoluteUrl(`/seri/${series.slug}`) })) },
    })} />
    <Suspense fallback={<main className="site-shell" style={{ padding: '60px 20px' }}>Seriler yükleniyor...</main>}><SeriesArchive initialData={initialData} /></Suspense>
  </>
}
