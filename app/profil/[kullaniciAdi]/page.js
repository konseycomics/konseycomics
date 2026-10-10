import ProfilSayfasiClient from './page-client'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { absoluteUrl, buildMetadata, createSeoDescription, createSupabaseServerClient, jsonLdScript } from '../../lib/seo'

const getProfileSeoData = cache(async (kullaniciAdi) => {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('public_profiller')
    .select('id, kullanici_adi, avatar_url, bio, rol, seviye, banner_url')
    .eq('kullanici_adi', kullaniciAdi)
    .maybeSingle()

  if (error) throw new Error(`Public profile query failed: ${error.code}`)
  return data
})

export async function generateMetadata({ params }) {
  const { kullaniciAdi } = await params
  const profil = await getProfileSeoData(kullaniciAdi)

  if (!profil) {
    return buildMetadata({
      title: 'Profil Bulunamadı',
      description: 'Aradığın kullanıcı profili bulunamadı.',
      path: `/profil/${kullaniciAdi}`,
      type: 'profile',
    })
  }

  return buildMetadata({
    title: `${profil.kullanici_adi} Profili`,
    description: createSeoDescription(
      profil.bio,
      `${profil.kullanici_adi} kullanıcısının KonseyComics profilini incele. Rozetler, unvanlar ve vitrin seçimleri burada yer alıyor.`
    ),
    path: `/profil/${profil.kullanici_adi}`,
    image: profil.banner_url || profil.avatar_url,
    type: 'profile',
    keywords: [profil.kullanici_adi, profil.rol, 'KonseyComics profil'].filter(Boolean),
  })
}

export default async function ProfilPage({ params }) {
  const { kullaniciAdi } = await params
  const profil = await getProfileSeoData(kullaniciAdi)
  if (!profil) notFound()

  const structuredData = profil
    ? {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        url: absoluteUrl(`/profil/${profil.kullanici_adi}`),
        mainEntity: {
          '@type': 'Person',
          name: profil.kullanici_adi,
          description: createSeoDescription(profil.bio, `${profil.kullanici_adi} KonseyComics kullanıcısı.`),
          image: profil.avatar_url || undefined,
        },
      }
    : null

  return (
    <>
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript(structuredData)}
        />
      ) : null}
      <ProfilSayfasiClient />
    </>
  )
}
