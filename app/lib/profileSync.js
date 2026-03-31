'use client'

import { supabase } from './supabase'

function slugifyUsername(value) {
  const base = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')

  if (base.length >= 3) return base.slice(0, 24)
  if (base.length > 0) return `${base}${'_'.repeat(Math.max(0, 3 - base.length))}`.slice(0, 24)
  return ''
}

function getPreferredUsername(user, explicitUsername) {
  const emailLocalPart = String(user?.email || '').split('@')[0]
  return (
    slugifyUsername(explicitUsername) ||
    slugifyUsername(user?.user_metadata?.kullanici_adi) ||
    slugifyUsername(user?.user_metadata?.username) ||
    slugifyUsername(user?.raw_user_meta_data?.kullanici_adi) ||
    slugifyUsername(user?.raw_user_meta_data?.username) ||
    slugifyUsername(emailLocalPart) ||
    `uye_${String(user?.id || '').replace(/-/g, '').slice(0, 8)}`
  )
}

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

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const suffix = attempt === 0 ? '' : `_${Math.floor(100 + Math.random() * 900)}`
    const candidate = `${preferredUsername}${suffix}`.slice(0, 24)

    const { data: usedProfile } = await supabase
      .from('public_profiller')
      .select('id')
      .eq('kullanici_adi', candidate)
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
