import { notFound } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import Footer from '../../../components/Footer'
import { buildMetadata, createSeoDescription } from '../../../lib/seo'
import { getCommunityTopics } from '../../../lib/communityData'
import { getForumBySlug, topicBelongsToForum } from '../../../lib/forumConfig'
import ForumCategoryClient from '../../ForumCategoryClient'
import '../../forum.css'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const forum = getForumBySlug(slug)
  if (!forum) return buildMetadata({ title: 'Forum Bulunamadı', description: 'Aradığın forum bulunamadı.', path: `/forum/${slug}` })
  return buildMetadata({
    title: `${forum.name} Forumu`,
    description: createSeoDescription(forum.description, `${forum.name} üzerine KonseyComics tartışmaları.`),
    path: `/forum/${forum.slug}`,
    keywords: [forum.name, 'Konsey Forum', 'çizgi roman topluluğu'],
  })
}

export default async function ForumCategoryPage({ params }) {
  const { slug } = await params
  const forum = getForumBySlug(slug)
  if (!forum) notFound()
  const { topics } = await getCommunityTopics({ limit: 200 })
  const forumWithGroup = { ...forum, group: forum.slug === 'duyurular' ? 'KONSEY' : 'KONSEY FORUM' }

  return (
    <>
      <Navbar />
      <main className="forum-page">
        <section className="site-section forum-page-inner">
          <ForumCategoryClient forum={forumWithGroup} initialTopics={(topics || []).filter((topic) => topicBelongsToForum(topic, forum))} />
        </section>
      </main>
      <Footer />
    </>
  )
}
