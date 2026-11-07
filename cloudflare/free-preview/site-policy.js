export function isProductionHost(hostname, env) {
  return env.KONSEY_PRODUCTION === '1' && hostname === 'www.konseycomics.com'
}

export function siteResponseHeaders(request, env) {
  const { hostname, pathname } = new URL(request.url)
  const privatePath = /^\/(api|admin|auth|giris|sifre-sifirla)(\/|$)/.test(pathname) || pathname === '/profil/duzenle'
  return {
    ...(!isProductionHost(hostname, env) || privatePath ? { 'X-Robots-Tag': 'noindex, nofollow, noarchive' } : {}),
    'Cache-Control': 'no-store',
  }
}

export function productionRedirect(request, env) {
  const url = new URL(request.url)
  if (env.KONSEY_PRODUCTION !== '1' || url.hostname !== 'konseycomics.com') return null
  url.protocol = 'https:'
  url.hostname = 'www.konseycomics.com'
  return Response.redirect(url.href, 308)
}

export function robotsText(request, env) {
  if (!isProductionHost(new URL(request.url).hostname, env)) return 'User-agent: *\nDisallow: /\n'
  return 'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /auth/\nSitemap: https://www.konseycomics.com/sitemap.xml\n'
}
