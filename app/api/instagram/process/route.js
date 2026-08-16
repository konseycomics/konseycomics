import { NextResponse } from 'next/server'
import { instagramGonderisiYayinla } from '../../../lib/instagram'
import { instagramClients } from '../_auth'

export const maxDuration = 60

function authorized(req) {
  const secret = process.env.INSTAGRAM_CRON_SECRET
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  return Boolean(secret && token && secret === token)
}

export async function POST(req) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const { adminClient } = instagramClients()
  const { data: due, error } = await adminClient
    .from('instagram_gonderileri')
    .select('*')
    .in('durum', ['planlandi', 'hata'])
    .lte('yayin_tarihi', new Date().toISOString())
    .lt('deneme_sayisi', 4)
    .order('yayin_tarihi', { ascending: true })
    .limit(3)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = []
  for (const post of due || []) {
    const { data: claimed } = await adminClient
      .from('instagram_gonderileri')
      .update({ durum: 'isleniyor', son_deneme_at: new Date().toISOString(), deneme_sayisi: post.deneme_sayisi + 1, updated_at: new Date().toISOString() })
      .eq('id', post.id)
      .in('durum', ['planlandi', 'hata'])
      .select('id')
      .maybeSingle()
    if (!claimed) continue

    try {
      const published = await instagramGonderisiYayinla({ gorseller: post.gorseller, aciklama: post.aciklama })
      await adminClient.from('instagram_gonderileri').update({
        durum: 'yayinlandi',
        instagram_media_id: published.mediaId,
        instagram_permalink: published.permalink,
        yayinlandi_at: new Date().toISOString(),
        hata_mesaji: null,
        updated_at: new Date().toISOString(),
      }).eq('id', post.id)
      results.push({ id: post.id, status: 'published' })
    } catch (publishError) {
      await adminClient.from('instagram_gonderileri').update({
        durum: 'hata',
        hata_mesaji: String(publishError?.message || publishError).slice(0, 1000),
        updated_at: new Date().toISOString(),
      }).eq('id', post.id)
      results.push({ id: post.id, status: 'error' })
    }
  }

  return NextResponse.json({ ok: true, processed: results })
}
