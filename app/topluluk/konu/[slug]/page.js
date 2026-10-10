import { notFound } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import Footer from '../../../components/Footer'
import ForumTopicClient from '../../ForumTopicClient'
import { absoluteUrl, buildMetadata, createSeoDescription, jsonLdScript } from '../../../lib/seo'
import { cache } from 'react'
import { getCommunityTopicBySlug } from '../../../lib/communityData'
import '../../forum.css'

const getTopic = cache(getCommunityTopicBySlug)

function schemaAuthor(profile) {
  if (!profile?.kullanici_adi) return undefined
  return {
    '@type': 'Person',
    name: profile.kullanici_adi,
    url: absoluteUrl(profile.system_slug ? `/forum/uye/${encodeURIComponent(profile.system_slug)}` : `/profil/${encodeURIComponent(profile.kullanici_adi)}`),
  }
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params
  const slug = resolvedParams?.slug
  const { topic } = await getTopic(slug)

  if (!topic) {
    return buildMetadata({
      title: 'Konu Bulunamadı | KonseyComics',
      description: 'Aradığın forum konusu bulunamadı.',
      path: `/forum/konu/${slug}`,
      keywords: ['Konsey Forum', 'konu bulunamadı'],
    })
  }

  return buildMetadata({
    title: `${topic.baslik} | Forum`,
    description: createSeoDescription(topic.icerik_tam || topic.icerik, 'Konsey Forum tartışmaları ve okur yanıtları.'),
    path: `/forum/konu/${slug}`,
    keywords: ['Konsey Forum', topic.kategori, ...(topic.etiketler || [])].filter(Boolean),
  })
}

export default async function ToplulukKonuDetayPage({ params }) {
  const resolvedParams = await params
  const slug = resolvedParams?.slug
  const { available, topic, replies } = await getTopic(slug)

  if (!available) {
    return (
      <>
        <Navbar />
        <main style={{ background: '#050505', minHeight: '100vh' }}>
          <section className="site-shell" style={{ paddingTop: '44px', paddingBottom: '44px' }}>
            <div style={{ padding: '22px', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#fff' }}>
              Forum veritabanı henüz kurulmamış görünüyor. Supabase SQL dosyasını çalıştırdıktan sonra bu alan aktif olacak.
            </div>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  if (!topic) notFound()

  const structuredData = topic.profil?.kullanici_adi ? {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    '@id': absoluteUrl(`/forum/konu/${slug}#topic`),
    url: absoluteUrl(`/forum/konu/${slug}`),
    headline: topic.baslik,
    text: topic.icerik_tam || topic.icerik,
    datePublished: topic.created_at,
    author: schemaAuthor(topic.profil),
    inLanguage: 'tr-TR',
    comment: (replies || []).filter(reply => reply.profil?.kullanici_adi).map(reply => ({
      '@type': 'Comment',
      text: reply.icerik,
      datePublished: reply.created_at,
      author: schemaAuthor(reply.profil),
    })),
  } : null

  return (
    <>
      {structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(structuredData)} />}
      <Navbar />
      <main className="forum-page">
        <section className="site-section forum-page-inner">
          <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
            <ForumTopicClient topic={topic} initialReplies={replies} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
