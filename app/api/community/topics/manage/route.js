import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getForumBySlug } from '../../../../lib/forumConfig'

function getClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Supabase environment variables are missing.')
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

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { konuId, action, forumSlug } = await req.json()
    const allowedActions = ['delete', 'hide', 'restore', 'pin', 'unpin', 'lock', 'unlock', 'move']
    if (!konuId || !allowedActions.includes(action)) {
      return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
    }

    const { publicClient, adminClient } = getClients()
    const { data: userData, error: userError } = await publicClient.auth.getUser(accessToken)

    if (userError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const userId = userData.user.id

    const [{ data: topicRow }, { data: profileRow }] = await Promise.all([
      adminClient
        .from('topluluk_konulari')
        .select('id, kullanici_id, aktif')
        .eq('id', konuId)
        .maybeSingle(),
      adminClient
        .from('public_profiller')
        .select('id, rol')
        .eq('id', userId)
        .maybeSingle(),
    ])

    if (!topicRow?.id) {
      return NextResponse.json({ error: 'Konu bulunamadı.' }, { status: 404 })
    }

    const isOwner = topicRow.kullanici_id === userId
    const isAdmin = ['admin', 'yonetici', 'moderator'].includes(String(profileRow?.rol || '').toLowerCase())

    if (action === 'delete' && !isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Bu konuyu silme yetkin yok.' }, { status: 403 })
    }

    if (action !== 'delete' && !isAdmin) {
      return NextResponse.json({ error: 'Bu moderasyon işlemi için yetkin yok.' }, { status: 403 })
    }

    const updatePayload = { updated_at: new Date().toISOString() }
    if (action === 'delete' || action === 'hide') updatePayload.aktif = false
    if (action === 'restore') updatePayload.aktif = true
    if (action === 'pin') updatePayload.sabitlendi = true
    if (action === 'unpin') updatePayload.sabitlendi = false
    if (action === 'lock') updatePayload.kilitli = true
    if (action === 'unlock') updatePayload.kilitli = false
    if (action === 'move') {
      const forum = getForumBySlug(forumSlug)
      if (!forum) return NextResponse.json({ error: 'Hedef forum bulunamadı.' }, { status: 400 })
      const { data: forumRow } = await adminClient.from('topluluk_forumlari').select('id').eq('slug', forum.slug).maybeSingle()
      if (!forumRow?.id) return NextResponse.json({ error: 'Forum veritabanında bulunamadı.' }, { status: 400 })
      updatePayload.forum_id = forumRow.id
      updatePayload.kategori = forum.category
    }

    const { error: updateError } = await adminClient
      .from('topluluk_konulari')
      .update(updatePayload)
      .eq('id', konuId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    if (isAdmin) {
      await adminClient.from('topluluk_moderasyon_loglari').insert({
        moderator_id: userId,
        eylem: `topic_${action}`,
        konu_id: konuId,
        detay: action === 'move' ? { forum_slug: forumSlug } : {},
      })
    }

    return NextResponse.json({
      ok: true,
      action,
      hidden: Boolean(updatePayload.aktif === false),
    })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Topic manage failed.' }, { status: 500 })
  }
}
