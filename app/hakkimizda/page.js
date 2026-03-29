import HakkimizdaClient from './page-client'
import { absoluteUrl, buildMetadata, jsonLdScript } from '../lib/seo'

export const metadata = buildMetadata({
  title: 'Hakkimizda',
  description: 'KonseyComics ekibini, yayin vizyonunu ve arkasindaki topluluk yaklasimini kesfet.',
  path: '/hakkimizda',
  keywords: ['KonseyComics', 'hakkimizda', 'ekip', 'topluluk'],
})

export default function HakkimizdaPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'KonseyComics Hakkimizda',
    url: absoluteUrl('/hakkimizda'),
    description: 'KonseyComics ekibini, yayin vizyonunu ve arkasindaki topluluk yaklasimini kesfet.',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(structuredData)}
      />
      <HakkimizdaClient />
    </>
  )
}
