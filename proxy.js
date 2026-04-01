import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function proxy(req) {
  const pathname = req.nextUrl.pathname
  const host = req.headers.get('host') || ''
  const canonicalHost = 'www.konseycomics.com'
  const bareHost = 'konseycomics.com'
  const legacyHost = 'konseycomics.vercel.app'

  if (host === legacyHost || host === bareHost) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.protocol = 'https:'
    redirectUrl.host = canonicalHost
    return NextResponse.redirect(redirectUrl, 308)
  }

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
          cookiesToSet.forEach(({ name, value }) => {
            req.cookies.set(name, value)
          })
          res = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (pathname.startsWith('/admin') && user) {
    const { data: profil } = await supabase
      .from('profiller')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle()

    if (!profil || !['admin', 'yonetici'].includes(profil.rol)) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/'
      redirectUrl.search = ''
      return NextResponse.redirect(redirectUrl)
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
