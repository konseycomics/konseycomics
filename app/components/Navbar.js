'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import BildirimZili from './BildirimZili'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [kullanici, setKullanici] = useState(null)
  const [profil, setProfil] = useState(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setKullanici(session?.user || null)
      if (session?.user) {
        supabase.from('profiller').select('kullanici_adi, avatar_url, rol')
          .eq('id', session.user.id).single()
          .then(({ data }) => setProfil(data))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setKullanici(session?.user || null)
      if (session?.user) {
        supabase.from('profiller').select('kullanici_adi, avatar_url, rol')
          .eq('id', session.user.id).single()
          .then(({ data }) => setProfil(data))
      } else {
        setProfil(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleCikis() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const linkler = [
    { label: 'Seriler', href: '/seriler' },
    { label: 'Çizgi Roman', href: '/kategori/cizgi-roman' },
    { label: 'Manga', href: '/kategori/manga' },
    { label: 'Webtoon', href: '/kategori/webtoon' },
    { label: 'Hakkımızda', href: '/hakkimizda' },
    { label: 'İletişim', href: '/iletisim' },
  ]

  return (
    <>
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: '#000', borderBottom: '1px solid #121212' }}>
        <div className="site-shell" style={{ height: '90px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
            <Image src="/demo/logo.png" alt="Konsey Comics" width={164} height={60} priority style={{ height: '60px', width: 'auto', display: 'block' }} />
          </Link>

          <ul style={{ display: 'flex', gap: '4px', listStyle: 'none', flex: 1, margin: 0, padding: 0 }} className="desktop-nav">
            {linkler.map(item => (
              <li key={item.href}>
                <Link href={item.href} style={{ fontSize: '14px', fontWeight: 500, color: '#bcbcbc', textDecoration: 'none', padding: '8px 12px', borderRadius: '10px', display: 'block', letterSpacing: '0.1px' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#141414'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#bcbcbc' }}
                >{item.label}</Link>
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
          {kullanici && profil ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="desktop-only">
              {(profil.rol === 'admin' || profil.rol === 'yonetici') && (
                <Link href="/admin" style={{ fontSize: '12px', padding: '6px 10px', background: '#111', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 500 }}>
                  Admin
                </Link>
              )}
              <BildirimZili kullaniciId={kullanici.id} />
              <Link href={`/profil/${profil.kullanici_adi}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', padding: '6px 12px', borderRadius: '10px', background: '#111', border: '1px solid #222' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#222', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', fontWeight: 700 }}>
                  {profil.avatar_url ? <img src={profil.avatar_url} alt={profil.kullanici_adi || 'Profil avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profil.kullanici_adi[0].toUpperCase()}
                </div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#f5f5f3' }}>{profil.kullanici_adi}</span>
              </Link>
              <button onClick={handleCikis} style={{ fontSize: '12px', padding: '7px 12px', background: 'none', border: '1px solid #222', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', color: '#bcbcbc' }}>
                Çıkış
              </button>
            </div>
          ) : (
            <Link href="/giris" className="desktop-only" style={{ height: '38px', padding: '0 16px', background: '#fff', color: '#111', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              Giriş Yap
            </Link>
          )}

          <button onClick={() => setMenuOpen(!menuOpen)} className="hamburger" style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '6px', flexDirection: 'column', gap: '5px' }}>
            <span style={{ display: 'block', width: '24px', height: '2px', background: '#f5f5f3', borderRadius: '2px', transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
            <span style={{ display: 'block', width: '24px', height: '2px', background: '#f5f5f3', borderRadius: '2px', opacity: menuOpen ? 0 : 1 }} />
            <span style={{ display: 'block', width: '24px', height: '2px', background: '#f5f5f3', borderRadius: '2px', transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
          </button>
        </div>
        </div>
      </nav>

      {menuOpen && (
        <div style={{ position: 'fixed', top: '90px', left: 0, right: 0, background: '#000', borderBottom: '1px solid #121212', padding: '12px 0', zIndex: 99, maxHeight: 'calc(100vh - 90px)', overflowY: 'auto' }}>
          {linkler.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '12px 24px', fontSize: '15px', fontWeight: 500, color: '#f5f5f3', textDecoration: 'none', borderBottom: '1px solid #121212' }}>
              {item.label}
            </Link>
          ))}
          <div style={{ padding: '12px 24px' }}>
            {kullanici && profil ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link href={`/profil/${profil.kullanici_adi}`} onClick={() => setMenuOpen(false)} style={{ padding: '11px', background: '#111', border: '1px solid #222', borderRadius: '10px', fontSize: '14px', fontWeight: 500, color: '#f5f5f3', textDecoration: 'none', textAlign: 'center', display: 'block' }}>
                  Profilim
                </Link>
                <button onClick={() => { handleCikis(); setMenuOpen(false) }} style={{ padding: '11px', background: 'none', border: '1px solid #222', borderRadius: '10px', fontSize: '14px', fontWeight: 500, color: '#bcbcbc', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Çıkış Yap
                </button>
              </div>
            ) : (
              <Link href="/giris" onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '11px', background: '#fff', color: '#111', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                Giriş Yap
              </Link>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .desktop-only { display: none !important; }
          .hamburger { display: flex !important; }
        }
      `}</style>
    </>
  )
}
