import { createClient } from '@supabase/supabase-js'

const BASE_URL = 'https://konseycomics.vercel.app'

export default async function sitemap() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_KEY
  )

  // Static pages
  const staticPages = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/giris`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  // Dynamic: seri sayfaları
  const { data: seriler } = await supabase
    .from('seriler')
    .select('slug, updated_at')
    .order('updated_at', { ascending: false })

  const seriPages = (seriler || []).map((seri) => ({
    url: `${BASE_URL}/seri/${seri.slug}`,
    lastModified: new Date(seri.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  // Dynamic: bölüm sayfaları
  const { data: bolumler } = await supabase
    .from('bolumler')
    .select('sayi, updated_at, seriler(slug)')
    .order('updated_at', { ascending: false })
    .limit(200)

  const bolumPages = (bolumler || [])
    .filter((b) => b.seriler?.slug)
    .map((b) => ({
      url: `${BASE_URL}/oku/${b.seriler.slug}/${b.sayi}`,
      lastModified: new Date(b.updated_at),
      changeFrequency: 'monthly',
      priority: 0.6,
    }))

  return [...staticPages, ...seriPages, ...bolumPages]
}
