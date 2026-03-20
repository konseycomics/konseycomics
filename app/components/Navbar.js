'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
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
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(245,244,240,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '24px', height: '56px' }}>
        <Link href="/" style={{ fontWeight: 600, fontSize: '17px', letterSpacing: '-0.3px', textDecoration: 'none', color: 'var(--text)', flexShrink: 0 }}>
          Konsey<span style={{ fontWeight: 300 }}>Comics</span>
        </Link>

        <ul style={{ display: 'flex', gap: '2px', listStyle: 'none', flex: 1, margin: 0, padding: 0 }} className="desktop-nav">
          {linkler.map(item => (
            <li key={item.href}>
              <Link href={item.href} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', textDecoration: 'none', padding: '6px 10px', borderRadius: '8px', display: 'block' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >{item.label}</Link>
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          {kullanici && profil ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="desktop-only">
              {(profil.rol === 'admin' || profil.rol === 'yonetici') && (
                <Link href="/admin" style={{ fontSize: '12px', padding: '5px 10px', background: '#111', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: 500 }}>
                  Admin
                </Link>
              )}
              <BildirimZili kullaniciId={kullanici.id} />
              <Link href={`/profil/${profil.kullanici_adi}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', padding: '4px 10px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#111', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', fontWeight: 600 }}>
                  {profil.avatar_url ? <img src={profil.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profil.kullanici_adi[0].toUpperCase()}
                </div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{profil.kullanici_adi}</span>
              </Link>
              <button onClick={handleCikis} style={{ fontSize: '12px', padding: '6px 12px', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-muted)' }}>
                Çıkış
              </button>
            </div>
          ) : (
            <Link href="/giris" className="desktop-only" style={{ height: '34px', padding: '0 14px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              Giriş Yap
            </Link>
          )}

          <button onClick={() => setMenuOpen(!menuOpen)} className="hamburger" style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '6px', flexDirection: 'column', gap: '5px' }}>
            <span style={{ display: 'block', width: '22px', height: '2px', background: 'var(--text)', borderRadius: '2px', transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
            <span style={{ display: 'block', width: '22px', height: '2px', background: 'var(--text)', borderRadius: '2px', opacity: menuOpen ? 0 : 1 }} />
            <span style={{ display: 'block', width: '22px', height: '2px', background: 'var(--text)', borderRadius: '2px', transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div style={{ position: 'fixed', top: '56px', left: 0, right: 0, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 0', zIndex: 99 }}>
          {linkler.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '12px 24px', fontSize: '15px', fontWeight: 500, color: 'var(--text)', textDecoration: 'none', borderBottom: '1px solid var(--border)' }}>
              {item.label}
            </Link>
          ))}
          <div style={{ padding: '12px 24px' }}>
            {kullanici && profil ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link href={`/profil/${profil.kullanici_adi}`} onClick={() => setMenuOpen(false)} style={{ padding: '11px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--text)', textDecoration: 'none', textAlign: 'center', display: 'block' }}>
                  Profilim
                </Link>
                <button onClick={() => { handleCikis(); setMenuOpen(false) }} style={{ padding: '11px', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Çıkış Yap
                </button>
              </div>
            ) : (
              <Link href="/giris" onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '11px', background: 'var(--text)', color: '#fff', borderRadius: '8px', fontSize: '14px', fontWeight: 500, textDecoration: 'none', textAlign: 'center' }}>
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