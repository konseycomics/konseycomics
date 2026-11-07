export { default, generateMetadata } from '../../../topluluk/konu/[slug]/page'
import { getCommunityTopics } from '../../../lib/communityData'

export const dynamic = 'force-dynamic'
export async function generateStaticParams() {
  const { available, topics } = await getCommunityTopics({ limit: 1000 })
  if (!available) throw new Error('Cannot build forum without public topics')
  return topics.map(({ slug }) => ({ slug }))
}
