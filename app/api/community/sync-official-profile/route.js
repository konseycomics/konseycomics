import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const TOKEN_HASH = 'a35e3cfec12fd7e80d731bf81040163a5f25b92127d47a738638f7026527204e'
const AVATAR_URL = 'https://cdn.konseycomics.com/avatarlar/peter-parker-official-v1.webp'

function authorized(req) {
  const supplied = createHash('sha256').update(req.headers.get('x-setup-token') || '').digest()
  const expected = Buffer.from(TOKEN_HASH, 'hex')
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

export async function POST(req) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) return NextResponse.json({ error: 'Supabase environment variables are missing.' }, { status: 500 })

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: profile, error: profileError } = await admin
    .from('topluluk_sistem_profilleri')
    .update({ avatar_url: AVATAR_URL, updated_at: new Date().toISOString() })
    .eq('slug', 'peter-parker')
    .select('id, avatar_url')
    .single()

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  const { error: topicError } = await admin
    .from('topluluk_konulari')
    .update({ kilitli: true, updated_at: new Date().toISOString() })
    .eq('sistem_profil_id', profile.id)

  if (topicError) return NextResponse.json({ error: topicError.message }, { status: 500 })
  return NextResponse.json({ ok: true, avatarUrl: profile.avatar_url })
}
