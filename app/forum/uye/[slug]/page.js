export { default, generateMetadata } from '../../../topluluk/uye/[slug]/page'
export const dynamic = 'force-static'
export function generateStaticParams() {
  return [{ slug: 'peter-parker' }]
}
