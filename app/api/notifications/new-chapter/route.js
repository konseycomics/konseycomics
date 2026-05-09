import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const { seriId, seriBaslik, bolumBaslik, bolumNo } = await req.json()

    if (!accessToken || !seriId || !seriBaslik || !bolumBaslik) {
      return NextResponse.json({ error: 'Missing notification payload.' }, { status: 400 })
    }

    const { publicClient, adminClient } = getClients()
    const { data: userData, error: userError } = await publicClient.auth.getUser(accessToken)

    if (userError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { data: profil, error: profilError } = await adminClient
      .from('profiller')
      .select('rol')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (profilError || !['admin', 'yonetici'].includes(String(profil?.rol || ''))) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const { data: takipciler, error: takipciError } = await adminClient
      .from('okuma_listesi')
      .select('kullanici_id')
      .eq('seri_id', seriId)
      .in('durum', ['okunuyor', 'okumak_istiyorum'])

    if (takipciError) {
      return NextResponse.json({ error: takipciError.message }, { status: 400 })
    }

    const aliciIdleri = [...new Set((takipciler || []).map((item) => item.kullanici_id).filter(Boolean))]

    if (aliciIdleri.length === 0) {
      return NextResponse.json({ ok: true, count: 0 })
    }

    const payload = aliciIdleri.map((aliciId) => ({
      alici_id: aliciId,
      gonderen_id: null,
      tip: 'yeni_bolum',
      baslik: 'Takip ettiğin seriye yeni bölüm geldi',
      mesaj: `${seriBaslik} için ${bolumNo ? `#${bolumNo} ` : ''}${bolumBaslik} şimdi yayında.`,
      okundu: false,
    }))

    const { error: bildirimError } = await adminClient
      .from('bildirimler')
      .insert(payload)

    if (bildirimError) {
      return NextResponse.json({ error: bildirimError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, count: payload.length })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'New chapter notification failed.' }, { status: 500 })
  }
}
