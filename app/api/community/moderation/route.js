import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function clients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !service) throw new Error('Supabase environment variables are missing.')
  return {
    auth: createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } }),
    admin: createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } }),
  }
}

async function moderator(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { auth, admin } = clients()
  const { data } = await auth.auth.getUser(token)
  const userId = data?.user?.id
  if (!userId) return null
  const { data: profile } = await admin.from('public_profiller').select('id, rol').eq('id', userId).maybeSingle()
  if (!['admin', 'yonetici', 'moderator'].includes(String(profile?.rol || '').toLowerCase())) return null
  return { admin, userId, role: String(profile.rol).toLowerCase() }
}

export async function GET(req) {
  try {
    const session = await moderator(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    const { admin } = session
    const [{ data: reports }, { data: topics }, { data: logs }] = await Promise.all([
      admin.from('topluluk_sikayetleri').select('*').order('created_at', { ascending: false }).limit(150),
      admin.from('topluluk_konulari').select('id, slug, baslik, kategori, aktif, sabitlendi, kilitli, yanit_sayisi, goruntulenme_sayisi, kullanici_id, created_at').order('created_at', { ascending: false }).limit(150),
      admin.from('topluluk_moderasyon_loglari').select('*').order('created_at', { ascending: false }).limit(30),
    ])
    const topicIds = [...new Set((reports || []).map((row) => row.konu_id).filter(Boolean))]
    const replyIds = [...new Set((reports || []).map((row) => row.yanit_id).filter(Boolean))]
    const userIds = [...new Set([...(reports || []).map((row) => row.bildiren_id), ...(topics || []).map((row) => row.kullanici_id), ...(logs || []).map((row) => row.moderator_id)].filter(Boolean))]
    const [{ data: reportTopics }, { data: replies }, { data: profiles }] = await Promise.all([
      topicIds.length ? admin.from('topluluk_konulari').select('id, slug, baslik, kategori, aktif').in('id', topicIds) : { data: [] },
      replyIds.length ? admin.from('topluluk_yanitlari').select('id, konu_id, icerik, aktif, kullanici_id').in('id', replyIds) : { data: [] },
      userIds.length ? admin.from('public_profiller').select('id, kullanici_adi, avatar_url, rol').in('id', userIds) : { data: [] },
    ])
    return NextResponse.json({ reports: reports || [], topics: topics || [], logs: logs || [], reportTopics: reportTopics || [], replies: replies || [], profiles: profiles || [] })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Moderation load failed.' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const session = await moderator(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    const { admin, userId, role } = session
    const { action, reportId, replyId } = await req.json()

    if (['report_review', 'report_resolve', 'report_reject'].includes(action)) {
      const status = action === 'report_review' ? 'inceleniyor' : action === 'report_resolve' ? 'cozuldu' : 'reddedildi'
      const payload = { durum: status, inceleyen_id: userId, updated_at: new Date().toISOString(), cozuldu_at: status === 'cozuldu' ? new Date().toISOString() : null }
      const { error } = await admin.from('topluluk_sikayetleri').update(payload).eq('id', reportId)
      if (error) throw error
      await admin.from('topluluk_moderasyon_loglari').insert({ moderator_id: userId, eylem: action, sikayet_id: reportId, detay: { durum: status } })
      return NextResponse.json({ ok: true })
    }

    if (['hide_reply', 'restore_reply'].includes(action)) {
      const aktif = action === 'restore_reply'
      const { error } = await admin.from('topluluk_yanitlari').update({ aktif, updated_at: new Date().toISOString() }).eq('id', replyId)
      if (error) throw error
      await admin.from('topluluk_moderasyon_loglari').insert({ moderator_id: userId, eylem: action, yanit_id: replyId })
      return NextResponse.json({ ok: true })
    }

    if (action === 'hard_delete_reply') {
      if (!['admin', 'yonetici'].includes(role)) return NextResponse.json({ error: 'Bu işlem yalnızca yöneticilere açık.' }, { status: 403 })
      await admin.from('topluluk_moderasyon_loglari').insert({ moderator_id: userId, eylem: action, yanit_id: replyId })
      const { error } = await admin.from('topluluk_yanitlari').delete().eq('id', replyId)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Moderation action failed.' }, { status: 500 })
  }
}
