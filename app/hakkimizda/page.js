import HakkimizdaClient from './page-client'
import { absoluteUrl, buildMetadata, jsonLdScript } from '../lib/seo'

export const metadata = buildMetadata({
  title: 'Hakkımızda',
  description: 'KonseyComics ekibini, yayın vizyonunu ve arkasındaki topluluk yaklaşımını keşfet.',
  path: '/hakkimizda',
  keywords: ['KonseyComics', 'hakkimizda', 'ekip', 'topluluk'],
})

export default function HakkimizdaPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'KonseyComics Hakkımızda',
    url: absoluteUrl('/hakkimizda'),
    description: 'KonseyComics ekibini, yayın vizyonunu ve arkasındaki topluluk yaklaşımını keşfet.',
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
