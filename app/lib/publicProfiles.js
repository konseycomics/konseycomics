import { supabase } from './supabase'

function mapProfiles(rows) {
  const map = {}
  for (const row of rows || []) {
    map[row.id] = row
  }
  return map
}

function normalizeName(value) {
  return String(value || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
}

export async function getPublicProfileByUsername(kullaniciAdi) {
  const { data, error } = await supabase
    .from('public_profiller')
    .select('id, kullanici_adi, avatar_url, bio, rol, xp, seviye, takipci_sayisi, takip_sayisi, created_at, banner_url, favori_turler, one_cikan_seri_ids, profil_vitrin_ayarlari')
    .eq('kullanici_adi', kullaniciAdi)
    .single()

  if (error || !data?.id) return { data, error }

  const [{ data: seciliUnvan }, { data: teamRows }] = await Promise.all([
    supabase
      .from('kullanici_unvanlari')
      .select('one_cikarildi, unvan_tanimlari(isim, nadirlik)')
      .eq('kullanici_id', data.id)
      .eq('one_cikarildi', true)
      .limit(1)
      .maybeSingle(),
    supabase.from('ekip').select('profil_id, isim, unvan'),
  ])

  const team = (teamRows || []).find((row) => row.profil_id === data.id) || (teamRows || []).find((row) => normalizeName(row.isim) === normalizeName(data.kullanici_adi))

  return { data: { ...data, secili_unvan: seciliUnvan?.unvan_tanimlari || null, ekip_uyesi: Boolean(team), ekip_rolu: team?.unvan || '' }, error }
}

export async function getPublicProfilesByIds(ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))]
  if (uniqueIds.length === 0) return {}

  const { data } = await supabase
    .from('public_profiller')
    .select('id, kullanici_adi, avatar_url, bio, rol, xp, seviye, takipci_sayisi, takip_sayisi, created_at, banner_url, favori_turler, one_cikan_seri_ids, profil_vitrin_ayarlari')
    .in('id', uniqueIds)

  const map = mapProfiles(data)
  const [{ data: seciliUnvanlar }, { data: teamRows }] = await Promise.all([
    supabase
      .from('kullanici_unvanlari')
      .select('kullanici_id, one_cikarildi, unvan_tanimlari(isim, nadirlik)')
      .in('kullanici_id', uniqueIds)
      .eq('one_cikarildi', true),
    supabase.from('ekip').select('profil_id, isim, unvan'),
  ])

  for (const row of seciliUnvanlar || []) {
    if (map[row.kullanici_id]) {
      map[row.kullanici_id] = {
        ...map[row.kullanici_id],
        secili_unvan: row.unvan_tanimlari || null,
      }
    }
  }

  for (const profile of Object.values(map)) {
    const team = (teamRows || []).find((row) => row.profil_id === profile.id) || (teamRows || []).find((row) => normalizeName(row.isim) === normalizeName(profile.kullanici_adi))
    if (team) {
      profile.ekip_uyesi = true
      profile.ekip_rolu = team.unvan || ''
    }
  }

  return map
}
