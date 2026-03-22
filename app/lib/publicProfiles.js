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
    .select('id, kullanici_adi, avatar_url, bio, rol, xp, seviye, takipci_sayisi, takip_sayisi, created_at')
    .eq('kullanici_adi', kullaniciAdi)
    .single()

  return { data, error }
}

export async function getPublicProfilesByIds(ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))]
  if (uniqueIds.length === 0) return {}

  const { data } = await supabase
    .from('public_profiller')
    .select('id, kullanici_adi, avatar_url, bio, rol, xp, seviye, takipci_sayisi, takip_sayisi, created_at')
    .in('id', uniqueIds)

  return mapProfiles(data)
}
