import IletisimClient from './page-client'
import { absoluteUrl, buildMetadata, jsonLdScript } from '../lib/seo'

export const metadata = buildMetadata({
  title: 'İletişim',
  description: 'Telif, işbirliği, teknik destek ve topluluk konuları için KonseyComics ile iletişime geç.',
  path: '/iletisim',
  keywords: ['KonseyComics iletisim', 'destek', 'telif', 'isbirligi'],
})

export default function IletisimPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'KonseyComics İletişim',
    url: absoluteUrl('/iletisim'),
    description: 'Telif, işbirliği, teknik destek ve topluluk konuları için KonseyComics ile iletişime geç.',
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
