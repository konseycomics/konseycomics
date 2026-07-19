import { createSupabaseServerClient } from './seo'
import { unstable_noStore as noStore } from 'next/cache'

function trimText(value, max = 220) {
  const text = String(value || '').trim()
  return text.length > max ? `${text.slice(0, max - 3).trim()}...` : text
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatPlanetRow(row) {
  if (!row) return null
  const slug = row.slug || slugify(row.baslik)
  return {
    ...row,
    slug,
    href: `/forum/planet/${slug}`,
    preview: trimText(row.ozet || row.icerik, 220),
    fullPreview: trimText(row.icerik, 420),
  }
}

export async function getPlanetPosts({ limit = 12, onlyPublished = true } = {}) {
  noStore()
  const supabase = createSupabaseServerClient()
  let query = supabase
    .from('konsey_planet_yazilari')
    .select('id, baslik, slug, ozet, icerik, kapak_url, tip, one_cikan, yayinlandi, created_at, updated_at')
    .order('one_cikan', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (onlyPublished) query = query.eq('yayinlandi', true)

  const { data, error } = await query
  if (error) {
    if (error.code === '42P01' || error.code === '42703') {
      return []
    }
    throw error
  }
  return (data || []).map(formatPlanetRow).filter(Boolean)
}

export async function getPlanetPostBySlug(slug) {
  noStore()
  const posts = await getPlanetPosts({ limit: 50, onlyPublished: true })
  return posts.find((item) => item.slug === slug) || null
}

export function buildPlanetView(posts = []) {
  const list = [...posts]
  const featured = list.find((item) => item.one_cikan) || list[0] || null
  const remaining = featured ? list.filter((item) => item.id !== featured.id) : list
  const spotlight = remaining.slice(0, 3)
  const bulletins = remaining.filter((item) => item.tip === 'duyuru').slice(0, 3)
  const editorials = remaining.filter((item) => item.tip === 'editor').slice(0, 2)

  return {
    featured,
    spotlight,
    bulletins,
    editorials,
    all: list,
  }
}
