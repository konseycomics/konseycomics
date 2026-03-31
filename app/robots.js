function normalizeSiteUrl(value) {
  if (!value) return 'https://www.konseycomics.com'
  const normalized = value.startsWith('http') ? value : `https://${value}`
  return normalized.replace('https://konseycomics.com', 'https://www.konseycomics.com')
}

const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
)

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/admin/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
