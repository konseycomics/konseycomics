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

function mapProfiles(rows, titles) {
  const titleMap = new Map((titles || []).map((row) => [
    row.kullanici_id,
    Array.isArray(row.unvan_tanimlari) ? row.unvan_tanimlari[0]?.isim : row.unvan_tanimlari?.isim || '',
  ]))

  return new Map((rows || []).map((row) => [
    row.id,
    {
      id: row.id,
      kullanici_adi: row.kullanici_adi,
      avatar_url: row.avatar_url || '',
      unvan: titleMap.get(row.id) || '',
    },
  ]))
}

function formatTopicRow(row, profil, hrefBase = '/topluluk/konu') {
  return {
    id: row.id,
    slug: row.slug,
    href: `${hrefBase}/${row.slug}`,
    baslik: row.baslik,
    icerik: truncate(row.icerik, 240),
    kategori: row.kategori || 'Genel Sohbet',
    etiketler: Array.isArray(row.etiketler) ? row.etiketler : [],
    created_at: row.created_at,
    son_aktivite_at: row.son_aktivite_at || row.created_at,
    yanit_sayisi: Number(row.yanit_sayisi || 0),
    begeni_sayisi: Number(row.begeni_sayisi || 0),
    goruntulenme_sayisi: Number(row.goruntulenme_sayisi || 0),
    sabitlendi: Boolean(row.sabitlendi),
    profil: profil || null,
    source: 'topic',
  }
}

export async function getCommunityTopics({ limit = 12 } = {}) {
  const admin = createSupabaseAdminClient()
  if (!admin) {
    return { available: false, topics: [] }
  }

  const { data: topicRows, error } = await admin
    .from('topluluk_konulari')
    .select('id, slug, baslik, icerik, kategori, etiketler, created_at, son_aktivite_at, yanit_sayisi, begeni_sayisi, goruntulenme_sayisi, sabitlendi, kullanici_id')
    .eq('aktif', true)
    .order('sabitlendi', { ascending: false })
    .order('son_aktivite_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (error.code === '42P01') {
      return { available: false, topics: [] }
    }
    throw error
  }

  const userIds = [...new Set((topicRows || []).map((row) => row.kullanici_id).filter(Boolean))]
  const [{ data: profileRows }, { data: titleRows }] = userIds.length > 0
    ? await Promise.all([
        admin.from('public_profiller').select('id, kullanici_adi, avatar_url').in('id', userIds),
        admin
          .from('kullanici_unvanlari')
          .select('kullanici_id, unvan_tanimlari(isim)')
          .in('kullanici_id', userIds)
          .eq('one_cikarildi', true),
      ])
    : [{ data: [] }, { data: [] }]

  const profileMap = mapProfiles(profileRows, titleRows)

  return {
    available: true,
    topics: (topicRows || []).map((row) => formatTopicRow(row, profileMap.get(row.kullanici_id))),
  }
}

export async function getCommunityTopicBySlug(slug) {
  const admin = createSupabaseAdminClient()
  if (!admin) return { available: false, topic: null, replies: [] }

  const { data: topicRow, error } = await admin
    .from('topluluk_konulari')
    .select('id, slug, baslik, icerik, kategori, etiketler, created_at, son_aktivite_at, yanit_sayisi, begeni_sayisi, goruntulenme_sayisi, sabitlendi, kullanici_id')
    .eq('slug', slug)
    .eq('aktif', true)
    .maybeSingle()

  if (error) {
    if (error.code === '42P01') return { available: false, topic: null, replies: [] }
    throw error
  }

  if (!topicRow?.id) return { available: true, topic: null, replies: [] }

  const { data: replyRows } = await admin
    .from('topluluk_yanitlari')
    .select('id, konu_id, kullanici_id, icerik, spoiler, created_at')
    .eq('konu_id', topicRow.id)
    .eq('aktif', true)
    .order('created_at', { ascending: true })

  const userIds = [...new Set([topicRow.kullanici_id, ...(replyRows || []).map((row) => row.kullanici_id)].filter(Boolean))]

  const [{ data: profileRows }, { data: titleRows }] = userIds.length > 0
    ? await Promise.all([
        admin.from('public_profiller').select('id, kullanici_adi, avatar_url').in('id', userIds),
        admin
          .from('kullanici_unvanlari')
          .select('kullanici_id, unvan_tanimlari(isim)')
          .in('kullanici_id', userIds)
          .eq('one_cikarildi', true),
      ])
    : [{ data: [] }, { data: [] }]

  const profileMap = mapProfiles(profileRows, titleRows)

  return {
    available: true,
    topic: {
      ...formatTopicRow(topicRow, profileMap.get(topicRow.kullanici_id)),
      icerik_tam: topicRow.icerik,
    },
    replies: (replyRows || []).map((row) => ({
      id: row.id,
      konu_id: row.konu_id,
      icerik: row.icerik,
      spoiler: Boolean(row.spoiler),
      created_at: row.created_at,
      profil: profileMap.get(row.kullanici_id) || null,
    })),
  }
}

export async function incrementCommunityTopicView(topicId) {
  const admin = createSupabaseAdminClient()
  if (!admin || !topicId) return

  const { data: row, error } = await admin
    .from('topluluk_konulari')
    .select('id, goruntulenme_sayisi')
    .eq('id', topicId)
    .maybeSingle()

  if (error || !row?.id) return

  await admin
    .from('topluluk_konulari')
    .update({
      goruntulenme_sayisi: Number(row.goruntulenme_sayisi || 0) + 1,
    })
    .eq('id', row.id)
}
