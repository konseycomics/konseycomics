'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getAuthRedirectUrl, supabase } from '../lib/supabase'
import { getPublicProfileByUsername } from '../lib/publicProfiles'
import { getCaptchaErrorMessage, getPasswordChecks, isCaptchaEnabled, mapAuthError, validatePassword, validateUsername } from '../lib/authSecurity'

async function syncProfile(accessToken, username) {
  if (!accessToken) return
  try {
    const response = await fetch('/api/auth/sync-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken,
        username: username || undefined,
      }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { ok: false, error: payload?.error || 'PROFILE_SYNC_FAILED' }
    }
    return { ok: true, profile: payload?.profile || null }
  } catch (error) {
    return { ok: false, error: error?.message || 'PROFILE_SYNC_FAILED' }
  }
}
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TurnstileWidget from '../components/TurnstileWidget'

const inputStyle = {
  width: '100%',
  padding: '13px 15px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '14px',
  fontSize: '14px',
  color: '#fff',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = {
  fontSize: '11px',
  fontWeight: 700,
  display: 'block',
  marginBottom: '7px',
  color: 'rgba(255,255,255,0.55)',
  textTransform: 'uppercase',
  letterSpacing: '1px',
}

export default function GirisKayit() {
  const [mod, setMod] = useState('giris')
  const [form, setForm] = useState({ girisKimlik: '', email: '', sifre: '', sifreTekrar: '', kullaniciAdi: '' })
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState('')
  const [mesaj, setMesaj] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef(null)
  const router = useRouter()
  const captchaActive = isCaptchaEnabled()
  const passwordChecks = useMemo(() => getPasswordChecks(form.sifre), [form.sifre])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/')
    })
  }, [router])

  useEffect(() => {
    setHata('')
    setMesaj('')
    setCaptchaToken('')
    captchaRef.current?.reset?.()
  }, [mod])

  async function handleGiris(e) {
    e.preventDefault()
    setYukleniyor(true)
    setHata('')
    setMesaj('')

    if (captchaActive && !captchaToken) {
      setHata(getCaptchaErrorMessage())
      setYukleniyor(false)
      return
    }

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: form.girisKimlik,
        password: form.sifre,
        captchaToken: captchaToken || undefined,
      }),
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok || !payload?.session) {
      setHata(mapAuthError(payload?.error || 'Giriş yapılamadı.', 'login'))
    } else {
      const { error } = await supabase.auth.setSession(payload.session)
      if (error) {
        setHata(mapAuthError(error, 'login'))
      } else {
        const syncResult = await syncProfile(payload.session?.access_token)
        if (!syncResult?.ok) {
          setHata(`Profil senkronizasyonu basarisiz: ${syncResult?.error || 'PROFILE_SYNC_FAILED'}`)
          setYukleniyor(false)
          return
        }
        router.push('/')
        router.refresh()
      }
    }

    captchaRef.current?.reset?.()
    setCaptchaToken('')
    setYukleniyor(false)
  }

  async function handleKayit(e) {
    e.preventDefault()
    setHata('')
    setMesaj('')

    const usernameError = validateUsername(form.kullaniciAdi)
    if (usernameError) { setHata(usernameError); return }
    if (form.sifre !== form.sifreTekrar) { setHata('Şifreler eşleşmiyor.'); return }

    const passwordError = validatePassword(form.sifre)
    if (passwordError) { setHata(passwordError); return }

    if (captchaActive && !captchaToken) {
      setHata(getCaptchaErrorMessage())
      return
    }

    const { data: mevcutProfil } = await getPublicProfileByUsername(form.kullaniciAdi)
    if (mevcutProfil) {
      setHata('Bu kullanıcı adı zaten alınmış.')
      return
    }

    setYukleniyor(true)
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.sifre,
      options: {
        data: { kullanici_adi: form.kullaniciAdi },
        emailRedirectTo: getAuthRedirectUrl('/auth/callback'),
        ...(captchaToken ? { captchaToken } : {}),
      },
    })
    if (error) {
      setHata(mapAuthError(error, 'signup'))
    } else if (data.session) {
      const syncResult = await syncProfile(data.session?.access_token, form.kullaniciAdi)
      if (!syncResult?.ok) {
        setHata(`Profil senkronizasyonu basarisiz: ${syncResult?.error || 'PROFILE_SYNC_FAILED'}`)
        setYukleniyor(false)
        return
      }
      setMesaj('Kayıt başarılı! Hesabın hazır, yönlendiriliyorsun.')
      router.push('/')
      router.refresh()
    } else {
      setMesaj('Kayıt başarılı! Güvenlik ayarına göre e-posta doğrulaması gerekebilir, lütfen gelen kutunu kontrol et.')
      setForm({ girisKimlik: '', email: '', sifre: '', sifreTekrar: '', kullaniciAdi: '' })
    }

    captchaRef.current?.reset?.()
    setCaptchaToken('')
    setYukleniyor(false)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getAuthRedirectUrl('/auth/callback') },
    })
  }

  async function handleSifre(e) {
    e.preventDefault()
    setYukleniyor(true)
    setHata('')
    setMesaj('')

    if (captchaActive && !captchaToken) {
      setHata(getCaptchaErrorMessage())
      setYukleniyor(false)
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: getAuthRedirectUrl('/sifre-sifirla'),
      ...(captchaToken ? { captchaToken } : {}),
    })
    if (error) setHata(mapAuthError(error, 'reset-password'))
    else setMesaj('Şifre sıfırlama bağlantısı e-postana gönderildi.')
    captchaRef.current?.reset?.()
    setCaptchaToken('')
    setYukleniyor(false)
  }

  const isSifre = mod === 'sifre'

  return (
    <main style={{ minHeight: '100vh', background: '#050505', color: '#fff' }}>
      <style>{`
        .auth-shell {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(circle at 18% 18%, rgba(109, 40, 217, 0.18), transparent 28%),
            radial-gradient(circle at 82% 16%, rgba(59, 130, 246, 0.12), transparent 26%),
            radial-gradient(circle at 50% 100%, rgba(245, 158, 11, 0.08), transparent 32%),
            linear-gradient(180deg, #090909 0%, #030303 100%);
        }
        .auth-grid {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(380px, 460px);
          gap: 40px;
          align-items: center;
        }
        .auth-panel {
          position: relative;
          border-radius: 28px;
          background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 28px 80px rgba(0,0,0,0.34);
          backdrop-filter: blur(16px);
        }
        .auth-input::placeholder {
          color: rgba(255,255,255,0.28);
        }
        @media (max-width: 980px) {
          .auth-grid {
            width: min(100%, calc(100% - 32px));
            grid-template-columns: 1fr;
            gap: 28px;
            padding: 104px 0 48px;
            min-height: auto;
          }
          .auth-copy {
            text-align: center;
          }
          .auth-copy p,
          .auth-copy .auth-copy-meta {
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }
      `}</style>

      <div className="auth-shell">
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.02), transparent 24%, rgba(0,0,0,0.54) 100%)' }} />

        <div className="auth-grid">
          <section className="auth-copy" style={{ position: 'relative', zIndex: 1 }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '28px' }}>
              <img src="/demo/logo.png" alt="Konsey Comics" style={{ width: '130px', height: 'auto', display: 'block' }} />
            </Link>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '18px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.22)', color: '#f6e7c3', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', borderRadius: '999px', padding: '6px 12px' }}>
              Konsey Profili
            </div>

            <h1 style={{ margin: '0 0 16px', fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(56px, 9vw, 110px)', lineHeight: 0.9, letterSpacing: '0.8px' }}>
              {isSifre ? 'Hesabına Dön' : mod === 'kayit' ? 'Konsey\'e Katıl' : 'Geri Dön'}
            </h1>

            <p style={{ margin: '0 0 26px', maxWidth: '56ch', color: 'rgba(255,255,255,0.72)', fontSize: '16px', lineHeight: 1.8 }}>
              {isSifre
                ? 'E-posta adresini gir, şifre sıfırlama bağlantısını gönderelim. Hesabını kaybetmeden arşivine geri dön.'
                : mod === 'kayit'
                  ? 'Arşivini kur, ünvanlarını topla, profil vitrini oluştur ve okuma geçmişini kendi düzeninde yönet.'
                  : 'Arşivine, profiline ve takip ettiğin serilere kaldığın yerden devam etmek için giriş yap.'}
            </p>

            <div className="auth-copy-meta" style={{ display: 'grid', gap: '12px', maxWidth: '520px' }}>
              {[
                ['Profil vitrini', 'Rozetlerin, ünvanların ve öne çıkan serilerin tek yerde görünür.'],
                ['Okuma arşivi', 'Okundu, okunuyor ve okuyacak listelerin hesabına bağlı kalır.'],
                ['Konsey deneyimi', 'Yorumlar, takip sistemi ve kişisel vitrin tek hesap altında birleşir.'],
              ].map(([title, desc]) => (
                <div key={title} style={{ padding: '14px 16px', borderRadius: '18px', background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>{title}</div>
                  <div style={{ fontSize: '13px', lineHeight: 1.7, color: 'rgba(255,255,255,0.6)' }}>{desc}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="auth-panel" style={{ position: 'relative', zIndex: 1, padding: '28px' }}>
            {!isSifre && (
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '4px', marginBottom: '22px', border: '1px solid rgba(255,255,255,0.06)' }}>
                {[['giris', 'Giriş Yap'], ['kayit', 'Kayıt Ol']].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setMod(key); setHata(''); setMesaj('') }}
                    style={{
                      flex: 1,
                      padding: '12px 10px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: '13px',
                      fontWeight: 700,
                      letterSpacing: '0.2px',
                      background: mod === key ? '#fff' : 'transparent',
                      color: mod === key ? '#111' : 'rgba(255,255,255,0.64)',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {isSifre && (
              <div style={{ marginBottom: '20px' }}>
                <button
                  onClick={() => { setMod('giris'); setHata(''); setMesaj('') }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', padding: 0, marginBottom: '12px' }}
                >
                  ← Giriş ekranına dön
                </button>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '38px', lineHeight: 0.95 }}>Şifre Sıfırla</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.56)', marginTop: '6px', lineHeight: 1.6 }}>
                  Kayıtlı e-posta adresine güvenli sıfırlama bağlantısı gönderelim.
                </div>
              </div>
            )}

            {!isSifre && (
              <>
                <button
                  onClick={handleGoogle}
                  style={{
                    width: '100%',
                    padding: '13px 14px',
                    background: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#111',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    marginBottom: '18px',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.07 0-3.83-1.4-4.46-3.28H1.84v2.07A8 8 0 0 0 8.98 17z"/>
                    <path fill="#FBBC05" d="M4.52 10.53c-.16-.48-.25-.98-.25-1.53s.09-1.05.25-1.53V5.4H1.84A8 8 0 0 0 .98 9c0 1.29.31 2.51.86 3.6l2.68-2.07z"/>
                    <path fill="#EA4335" d="M8.98 3.58c1.16 0 2.2.4 3.02 1.19l2.26-2.26A8 8 0 0 0 8.98 1a8 8 0 0 0-7.14 4.4l2.68 2.07c.63-1.89 2.39-3.29 4.46-3.29z"/>
                  </svg>
                  Google ile devam et
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.42)', textTransform: 'uppercase', letterSpacing: '1px' }}>veya</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                </div>
              </>
            )}

            <form onSubmit={mod === 'giris' ? handleGiris : mod === 'kayit' ? handleKayit : handleSifre}>
              {mod === 'kayit' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>Kullanıcı Adı</label>
                  <input
                    className="auth-input"
                    value={form.kullaniciAdi}
                    onChange={e => setForm(f => ({ ...f, kullaniciAdi: e.target.value }))}
                    placeholder="kullanici_adi"
                    required
                    style={inputStyle}
                  />
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.42)', marginTop: '6px' }}>Harf, rakam ve _ kullanabilirsin</div>
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>{mod === 'giris' ? 'E-posta veya Kullanıcı Adı' : 'E-posta'}</label>
                <input
                  className="auth-input"
                  type={mod === 'giris' ? 'text' : 'email'}
                  value={mod === 'giris' ? form.girisKimlik : form.email}
                  onChange={e => setForm(f => ({ ...f, [mod === 'giris' ? 'girisKimlik' : 'email']: e.target.value }))}
                  placeholder={mod === 'giris' ? 'ornek@email.com veya kullanici_adi' : 'ornek@email.com'}
                  required
                  style={inputStyle}
                />
              </div>

              {!isSifre && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>Şifre</label>
                  <input
                    className="auth-input"
                    type="password"
                    value={form.sifre}
                    onChange={e => setForm(f => ({ ...f, sifre: e.target.value }))}
                    placeholder="En az 10 karakter"
                    required
                    minLength={10}
                    style={inputStyle}
                  />
                </div>
              )}

              {mod === 'kayit' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>Şifre Tekrar</label>
                  <input
                    className="auth-input"
                    type="password"
                    value={form.sifreTekrar}
                    onChange={e => setForm(f => ({ ...f, sifreTekrar: e.target.value }))}
                    placeholder="Şifreyi tekrar gir"
                    required
                    style={inputStyle}
                  />
                </div>
              )}

              {(mod === 'kayit' || mod === 'sifre' || mod === 'giris') && captchaActive && (
                <div style={{ marginBottom: '14px' }}>
                  <TurnstileWidget
                    ref={captchaRef}
                    action={mod}
                    onVerify={setCaptchaToken}
                    onExpire={() => setCaptchaToken('')}
                  />
                </div>
              )}

              {mod === 'kayit' && (
                <div style={{ marginBottom: '14px', padding: '12px 13px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                    Şifre Gücü
                  </div>
                  <div style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.68)' }}>
                    <span style={{ color: passwordChecks.minLength ? '#86efac' : 'rgba(255,255,255,0.68)' }}>• En az 10 karakter</span>
                    <span style={{ color: passwordChecks.uppercase ? '#86efac' : 'rgba(255,255,255,0.68)' }}>• En az 1 büyük harf</span>
                    <span style={{ color: passwordChecks.lowercase ? '#86efac' : 'rgba(255,255,255,0.68)' }}>• En az 1 küçük harf</span>
                    <span style={{ color: passwordChecks.number ? '#86efac' : 'rgba(255,255,255,0.68)' }}>• En az 1 rakam</span>
                  </div>
                </div>
              )}

              {hata && (
                <div style={{ fontSize: '13px', color: '#fecaca', marginBottom: '14px', padding: '12px 13px', background: 'rgba(127,29,29,0.24)', borderRadius: '12px', border: '1px solid rgba(248,113,113,0.24)' }}>
                  {hata}
                </div>
              )}

              {mesaj && (
                <div style={{ fontSize: '13px', color: '#bbf7d0', marginBottom: '14px', padding: '12px 13px', background: 'rgba(20,83,45,0.24)', borderRadius: '12px', border: '1px solid rgba(74,222,128,0.18)' }}>
                  {mesaj}
                </div>
              )}

              <button
                type="submit"
                disabled={yukleniyor}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#fff',
                  color: '#111',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '14px',
                  fontWeight: 800,
                  fontFamily: 'inherit',
                  cursor: yukleniyor ? 'not-allowed' : 'pointer',
                  opacity: yukleniyor ? 0.7 : 1,
                }}
              >
                {yukleniyor ? 'Lütfen bekle...' : mod === 'giris' ? 'Giriş Yap' : mod === 'kayit' ? 'Kayıt Ol' : 'Link Gönder'}
              </button>

              {mod === 'giris' && (
                <button
                  type="button"
                  onClick={() => { setMod('sifre'); setHata(''); setMesaj('') }}
                  style={{ width: '100%', marginTop: '12px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}
                >
                  Şifremi unuttum
                </button>
              )}
            </form>
          </section>
        </div>
      </div>
    </main>
  )
}
