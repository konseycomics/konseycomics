import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { isTrustedBrowserRequest, isUuid } from '../../lib/requestSecurity'

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server environment variables are missing.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function getClientIp(req) {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('x-vercel-forwarded-for') ||
    req.headers.get('cf-connecting-ip') ||
    ''
  ).trim()
}

function getTurkeyDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function hashIp(ip) {
  return createHash('sha256').update(String(ip || '')).digest('hex')
}

export async function POST(req) {
  try {
    const { seriId } = await req.json()

    if (!isTrustedBrowserRequest(req)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    if (!seriId || !isUuid(seriId)) {
      return NextResponse.json({ error: 'Missing series id.' }, { status: 400 })
    }

    const clientIp = getClientIp(req)
    if (!clientIp) {
      return NextResponse.json({ ok: false, reason: 'missing_ip' }, { status: 200 })
    }

    const adminClient = getAdminClient()
    const goruntulenmeGunu = getTurkeyDateKey()
    const ipHash = hashIp(clientIp)

    const { data: insertedRows, error: insertError } = await adminClient
      .from('seri_goruntuleme_kayitlari')
      .upsert(
        [{ seri_id: seriId, ip_hash: ipHash, goruntulenme_gunu: goruntulenmeGunu }],
        { onConflict: 'seri_id,ip_hash,goruntulenme_gunu', ignoreDuplicates: true }
      )
      .select('id')

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    const yeniKayit = Array.isArray(insertedRows) && insertedRows.length > 0

    if (yeniKayit) {
      const { data: seriData, error: seriError } = await adminClient
        .from('seriler')
        .select('goruntuleme_sayisi')
        .eq('id', seriId)
        .maybeSingle()

      if (seriError) {
        return NextResponse.json({ error: seriError.message }, { status: 400 })
      }

      const mevcut = Number(seriData?.goruntuleme_sayisi || 0)
      const { error: updateError } = await adminClient
        .from('seriler')
        .update({ goruntuleme_sayisi: mevcut + 1 })
        .eq('id', seriId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }
    }

    return NextResponse.json({ ok: true, counted: yeniKayit })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Series view tracking failed.' }, { status: 500 })
  }
}
