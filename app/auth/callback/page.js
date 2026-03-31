'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { ensureOwnProfile } from '../../lib/profileSync'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    // Supabase URL'deki token'ı otomatik işler
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        ensureOwnProfile(session.user).finally(() => {
          router.push('/')
        })
      } else {
        // Token işlenmesini bekle
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            subscription.unsubscribe()
            ensureOwnProfile(session.user).finally(() => {
              router.push('/')
            })
          }
          if (event === 'PASSWORD_RECOVERY') {
            subscription.unsubscribe()
            router.push('/sifre-sifirla')
          }
        })
      }
    })
  }, [])

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
