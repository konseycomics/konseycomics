import { Suspense } from 'react'
import { buildMetadata, absoluteUrl, jsonLdScript } from '../lib/seo'
import SeriesArchive from './series-archive'

export const metadata = buildMetadata({
  title: 'Seriler ve Tek Sayılıklar',
  description: 'Marvel, DC, bağımsız ve yerli çizgi romanlar. Türkçe serileri ve tek sayılık eserleri türüne ve yayın durumuna göre keşfet.',
  path: '/seriler',
  keywords: ['Türkçe çizgi roman', 'seriler', 'tek sayılıklar', 'yerli çizgi roman'],
})

export default function SerilerPage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Seriler', url: absoluteUrl('/seriler') })} />
    <Suspense fallback={<main className="site-shell" style={{ padding: '60px 20px' }}>Seriler yükleniyor...</main>}><SeriesArchive /></Suspense>
  </>
}
