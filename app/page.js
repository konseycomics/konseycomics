import HomeClient from './page-client'
import { createSupabaseServerClient } from './lib/seo'

async function getHomePageData() {
  const supabase = createSupabaseServerClient()

  const [{ data: seriler }, { data: bolumler }, { data: ayarData }] = await Promise.all([
    supabase.from('seriler').select('*, kategoriler(isim)').order('created_at', { ascending: false }),
    supabase
      .from('bolumler')
      .select('id, baslik, sayi, kapak_url, created_at, seri_id, seriler(baslik, slug, kapak_url)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('site_ayarlari').select('anahtar, deger').in('anahtar', ['anasayfa_hero_slider']),
  ])

  const siteAyarlari = {}
  ayarData?.forEach((item) => {
    siteAyarlari[item.anahtar] = item.deger
  })

  return {
    seriler: seriler || [],
    bolumler: bolumler || [],
    siteAyarlari,
  }
}

export default async function HomePage() {
  const initialData = await getHomePageData()
  return <HomeClient {...initialData} />
}
