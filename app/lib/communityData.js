import { createSupabaseAdminClient } from './leaderboardData'

function truncate(value, max = 220) {
  const text = String(value || '').trim()
  return text.length > max ? `${text.slice(0, max - 3).trim()}...` : text
}

export function slugifyTopicTitle(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
}

function normalizeName(value) {
  return String(value || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
}

function mapProfiles(rows, titles, teamRows = []) {
  const titleMap = new Map((titles || []).map((row) => [
    row.kullanici_id,
    Array.isArray(row.unvan_tanimlari) ? row.unvan_tanimlari[0]?.isim : row.unvan_tanimlari?.isim || '',
  ]))

  const teamByProfile = new Map((teamRows || []).filter((row) => row.profil_id).map((row) => [row.profil_id, row]))
  const teamByName = new Map((teamRows || []).map((row) => [normalizeName(row.isim), row]))

  return new Map((rows || []).map((row) => {
    const team = teamByProfile.get(row.id) || teamByName.get(normalizeName(row.kullanici_adi))
    return [row.id, {
      id: row.id,
      kullanici_adi: row.kullanici_adi,
      avatar_url: row.avatar_url || '',
      unvan: titleMap.get(row.id) || '',
      rol: row.rol || 'okuyucu',
      ekip_uyesi: Boolean(team),
      ekip_rolu: team?.unvan || '',
    }]
  }))
}

function mapSystemProfiles(rows) {
  return new Map((rows || []).map((row) => [row.id, {
    id: row.id,
    kullanici_adi: row.gorunen_ad || row.kullanici_adi,
    avatar_url: row.avatar_url || '',
    unvan: '',
    rol: 'moderator',
    ekip_uyesi: true,
    ekip_rolu: row.ekip_rolu || 'Topluluk Yöneticisi',
    system_slug: row.slug,
    bio: row.bio || '',
  }]))
}

function formatTopicRow(row, profil, hrefBase = '/topluluk/konu') {
  const pollOptions = Array.isArray(row.anket_secenekleri) ? row.anket_secenekleri : []
  return {
    id: row.id,
    slug: row.slug,
    href: `${hrefBase}/${row.slug}`,
    baslik: row.baslik,
    icerik: truncate(row.icerik, 240),
    spoiler: Boolean(row.spoiler),
    kategori: row.kategori || 'Genel Sohbet',
    etiketler: Array.isArray(row.etiketler) ? row.etiketler : [],
    created_at: row.created_at,
    son_aktivite_at: row.son_aktivite_at || row.created_at,
    yanit_sayisi: Number(row.yanit_sayisi || 0),
    begeni_sayisi: Number(row.begeni_sayisi || 0),
    goruntulenme_sayisi: Number(row.goruntulenme_sayisi || 0),
    sabitlendi: Boolean(row.sabitlendi),
    kilitli: Boolean(row.kilitli),
    one_cikan: Boolean(row.one_cikan),
    forum_id: row.forum_id || null,
    sistem_profil_id: row.sistem_profil_id || null,
    anket_aktif: Boolean(row.anket_aktif),
    anket_sorusu: row.anket_sorusu || '',
    anket_secenekleri: pollOptions,
    anket_toplam_oy: Number(row.anket_toplam_oy || 0),
    anket_sonuclari: Array.isArray(row.anket_sonuclari) ? row.anket_sonuclari : [],
    profil: profil || null,
    source: 'topic',
  }
}

function formatReplyRow(row, profil) {
  return {
    id: row.id,
    konu_id: row.konu_id,
    parent_yanit_id: row.parent_yanit_id || null,
    icerik: row.icerik,
    spoiler: Boolean(row.spoiler),
    created_at: row.created_at,
    profil: profil || null,
  }
}

export async function getCommunityTopics({ limit = 12 } = {}) {
  const admin = createSupabaseAdminClient()
  if (!admin) {
    return { available: false, topics: [] }
  }

  let topicRows
  let error

  ;({ data: topicRows, error } = await admin
    .from('topluluk_konulari')
    .select('id, slug, baslik, icerik, spoiler, kategori, etiketler, anket_aktif, anket_sorusu, anket_secenekleri, created_at, son_aktivite_at, yanit_sayisi, begeni_sayisi, goruntulenme_sayisi, sabitlendi, kilitli, one_cikan, forum_id, kullanici_id, sistem_profil_id')
    .eq('aktif', true)
    .order('sabitlendi', { ascending: false })
    .order('son_aktivite_at', { ascending: false })
    .limit(limit))

  if (error?.code === '42703') {
    ;({ data: topicRows, error } = await admin
      .from('topluluk_konulari')
      .select('id, slug, baslik, icerik, kategori, etiketler, created_at, son_aktivite_at, yanit_sayisi, begeni_sayisi, goruntulenme_sayisi, sabitlendi, kullanici_id')
      .eq('aktif', true)
      .order('sabitlendi', { ascending: false })
      .order('son_aktivite_at', { ascending: false })
      .limit(limit))
  }

  if (error) {
    if (error.code === '42P01') {
      return { available: false, topics: [] }
    }
    throw error
  }

  const userIds = [...new Set((topicRows || []).map((row) => row.kullanici_id).filter(Boolean))]
  const systemIds = [...new Set((topicRows || []).map((row) => row.sistem_profil_id).filter(Boolean))]
  const [{ data: profileRows }, { data: titleRows }, { data: teamRows }, { data: systemRows }] = await Promise.all([
    userIds.length > 0
      ? admin.from('public_profiller').select('id, kullanici_adi, avatar_url, rol').in('id', userIds)
      : Promise.resolve({ data: [] }),
    userIds.length > 0
      ? admin
        .from('kullanici_unvanlari')
        .select('kullanici_id, unvan_tanimlari(isim)')
        .in('kullanici_id', userIds)
        .eq('one_cikarildi', true)
      : Promise.resolve({ data: [] }),
    userIds.length > 0
      ? admin.from('ekip').select('profil_id, isim, unvan').or(`profil_id.in.(${userIds.join(',')}),profil_id.is.null`)
      : Promise.resolve({ data: [] }),
    systemIds.length > 0
      ? admin.from('topluluk_sistem_profilleri').select('id, slug, kullanici_adi, gorunen_ad, avatar_url, bio, ekip_rolu').in('id', systemIds)
      : Promise.resolve({ data: [] }),
  ])

  const profileMap = mapProfiles(profileRows, titleRows, teamRows)
  const systemProfileMap = mapSystemProfiles(systemRows)
  const topicIds = (topicRows || []).map((row) => row.id).filter(Boolean)
  const pollStatsMap = new Map()

  const pollTopicRows = (topicRows || []).filter((row) => row.anket_aktif && Array.isArray(row.anket_secenekleri) && row.anket_secenekleri.length > 0)

  if (topicIds.length > 0 && pollTopicRows.length > 0) {
    const { data: voteRows } = await admin
      .from('topluluk_anket_oylari')
      .select('konu_id, secenek_index')
      .in('konu_id', topicIds)

    const voteCountMap = new Map()

    for (const row of voteRows || []) {
      const key = `${row.konu_id}:${row.secenek_index}`
      voteCountMap.set(key, (voteCountMap.get(key) || 0) + 1)
      pollStatsMap.set(row.konu_id, {
        toplamOy: Number(pollStatsMap.get(row.konu_id)?.toplamOy || 0) + 1,
        sonuclar: pollStatsMap.get(row.konu_id)?.sonuclar || [],
      })
    }

    for (const topicRow of pollTopicRows) {
      const toplamOy = Number(pollStatsMap.get(topicRow.id)?.toplamOy || 0)
      const sonuclar = (topicRow.anket_secenekleri || []).map((option, index) => {
        const oy = Number(voteCountMap.get(`${topicRow.id}:${index}`) || 0)
        return {
          index,
          label: String(option || ''),
          oy,
          yuzde: toplamOy > 0 ? Math.round((oy / toplamOy) * 100) : 0,
        }
      })

      pollStatsMap.set(topicRow.id, { toplamOy, sonuclar })
    }
  }

  return {
    available: true,
    topics: (topicRows || []).map((row) => formatTopicRow({
      ...row,
      anket_toplam_oy: pollStatsMap.get(row.id)?.toplamOy || 0,
      anket_sonuclari: pollStatsMap.get(row.id)?.sonuclar || [],
    }, systemProfileMap.get(row.sistem_profil_id) || profileMap.get(row.kullanici_id))),
  }
}

export async function getCommunityTopicBySlug(slug) {
  const admin = createSupabaseAdminClient()
  if (!admin) return { available: false, topic: null, replies: [] }

  let topicRow
  let error

  ;({ data: topicRow, error } = await admin
    .from('topluluk_konulari')
    .select('id, slug, baslik, icerik, spoiler, kategori, etiketler, anket_aktif, anket_sorusu, anket_secenekleri, created_at, son_aktivite_at, yanit_sayisi, begeni_sayisi, goruntulenme_sayisi, sabitlendi, kilitli, one_cikan, forum_id, kullanici_id, sistem_profil_id')
    .eq('slug', slug)
    .eq('aktif', true)
    .maybeSingle())

  if (error?.code === '42703') {
    ;({ data: topicRow, error } = await admin
      .from('topluluk_konulari')
      .select('id, slug, baslik, icerik, kategori, etiketler, created_at, son_aktivite_at, yanit_sayisi, begeni_sayisi, goruntulenme_sayisi, sabitlendi, kullanici_id')
      .eq('slug', slug)
      .eq('aktif', true)
      .maybeSingle())
  }

  if (error) {
    if (error.code === '42P01') return { available: false, topic: null, replies: [] }
    throw error
  }

  if (!topicRow?.id) return { available: true, topic: null, replies: [] }

  const { data: replyRows } = await admin
    .from('topluluk_yanitlari')
    .select('id, konu_id, parent_yanit_id, kullanici_id, icerik, spoiler, created_at')
    .eq('konu_id', topicRow.id)
    .eq('aktif', true)
    .order('created_at', { ascending: true })

  let pollResults = []
  let pollTotalVotes = 0

  if (topicRow.anket_aktif && Array.isArray(topicRow.anket_secenekleri) && topicRow.anket_secenekleri.length > 0) {
    const { data: voteRows } = await admin
      .from('topluluk_anket_oylari')
      .select('secenek_index')
      .eq('konu_id', topicRow.id)

    const voteCounts = new Map()
    for (const row of voteRows || []) {
      voteCounts.set(row.secenek_index, (voteCounts.get(row.secenek_index) || 0) + 1)
      pollTotalVotes += 1
    }

    pollResults = topicRow.anket_secenekleri.map((option, index) => ({
      index,
      label: String(option || ''),
      oy: Number(voteCounts.get(index) || 0),
      yuzde: pollTotalVotes > 0 ? Math.round((Number(voteCounts.get(index) || 0) / pollTotalVotes) * 100) : 0,
    }))
  }

  const userIds = [...new Set([topicRow.kullanici_id, ...(replyRows || []).map((row) => row.kullanici_id)].filter(Boolean))]

  const [{ data: profileRows }, { data: titleRows }, { data: teamRows }] = userIds.length > 0
    ? await Promise.all([
        admin.from('public_profiller').select('id, kullanici_adi, avatar_url, rol').in('id', userIds),
        admin
          .from('kullanici_unvanlari')
          .select('kullanici_id, unvan_tanimlari(isim)')
          .in('kullanici_id', userIds)
          .eq('one_cikarildi', true),
        admin.from('ekip').select('profil_id, isim, unvan').or(`profil_id.in.(${userIds.join(',')}),profil_id.is.null`),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  const profileMap = mapProfiles(profileRows, titleRows, teamRows)
  let systemProfile = null
  if (topicRow.sistem_profil_id) {
    const { data } = await admin
      .from('topluluk_sistem_profilleri')
      .select('id, slug, kullanici_adi, gorunen_ad, avatar_url, bio, ekip_rolu')
      .eq('id', topicRow.sistem_profil_id)
      .maybeSingle()
    systemProfile = mapSystemProfiles(data ? [data] : []).get(topicRow.sistem_profil_id) || null
  }

  return {
    available: true,
    topic: {
      ...formatTopicRow({
        ...topicRow,
        anket_sonuclari: pollResults,
        anket_toplam_oy: pollTotalVotes,
      }, systemProfile || profileMap.get(topicRow.kullanici_id)),
      icerik_tam: topicRow.icerik,
    },
    replies: (replyRows || []).map((row) => formatReplyRow(row, profileMap.get(row.kullanici_id))),
  }
}

export async function getCommunitySystemProfileBySlug(slug) {
  const admin = createSupabaseAdminClient()
  if (!admin) return null

  const { data: profile, error } = await admin
    .from('topluluk_sistem_profilleri')
    .select('id, slug, kullanici_adi, gorunen_ad, avatar_url, bio, ekip_rolu, created_at')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !profile) return null

  const { data: topicRows } = await admin
    .from('topluluk_konulari')
    .select('id, slug, baslik, kategori, created_at, yanit_sayisi, goruntulenme_sayisi, sabitlendi')
    .eq('sistem_profil_id', profile.id)
    .eq('aktif', true)
    .order('sabitlendi', { ascending: false })
    .order('created_at', { ascending: false })

  return {
    ...mapSystemProfiles([profile]).get(profile.id),
    gorunen_ad: profile.gorunen_ad,
    created_at: profile.created_at,
    topics: topicRows || [],
  }
}
