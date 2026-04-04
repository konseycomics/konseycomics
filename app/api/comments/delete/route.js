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
    const { yorumId } = await req.json()

    if (!accessToken || !yorumId) {
      return NextResponse.json({ error: 'Missing comment id or access token.' }, { status: 400 })
    }

    const { publicClient, adminClient } = getClients()
    const { data: userData, error: userError } = await publicClient.auth.getUser(accessToken)

    if (userError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data, error } = await adminClient
      .from('yorumlar')
      .update({
        silindi: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', yorumId)
      .eq('kullanici_id', userData.user.id)
      .select('id')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data?.id) {
      return NextResponse.json({ error: 'Comment not found.' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, id: data.id })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Comment delete failed.' }, { status: 500 })
  }
}
