export function blocksPreviewWrite(hostname, url, method) {
  return hostname === 'konseycomics-free-preview.konseycomics.workers.dev'
    && !['GET', 'HEAD'].includes(method.toUpperCase())
    && new URL(url).pathname.startsWith('/rest/v1/')
}

export function previewSupabaseFetch(input, init = {}) {
  const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url
  const method = init.method || input?.method || 'GET'
  const hostname = typeof window === 'undefined' ? '' : window.location.hostname
  // Avoid accidental live data edits from the trial panel; normal auth requests still work.
  if (blocksPreviewWrite(hostname, url, method)) {
    return Promise.resolve(Response.json({ message: 'Bu deneme surumunde veri degisiklikleri kapali.' }, { status: 403 }))
  }
  return fetch(input, init)
}
