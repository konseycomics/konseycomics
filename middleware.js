import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  let res = NextResponse.next({
    request: { headers: req.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          )
          res = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // /admin rotasini koru - giris yoksa /giris'e yonlendir
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

  // /profil/duzenle - giris olmadan erisim engelle
  if (req.nextUrl.pathname.startsWith('/profil/duzenle')) {
    if (!session) {
      return NextResponse.redirect(new URL('/giris', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/profil/duzenle',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
