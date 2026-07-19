import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { slugifyTopicTitle } from '../../../lib/communityData'
import { getForumBySlug, getForumForCategory } from '../../../lib/forumConfig'

function getClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Supabase environment variables are missing.')
  }

  return {
    publicClient: createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    adminClient: createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  }
}

function normalizeTags(input) {
  const source = Array.isArray(input)
    ? input
    : String(input || '')
        .split(',')
        .map((item) => item.trim())

  return [...new Set(source.filter(Boolean).slice(0, 6))]
}

function normalizePollOptions(input) {
  const source = Array.isArray(input) ? input : []
  return [...new Set(source.map((item) => String(item || '').trim()).filter(Boolean))].slice(0, 4)
}

async function buildUniqueSlug(adminClient, title) {
  const base = slugifyTopicTitle(title) || 'topluluk-konusu'
  let candidate = base
  let suffix = 1

  while (true) {
    const { data: existing } = await adminClient
      .from('topluluk_konulari')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()

    if (!existing?.id) return candidate
    suffix += 1
    candidate = `${base}-${suffix}`
  }
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { baslik, icerik, kategori, forumSlug, etiketler, anket, spoiler } = await req.json()
    const cleanTitle = String(baslik || '').trim()
    const cleanBody = String(icerik || '').trim()

    if (cleanTitle.length < 6) {
      return NextResponse.json({ error: 'Konu başlığı en az 6 karakter olmalı.' }, { status: 400 })
    }

    if (cleanBody.length < 12) {
      return NextResponse.json({ error: 'Konu içeriği en az 12 karakter olmalı.' }, { status: 400 })
    }

    const { publicClient, adminClient } = getClients()
    const { data: userData, error: userError } = await publicClient.auth.getUser(accessToken)

    if (userError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const slug = await buildUniqueSlug(adminClient, cleanTitle)
    const selectedForum = getForumBySlug(forumSlug) || getForumForCategory(kategori)
    const safeTags = normalizeTags(etiketler)
    const pollEnabled = Boolean(anket?.aktif)
    const pollOptions = normalizePollOptions(anket?.secenekler)

    if (pollEnabled && pollOptions.length < 2) {
      return NextResponse.json({ error: 'Anket için en az 2 seçenek girmelisin.' }, { status: 400 })
    }

    const { data: requesterProfile } = await adminClient
      .from('public_profiller')
      .select('id, rol')
      .eq('id', userData.user.id)
      .maybeSingle()
    const isStaff = ['admin', 'yonetici', 'moderator'].includes(String(requesterProfile?.rol || '').toLowerCase())
    if (selectedForum?.slug === 'duyurular' && !isStaff) {
      return NextResponse.json({ error: 'Duyurular forumunda yalnızca yönetim konu açabilir.' }, { status: 403 })
    }

    if (!isStaff) {
      const since = new Date(Date.now() - 60_000).toISOString()
      const { count } = await adminClient.from('topluluk_konulari').select('id', { count: 'exact', head: true }).eq('kullanici_id', userData.user.id).gte('created_at', since)
      if (Number(count || 0) > 0) return NextResponse.json({ error: 'Yeni bir konu açmadan önce kısa bir süre beklemelisin.' }, { status: 429 })
    }

    const { data: forumRow } = await adminClient
      .from('topluluk_forumlari')
      .select('id, slug')
      .eq('slug', selectedForum.slug)
      .maybeSingle()

    const insertPayload = {
      kullanici_id: userData.user.id,
      slug,
      baslik: cleanTitle,
      icerik: cleanBody,
      kategori: selectedForum.category,
      etiketler: safeTags,
      spoiler: Boolean(spoiler),
      anket_aktif: pollEnabled,
      anket_sorusu: pollEnabled ? cleanTitle : null,
      anket_secenekleri: pollEnabled ? pollOptions : [],
    }
    if (forumRow?.id) insertPayload.forum_id = forumRow.id

    let { data: inserted, error: insertError } = await adminClient
      .from('topluluk_konulari')
      .insert(insertPayload)
      .select('id, slug, baslik, icerik, kategori, etiketler, anket_aktif, anket_sorusu, anket_secenekleri, created_at, son_aktivite_at, yanit_sayisi, begeni_sayisi, goruntulenme_sayisi')
      .single()

    if (insertError?.code === '42703' && insertPayload.forum_id) {
      delete insertPayload.forum_id
      ;({ data: inserted, error: insertError } = await adminClient
        .from('topluluk_konulari')
        .insert(insertPayload)
        .select('id, slug, baslik, icerik, kategori, etiketler, anket_aktif, anket_sorusu, anket_secenekleri, created_at, son_aktivite_at, yanit_sayisi, begeni_sayisi, goruntulenme_sayisi')
        .single())
    }

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    const [{ data: profil }, { data: bildirimResult }] = await Promise.all([
      adminClient
        .from('public_profiller')
        .select('id, kullanici_adi, avatar_url')
        .eq('id', userData.user.id)
        .maybeSingle(),
      adminClient
        .from('bildirimler')
        .insert({
          alici_id: userData.user.id,
          tip: 'topluluk',
          baslik: 'Konun paylaşıldı',
          mesaj: `${cleanTitle} konusu forum akışına eklendi.`,
          okundu: false,
        }),
    ])

    void bildirimResult

    return NextResponse.json({
      ok: true,
      topic: {
        ...inserted,
        href: `/forum/konu/${inserted.slug}`,
        profil: profil || null,
        source: 'topic',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Topic creation failed.' }, { status: 500 })
  }
}
