export function relativeTime(value, now) {
  // Postgres timestamp-without-time-zone values are UTC in this project.
  const iso = String(value || '').replace(' ', 'T')
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(iso) ? `${iso}Z` : iso
  const date = new Date(normalized)
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(now)) return ''
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000))
  if (seconds < 60) return 'Az önce'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}dk önce`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}s önce`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}g önce`
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' })
}
