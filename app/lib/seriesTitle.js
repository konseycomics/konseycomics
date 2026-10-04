export function validateSeriesTitle(enabled, name) {
  if (enabled && (!String(name || '').trim() || String(name).trim().length > 80)) {
    throw new Error('Ünvan adı 1-80 karakter olmalı.')
  }
}

export async function saveSeriesTitle(client, seriesId, enabled, name) {
  validateSeriesTitle(enabled, name)
  const { data: existing, error: readError } = await client.from('unvan_tanimlari')
    .select('id').eq('seri_id', seriesId).eq('kazanma_tipi', 'series').maybeSingle()
  if (readError) throw readError
  if (!enabled && !existing) return null
  const payload = enabled ? {
    isim: name.trim(), seri_id: seriesId, kazanma_tipi: 'series', gereken_seviye: null,
    aktif: true, siralama: 100, aciklama: 'Yayımlanmış tüm bölümleri okuyarak kazanılır.',
  } : { aktif: false }
  const query = existing
    ? client.from('unvan_tanimlari').update(payload).eq('id', existing.id)
    : client.from('unvan_tanimlari').insert({ ...payload, kod: `seri_${seriesId}` })
  const { data, error } = await query.select('id').single()
  if (error) throw error
  return data.id
}
