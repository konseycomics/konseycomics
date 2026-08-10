import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPreferredUsername, getUsernameCandidates, isGeneratedUsername } from '../../../lib/username'

function getClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('PROFILE_SYNC_NOT_CONFIGURED')
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

async function ensureProfile(adminClient, user, explicitUsername) {
  const { data: existingProfile, error: existingError } = await adminClient
    .from('profiller')
    .select('id, kullanici_adi')
    .eq('id', user.id)
    .maybeSingle()

  if (existingError) throw existingError
  if (existingProfile?.id) {
    const preferredUsername = getPreferredUsername(user, explicitUsername, { allowFallback: false })
    const canReplaceUsername = Boolean(explicitUsername) || isGeneratedUsername(existingProfile.kullanici_adi)

    if (
      canReplaceUsername &&
      preferredUsername &&
      existingProfile.kullanici_adi &&
      existingProfile.kullanici_adi.toLowerCase() !== preferredUsername.toLowerCase()
    ) {
      for (const candidate of getUsernameCandidates(preferredUsername, user.id)) {
        const { data: usedProfile } = await adminClient
          .from('profiller')
          .select('id')
          .ilike('kullanici_adi', candidate)
          .maybeSingle()

        if (usedProfile?.id && usedProfile.id !== user.id) continue

        const { data: updatedProfile, error: updateError } = await adminClient
          .from('profiller')
          .update({ kullanici_adi: candidate })
          .eq('id', user.id)
          .select('id, kullanici_adi')
          .single()

        if (!updateError && updatedProfile?.id) {
          return updatedProfile
        }
      }
    }

    return existingProfile
  }

  const preferredUsername = getPreferredUsername(user, explicitUsername, { allowFallback: true })

  for (const candidate of getUsernameCandidates(preferredUsername, user.id)) {
    const { data: usedProfile } = await adminClient
      .from('profiller')
      .select('id')
      .ilike('kullanici_adi', candidate)
      .maybeSingle()

    if (usedProfile?.id && usedProfile.id !== user.id) continue

    const { data, error } = await adminClient
      .from('profiller')
      .upsert(
        {
          id: user.id,
          kullanici_adi: candidate,
        },
        { onConflict: 'id' }
      )
      .select('id, kullanici_adi')
      .single()

    if (!error && data?.id) return data
  }

  throw new Error('PROFILE_SYNC_FAILED')
}

export async function POST(req) {
  try {
    const { publicClient, adminClient } = getClients()
    const body = await req.json().catch(() => ({}))
    const accessToken = String(body?.accessToken || '')
    const explicitUsername = String(body?.username || '')

    if (!accessToken) {
      return NextResponse.json({ error: 'Missing access token.' }, { status: 400 })
    }

    const { data: userData, error: userError } = await publicClient.auth.getUser(accessToken)
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Invalid session.' }, { status: 401 })
    }

    const profile = await ensureProfile(adminClient, userData.user, explicitUsername)
    return NextResponse.json({ profile })
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Profile sync failed.' },
      { status: 500 }
    )
  }
}
