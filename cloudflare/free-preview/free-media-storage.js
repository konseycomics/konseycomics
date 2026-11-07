const reply = (error, status) => Response.json({ error }, { status })

export async function storeFreeMedia(bytes, type, env, fetcher = fetch) {
  const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')
  const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }
  const key = `free-uploads/${crypto.randomUUID()}.${type === 'image/webp' ? 'webp' : 'jpg'}`
  const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('')
  const rpc = async (name, body) => {
    const response = await fetcher(`${base}/rest/v1/rpc/${name}`, {
      method: 'POST', redirect: 'manual', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (!response.ok) { await response.body?.cancel(); throw new Error('Free media setup unavailable') }
    return response.json()
  }
  const reserved = await rpc('konsey_reserve_free_media', { p_key: key, p_size: bytes.length, p_sha256: sha256 })
  if (reserved !== true) return reply('Ucretsiz gorsel alani sinirina ulasildi. Yeni yuklemeler durduruldu; ucretli depoya gecilmedi.', 507)
  const uploaded = await fetcher(`${base}/storage/v1/object/konsey-media-free/${key}`, {
    method: 'POST', redirect: 'manual', headers: { ...headers, 'Content-Type': type, 'x-upsert': 'false', 'cache-control': '3600' }, body: bytes,
  })
  if (!uploaded.ok) { await uploaded.body?.cancel(); return reply('Ucretsiz depoya kayit yapilamadi; ucretli depoya gecilmedi.', 503) }
  await uploaded.body?.cancel()
  if (await rpc('konsey_finish_free_media', { p_key: key }) !== true) return reply('Gorsel kaydedildi ancak yayin sirasi hazirlanamadi.', 503)
  return Response.json({ ok: true, key, url: `https://konseycomics-free-preview.konseycomics.workers.dev/${key}`, optimizedBytes: bytes.length, pendingPublication: true })
}
