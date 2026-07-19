import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { buildMetadata, createSeoDescription } from '../lib/seo'
import { getCommunityTopics } from '../lib/communityData'
import { getPlanetPosts } from '../lib/planetData'
import { getLeaderboards } from '../lib/leaderboardData'
import ForumHomeClient from './ForumHomeClient'
import './forum.css'

export async function generateMetadata() {
  return buildMetadata({
    title: 'Konsey Forum | Çizgi Roman, Manga ve Webtoon Topluluğu',
    description: createSeoDescription('', 'Çizgi roman, manga ve webtoon okurlarının konu açtığı, teorilerini paylaştığı ve birlikte tartıştığı KonseyComics forumu.'),
    path: '/topluluk',
    keywords: ['çizgi roman forumu', 'manga forumu', 'webtoon forumu', 'KonseyComics topluluk'],
  })
}

export default async function ToplulukPage() {
  const [{ topics }, planetPosts, leaderboards] = await Promise.all([
    getCommunityTopics({ limit: 60 }),
    getPlanetPosts({ limit: 8 }),
    getLeaderboards(null, { excludeTeam: false }),
  ])

  const activeUsers = leaderboards.gunluk.length > 0 ? leaderboards.gunluk : leaderboards.haftalik

  return (
    <>
      <Navbar />
      <main className="forum-page">
        <div className="site-section forum-page-inner">
          <ForumHomeClient initialTopics={topics || []} planetPosts={planetPosts || []} activeUsers={activeUsers || []} />
        </div>
      </main>
      <Footer />
    </>
  )
}
