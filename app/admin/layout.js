'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

const navLinks = [
  { href: '/admin', label: '📊 Dashboard', exact: true },
  { href: '/admin/seriler', label: '📚 Seriler' },
  { href: '/admin/bolumler', label: '📖 Bölümler' },
  { href: '/admin/kullanicilar', label: '👥 Kullanıcılar' },
  { href: '/admin/yorumlar', label: '💬 Yorumlar' },
]

export default function AdminLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [kullanici, setKullanici] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    const kontrol = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/giris'); return }

      const { data: profil } = await supabase
        .from('profiller')
        .select('rol, kullanici_adi')
        .eq('id', session.user.id)
        .single()

      if (!profil || (profil.rol !== 'admin' && profil.rol !== 'yonetici')) {
        router.push('/')
        return
      }
      setKullanici(profil)
      setYukleniyor(false)
    }
    kontrol()
  }, [])

  const cikisYap = async () => {
    await supabase.auth.signOut()
    router.push('/giris')
  }

  if (yukleniyor) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a' }}>
        <div style={{ color: '#888', fontSize: '14px' }}>Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a', fontFamily: 'sans-serif' }}>
      <aside style={{
        width: '240px',
        background: '#111',
        borderRight: '1px solid #222',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 10
      }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #222' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ color: '#e63946', fontWeight: 700, fontSize: '18px', letterSpacing: '1px' }}>
              KONSEY
            </div>
            <div style={{ color: '#555', fontSize: '11px', marginTop: '2px' }}>Admin Panel</div>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {navLinks.map(link => {
            const aktif = link.exact ? pathname === link.href : pathname.startsWith(link.href)
            return (
              <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  marginBottom: '4px',
                  color: aktif ? '#fff' : '#888',
                  background: aktif ? '#e63946' : 'transparent',
                  fontSize: '14px',
                  fontWeight: aktif ? 600 : 400,
                  transition: 'all 0.15s',
                  cursor: 'pointer'
                }}>
                  {link.label}
                </div>
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid #222' }}>
          <div style={{ color: '#666', fontSize: '12px', marginBottom: '10px' }}>
            {kullanici?.kullanici_adi}
            <span style={{ marginLeft: '6px', background: '#1a1a2e', color: '#6c6ce8', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
              {kullanici?.rol}
            </span>
          </div>
          <button onClick={cikisYap} style={{
            width: '100%',
            padding: '8px',
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '6px',
            color: '#888',
            fontSize: '13px',
            cursor: 'pointer'
          }}>
            Çıkış Yap
          </button>
        </div>
      </aside>

      <main style={{ marginLeft: '240px', flex: 1, padding: '32px', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
