'use client'

import { supabase } from './supabase'
import { getPreferredUsername, getUsernameCandidates } from './username'

function isDuplicateUsernameError(error) {
  const message = String(error?.message || '').toLowerCase()
  return error?.code === '23505' || message.includes('duplicate') || message.includes('unique')
}

export async function ensureOwnProfile(user, explicitUsername) {
  if (!user?.id) return { ok: false, reason: 'missing-user' }

  const { data: existingProfile, error: existingError } = await supabase
    .from('profiller')
    .select('id, kullanici_adi')
    .eq('id', user.id)
    .maybeSingle()

  if (existingError) return { ok: false, reason: 'read-failed', error: existingError }
  if (existingProfile?.id) return { ok: true, profile: existingProfile }

  const preferredUsername = getPreferredUsername(user, explicitUsername)

  for (const candidate of getUsernameCandidates(preferredUsername, user.id)) {
    const { data: usedProfile } = await supabase
      .from('public_profiller')
      .select('id')
      .ilike('kullanici_adi', candidate)
      .maybeSingle()

    if (usedProfile?.id && usedProfile.id !== user.id) continue

    const { data, error } = await supabase
      .from('profiller')
      .insert({
        id: user.id,
        kullanici_adi: candidate,
      })
      .select('id, kullanici_adi')
      .single()

    if (!error && data?.id) {
      return { ok: true, profile: data }
    }

    if (!isDuplicateUsernameError(error)) {
      return { ok: false, reason: 'insert-failed', error }
    }
  }

  return { ok: false, reason: 'username-exhausted' }
}
