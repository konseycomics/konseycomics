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
    title: 'Konsey Forum | Çizgi Roman Topluluğu',
    description: createSeoDescription('', 'Çizgi roman okurlarının konu açtığı, teorilerini paylaştığı ve birlikte tartıştığı KonseyComics forumu.'),
    path: '/forum',
    keywords: ['çizgi roman forumu', 'Konsey Forum', 'KonseyComics forum'],
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
