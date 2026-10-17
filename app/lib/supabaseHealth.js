export async function probeSupabaseHealth({ url, key, fetchImpl = fetch, timeoutMs = 2500 }) {
  if (!url || !key) return { healthy: false, definitive: true, reason: 'missing_configuration' }
  let endpoint
  try {
    endpoint = new URL('/rest/v1/kategoriler', url)
  } catch {
    return { healthy: false, definitive: true, reason: 'invalid_configuration' }
  }
  endpoint.searchParams.set('select', 'id')
  endpoint.searchParams.set('limit', '1')
  let failure
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
      // The response body is not needed, but must not keep a connection open.
      await response.body?.cancel()
      if (response.ok) return { healthy: true }
      const definitive = response.status < 500 && response.status !== 429
      failure = { healthy: false, definitive, reason: 'http_error', status: response.status }
      if (definitive) return failure
    } catch {
      failure = { healthy: false, definitive: false, reason: controller.signal.aborted ? 'timeout' : 'network_error' }
    } finally {
      clearTimeout(timeout)
    }
  }
  return failure
}

export async function checkSupabaseHealth(options) {
  return (await probeSupabaseHealth(options)).healthy
}

export function createHealthMonitor({ probe, now = Date.now, onFailure = () => {}, healthyTtlMs = 60000, retryTtlMs = 10000, graceMs = 120000, failureThreshold = 3 }) {
  let checkedAt = null
  let lastSuccessAt = null
  let consecutiveFailures = 0
  let lastProbeHealthy = false
  let allowed = false
  let pending = null

  return function isHealthy() {
    const ttl = lastProbeHealthy ? healthyTtlMs : retryTtlMs
    if (checkedAt !== null && now() - checkedAt < ttl) return Promise.resolve(allowed)
    if (pending) return pending

    pending = (async () => {
      let result
      try { result = await probe() }
      catch { result = { healthy: false, definitive: false, reason: 'probe_error' } }
      checkedAt = now()
      lastProbeHealthy = result.healthy
      if (result.healthy) {
        lastSuccessAt = checkedAt
        consecutiveFailures = 0
        allowed = true
      } else {
        consecutiveFailures++
        // Never serve an unverified cold start or bypass quota/auth failures.
        allowed = !result.definitive && lastSuccessAt !== null &&
          checkedAt - lastSuccessAt < graceMs && consecutiveFailures < failureThreshold
        onFailure({ reason: result.reason, status: result.status, consecutiveFailures, maintenance: !allowed })
      }
      return allowed
    })().finally(() => { pending = null })
    return pending
  }
}
