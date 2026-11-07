let publicIndex

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url)
    const headers = { 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Cache-Control': 'no-store' }
    if (pathname === '/robots.txt') {
      return new Response('User-agent: *\nDisallow: /\n', { headers: { ...headers, 'Content-Type': 'text/plain' } })
    }
    if (pathname.startsWith('/_vinext/static-cache/')) {
      return new Response('Not found', { status: 404, headers })
    }
    const accountTests = env?.KONSEY_PREVIEW_ACCOUNTS === '1'
    if (accountTests && request.method === 'POST' && !request.headers.has('next-action')) {
      let handler
      if (pathname === '/api/auth/login') handler = (await import('../../app/api/auth/login/route.js')).POST
      if (pathname === '/api/auth/sync-profile') handler = (await import('../../app/api/auth/sync-profile/route.js')).POST
      if (pathname === '/api/media/upload' && env.KONSEY_PREVIEW_UPLOADS === '1') {
        const { uploadPreviewImage } = await import('./media-upload.js')
        handler = req => uploadPreviewImage(req, env)
      }
      if (pathname === '/api/preview/series' && env.KONSEY_PREVIEW_DRAFTS === '1') {
        const { createPreviewSeries } = await import('./draft-series.js')
        handler = req => createPreviewSeries(req, env)
      }
      if (pathname === '/api/preview/chapters' && env.KONSEY_PREVIEW_DRAFTS === '1') {
        const { createPreviewChapter } = await import('./draft-chapter.js')
        handler = req => createPreviewChapter(req, env)
      }
      if (handler) {
        const result = await handler(request)
        const response = new Response(result.body, result)
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
        response.headers.set('X-Konsey-Preview', 'account-test-no-publishing')
        return response
      }
    }
    const blocked = /^\/api(\/|$)/.test(pathname) || (!accountTests && (/^\/(admin|auth|giris|sifre-sifirla)(\/|$)/.test(pathname) || pathname === '/profil/duzenle'))
    if (blocked || !['GET', 'HEAD'].includes(request.method) || request.headers.has('next-action')) {
      return new Response('This read-only free-tier preview does not allow account changes or uploads.', { status: 403, headers })
    }
    const isRsc = request.headers.get('rsc') === '1' || request.headers.get('accept')?.includes('text/x-component') || new URL(request.url).searchParams.has('_rsc')
    if (env?.ASSETS && process.env.VINEXT_PRERENDER !== '1' && !isRsc && !request.headers.has('authorization') && !request.headers.has('cookie') && !pathname.startsWith('/_next/')) {
      if (!publicIndex) {
        const indexResponse = await env.ASSETS.fetch('https://vinext.invalid/_vinext/static-cache/public-pages.json')
        if (indexResponse.ok) publicIndex = await indexResponse.json()
      }
      const snapshot = publicIndex?.routes[pathname]
      if (snapshot) {
        const asset = await env.ASSETS.fetch(`https://vinext.invalid${snapshot.asset}`)
        if (!asset.ok) return new Response('Preview snapshot unavailable', { status: 503, headers })
        return new Response(request.method === 'HEAD' ? null : asset.body, {
          status: snapshot.status,
          headers: { ...publicIndex.headers, ...snapshot.headers, ...headers, 'Content-Type': 'text/html; charset=utf-8', 'X-Konsey-Preview': 'read-only-free-tier', 'X-Konsey-Delivery': 'static-html' },
        })
      }
    }
    const { default: app } = await import('vinext/server/fetch-handler')
    const result = await app.fetch(request, env, ctx)
    const response = new Response(result.body, result)
    for (const [key, value] of Object.entries(headers)) {
      if (key === 'Cache-Control' && process.env.VINEXT_PRERENDER === '1') continue
      response.headers.set(key, value)
    }
    response.headers.set('X-Konsey-Preview', 'read-only-free-tier')
    return response
  },
}
