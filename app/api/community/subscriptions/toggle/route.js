import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function clients() {
  return {
    auth: createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_KEY, { auth: { persistSession: false } }),
    admin: createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }),
  }
}

export async function POST(req) {
  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    const { konuId } = await req.json()
    if (!token || !konuId) return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
    const { auth, admin } = clients()
    const { data } = await auth.auth.getUser(token)
    const userId = data?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    const { data: existing } = await admin.from('topluluk_abonelikleri').select('id').eq('konu_id', konuId).eq('kullanici_id', userId).maybeSingle()
    if (existing?.id) {
      const { error } = await admin.from('topluluk_abonelikleri').delete().eq('id', existing.id)
      if (error) throw error
      return NextResponse.json({ ok: true, active: false })
    }
    const { error } = await admin.from('topluluk_abonelikleri').insert({ konu_id: konuId, kullanici_id: userId })
    if (error) throw error
    return NextResponse.json({ ok: true, active: true })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Subscription failed.' }, { status: 500 })
  }
}
