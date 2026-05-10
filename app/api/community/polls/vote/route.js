import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

function buildPollResults(options, voteRows, selectedIndex) {
  const counts = new Map()
  for (const row of voteRows || []) {
    counts.set(row.secenek_index, (counts.get(row.secenek_index) || 0) + 1)
  }
  const toplamOy = (voteRows || []).length

  return {
    toplamOy,
    seciliIndex: selectedIndex,
    sonuclar: (options || []).map((option, index) => {
      const oy = Number(counts.get(index) || 0)
      return {
        index,
        label: String(option || ''),
        oy,
        yuzde: toplamOy > 0 ? Math.round((oy / toplamOy) * 100) : 0,
      }
    }),
  }
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { konuId, secenekIndex } = await req.json()
    const targetIndex = Number(secenekIndex)

    if (!konuId || Number.isNaN(targetIndex) || targetIndex < 0) {
      return NextResponse.json({ error: 'Geçersiz anket isteği.' }, { status: 400 })
    }

    const { publicClient, adminClient } = getClients()
    const { data: userData, error: userError } = await publicClient.auth.getUser(accessToken)

    if (userError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: topic } = await adminClient
      .from('topluluk_konulari')
      .select('id, anket_aktif, anket_secenekleri')
      .eq('id', konuId)
      .maybeSingle()

    if (!topic?.id || !topic.anket_aktif || !Array.isArray(topic.anket_secenekleri)) {
      return NextResponse.json({ error: 'Anket bulunamadı.' }, { status: 404 })
    }

    if (targetIndex >= topic.anket_secenekleri.length) {
      return NextResponse.json({ error: 'Geçersiz seçenek.' }, { status: 400 })
    }

    const { data: existing } = await adminClient
      .from('topluluk_anket_oylari')
      .select('id, secenek_index')
      .eq('konu_id', konuId)
      .eq('kullanici_id', userData.user.id)
      .maybeSingle()

    if (existing?.id) {
      const { error } = await adminClient
        .from('topluluk_anket_oylari')
        .update({ secenek_index: targetIndex })
        .eq('id', existing.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    } else {
      const { error } = await adminClient
        .from('topluluk_anket_oylari')
        .insert({
          konu_id: konuId,
          kullanici_id: userData.user.id,
          secenek_index: targetIndex,
        })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    const { data: voteRows } = await adminClient
      .from('topluluk_anket_oylari')
      .select('secenek_index')
      .eq('konu_id', konuId)

    return NextResponse.json({
      ok: true,
      ...buildPollResults(topic.anket_secenekleri, voteRows || [], targetIndex),
    })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Poll vote failed.' }, { status: 500 })
  }
}
