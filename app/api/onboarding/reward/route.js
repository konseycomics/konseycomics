import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ONBOARDING_TITLE = {
  kod: 'konsey_ilk_adim',
  isim: 'Konsey Yolcusu',
  aciklama: 'Ilk takip, ilk bölüm ve ilk puan ile Konsey yolculuğunu başlattın.',
  kategori: 'engagement',
  nadirlik: 'rare',
  aktif: true,
  siralama: 95,
}

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

async function ensureTitle(adminClient) {
  const { data: existing } = await adminClient
    .from('unvan_tanimlari')
    .select('id, kod, isim')
    .eq('kod', ONBOARDING_TITLE.kod)
    .maybeSingle()

  if (existing?.id) return existing

  const { data, error } = await adminClient
    .from('unvan_tanimlari')
    .insert(ONBOARDING_TITLE)
    .select('id, kod, isim')
    .single()

  if (error) throw error
  return data
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { publicClient, adminClient } = getClients()
    const { data: userData, error: userError } = await publicClient.auth.getUser(accessToken)

    if (userError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const kullaniciId = userData.user.id

    const [listeCount, okumaCount, puanCount] = await Promise.all([
      adminClient.from('okuma_listesi').select('seri_id', { count: 'exact', head: true }).eq('kullanici_id', kullaniciId),
      adminClient.from('kullanici_bolum_okumalari').select('id', { count: 'exact', head: true }).eq('kullanici_id', kullaniciId).gte('completion_ratio', 0.7),
      adminClient.from('seri_puanlari').select('seri_id', { count: 'exact', head: true }).eq('kullanici_id', kullaniciId),
    ])

    const tamamlandi =
      Number(listeCount.count || 0) > 0 &&
      Number(okumaCount.count || 0) > 0 &&
      Number(puanCount.count || 0) > 0

    if (!tamamlandi) {
      return NextResponse.json({ ok: true, awarded: false, reason: 'requirements_not_met' })
    }

    const title = await ensureTitle(adminClient)

    const { data: existingUnlock } = await adminClient
      .from('kullanici_unvanlari')
      .select('id')
      .eq('kullanici_id', kullaniciId)
      .eq('unvan_id', title.id)
      .maybeSingle()

    if (existingUnlock?.id) {
      return NextResponse.json({ ok: true, awarded: false, reason: 'already_unlocked', title })
    }

    const { data: activeTitle } = await adminClient
      .from('kullanici_unvanlari')
      .select('id')
      .eq('kullanici_id', kullaniciId)
      .eq('one_cikarildi', true)
      .maybeSingle()

    const { error: unlockError } = await adminClient
      .from('kullanici_unvanlari')
      .insert({
        kullanici_id: kullaniciId,
        unvan_id: title.id,
        one_cikarildi: !activeTitle?.id,
        acilma_nedeni: {
          kaynak: 'onboarding_gorevleri',
          takip: true,
          okuma: true,
          puan: true,
        },
      })

    if (unlockError) {
      return NextResponse.json({ error: unlockError.message }, { status: 400 })
    }

    await adminClient
      .from('bildirimler')
      .insert({
        alici_id: kullaniciId,
        gonderen_id: null,
        tip: 'rozet_kazanildi',
        baslik: 'Yeni unvan kazandın',
        mesaj: `${title.isim} unvanının kilidi açıldı. Profilinde öne çıkarabilirsin.`,
        okundu: false,
      })

    return NextResponse.json({ ok: true, awarded: true, title })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Onboarding reward failed.' }, { status: 500 })
  }
}
