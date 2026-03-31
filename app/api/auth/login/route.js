import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isEmail, normalizeAuthIdentifier } from '../../../lib/authSecurity'

function getClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase environment variables are missing.')
  }

  return {
    publicClient: createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    adminClient: serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null,
  }
}

async function resolveEmailFromIdentifier(adminClient, identifier) {
  if (isEmail(identifier)) {
    return identifier.toLowerCase()
  }

  if (!adminClient) {
    throw new Error('Username sign-in is not configured on the server.')
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiller')
    .select('id')
    .ilike('kullanici_adi', identifier)
    .maybeSingle()

  if (profileError || !profile?.id) {
    return null
  }

  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(profile.id)
  if (userError || !userData?.user?.email) {
    return null
  }

  return userData.user.email.toLowerCase()
}

export async function POST(req) {
  try {
    const body = await req.json()
    const identifier = normalizeAuthIdentifier(body?.identifier)
    const password = String(body?.password || '')
    const captchaToken = body?.captchaToken ? String(body.captchaToken) : undefined

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Identifier and password are required.' }, { status: 400 })
    }

    const { publicClient, adminClient } = getClients()
    const email = await resolveEmailFromIdentifier(adminClient, identifier)

    if (!email) {
      return NextResponse.json({ error: 'Invalid login credentials' }, { status: 400 })
    }

    const { data, error } = await publicClient.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    })

    if (error || !data?.session) {
      return NextResponse.json({ error: error?.message || 'Invalid login credentials' }, { status: 400 })
    }

    return NextResponse.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
      user: data.user,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Authentication failed.' },
      { status: 500 }
    )
  }
}
