import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const MAINTENANCE_ENABLED = process.env.MAINTENANCE_MODE !== 'false'

function maintenanceResponse() {
  return new NextResponse(`<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Konsey Bakımda</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #000;
        --panel: rgba(255, 255, 255, 0.035);
        --panel-strong: rgba(255, 255, 255, 0.075);
        --text: #f5f5f3;
        --muted: #b8b8b2;
        --gold: #f0b232;
        --line: rgba(255, 255, 255, 0.11);
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        width: 100%;
        min-height: 100%;
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: Arial, Helvetica, sans-serif;
      }

      body {
        min-height: 100vh;
        display: grid;
        place-items: center;
        overflow: hidden;
      }

      body::before {
        content: "";
        position: fixed;
        inset: 0;
        background:
          radial-gradient(circle at 50% 38%, rgba(240, 178, 50, 0.16), transparent 28%),
          radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.06), transparent 40%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 42%);
        opacity: 0.95;
        animation: ambience 7s ease-in-out infinite alternate;
      }

      body::after {
        content: "";
        position: fixed;
        inset: 0;
        background:
          radial-gradient(circle at center, transparent 0 42%, rgba(0, 0, 0, 0.86) 78%),
          repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.018), rgba(255, 255, 255, 0.018) 1px, transparent 1px, transparent 8px);
        pointer-events: none;
      }

      main {
        position: relative;
        z-index: 1;
        width: min(92vw, 860px);
        padding: 42px 22px;
        text-align: center;
      }

      .logo {
        display: block;
        width: min(270px, 64vw);
        height: auto;
        margin: 0 auto 34px;
        filter: drop-shadow(0 18px 34px rgba(0, 0, 0, 0.9));
        animation: enter 760ms cubic-bezier(0.16, 1, 0.3, 1) both;
      }

      .signal {
        position: relative;
        width: min(100%, 540px);
        height: 1px;
        margin: 0 auto 30px;
        background: linear-gradient(90deg, transparent, rgba(240, 178, 50, 0.55), transparent);
        overflow: hidden;
        animation: enter 760ms cubic-bezier(0.16, 1, 0.3, 1) 80ms both;
      }

      .signal::after {
        content: "";
        position: absolute;
        top: 0;
        left: -18%;
        width: 18%;
        height: 100%;
        background: var(--text);
        box-shadow: 0 0 22px rgba(245, 242, 234, 0.82);
        animation: trace 3.6s ease-in-out infinite;
      }

      .eyebrow {
        margin: 0 0 16px;
        color: var(--gold);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        animation: enter 760ms cubic-bezier(0.16, 1, 0.3, 1) 150ms both;
      }

      h1 {
        margin: 0;
        font-size: clamp(42px, 8.2vw, 96px);
        line-height: 0.88;
        letter-spacing: 0;
        text-transform: uppercase;
        text-wrap: balance;
        font-weight: 950;
        text-shadow: 0 18px 70px rgba(0, 0, 0, 0.92);
        animation: enter 820ms cubic-bezier(0.16, 1, 0.3, 1) 220ms both;
      }

      .social {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        min-height: 44px;
        margin-top: 32px;
        padding: 0 18px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: var(--panel);
        color: var(--text);
        text-decoration: none;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.02em;
        animation: enter 760ms cubic-bezier(0.16, 1, 0.3, 1) 340ms both;
        transition: border-color 180ms ease, background 180ms ease, transform 180ms ease;
      }

      .social:hover {
        border-color: rgba(240, 178, 50, 0.48);
        background: rgba(217, 170, 61, 0.1);
        transform: translateY(-2px);
      }

      .social svg {
        width: 18px;
        height: 18px;
        flex: 0 0 auto;
      }

      .social span {
        color: var(--gold);
      }

      @keyframes ambience {
        from {
          opacity: 0.76;
          transform: scale(1);
        }
        to {
          opacity: 1;
          transform: scale(1.04);
        }
      }

      @keyframes trace {
        0%, 30% { left: -18%; opacity: 0; }
        42% { opacity: 1; }
        70%, 100% { left: 100%; opacity: 0; }
      }

      @keyframes enter {
        from {
          opacity: 0;
          filter: blur(10px);
          transform: translateY(14px);
        }
        to {
          opacity: 1;
          filter: blur(0);
          transform: translateY(0);
        }
      }

      @media (max-width: 560px) {
        main {
          width: 100%;
          padding: 34px 20px;
        }

        .logo {
          width: min(230px, 70vw);
          margin-bottom: 28px;
        }

        h1 {
          font-size: clamp(42px, 15vw, 76px);
        }

        .social {
          min-height: 48px;
          padding: 0 16px;
          font-size: 12px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 1ms !important;
          animation-iteration-count: 1 !important;
        }
      }
    </style>
  </head>
  <body>
    <main aria-label="Bakim bildirimi">
      <img class="logo" src="/demo/logo.png" alt="Konsey Comics" />
      <div class="signal" aria-hidden="true"></div>
      <p class="eyebrow">Çok kısa süreliğine</p>
      <h1>Bakımdayız</h1>
      <a class="social" href="https://www.instagram.com/konseycomics" rel="noopener noreferrer" target="_blank" aria-label="KonseyComics Instagram hesabini ac">
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="5.5" stroke="currentColor" stroke-width="1.8"/>
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.8"/>
          <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/>
        </svg>
        Instagram <span>@konseycomics</span>
      </a>
    </main>
  </body>
</html>`, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'Retry-After': '3600',
    },
  })
}

export async function proxy(req) {
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

  if (MAINTENANCE_ENABLED) {
    return maintenanceResponse()
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

  await supabase.auth.getSession()

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|demo/logo.png).*)'],
}
