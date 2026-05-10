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

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { konuId, icerik, spoiler, parentYanitId } = await req.json()
    const cleanBody = String(icerik || '').trim()

    if (!konuId) {
      return NextResponse.json({ error: 'Konu bulunamadı.' }, { status: 400 })
    }

    if (cleanBody.length < 2) {
      return NextResponse.json({ error: 'Yanıt çok kısa.' }, { status: 400 })
    }

    const { publicClient, adminClient } = getClients()
    const { data: userData, error: userError } = await publicClient.auth.getUser(accessToken)

    if (userError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: topicRow } = await adminClient
      .from('topluluk_konulari')
      .select('id, kullanici_id, baslik')
      .eq('id', konuId)
      .maybeSingle()

    let parentReplyRow = null
    if (parentYanitId) {
      const { data: parentReply } = await adminClient
        .from('topluluk_yanitlari')
        .select('id, konu_id, kullanici_id')
        .eq('id', parentYanitId)
        .eq('aktif', true)
        .maybeSingle()

      if (!parentReply?.id || parentReply.konu_id !== konuId) {
        return NextResponse.json({ error: 'Yanıtlanacak yorum bulunamadı.' }, { status: 400 })
      }

      parentReplyRow = parentReply
    }

    const { data: inserted, error: insertError } = await adminClient
      .from('topluluk_yanitlari')
      .insert({
        konu_id: konuId,
        kullanici_id: userData.user.id,
        icerik: cleanBody,
        spoiler: Boolean(spoiler),
        parent_yanit_id: parentReplyRow?.id || null,
      })
      .select('id, konu_id, parent_yanit_id, icerik, spoiler, created_at')
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    const { data: profil } = await adminClient
      .from('public_profiller')
      .select('id, kullanici_adi, avatar_url')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (topicRow?.kullanici_id && topicRow.kullanici_id !== userData.user.id) {
      await adminClient.from('bildirimler').insert({
        alici_id: topicRow.kullanici_id,
        tip: 'topluluk',
        baslik: 'Konuna yeni yanıt geldi',
        mesaj: `${topicRow.baslik} konuna yeni bir yanıt bırakıldı.`,
        okundu: false,
      })
    }

    if (
      parentReplyRow?.kullanici_id &&
      parentReplyRow.kullanici_id !== userData.user.id &&
      parentReplyRow.kullanici_id !== topicRow?.kullanici_id
    ) {
      await adminClient.from('bildirimler').insert({
        alici_id: parentReplyRow.kullanici_id,
        tip: 'topluluk',
        baslik: 'Yanıtına cevap geldi',
        mesaj: `${topicRow?.baslik || 'Topluluk konusu'} içinde yanıtına cevap yazıldı.`,
        okundu: false,
      })
    }

    return NextResponse.json({
      ok: true,
      reply: {
        ...inserted,
        profil: profil || null,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Reply creation failed.' }, { status: 500 })
  }
}
