'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

async function syncProfile(accessToken) {
  if (!accessToken) return
  try {
    await fetch('/api/auth/sync-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
    })
  } catch {}
}

function getAuthCallbackType() {
  if (typeof window === 'undefined') return ''
  const url = new URL(window.location.href)
  const searchParams = new URLSearchParams(url.search)
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
  return searchParams.get('type') || hashParams.get('type') || ''
}

function getRedirectPath(type) {
  if (type === 'recovery') return '/sifre-sifirla'
  if (type === 'email_change' || type === 'email_change_current' || type === 'email_change_new') {
    return '/?auth=email-changed'
  }
  return '/'
}

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const initialType = getAuthCallbackType()

    // Supabase URL'deki token'ı otomatik işler
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        syncProfile(session.access_token).finally(() => {
          router.push(getRedirectPath(initialType))
        })
      } else {
        // Token işlenmesini bekle
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          const callbackType = getAuthCallbackType() || initialType
          if (event === 'SIGNED_IN' && session) {
            subscription.unsubscribe()
            syncProfile(session.access_token).finally(() => {
              router.push(getRedirectPath(callbackType))
            })
          }
          if (event === 'PASSWORD_RECOVERY') {
            subscription.unsubscribe()
            router.push('/sifre-sifirla')
          }
        })
      }
    })
  }, [router])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
        <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>Giriş yapılıyor...</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Lütfen bekle, yönlendiriliyorsun.</div>
      </div>
    </div>
  )
}
