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

const TABLES = {
  like: 'topluluk_begenileri',
  bookmark: 'topluluk_yer_imleri',
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { konuId, type } = await req.json()

    if (!konuId || !TABLES[type]) {
      return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
    }

    const { publicClient, adminClient } = getClients()
    const { data: userData, error: userError } = await publicClient.auth.getUser(accessToken)

    if (userError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const table = TABLES[type]
    const { data: existing } = await adminClient
      .from(table)
      .select('id')
      .eq('konu_id', konuId)
      .eq('kullanici_id', userData.user.id)
      .maybeSingle()

    if (existing?.id) {
      const { error } = await adminClient
        .from(table)
        .delete()
        .eq('id', existing.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ ok: true, active: false, type })
    }

    const { error } = await adminClient
      .from(table)
      .insert({
        konu_id: konuId,
        kullanici_id: userData.user.id,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, active: true, type })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Reaction toggle failed.' }, { status: 500 })
  }
}
