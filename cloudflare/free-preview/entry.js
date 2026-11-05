import app from 'vinext/server/fetch-handler'

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url)
    const headers = { 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Cache-Control': 'no-store' }
    if (pathname === '/robots.txt') {
      return new Response('User-agent: *\nDisallow: /\n', { headers: { ...headers, 'Content-Type': 'text/plain' } })
    }
    const blocked = /^\/(api|admin|auth|giris|sifre-sifirla)(\/|$)/.test(pathname) || pathname === '/profil/duzenle'
    if (blocked || !['GET', 'HEAD'].includes(request.method) || request.headers.has('next-action')) {
      return new Response('This read-only free-tier preview does not allow account changes or uploads.', { status: 403, headers })
    }
    const result = await app.fetch(request, env, ctx)
    const response = new Response(result.body, result)
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
    response.headers.set('X-Konsey-Preview', 'read-only-free-tier')
    return response
  },
}
