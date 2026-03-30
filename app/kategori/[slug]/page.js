import KategoriSayfasiClient from './page-client'
import { absoluteUrl, buildMetadata, createSeoDescription, jsonLdScript } from '../../lib/seo'

const KATEGORI_SEO = {
  'cizgi-roman': {
    title: 'Çizgi Roman Arşivi',
    description: 'Marvel, DC ve bağımsız evrenlerden Türkçe çizgi roman arşivini keşfet.',
  },
  manga: {
    title: 'Manga Arşivi',
    description: 'KonseyComics içindeki Türkçe manga arşivini keşfet, serileri filtrele ve yeni hikâyeler bul.',
  },
  webtoon: {
    title: 'Webtoon Arşivi',
    description: 'Dikey okumaya uygun Türkçe webtoon arşivini keşfet ve yeni seriler bul.',
  },
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const seo = KATEGORI_SEO[slug] || {
    title: 'Kategori Arşivi',
    description: 'KonseyComics kategorilerini keşfet ve arşivdeki serilere ulaş.',
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
    title: 'Kategori Arşivi',
    description: 'KonseyComics kategorilerini keşfet ve arşivdeki serilere ulaş.',
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
