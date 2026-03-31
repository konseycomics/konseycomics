'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getAuthRedirectUrl, supabase } from '../lib/supabase'
import TurnstileWidget from './TurnstileWidget'
import { getCaptchaErrorMessage, getPasswordChecks, isCaptchaEnabled, mapAuthError, validatePassword } from '../lib/authSecurity'

export default function AuthModal({ open, onClose }) {
  const [mod, setMod] = useState('giris')
  const [identifier, setIdentifier] = useState('')
  const [email, setEmail] = useState('')
  const [sifre, setSifre] = useState('')
  const [sifreTekrar, setSifreTekrar] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const [hata, setHata] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef(null)
  const captchaActive = isCaptchaEnabled()
  const passwordChecks = useMemo(() => getPasswordChecks(sifre), [sifre])

  useEffect(() => {
    setHata('')
    setMesaj('')
    setCaptchaToken('')
    captchaRef.current?.reset?.()
  }, [mod])

  if (!open) return null

  async function handleGiris(e) {
    e.preventDefault()
    setYukleniyor(true); setHata(''); setMesaj('')
    if (captchaActive && !captchaToken) {
      setHata(getCaptchaErrorMessage())
      setYukleniyor(false)
      return
    }
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password: sifre, captchaToken: captchaToken || undefined }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload?.session) {
      setHata(mapAuthError(payload?.error || 'Giriş yapılamadı.', 'login'))
    } else {
      const { error } = await supabase.auth.setSession(payload.session)
      if (error) setHata(mapAuthError(error, 'login'))
      else { setMesaj('Giriş başarılı!'); setTimeout(onClose, 800) }
    }
    captchaRef.current?.reset?.()
    setCaptchaToken('')
    setYukleniyor(false)
  }

  async function handleKayit(e) {
    e.preventDefault()
    setYukleniyor(true); setHata(''); setMesaj('')
    if (sifre !== sifreTekrar) {
      setHata('Şifreler eşleşmiyor.')
      setYukleniyor(false)
      return
    }
    const passwordError = validatePassword(sifre)
    if (passwordError) {
      setHata(passwordError)
      setYukleniyor(false)
      return
    }
    if (captchaActive && !captchaToken) {
      setHata(getCaptchaErrorMessage())
      setYukleniyor(false)
      return
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password: sifre,
      options: {
        emailRedirectTo: getAuthRedirectUrl('/auth/callback'),
        ...(captchaToken ? { captchaToken } : {}),
      },
    })
    if (error) setHata(mapAuthError(error, 'signup'))
    else if (data.session) setMesaj('Kayıt başarılı! Hesabın hazır.')
    else setMesaj('Kayıt başarılı! Güvenlik ayarına göre e-postanı doğrulaman gerekebilir.')
    captchaRef.current?.reset?.()
    setCaptchaToken('')
    setYukleniyor(false)
  }

  async function handleSifre(e) {
    e.preventDefault()
    setYukleniyor(true); setHata(''); setMesaj('')
    if (captchaActive && !captchaToken) {
      setHata(getCaptchaErrorMessage())
      setYukleniyor(false)
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthRedirectUrl('/sifre-sifirla'),
      ...(captchaToken ? { captchaToken } : {}),
    })
    if (error) setHata(mapAuthError(error, 'reset-password'))
    else setMesaj('Şifre sıfırlama bağlantısı gönderildi.')
    captchaRef.current?.reset?.()
    setCaptchaToken('')
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
          {mod === 'giris' ? (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>E-posta veya Kullanıcı Adı</label>
              <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="ornek@email.com veya kullanici_adi" required style={I} />
            </div>
          ) : (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>E-posta</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ornek@email.com" required style={I} />
            </div>
          )}
          {mod !== 'sifre' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Şifre</label>
              <input type="password" value={sifre} onChange={e => setSifre(e.target.value)} placeholder="••••••••" required minLength={10} style={I} />
            </div>
          )}
          {mod === 'kayit' && (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Şifre Tekrar</label>
                <input type="password" value={sifreTekrar} onChange={e => setSifreTekrar(e.target.value)} placeholder="Şifreyi tekrar gir" required minLength={10} style={I} />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', display: 'grid', gap: '4px' }}>
                <span style={{ color: passwordChecks.minLength ? '#166534' : 'var(--text-muted)' }}>• En az 10 karakter</span>
                <span style={{ color: passwordChecks.uppercase ? '#166534' : 'var(--text-muted)' }}>• En az 1 büyük harf</span>
                <span style={{ color: passwordChecks.lowercase ? '#166534' : 'var(--text-muted)' }}>• En az 1 küçük harf</span>
                <span style={{ color: passwordChecks.number ? '#166534' : 'var(--text-muted)' }}>• En az 1 rakam</span>
              </div>
            </>
          )}
          {captchaActive && (
            <div style={{ marginBottom: '12px' }}>
              <TurnstileWidget ref={captchaRef} action={mod} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} theme="light" />
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
