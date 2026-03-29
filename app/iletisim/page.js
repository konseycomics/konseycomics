import IletisimClient from './page-client'
import { absoluteUrl, buildMetadata, jsonLdScript } from '../lib/seo'

export const metadata = buildMetadata({
  title: 'Iletisim',
  description: 'Telif, isbirligi, teknik destek ve topluluk konulari icin KonseyComics ile iletisime gec.',
  path: '/iletisim',
  keywords: ['KonseyComics iletisim', 'destek', 'telif', 'isbirligi'],
})

export default function IletisimPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'KonseyComics Iletisim',
    url: absoluteUrl('/iletisim'),
    description: 'Telif, isbirligi, teknik destek ve topluluk konulari icin KonseyComics ile iletisime gec.',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(structuredData)}
      />
      <IletisimClient />
    </>
  )
}
