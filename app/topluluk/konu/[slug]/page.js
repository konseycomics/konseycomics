import { notFound } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import Footer from '../../../components/Footer'
import ForumTopicClient from '../../ForumTopicClient'
import { buildMetadata, createSeoDescription } from '../../../lib/seo'
import { getCommunityTopicBySlug, incrementCommunityTopicView } from '../../../lib/communityData'
import '../../forum.css'

export async function generateMetadata({ params }) {
  const resolvedParams = await params
  const slug = resolvedParams?.slug
  const { topic } = await getCommunityTopicBySlug(slug)

  if (!topic) {
    return buildMetadata({
      title: 'Konu Bulunamadı | KonseyComics',
      description: 'Aradığın topluluk konusu bulunamadı.',
      path: `/topluluk/konu/${slug}`,
      keywords: ['KonseyComics topluluk', 'konu bulunamadı'],
    })
  }

  return buildMetadata({
    title: `${topic.baslik} | Topluluk | KonseyComics`,
    description: createSeoDescription(topic.icerik_tam || topic.icerik, 'KonseyComics topluluk tartışmaları ve okur yanıtları.'),
    path: `/topluluk/konu/${slug}`,
    keywords: ['KonseyComics topluluk', topic.kategori, ...(topic.etiketler || [])].filter(Boolean),
  })
}

export default async function ToplulukKonuDetayPage({ params }) {
  const resolvedParams = await params
  const slug = resolvedParams?.slug
  const { available, topic, replies } = await getCommunityTopicBySlug(slug)

  if (!available) {
    return (
      <>
        <Navbar />
        <main style={{ background: '#050505', minHeight: '100vh' }}>
          <section className="site-shell" style={{ paddingTop: '44px', paddingBottom: '44px' }}>
            <div style={{ padding: '22px', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#fff' }}>
              Topluluk veritabanı henüz kurulmamış görünüyor. Supabase SQL dosyasını çalıştırdıktan sonra bu alan aktif olacak.
            </div>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  if (!topic) notFound()

  await incrementCommunityTopicView(topic.id)
  const topicWithFreshView = {
    ...topic,
    goruntulenme_sayisi: Number(topic.goruntulenme_sayisi || 0) + 1,
  }

  return (
    <>
      <Navbar />
      <main className="forum-page">
        <section className="site-section forum-page-inner">
          <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
            <ForumTopicClient topic={topicWithFreshView} initialReplies={replies} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
