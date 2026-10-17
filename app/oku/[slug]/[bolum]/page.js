import { notFound } from 'next/navigation'
import ReaderClient from './page-client'
import { getPublicReader, getPublicSeries } from '../../../lib/publicCatalog'
import { absoluteUrl, buildMetadata, createSeoDescription, jsonLdScript } from '../../../lib/seo'

async function getChapter(slug, number) {
  const payload = await getPublicSeries(slug)
  const chapter = payload?.chapters.find(row => String(row.sayi) === String(number))
  if (!chapter) return null
  return { series: payload.series, chapter: { ...chapter, seriBaslik: payload.series.baslik }, chapters: payload.chapters }
}

export async function generateMetadata({ params }) {
  const { slug, bolum } = await params
  const data = await getChapter(slug, bolum)
  if (!data) return { title: 'Bölüm Bulunamadı', robots: { index: false, follow: true } }
  const { series, chapter } = data
  return buildMetadata({
    title: `${series.baslik} #${chapter.sayi} Oku`,
    description: createSeoDescription(`${series.baslik} #${chapter.sayi}${chapter.baslik ? `: ${chapter.baslik}` : ''}. Türkçe çizgi romanı KonseyComics üzerinde oku.`, series.baslik),
    path: `/oku/${series.slug}/${chapter.sayi}`,
    image: chapter.kapak_url || series.kapak_url,
    type: 'article',
  })
}

export default async function ReaderPage({ params }) {
  const { slug, bolum } = await params
  const data = await getPublicReader(slug, bolum)
  if (!data) notFound()
  const { series, chapter } = data
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript({
      '@context': 'https://schema.org', '@type': 'ComicIssue',
      name: `${series.baslik} #${chapter.sayi}${chapter.baslik ? `: ${chapter.baslik}` : ''}`,
      issueNumber: chapter.sayi, url: absoluteUrl(`/oku/${series.slug}/${chapter.sayi}`),
      image: chapter.kapak_url || series.kapak_url || undefined,
      inLanguage: 'tr-TR',
      isPartOf: { '@type': 'ComicSeries', name: series.baslik, url: absoluteUrl(`/seri/${series.slug}`) },
    })} />
    <ReaderClient key={chapter.id} initialData={data} />
  </>
}
