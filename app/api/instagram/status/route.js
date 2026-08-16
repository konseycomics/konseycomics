import { NextResponse } from 'next/server'
import { instagramHesabiniGetir } from '../../../lib/instagram'
import { requireInstagramAdmin } from '../_auth'

export async function GET(req) {
  const auth = await requireInstagramAdmin(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const account = await instagramHesabiniGetir()
    return NextResponse.json({ connected: true, account })
  } catch (error) {
    return NextResponse.json({ connected: false, error: error?.message || 'Instagram bağlantısı kurulmadı.' })
  }
}
