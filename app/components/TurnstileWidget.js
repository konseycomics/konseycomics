'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
let turnstileScriptPromise

function loadTurnstileScript() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (turnstileScriptPromise) return turnstileScriptPromise

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-turnstile-script="true"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.turnstile))
      existing.addEventListener('error', reject)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.dataset.turnstileScript = 'true'
    script.onload = () => resolve(window.turnstile)
    script.onerror = reject
    document.head.appendChild(script)
  })

  return turnstileScriptPromise
}

const TurnstileWidget = forwardRef(function TurnstileWidget(
  { onVerify, onExpire, theme = 'dark', action = 'auth' },
  ref
) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)
  const onVerifyRef = useRef(onVerify)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onVerifyRef.current = onVerify
    onExpireRef.current = onExpire
  }, [onExpire, onVerify])

  useEffect(() => {
    let active = true

    if (!SITE_KEY || !containerRef.current) return undefined

    loadTurnstileScript()
      .then((turnstile) => {
        if (!active || !turnstile || !containerRef.current) return

        containerRef.current.innerHTML = ''
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme,
          action,
          callback: (token) => onVerifyRef.current?.(token),
          'expired-callback': () => {
            onVerifyRef.current?.('')
            onExpireRef.current?.()
          },
          'error-callback': () => {
            onVerifyRef.current?.('')
          },
        })
      })
      .catch(() => {
        onVerifyRef.current?.('')
      })

    return () => {
      active = false
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [action, theme])

  useImperativeHandle(ref, () => ({
    reset() {
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.reset(widgetIdRef.current)
      }
      onVerifyRef.current?.('')
    },
  }), [])

  if (!SITE_KEY) return null

  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <div ref={containerRef} />
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.6 }}>
        Bu form spam koruması için güvenlik doğrulaması kullanır.
      </div>
    </div>
  )
})

export default TurnstileWidget
