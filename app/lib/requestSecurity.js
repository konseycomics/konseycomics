const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value) {
  return UUID_REGEX.test(String(value || '').trim())
}

export function isTrustedBrowserRequest(req) {
  const host = String(req.headers.get('host') || '').trim().toLowerCase()
  if (!host) return false

  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  const candidates = [origin, referer].filter(Boolean)

  if (candidates.length === 0) return false

  return candidates.some((value) => {
    try {
      return new URL(value).host.toLowerCase() === host
    } catch {
      return false
    }
  })
}
