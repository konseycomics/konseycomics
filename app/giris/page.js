'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function GirisKayit() {
  const [mod, setMod] = useState('giris')
  const [form, setForm] = useState({ email: '', sifre: '', sifreTekrar: '', kullaniciAdi: '' })
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState('')
  const [mesaj, setMesaj] = useState('')
  const router = useRouter()

  async function handleGiris(e) {
    e.preventDefault()
    setYukleniyor(true); setHata('')
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.sifre })
    if (error) setHata('E-posta veya şifre hatalı.')
    else router.push('/')
    setYukleniyor(false)
  }

  async function handleKayit(e) {
    e.preventDefault()
    setHata('')
    if (form.sifre !== form.sifreTekrar) { setHata('Şifreler eşleşmiyor.'); return }
    if (form.sifre.length < 6) { setHata('Şifre en az 6 karakter olmalı.'); return }
    if (form.kullaniciAdi.length < 3) { setHata('Kullanıcı adı en az 3 karakter olmalı.'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(form.kullaniciAdi)) { setHata('Kullanıcı adı sadece harf, rakam ve _ içerebilir.'); return }

    setYukleniyor(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.sifre,
      options: { data: { kullanici_adi: form.kullaniciAdi } }
    })
    if (error) setHata(error.message)
    else setMesaj('Kayıt başarılı! E-postanı doğrulamayı unutma.')
    setYukleniyor(false)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  async function handleSifre(e) {
    e.preventDefault()
    setYukleniyor(true); setHata('')
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/sifre-sifirla`
    })
    if (error) setHata(error.message)
    else setMesaj('Şifre sıfırlama bağlantısı e-postana gönderildi.')
    setYukleniyor(false)
  }

  const I = { width: '100%', padding: '11px 14px', background: '#f5f4f0', border: '1px solid #e8e6e0', borderRadius: '10px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'DM Sans', sans-serif" }}>
      <Link href="/" style={{ fontWeight: 600, fontSize: '20px', textDecoration: 'none', color: 'var(--text)', marginBottom: '32px' }}>
        Konsey<span style={{ fontWeight: 300 }}>Comics</span>
      </Link>

      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '20px', padding: '36px', width: '100%', maxWidth: '400px' }}>
        {/* Sekme */}
        {mod !== 'sifre' && (
          <div style={{ display: 'flex', background: '#f5f4f0', borderRadius: '10px', padding: '4px', marginBottom: '28px' }}>
            {[['giris', 'Giriş Yap'], ['kayit', 'Kayıt Ol']].map(([key, label]) => (
              <button key={key} onClick={() => { setMod(key); setHata(''); setMesaj('') }} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', background: mod === key ? '#fff' : 'transparent', color: mod === key ? 'var(--text)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {mod === 'sifre' && (
          <div style={{ marginBottom: '24px' }}>
            <button onClick={() => { setMod('giris'); setHata(''); setMesaj('') }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', padding: 0, marginBottom: '12px' }}>← Geri dön</button>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px' }}>Şifre Sıfırla</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>E-postana sıfırlama bağlantısı gönderelim.</div>
          </div>
        )}

        {/* Google butonu */}
        {mod !== 'sifre' && (
          <>
            <button onClick={handleGoogle} style={{ width: '100%', padding: '11px', background: '#fff', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
              <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.07 0-3.83-1.4-4.46-3.28H1.84v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.52 10.53c-.16-.48-.25-.98-.25-1.53s.09-1.05.25-1.53V5.4H1.84A8 8 0 0 0 .98 9c0 1.29.31 2.51.86 3.6l2.68-2.07z"/><path fill="#EA4335" d="M8.98 3.58c1.16 0 2.2.4 3.02 1.19l2.26-2.26A8 8 0 0 0 8.98 1a8 8 0 0 0-7.14 4.4l2.68 2.07c.63-1.89 2.39-3.29 4.46-3.29z"/></svg>
              Google ile devam et
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>veya</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>
          </>
        )}

        {/* Form */}
        <form onSubmit={mod === 'giris' ? handleGiris : mod === 'kayit' ? handleKayit : handleSifre}>
          {mod === 'kayit' && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Kullanıcı Adı</label>
              <input value={form.kullaniciAdi} onChange={e => setForm(f => ({ ...f, kullaniciAdi: e.target.value }))} placeholder="kullanici_adi" required style={I} />
              <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>Harf, rakam ve _ kullanabilirsin</div>
            </div>
          )}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>E-posta</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ornek@email.com" required style={I} />
          </div>
          {mod !== 'sifre' && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Şifre</label>
              <input type="password" value={form.sifre} onChange={e => setForm(f => ({ ...f, sifre: e.target.value }))} placeholder="En az 6 karakter" required minLength={6} style={I} />
            </div>
          )}
          {mod === 'kayit' && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Şifre Tekrar</label>
              <input type="password" value={form.sifreTekrar} onChange={e => setForm(f => ({ ...f, sifreTekrar: e.target.value }))} placeholder="Şifreyi tekrar gir" required style={I} />
            </div>
          )}

          {hata && <div style={{ fontSize: '13px', color: '#dc2626', marginBottom: '14px', padding: '10px 12px', background: '#fff0f0', borderRadius: '8px' }}>{hata}</div>}
          {mesaj && <div style={{ fontSize: '13px', color: '#166534', marginBottom: '14px', padding: '10px 12px', background: '#f0fdf4', borderRadius: '8px' }}>{mesaj}</div>}

          <button type="submit" disabled={yukleniyor} style={{ width: '100%', padding: '12px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 500, fontFamily: 'inherit', cursor: yukleniyor ? 'not-allowed' : 'pointer', opacity: yukleniyor ? 0.7 : 1 }}>
            {yukleniyor ? 'Lütfen bekle...' : mod === 'giris' ? 'Giriş Yap' : mod === 'kayit' ? 'Kayıt Ol' : 'Link Gönder'}
          </button>

          {mod === 'giris' && (
            <button type="button" onClick={() => { setMod('sifre'); setHata(''); setMesaj('') }} style={{ width: '100%', marginTop: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>
              Şifremi unuttum
            </button>
          )}
        </form>
      </div>
    </div>
  )
}