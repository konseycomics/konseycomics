import { createClient } from '@supabase/supabase-js'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
  'https://konseycomics.vercel.app'

export default async function sitemap() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_KEY
  )

  const now = new Date()

  const staticPages = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/seriler`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/giris`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/hakkimizda`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/iletisim`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/gizlilik-politikasi`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/kullanim-kosullari`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]

  const { data: seriler } = await supabase
    .from('seriler')
    .select('slug, updated_at')
    .order('updated_at', { ascending: false })

  const seriPages = (seriler || []).map((seri) => ({
    url: `${SITE_URL}/seri/${seri.slug}`,
    lastModified: new Date(seri.updated_at || now),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const { data: bolumler } = await supabase
    .from('bolumler')
    .select('sayi, updated_at, seriler(slug)')
    .order('updated_at', { ascending: false })
    .limit(200)

  const bolumPages = (bolumler || [])
    .filter((bolum) => bolum.seriler?.slug)
    .map((bolum) => ({
      url: `${SITE_URL}/oku/${bolum.seriler.slug}/${bolum.sayi}`,
      lastModified: new Date(bolum.updated_at || now),
      changeFrequency: 'monthly',
      priority: 0.6,
    }))

  return [...staticPages, ...seriPages, ...bolumPages]
}
