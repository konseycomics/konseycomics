export { default, generateMetadata } from '../../topluluk/forum/[slug]/page'
import { FORUMS } from '../../lib/forumConfig'

export const dynamic = 'force-static'
export function generateStaticParams() {
  return FORUMS.map(({ slug }) => ({ slug }))
}
