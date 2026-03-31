import { createClient } from '@supabase/supabase-js'

export function normalizeSiteUrl(value) {
  if (!value) return 'https://www.konseycomics.com'
  const normalized = value.startsWith('http') ? value : `https://${value}`
  return normalized.replace('https://konseycomics.com', 'https://www.konseycomics.com')
}

export function getSiteUrl() {
  return normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
  )
}

export function absoluteUrl(path = '/') {
  const siteUrl = getSiteUrl()
  if (!path || path === '/') return siteUrl
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`
}

export function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function createSeoDescription(value, fallback) {
  const source = stripHtml(value) || fallback
  return source.length > 160 ? `${source.slice(0, 157).trim()}...` : source
}

export function createSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_KEY
  )
}

export function buildMetadata({
  title,
  description,
  path,
  image,
  type = 'website',
  keywords = [],
}) {
  const canonical = absoluteUrl(path)
  const imageUrl = image ? (String(image).startsWith('http') ? image : absoluteUrl(image)) : absoluteUrl('/demo/hero.jpg')

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      type,
      url: canonical,
      title,
      description,
      images: [{ url: imageUrl, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}

export function jsonLdScript(data) {
  return {
    __html: JSON.stringify(data),
  }
}
