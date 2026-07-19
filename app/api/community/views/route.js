import { createHash, randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req) {
  try {
    const { konuId } = await req.json()
    if (!konuId) return NextResponse.json({ error: 'Konu bulunamadı.' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) throw new Error('Supabase environment variables are missing.')

    const existingVisitor = req.cookies.get('konsey_forum_visitor')?.value
    const visitorId = existingVisitor || randomUUID()
    const visitorHash = createHash('sha256').update(`forum:${visitorId}:${serviceKey.slice(0, 16)}`).digest('hex')
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await admin.rpc('register_topluluk_view', { target_konu: konuId, visitor_hash: visitorHash })
    if (error) throw error

    const response = NextResponse.json({ ok: true, count: Number(data || 0) })
    if (!existingVisitor) {
      response.cookies.set('konsey_forum_visitor', visitorId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      })
    }
    return response
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'View registration failed.' }, { status: 500 })
  }
}
