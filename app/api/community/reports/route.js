import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    const { konuId, yanitId, neden, aciklama } = await req.json()
    if (!token || (!konuId && !yanitId) || String(neden || '').trim().length < 3) return NextResponse.json({ error: 'Eksik şikâyet bilgisi.' }, { status: 400 })
    const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_KEY, { auth: { persistSession: false } })
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data } = await auth.auth.getUser(token)
    const userId = data?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    const { error } = await admin.from('topluluk_sikayetleri').insert({ konu_id: konuId || null, yanit_id: yanitId || null, bildiren_id: userId, neden: String(neden).trim().slice(0, 80), aciklama: String(aciklama || '').trim().slice(0, 500) })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Report failed.' }, { status: 500 })
  }
}
