import { allowsInteractiveApi, isLiveForum, needsInteractiveSession } from './interactive-policy.js'
import { authorizePreviewStaff, boundedBody } from './staff-request.js'

let publicIndex

export default {
  async scheduled(controller, env, ctx) {
    if (env.KONSEY_PREVIEW_REBUILD !== '1') return
    const { runPreviewRebuild } = await import('./rebuild.js')
    ctx.waitUntil(runPreviewRebuild(env))
  },
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
    const interactiveApi = allowsInteractiveApi(pathname, request.method, env)
    if (interactiveApi) {
      const origin = request.headers.get('origin')
      if (request.headers.has('next-action') || origin && origin !== new URL(request.url).origin) {
        return Response.json({ error: 'Forbidden.' }, { status: 403, headers })
      }
      if (needsInteractiveSession(pathname)) {
        const access = await authorizePreviewStaff(request, env, fetch, true)
        if (access.error) {
          const response = new Response(access.error.body, access.error)
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
          return response
        }
      }
      if (request.method === 'POST') {
        try {
          const body = await boundedBody(request, 128 * 1024)
          request = new Request(request.url, { method: request.method, headers: request.headers, body })
        } catch {
          return Response.json({ error: 'Istek boyutu siniri asildi.' }, { status: 413, headers })
        }
      }
    }
    if (accountTests && pathname === '/api/preview/refresh' && ['GET', 'POST'].includes(request.method) && !request.headers.has('next-action')) {
      const { previewRebuildRoute } = await import('./rebuild.js')
      const result = await previewRebuildRoute(request, env)
      const response = new Response(result.body, result)
      for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
      return response
    }
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
    if (((blocked || !['GET', 'HEAD'].includes(request.method)) && !interactiveApi) || request.headers.has('next-action')) {
      return new Response('This read-only free-tier preview does not allow account changes or uploads.', { status: 403, headers })
    }
    const isRsc = request.headers.get('rsc') === '1' || request.headers.get('accept')?.includes('text/x-component') || new URL(request.url).searchParams.has('_rsc')
    if (env?.ASSETS && process.env.VINEXT_PRERENDER !== '1' && !isLiveForum(pathname, env) && !isRsc && !request.headers.has('authorization') && !request.headers.has('cookie') && !pathname.startsWith('/_next/')) {
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
    response.headers.set('X-Konsey-Preview', env.KONSEY_PREVIEW_INTERACTIVE === '1' ? 'interactive-free-tier' : 'read-only-free-tier')
    return response
  },
}
