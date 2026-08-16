import { NextResponse } from 'next/server'
import { requireInstagramAdmin } from '../_auth'

export async function GET(req) {
  try {
    const auth = await requireInstagramAdmin(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    const { data, error } = await auth.adminClient
      .from('instagram_gonderileri')
      .select('*')
      .order('yayin_tarihi', { ascending: false })
      .limit(30)
    if (error) throw error
    return NextResponse.json({ posts: data || [] })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Instagram gönderileri alınamadı.' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const auth = await requireInstagramAdmin(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    const body = await req.json()
    const images = Array.isArray(body.gorseller) ? body.gorseller.filter(url => /^https:\/\//.test(String(url))) : []
    const publishAt = new Date(body.yayinTarihi)
    if (images.length < 1 || images.length > 10) return NextResponse.json({ error: '1-10 Instagram görseli gerekli.' }, { status: 400 })
    if (Number.isNaN(publishAt.getTime())) return NextResponse.json({ error: 'Geçerli yayın tarihi gerekli.' }, { status: 400 })

    const { data, error } = await auth.adminClient.from('instagram_gonderileri').insert({
      bolum_id: body.bolumId || null,
      aciklama: String(body.aciklama || '').slice(0, 2200),
      gorseller: images,
      yayin_tarihi: publishAt.toISOString(),
      durum: body.taslak ? 'taslak' : 'planlandi',
      olusturan_id: auth.user.id,
    }).select().single()
    if (error) throw error
    return NextResponse.json({ ok: true, post: data })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Instagram gönderisi planlanamadı.' }, { status: 500 })
  }
}
