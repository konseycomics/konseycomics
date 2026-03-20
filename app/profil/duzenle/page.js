'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { useRouter } from 'next/navigation'

// ── Avatar Kırpma Modalı ──────────────────────────────────────────
function AvatarModal({ src, onKaydet, onIptal }) {
  const canvasRef = useRef()
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [drag, setDrag] = useState(null)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })
  const CIRCLE = 260

  // Resim yüklenince ortala
  function onImgLoad(e) {
    const img = e.target
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
    // Başlangıç scale: daire tamamen dolsun
    const s = Math.max(CIRCLE / img.naturalWidth, CIRCLE / img.naturalHeight)
    setScale(s)
    setOffset({ x: 0, y: 0 })
  }

  function clampOffset(ox, oy, s) {
    const halfW = (imgSize.w * s) / 2
    const halfH = (imgSize.h * s) / 2
    const half = CIRCLE / 2
    return {
      x: Math.min(halfW - half, Math.max(-(halfW - half), ox)),
      y: Math.min(halfH - half, Math.max(-(halfH - half), oy)),
    }
  }

  function onMouseDown(e) {
    e.preventDefault()
    setDrag({ sx: e.clientX - offset.x, sy: e.clientY - offset.y })
  }

  const onMouseMove = useCallback((e) => {
    if (!drag) return
    const raw = { x: e.clientX - drag.sx, y: e.clientY - drag.sy }
    setOffset(clampOffset(raw.x, raw.y, scale))
  }, [drag, scale, imgSize])

  const onMouseUp = useCallback(() => setDrag(null), [])

  // Dokunmatik destek
  function onTouchStart(e) {
    const t = e.touches[0]
    setDrag({ sx: t.clientX - offset.x, sy: t.clientY - offset.y })
  }
  const onTouchMove = useCallback((e) => {
    if (!drag) return
    const t = e.touches[0]
    const raw = { x: t.clientX - drag.sx, y: t.clientY - drag.sy }
    setOffset(clampOffset(raw.x, raw.y, scale))
  }, [drag, scale, imgSize])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove)
    window.addEventListener('touchend', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onMouseUp)
    }
  }, [onMouseMove, onMouseUp, onTouchMove])

  function onWheel(e) {
    e.preventDefault()
    const yeni = Math.max(0.5, Math.min(5, scale - e.deltaY * 0.001))
    setScale(yeni)
    setOffset(o => clampOffset(o.x, o.y, yeni))
  }

  function handleScale(v) {
    setScale(v)
    setOffset(o => clampOffset(o.x, o.y, v))
  }

 async function uygula() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const OUT = 400
    canvas.width = OUT
    canvas.height = OUT

    const img = new Image()
    img.src = src
    await new Promise(r => { img.onload = r })

    // Daire clip
    ctx.beginPath()
    ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2)
    ctx.clip()

    // Gösterilen dairenin piksel başına düşen oran
    const ratio = OUT / CIRCLE

    // Resmin canvas'taki boyutu
    const drawW = imgSize.w * scale * ratio
    const drawH = imgSize.h * scale * ratio

    // Merkez + offset
    const x = OUT / 2 - drawW / 2 + offset.x * ratio
    const y = OUT / 2 - drawH / 2 + offset.y * ratio

    ctx.drawImage(img, x, y, drawW, drawH)

    canvas.toBlob(blob => onKaydet(blob), 'image/jpeg', 0.92)
  }

  const imgW = imgSize.w * scale
  const imgH = imgSize.h * scale

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '400px' }}>
        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>Profil Fotoğrafı</div>
        <div style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>Sürükle konumlandır · Kaydırıcıyla yakınlaştır</div>

        {/* Görüntü alanı */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            onWheel={onWheel}
            style={{
              width: CIRCLE, height: CIRCLE,
              borderRadius: '50%',
              overflow: 'hidden',
              cursor: drag ? 'grabbing' : 'grab',
              background: '#111',
              position: 'relative',
              userSelect: 'none',
              border: '3px solid #111',
              outline: '4px solid #e8e6e0',
            }}
          >
            {src && (
              <img
                src={src}
                onLoad={onImgLoad}
                draggable={false}
                style={{
                  position: 'absolute',
                  width: imgW,
                  height: imgH,
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
        </div>

        {/* Zoom kaydırıcı */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>🔍</span>
          <input
            type="range"
            min={0.3}
            max={4}
            step={0.01}
            value={scale}
            onChange={e => handleScale(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: '20px', lineHeight: 1 }}>🔍</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onIptal} style={{ flex: 1, padding: '11px', background: '#f5f4f0', border: '1px solid #e8e6e0', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>İptal</button>
          <button onClick={uygula} style={{ flex: 1, padding: '11px', background: '#111', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Uygula</button>
        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

// ── Ana Sayfa ─────────────────────────────────────────────────────
export default function ProfilDuzenle() {
  const [profil, setProfil] = useState(null)
  const [form, setForm] = useState({ kullanici_adi: '', bio: '', avatar_url: '' })
  const [sifreForm, setSifreForm] = useState({ yeni: '', tekrar: '' })
  const [yukleniyor, setYukleniyor] = useState(false)
  const [avatarYukleniyor, setAvatarYukleniyor] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const [hata, setHata] = useState('')
  const [avatarOnizleme, setAvatarOnizleme] = useState(null)
  const [modalSrc, setModalSrc] = useState(null)
  const router = useRouter()

  useEffect(() => {
    async function fetchProfil() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/giris'); return }
      const { data } = await supabase.from('profiller').select('*').eq('id', session.user.id).single()
      if (data) {
        setProfil(data)
        setForm({ kullanici_adi: data.kullanici_adi, bio: data.bio || '', avatar_url: data.avatar_url || '' })
        setAvatarOnizleme(data.avatar_url)
      }
    }
    fetchProfil()
  }, [])

  function handleResimSec(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setModalSrc(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleKaydetBlob(blob) {
    setModalSrc(null)
    setAvatarYukleniyor(true)
    const onizleme = URL.createObjectURL(blob)
    setAvatarOnizleme(onizleme)

    const path = `avatar-${profil.id}-${Date.now()}.jpg`
    const { error } = await supabase.storage.from('avatarlar').upload(path, blob, { contentType: 'image/jpeg', upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatarlar').getPublicUrl(path)
      setForm(f => ({ ...f, avatar_url: data.publicUrl }))
    }
    setAvatarYukleniyor(false)
  }

  async function handleKaydet(e) {
    e.preventDefault()
    setYukleniyor(true); setHata(''); setMesaj('')
    if (form.kullanici_adi.length < 3) { setHata('Kullanıcı adı en az 3 karakter olmalı.'); setYukleniyor(false); return }
    if (!/^[a-zA-Z0-9_]+$/.test(form.kullanici_adi)) { setHata('Kullanıcı adı sadece harf, rakam ve _ içerebilir.'); setYukleniyor(false); return }
    const { error } = await supabase.from('profiller').update({
      kullanici_adi: form.kullanici_adi,
      bio: form.bio,
      avatar_url: form.avatar_url,
      updated_at: new Date().toISOString(),
    }).eq('id', profil.id)
    if (error) setHata(error.message.includes('unique') ? 'Bu kullanıcı adı zaten alınmış.' : error.message)
    else setMesaj('Profil güncellendi!')
    setYukleniyor(false)
  }

  async function handleSifreDegistir(e) {
    e.preventDefault()
    if (sifreForm.yeni !== sifreForm.tekrar) { setHata('Şifreler eşleşmiyor.'); return }
    if (sifreForm.yeni.length < 6) { setHata('Şifre en az 6 karakter olmalı.'); return }
    setYukleniyor(true); setHata(''); setMesaj('')
    const { error } = await supabase.auth.updateUser({ password: sifreForm.yeni })
    if (error) setHata(error.message)
    else { setMesaj('Şifre güncellendi!'); setSifreForm({ yeni: '', tekrar: '' }) }
    setYukleniyor(false)
  }

  const I = { width: '100%', padding: '10px 13px', background: '#f5f4f0', border: '1px solid #e8e6e0', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
  const L = { fontSize: '11px', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }

  if (!profil) return <><Navbar /><div style={{ padding: '80px 24px', color: 'var(--text-muted)' }}>Yükleniyor...</div></>

  return (
    <>
      <Navbar />

      {modalSrc && (
        <AvatarModal
          src={modalSrc}
          onKaydet={handleKaydetBlob}
          onIptal={() => setModalSrc(null)}
        />
      )}

      <div style={{ maxWidth: '560px', margin: '32px auto', padding: '0 24px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <button onClick={() => router.push(`/profil/${profil.kullanici_adi}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'inherit' }}>← Profile Dön</button>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px' }}>PROFİL DÜZENLE</div>
        </div>

        {hata && <div style={{ fontSize: '13px', color: '#dc2626', marginBottom: '16px', padding: '10px 14px', background: '#fff0f0', borderRadius: '8px', border: '1px solid #fecaca' }}>{hata}</div>}
        {mesaj && <div style={{ fontSize: '13px', color: '#166534', marginBottom: '16px', padding: '10px 14px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>{mesaj}</div>}

        {/* Avatar */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>Profil Fotoğrafı</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Önizleme */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue', sans-serif", fontSize: '32px', color: '#fff', border: '3px solid var(--border)' }}>
                {avatarOnizleme
                  ? <img src={avatarOnizleme} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : profil.kullanici_adi[0].toUpperCase()
                }
              </div>
              {avatarYukleniyor && (
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '20px', height: '20px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'inline-block', padding: '9px 18px', background: '#111', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginBottom: '8px' }}>
                Fotoğraf Değiştir
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleResimSec} style={{ display: 'none' }} />
              </label>
              <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>JPG, PNG veya WEBP · Maks 5MB</div>
            </div>
          </div>
        </div>

        {/* Profil bilgileri */}
        <form onSubmit={handleKaydet}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Profil Bilgileri</div>
            <div>
              <label style={L}>Kullanıcı Adı</label>
              <input value={form.kullanici_adi} onChange={e => setForm(f => ({ ...f, kullanici_adi: e.target.value }))} style={I} />
              <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>konseycomics.com/profil/{form.kullanici_adi}</div>
            </div>
            <div>
              <label style={L}>Hakkımda</label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Kendinden kısaca bahset..." rows={3} maxLength={200} style={{ ...I, resize: 'none', lineHeight: 1.6 }} />
              <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px', textAlign: 'right' }}>{form.bio.length}/200</div>
            </div>
            <button type="submit" disabled={yukleniyor} style={{ padding: '11px', background: '#111', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 500, fontFamily: 'inherit', cursor: yukleniyor ? 'not-allowed' : 'pointer' }}>
              {yukleniyor ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </form>

        {/* Şifre değiştir */}
        <form onSubmit={handleSifreDegistir}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Şifre Değiştir</div>
            <div>
              <label style={L}>Yeni Şifre</label>
              <input type="password" value={sifreForm.yeni} onChange={e => setSifreForm(f => ({ ...f, yeni: e.target.value }))} placeholder="En az 6 karakter" style={I} />
            </div>
            <div>
              <label style={L}>Şifre Tekrar</label>
              <input type="password" value={sifreForm.tekrar} onChange={e => setSifreForm(f => ({ ...f, tekrar: e.target.value }))} placeholder="Şifreyi tekrar gir" style={I} />
            </div>
            <button type="submit" disabled={yukleniyor} style={{ padding: '11px', background: '#f5f4f0', border: '1px solid #e8e6e0', color: '#111', borderRadius: '10px', fontSize: '14px', fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
              Şifreyi Güncelle
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <Footer />
    </>
  )
}