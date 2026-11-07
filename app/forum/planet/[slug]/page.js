export { default, generateMetadata } from '../../../topluluk/planet/[slug]/page'
import { getPlanetPosts } from '../../../lib/planetData'

export const dynamic = 'force-dynamic'
export async function generateStaticParams() {
  const posts = await getPlanetPosts({ limit: 1000 })
  return posts.map(({ slug }) => ({ slug }))
}
