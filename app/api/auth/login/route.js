import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isEmail, normalizeAuthIdentifier } from '../../../lib/authSecurity'

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase()
}

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
    throw new Error('USERNAME_SIGNIN_NOT_CONFIGURED')
  }

  const usernameCandidates = Array.from(
    new Set([normalizeAuthIdentifier(identifier), normalizeUsername(identifier)].filter(Boolean))
  )

  let profile = null
  let profileError = null

  for (const candidate of usernameCandidates) {
    const result = await adminClient
      .from('profiller')
      .select('id')
      .eq('kullanici_adi', candidate)
      .limit(1)
      .maybeSingle()

    if (result.error) {
      profileError = result.error
      continue
    }

    if (result.data?.id) {
      profile = result.data
      profileError = null
      break
    }
  }

  if (profileError) {
    return await resolveEmailFromUserMetadata(adminClient, identifier)
  }

  if (!profile?.id) {
    return await resolveEmailFromUserMetadata(adminClient, identifier)
  }

  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(profile.id)
  if (userError || !userData?.user?.email) {
    return await resolveEmailFromUserMetadata(adminClient, identifier)
  }

  return userData.user.email.toLowerCase()
}

async function resolveEmailFromUserMetadata(adminClient, identifier) {
  const normalizedIdentifier = normalizeUsername(identifier)
  let page = 1
  const perPage = 200

  while (page <= 10) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) return null

    const users = data?.users || []
    if (!users.length) return null

    const matchedUser = users.find((user) => {
      const candidates = [
        user.user_metadata?.kullanici_adi,
        user.user_metadata?.username,
        user.raw_user_meta_data?.kullanici_adi,
        user.raw_user_meta_data?.username,
      ]
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase())

      return candidates.includes(normalizedIdentifier)
    })

    if (matchedUser?.email) {
      return matchedUser.email.toLowerCase()
    }

    if (users.length < perPage) return null
    page += 1
  }

  return null
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
    return NextResponse.json(
      { error: isEmail(identifier) ? 'Invalid login credentials' : 'USERNAME_NOT_FOUND' },
      { status: 400 }
    )
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
