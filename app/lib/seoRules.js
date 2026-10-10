export function isPublished(row, now = Date.now()) {
  if (row.yayin_durumu === 'yayinda') return true
  const scheduled = Date.parse(row.yayin_tarihi)
  return row.yayin_durumu === 'planlandi' && Number.isFinite(scheduled) && scheduled <= now
}

export async function fetchAllRows(query, pageSize = 500) {
  const rows = []
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await query.range(start, start + pageSize - 1)
    if (error) throw new Error(`Public content query failed: ${error.code || 'unknown'}`)
    rows.push(...(data || []))
    if (!data || data.length < pageSize) return rows
  }
}

export function validDate(value) {
  const date = new Date(value)
  return value && Number.isFinite(date.getTime()) ? date : undefined
}

export function ratingSchema(series) {
  const count = Number(series.puan_sayisi)
  const value = Number(series.ortalama_puan)
  if (!Number.isInteger(count) || count < 1 || !Number.isFinite(value) || value < 1 || value > 10) return undefined
  return { '@type': 'AggregateRating', ratingValue: value.toFixed(1), bestRating: '10', worstRating: '1', ratingCount: count }
}

export function safeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}
