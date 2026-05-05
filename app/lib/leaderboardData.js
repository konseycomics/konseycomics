import { createClient } from '@supabase/supabase-js'

export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function fetchAllRows(queryBuilderFactory) {
  const rows = []
  const pageSize = 1000
  let offset = 0

  while (true) {
    const query = queryBuilderFactory().range(offset, offset + pageSize - 1)
    const { data, error } = await query

    if (error || !data?.length) break
    rows.push(...data)
    if (data.length < pageSize) break
    offset += pageSize
  }

  return rows
}

function getDateKey(date) {
  const d = new Date(date)
  const yil = d.getFullYear()
  const ay = String(d.getMonth() + 1).padStart(2, '0')
  const gun = String(d.getDate()).padStart(2, '0')
  return `${yil}-${ay}-${gun}`
}

function normalizeText(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function mapProfileToLeaderboardRow(profil, okumaSayisi = 0) {
  if (!profil?.kullanici_adi) return null

  return {
    id: profil.id,
    kullanici_adi: profil.kullanici_adi,
    avatar_url: profil.avatar_url || '',
    unvan: profil.secili_unvan || '',
    okumaSayisi,
  }
}

function buildLeaderboardRows(reads, profiles, startDate = null) {
  const counts = new Map()

  ;(reads || []).forEach((item) => {
    const kullaniciId = item?.kullanici_id
    const okunduAt = item?.okundu_at
    if (!kullaniciId || !okunduAt) return
    if (startDate && new Date(okunduAt) < startDate) return
    counts.set(kullaniciId, (counts.get(kullaniciId) || 0) + 1)
  })

  const siraliOkuyanlar = [...counts.entries()]
    .map(([kullaniciId, okumaSayisi]) => mapProfileToLeaderboardRow(profiles.get(kullaniciId), okumaSayisi))
    .filter(Boolean)
    .sort((a, b) => b.okumaSayisi - a.okumaSayisi || a.kullanici_adi.localeCompare(b.kullanici_adi, 'tr'))

  const sifirOkuyanlar = [...profiles.values()]
    .filter((profil) => profil?.kullanici_adi && !counts.has(profil.id))
    .map((profil) => mapProfileToLeaderboardRow(profil, 0))
    .filter(Boolean)
    .sort((a, b) => a.kullanici_adi.localeCompare(b.kullanici_adi, 'tr'))

  return [...siraliOkuyanlar, ...sifirOkuyanlar].slice(0, 5)
}

export async function getLeaderboards(existingAdminClient = null) {
  const admin = existingAdminClient || createSupabaseAdminClient()
  if (!admin) {
    return { gunluk: [], haftalik: [], tum: [] }
  }

  const bugun = new Date()
  bugun.setHours(0, 0, 0, 0)
  const hafta = new Date(bugun)
  hafta.setDate(hafta.getDate() - 6)

  const [reads, profiles, activeTitles, ekipUyeleri] = await Promise.all([
    fetchAllRows(() =>
      admin
        .from('kullanici_bolum_okumalari')
        .select('kullanici_id, okundu_at')
        .gte('completion_ratio', 0.7)
        .order('okundu_at', { ascending: false })
    ),
    fetchAllRows(() =>
      admin
        .from('public_profiller')
        .select('id, kullanici_adi, avatar_url')
    ),
    fetchAllRows(() =>
      admin
        .from('kullanici_unvanlari')
        .select('kullanici_id, one_cikarildi, unvan_tanimlari(isim)')
        .eq('one_cikarildi', true)
    ),
    fetchAllRows(() =>
      admin
        .from('ekip')
        .select('isim')
    ),
  ])

  const activeTitleMap = new Map(
    (activeTitles || []).map((item) => {
      const title = Array.isArray(item.unvan_tanimlari) ? item.unvan_tanimlari[0]?.isim : item.unvan_tanimlari?.isim
      return [item.kullanici_id, title || '']
    })
  )
  const excludedProfileIds = new Set()
  const profileRows = (profiles || []).map((profil) => ({
    ...profil,
    secili_unvan: activeTitleMap.get(profil.id) || '',
  }))

  for (const uye of ekipUyeleri || []) {
    const ekipIsmi = normalizeText(uye?.isim)
    if (!ekipIsmi) continue

    const eslesenProfil = profileRows.find((profil) => normalizeText(profil.kullanici_adi) === ekipIsmi)
      || profileRows.find((profil) => normalizeText(profil.kullanici_adi).includes(ekipIsmi))

    if (eslesenProfil?.id) {
      excludedProfileIds.add(eslesenProfil.id)
    }
  }

  const profileMap = new Map(
    profileRows
      .filter((profil) => !excludedProfileIds.has(profil.id))
      .map((profil) => [profil.id, profil])
  )

  return {
    gunluk: buildLeaderboardRows(reads, profileMap, bugun),
    haftalik: buildLeaderboardRows(reads, profileMap, hafta),
    tum: buildLeaderboardRows(reads, profileMap, null),
    trendEtiket: getDateKey(new Date()),
  }
}
