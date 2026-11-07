export { default, generateMetadata } from '../../../topluluk/uye/[slug]/page'
export const dynamic = 'force-dynamic'
export function generateStaticParams() {
  return [{ slug: 'peter-parker' }]
}
