'use client'

import { supabase } from './supabase'

function normalizeUsername(value) {
  return (value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function buildUsernameCandidates(user) {
  const firstChoice = normalizeUsername(
    user?.user_metadata?.kullanici_adi ||
    user?.user_metadata?.user_name ||
    user?.email?.split('@')[0] ||
    `uye_${user?.id?.slice(0, 8)}`
  )

  const base = firstChoice.length >= 3 ? firstChoice : `uye_${user?.id?.slice(0, 8)}`
  return [base, `${base}_1`, `${base}_2`, `${base}_3`]
}

async function readOwnProfile(userId) {
  try {
    const { data } = await supabase
      .from('profiller')
      .select('id, kullanici_adi, avatar_url, rol')
      .eq('id', userId)
      .maybeSingle()

    return data || null
  } catch {
    return null
  }
}

export async function ensureProfile(user) {
  try {
    if (!user?.id) return null

    const existing = await readOwnProfile(user.id)
    if (existing) return existing

    const candidates = buildUsernameCandidates(user)

    for (const kullaniciAdi of candidates) {
      const { error } = await supabase.from('profiller').insert([{
        id: user.id,
        kullanici_adi: kullaniciAdi,
        rol: 'okuyucu',
      }])

      if (!error) {
        return await readOwnProfile(user.id)
      }
    }

    return await readOwnProfile(user.id)
  } catch {
    return null
  }
}
