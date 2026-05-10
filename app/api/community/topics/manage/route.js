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

    const { konuId, action } = await req.json()
    if (!konuId || !['delete', 'hide'].includes(action)) {
      return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
    }

    const { publicClient, adminClient } = getClients()
    const { data: userData, error: userError } = await publicClient.auth.getUser(accessToken)

    if (userError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const userId = userData.user.id

    const [{ data: topicRow }, { data: profileRow }] = await Promise.all([
      adminClient
        .from('topluluk_konulari')
        .select('id, kullanici_id, aktif')
        .eq('id', konuId)
        .maybeSingle(),
      adminClient
        .from('public_profiller')
        .select('id, rol')
        .eq('id', userId)
        .maybeSingle(),
    ])

    if (!topicRow?.id) {
      return NextResponse.json({ error: 'Konu bulunamadı.' }, { status: 404 })
    }

    const isOwner = topicRow.kullanici_id === userId
    const isAdmin = ['admin', 'yonetici'].includes(String(profileRow?.rol || '').toLowerCase())

    if (action === 'delete' && !isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Bu konuyu silme yetkin yok.' }, { status: 403 })
    }

    if (action === 'hide' && !isAdmin) {
      return NextResponse.json({ error: 'Bu konuyu gizleme yetkin yok.' }, { status: 403 })
    }

    const { error: updateError } = await adminClient
      .from('topluluk_konulari')
      .update({ aktif: false, updated_at: new Date().toISOString() })
      .eq('id', konuId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      action,
      hidden: true,
    })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Topic manage failed.' }, { status: 500 })
  }
}
