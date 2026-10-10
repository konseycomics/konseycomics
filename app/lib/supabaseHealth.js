export async function checkSupabaseHealth({ url, key, fetchImpl = fetch, timeoutMs = 2500 }) {
  if (!url || !key) return false
  let endpoint
  try {
    endpoint = new URL('/rest/v1/kategoriler', url)
  } catch {
    return false
  }
  endpoint.searchParams.set('select', 'id')
  endpoint.searchParams.set('limit', '1')
  // Confirm transient failures once; quota/auth restrictions are definitive.
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetchImpl(endpoint, {
        method: 'GET',
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: 'no-store',
        signal: controller.signal,
      })
      if (response.ok) return true
      if (response.status < 500) return false
    } catch {
      if (attempt === 1) return false
    } finally {
      clearTimeout(timeout)
    }
  }
  return false
}
