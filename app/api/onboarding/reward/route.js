import { NextResponse } from 'next/server'

// Ilk-adim gorevleri artik unvan kazandirmaz. Eski istemciler icin uyumlu yanit.
export async function POST() {
  return NextResponse.json({ ok: true, awarded: false, reason: 'titles_use_level_or_series' })
}
