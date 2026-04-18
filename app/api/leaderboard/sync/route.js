import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getLeaderboards } from '../../../lib/leaderboardData'
import { syncLeaderboardAwards } from '../../../lib/leaderboardAwards'

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

    const { publicClient, adminClient } = getClients()
    const { data: userData, error: userError } = await publicClient.auth.getUser(accessToken)

    if (userError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: profil, error: profilError } = await adminClient
      .from('profiller')
      .select('rol')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (profilError || !['admin', 'yonetici'].includes(String(profil?.rol || ''))) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const leaderboards = await getLeaderboards(adminClient)
    await syncLeaderboardAwards({ adminClient, leaderboards })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Leaderboard sync failed.' }, { status: 500 })
  }
}
