'use client'
import { useState } from 'react'
import { getAuthRedirectUrl, supabase } from '../lib/supabase'

export default function AuthModal({ open, onClose }) {
  const [mod, setMod] = useState('giris')
  const [email, setEmail] = useState('')
  const [sifre, setSifre] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const [hata, setHata] = useState('')

  if (!open) return null

  async function handleGiris(e) {
    e.preventDefault()
    setYukleniyor(true); setHata(''); setMesaj('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: sifre })
    if (error) setHata('E-posta veya şifre hatalı.')
    else { setMesaj('Giriş başarılı!'); setTimeout(onClose, 800) }
    setYukleniyor(false)
  }

  async function handleKayit(e) {
    e.preventDefault()
    setYukleniyor(true); setHata(''); setMesaj('')
    const { error } = await supabase.auth.signUp({ email, password: sifre })
    if (error) setHata(error.message)
    else setMesaj('Kayıt başarılı! E-postanı kontrol et.')
    setYukleniyor(false)
  }

  async function handleSifre(e) {
    e.preventDefault()
    setYukleniyor(true); setHata(''); setMesaj('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: getAuthRedirectUrl('/sifre-sifirla') })
    if (error) setHata(error.message)
    else setMesaj('Şifre sıfırlama bağlantısı gönderildi.')
    setYukleniyor(false)
  }

  const I = { width: '100%', padding: '10px 13px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', outline: 'none', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '36px', width: '100%', maxWidth: '380px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', width: '28px', height: '28px', background: 'var(--border)', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '14px' }}>✕</button>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', marginBottom: '6px' }}>
          {mod === 'giris' ? 'Hoş Geldin' : mod === 'kayit' ? 'Kayıt Ol' : 'Şifre Sıfırla'}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          {mod === 'giris' ? 'Devam etmek için giriş yap.' : mod === 'kayit' ? 'Ücretsiz hesap oluştur.' : 'E-postanı gir, link gönderelim.'}
        </div>
        <form onSubmit={mod === 'giris' ? handleGiris : mod === 'kayit' ? handleKayit : handleSifre}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>E-posta</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ornek@email.com" required style={I} />
          </div>
          {mod !== 'sifre' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Şifre</label>
              <input type="password" value={sifre} onChange={e => setSifre(e.target.value)} placeholder="••••••••" required minLength={6} style={I} />
            </div>
          )}
          {hata && <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '10px', padding: '8px 10px', background: '#fff0f0', borderRadius: '6px' }}>{hata}</div>}
          {mesaj && <div style={{ fontSize: '12px', color: '#166534', marginBottom: '10px', padding: '8px 10px', background: '#f0fdf4', borderRadius: '6px' }}>{mesaj}</div>}
          <button type="submit" disabled={yukleniyor} style={{ width: '100%', padding: '11px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 500, fontFamily: 'inherit', cursor: yukleniyor ? 'not-allowed' : 'pointer', opacity: yukleniyor ? 0.7 : 1, marginTop: '4px' }}>
            {yukleniyor ? 'Lütfen bekle...' : mod === 'giris' ? 'Giriş Yap' : mod === 'kayit' ? 'Kayıt Ol' : 'Link Gönder'}
          </button>
        </form>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {mod === 'giris' && (<>
            <span>Hesabın yok mu? <button onClick={() => { setMod('kayit'); setHata(''); setMesaj('') }} style={{ background: 'none', border: 'none', color: 'var(--text)', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>Kayıt ol</button></span>
            <button onClick={() => { setMod('sifre'); setHata(''); setMesaj('') }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>Şifremi unuttum</button>
          </>)}
          {mod === 'kayit' && <span>Hesabın var mı? <button onClick={() => { setMod('giris'); setHata(''); setMesaj('') }} style={{ background: 'none', border: 'none', color: 'var(--text)', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>Giriş yap</button></span>}
          {mod === 'sifre' && <button onClick={() => { setMod('giris'); setHata(''); setMesaj('') }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>← Giriş yapmaya dön</button>}
        </div>
      </div>
    </div>
  )
}
