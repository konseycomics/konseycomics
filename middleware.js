import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Session'ı yenile
  const { data: { session } } = await supabase.auth.getSession()

  // /admin rotasini koru
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      const loginUrl = new URL('/giris', req.url)
      loginUrl.searchParams.set('redirect', req.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Admin veya yonetici rolu kontrolu
    const { data: profil } = await supabase
      .from('profiller')
      .select('rol')
      .eq('id', session.user.id)
      .single()

    if (!profil || (profil.rol !== 'admin' && profil.rol !== 'yonetici')) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // /profil/duzenle rotasini koru
  if (req.nextUrl.pathname.startsWith('/profil/duzenle')) {
    if (!session) {
      return NextResponse.redirect(new URL('/giris', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*', '/profil/duzenle'],
}
