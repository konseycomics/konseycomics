import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

function normalizeSiteUrl(value) {
  if (!value) return 'https://www.konseycomics.com'
  const normalized = value.startsWith('http') ? value : `https://${value}`
  return normalized.replace('https://konseycomics.com', 'https://www.konseycomics.com')
}

const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)

export function getAuthRedirectUrl(path = '/') {
  const safePath = path.startsWith('/') ? path : `/${path}`

  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${origin}${safePath}`
    }
  }

  return `${SITE_URL}${safePath}`
}
