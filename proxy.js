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
        --text: #f6f4ee;
        --gold: #d7a73a;
        --line: rgba(246, 244, 238, 0.14);
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        width: 100%;
        min-height: 100%;
        margin: 0;
        background: #000;
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
        inset: -35%;
        background:
          radial-gradient(circle at 50% 50%, rgba(215, 167, 58, 0.18), transparent 20%),
          conic-gradient(from 0deg, transparent, rgba(255, 255, 255, 0.1), transparent, rgba(215, 167, 58, 0.11), transparent);
        opacity: 0.68;
        animation: slowSpin 22s linear infinite;
      }

      body::after {
        content: "";
        position: fixed;
        inset: 0;
        background:
          linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.07), transparent),
          repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.025), rgba(255, 255, 255, 0.025) 1px, transparent 1px, transparent 8px);
        mix-blend-mode: screen;
        opacity: 0.32;
        transform: translateX(-120%);
        animation: sweep 4.8s ease-in-out infinite;
      }

      main {
        position: relative;
        z-index: 1;
        width: min(92vw, 900px);
        padding: 40px 24px;
        text-align: center;
      }

      .mark {
        position: relative;
        display: grid;
        place-items: center;
        width: 74px;
        height: 74px;
        margin: 0 auto 34px;
        border: 1px solid var(--line);
        border-radius: 50%;
        animation: float 3.2s ease-in-out infinite;
      }

      .mark::after {
        content: "";
        position: absolute;
        inset: 12px;
        border: 1px solid rgba(215, 167, 58, 0.42);
        border-radius: 50%;
        animation: ring 2.4s ease-in-out infinite;
      }

      .mark::before {
        content: "";
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--gold);
        box-shadow: 0 0 34px rgba(215, 167, 58, 0.95);
        animation: pulse 1.8s ease-in-out infinite;
      }

      h1 {
        position: relative;
        margin: 0;
        font-size: clamp(42px, 9vw, 112px);
        line-height: 0.94;
        letter-spacing: 0;
        word-spacing: 0.12em;
        text-transform: uppercase;
        text-wrap: balance;
        font-weight: 950;
        text-shadow:
          0 0 28px rgba(255, 255, 255, 0.16),
          0 18px 70px rgba(0, 0, 0, 0.9);
        animation: titleIn 900ms cubic-bezier(0.16, 1, 0.3, 1) both, flicker 6s ease-in-out 1s infinite;
      }

      h1 .glitch {
        position: absolute;
        inset: 0;
        pointer-events: none;
        opacity: 0;
      }

      h1 .glitch-a {
        color: rgba(215, 167, 58, 0.5);
        transform: translate(-2px, 0);
        animation: glitchA 4.7s steps(1, end) infinite;
      }

      h1 .glitch-b {
        color: rgba(255, 255, 255, 0.42);
        transform: translate(2px, 0);
        animation: glitchB 5.2s steps(1, end) infinite;
      }

      @keyframes slowSpin {
        to { transform: rotate(360deg); }
      }

      @keyframes sweep {
        0%, 48% { transform: translateX(-120%); }
        64%, 100% { transform: translateX(120%); }
      }

      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }

      @keyframes ring {
        0%, 100% { transform: scale(0.86); opacity: 0.5; }
        50% { transform: scale(1.22); opacity: 0.95; }
      }

      @keyframes pulse {
        0%, 100% {
          transform: scale(0.82);
          opacity: 0.45;
        }
        50% {
          transform: scale(1);
          opacity: 1;
        }
      }

      @keyframes titleIn {
        from {
          opacity: 0;
          filter: blur(16px);
          transform: translateY(18px) scale(0.98);
        }
        to {
          opacity: 1;
          filter: blur(0);
          transform: translateY(0) scale(1);
        }
      }

      @keyframes flicker {
        0%, 88%, 100% { opacity: 1; }
        89% { opacity: 0.78; }
        90% { opacity: 1; }
        92% { opacity: 0.88; }
        93% { opacity: 1; }
      }

      @keyframes glitchA {
        0%, 92%, 100% { opacity: 0; clip-path: inset(0 0 0 0); }
        93% { opacity: 0.85; clip-path: inset(12% 0 64% 0); }
        94% { opacity: 0; }
      }

      @keyframes glitchB {
        0%, 84%, 100% { opacity: 0; clip-path: inset(0 0 0 0); }
        85% { opacity: 0.72; clip-path: inset(62% 0 18% 0); }
        86% { opacity: 0; }
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
      <div class="mark" aria-hidden="true"></div>
      <h1>
        <span>KONSEY ÇOK KISA SÜRELİĞİNE BAKIMDA</span>
        <span class="glitch glitch-a" aria-hidden="true">KONSEY ÇOK KISA SÜRELİĞİNE BAKIMDA</span>
        <span class="glitch glitch-b" aria-hidden="true">KONSEY ÇOK KISA SÜRELİĞİNE BAKIMDA</span>
      </h1>
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
