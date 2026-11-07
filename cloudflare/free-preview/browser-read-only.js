export function blocksPreviewWrite(hostname, url, method, interactive = process.env.NEXT_PUBLIC_PREVIEW_INTERACTIVE) {
  return hostname === 'konseycomics-free-preview.konseycomics.workers.dev'
    && interactive !== '1'
    && !['GET', 'HEAD'].includes(method.toUpperCase())
    && new URL(url).pathname.startsWith('/rest/v1/')
}

export function previewSupabaseFetch(input, init = {}) {
  const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url
  const method = init.method || input?.method || 'GET'
  const hostname = typeof window === 'undefined' ? '' : window.location.hostname
  // Interactive builds use the caller's normal Supabase session and existing RLS.
  if (blocksPreviewWrite(hostname, url, method)) {
    return Promise.resolve(Response.json({ message: 'Bu deneme surumunde veri degisiklikleri kapali.' }, { status: 403 }))
  }
  return fetch(input, init)
}
