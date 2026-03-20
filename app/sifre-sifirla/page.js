'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SifreSifirla() {
  const [sifre, setSifre] = useState('')
  const [sifreTekrar, setSifreTekrar] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState('')
  const [mesaj, setMesaj] = useState('')
  const [hazir, setHazir] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Supabase sifre sifirlama token'ini otomatik isle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setHazir(true)
        } else if (event === 'SIGNED_IN' && session) {
          // Zaten giris yapilmis, ana sayfaya yonlendir
          // router.push('/')
        }
      }
    )

    // URL'de token varsa hazir say
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      setHazir(true)
    } else {
      // Token yoksa kontrol et
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setHazir(true)
        else {
          setHata('Gecersiz veya suresi dolmus sifre sifirlama baglantisi.')
        }
      })
    }

    return () => subscription.unsubscribe()
  }, [])

  async function handleSifreGuncelle(e) {
    e.preventDefault()
    setHata('')

    if (sifre !== sifreTekrar) {
      setHata('Sifreler eslesmior.')
      return
    }
    if (sifre.length < 8) {
      setHata('Sifre en az 8 karakter olmali.')
      return
    }

    setYukleniyor(true)
    const { error } = await supabase.auth.updateUser({ password: sifre })

    if (error) {
      setHata(error.message)
    } else {
      setMesaj('Sifren basariyla guncellendi! Simdi giris yapabilirsin.')
      setTimeout(() => router.push('/giris'), 3000)
    }
    setYukleniyor(false)
  }

  const I = {
    width: '100%',
    padding: '11px 14px',
    background: '#f5f4f0',
    border: '1px solid #e8e6e0',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'DM Sans', sans-serif"
    }}>
      <Link href="/" style={{ fontWeight: 600, fontSize: '20px', textDecoration: 'none', color: 'var(--text)', marginBottom: '32px' }}>
        Konsey<span style={{ fontWeight: 300 }}>Comics</span>
      </Link>

      <div style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '36px',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', marginBottom: '8px' }}>
          SIFRE SIFIRLA
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '28px' }}>
          Yeni sifrenizi girin.
        </div>

        {hata && (
          <div style={{ fontSize: '13px', color: '#dc2626', marginBottom: '16px', padding: '10px 12px', background: '#fff0f0', borderRadius: '8px', border: '1px solid #fecaca' }}>
            {hata}
          </div>
        )}
        {mesaj && (
          <div style={{ fontSize: '13px', color: '#166534', marginBottom: '16px', padding: '10px 12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            {mesaj} <Link href="/giris" style={{ color: '#166534', fontWeight: 600 }}>Giris yap</Link>
          </div>
        )}

        {hazir && !mesaj && (
          <form onSubmit={handleSifreGuncelle}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Yeni Sifre
              </label>
              <input
                type="password"
                value={sifre}
                onChange={e => setSifre(e.target.value)}
                placeholder="En az 8 karakter"
                required
                minLength={8}
                style={I}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Sifre Tekrar
              </label>
              <input
                type="password"
                value={sifreTekrar}
                onChange={e => setSifreTekrar(e.target.value)}
                placeholder="Sifrenizi tekrar girin"
                required
                style={I}
              />
            </div>
            <button
              type="submit"
              disabled={yukleniyor}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--text)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: yukleniyor ? 'not-allowed' : 'pointer',
                opacity: yukleniyor ? 0.7 : 1
              }}
            >
              {yukleniyor ? 'Guncelleniyor...' : 'Sifreyi Guncelle'}
            </button>
          </form>
        )}

        {!hazir && !hata && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            Yukleniyor...
          </div>
        )}
      </div>
    </div>
  )
}
