'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

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

  turnstileScriptPromise = turnstileScriptPromise.catch((error) => {
    turnstileScriptPromise = undefined
    document.querySelector('script[data-turnstile-script="true"]')?.remove()
    throw error
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
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    onVerifyRef.current = onVerify
    onExpireRef.current = onExpire
  }, [onExpire, onVerify])

  useEffect(() => {
    let active = true

    if (!SITE_KEY || !containerRef.current) return undefined

    const timeout = setTimeout(() => { if (active) setStatus('error') }, 20000)

    loadTurnstileScript()
      .then((turnstile) => {
        if (!active || !turnstile || !containerRef.current) return

        const render = () => {
          if (!active || !containerRef.current) return
          containerRef.current.innerHTML = ''
          widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme,
          action,
          size: 'flexible',
          appearance: 'always',
          callback: (token) => {
            if (!active) return
            clearTimeout(timeout)
            setStatus('verified')
            onVerifyRef.current?.(token)
          },
          'before-interactive-callback': () => {
            if (!active) return
            clearTimeout(timeout)
            setStatus('ready')
          },
          'expired-callback': () => {
            if (!active) return
            setStatus('loading')
            onVerifyRef.current?.('')
            onExpireRef.current?.()
          },
          'error-callback': () => {
            if (!active) return
            clearTimeout(timeout)
            setStatus('error')
            onVerifyRef.current?.('')
          },
          })
        }
        // The script load promise already waits for api.js; ready() rejects async scripts.
        render()
      })
      .catch(() => {
        if (!active) return
        clearTimeout(timeout)
        setStatus('error')
        onVerifyRef.current?.('')
      })

    return () => {
      active = false
      clearTimeout(timeout)
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [action, theme])

  useImperativeHandle(ref, () => ({
    reset() {
      setStatus('loading')
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.reset(widgetIdRef.current)
      }
      onVerifyRef.current?.('')
    },
  }), [])

  if (!SITE_KEY) return null

  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <div ref={containerRef} style={{ minHeight: '65px' }} />
      {status === 'loading' && <div role="status" style={{ fontSize: '12px', color: '#aaa' }}>Güvenlik doğrulaması yükleniyor...</div>}
      {status === 'verified' && <div role="status" style={{ fontSize: '12px', color: '#86efac' }}>Güvenlik doğrulandı.</div>}
      {status === 'error' && <div role="alert" style={{ fontSize: '12px', color: '#fca5a5' }}>Güvenlik doğrulaması yüklenemedi. Lütfen sayfayı yenileyip tekrar dene.</div>}
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.6 }}>
        Bu form spam koruması için güvenlik doğrulaması kullanır.
      </div>
    </div>
  )
})

export default TurnstileWidget
