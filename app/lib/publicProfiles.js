import { supabase } from './supabase'

function mapProfiles(rows) {
  const map = {}
  for (const row of rows || []) {
    map[row.id] = row
  }
  return map
}

export async function getPublicProfileByUsername(kullaniciAdi) {
  const { data, error } = await supabase
    .from('public_profiller')
    .select('id, kullanici_adi, avatar_url, bio, rol, xp, seviye, takipci_sayisi, takip_sayisi, created_at, banner_url, favori_turler, one_cikan_seri_ids, profil_vitrin_ayarlari')
    .eq('kullanici_adi', kullaniciAdi)
    .single()

  if (error || !data?.id) return { data, error }

  const [{ data: seciliUnvan }] = await Promise.all([
    supabase
      .from('kullanici_unvanlari')
      .select('one_cikarildi, unvan_tanimlari(isim, nadirlik)')
      .eq('kullanici_id', data.id)
      .eq('one_cikarildi', true)
      .limit(1)
      .maybeSingle(),
  ])

  return { data: { ...data, secili_unvan: seciliUnvan?.unvan_tanimlari || null }, error }
}

export async function getPublicProfilesByIds(ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))]
  if (uniqueIds.length === 0) return {}

  const { data } = await supabase
    .from('public_profiller')
    .select('id, kullanici_adi, avatar_url, bio, rol, xp, seviye, takipci_sayisi, takip_sayisi, created_at, banner_url, favori_turler, one_cikan_seri_ids, profil_vitrin_ayarlari')
    .in('id', uniqueIds)

  const map = mapProfiles(data)
  const [{ data: seciliUnvanlar }] = await Promise.all([
    supabase
      .from('kullanici_unvanlari')
      .select('kullanici_id, one_cikarildi, unvan_tanimlari(isim, nadirlik)')
      .in('kullanici_id', uniqueIds)
      .eq('one_cikarildi', true),
  ])

  for (const row of seciliUnvanlar || []) {
    if (map[row.kullanici_id]) {
      map[row.kullanici_id] = {
        ...map[row.kullanici_id],
        secili_unvan: row.unvan_tanimlari || null,
      }
    }
  }

  return map
}
