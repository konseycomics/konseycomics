import KategoriSayfasiClient from './page-client'
import { absoluteUrl, buildMetadata, createSeoDescription, jsonLdScript } from '../../lib/seo'

const KATEGORI_SEO = {
  'cizgi-roman': {
    title: 'Cizgi Roman Arsivi',
    description: 'Marvel, DC ve bagimsiz evrenlerden Turkce cizgi roman arsivini kesfet.',
  },
  manga: {
    title: 'Manga Arsivi',
    description: 'KonseyComics icindeki Turkce manga arsivini kesfet, serileri filtrele ve yeni hikayeler bul.',
  },
  webtoon: {
    title: 'Webtoon Arsivi',
    description: 'Dikey okumaya uygun Turkce webtoon arsivini kesfet ve yeni seriler bul.',
  },
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const seo = KATEGORI_SEO[slug] || {
    title: 'Kategori Arsivi',
    description: 'KonseyComics kategorilerini kesfet ve arsivdeki serilere ulas.',
  }

  return buildMetadata({
    title: seo.title,
    description: createSeoDescription(seo.description, seo.description),
    path: `/kategori/${slug}`,
    type: 'website',
    keywords: [slug, seo.title, 'konseycomics', 'seri arşivi'],
  })
}

export default async function KategoriPage({ params }) {
  const { slug } = await params
  const seo = KATEGORI_SEO[slug] || {
    title: 'Kategori Arsivi',
    description: 'KonseyComics kategorilerini kesfet ve arsivdeki serilere ulas.',
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: seo.title,
    description: seo.description,
    url: absoluteUrl(`/kategori/${slug}`),
    isPartOf: {
      '@type': 'WebSite',
      name: 'KonseyComics',
      url: absoluteUrl('/'),
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(structuredData)}
      />
      <KategoriSayfasiClient />
    </>
  )
}
