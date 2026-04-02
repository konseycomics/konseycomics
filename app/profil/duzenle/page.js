'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { getAuthRedirectUrl, supabase } from '../../lib/supabase'
import { getCaptchaErrorMessage, isCaptchaEnabled, mapAuthError, validatePassword } from '../../lib/authSecurity'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { useRouter } from 'next/navigation'
import TurnstileWidget from '../../components/TurnstileWidget'

function parseBannerMeta(url) {
  if (!url) return { src: '', x: 50, y: 50, z: 1.12 }
  const [src, hash = ''] = String(url).split('#')
  const params = new URLSearchParams(hash)
  const x = Number(params.get('x'))
  const y = Number(params.get('y'))
  const z = Number(params.get('z'))
  return {
    src,
    x: Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : 50,
    y: Number.isFinite(y) ? Math.max(0, Math.min(100, y)) : 50,
    z: Number.isFinite(z) ? Math.max(1, Math.min(2.5, z)) : 1.12,
  }
}

function buildBannerMeta(src, x, y, z) {
  if (!src) return ''
  return `${src}#x=${Math.round(x)}&y=${Math.round(y)}&z=${z.toFixed(2)}`
}

function formatRol(rol) {
  if (!rol) return 'Okuyucu'
  return String(rol)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

const DEFAULT_VITRIN_AYARLARI = {
  show_featured_series: true,
  show_reading_shelf: true,
  show_reading_okunuyor: true,
  show_reading_okundu: true,
  show_reading_okuyacak: true,
  show_comments: true,
  show_stats: true,
  show_stats_okundu: true,
  show_stats_takip: true,
  show_stats_takipci: true,
}

function normalizeVitrinAyarlari(value) {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return Object.fromEntries(
    Object.entries(DEFAULT_VITRIN_AYARLARI).map(([key, fallback]) => [key, typeof raw[key] === 'boolean' ? raw[key] : fallback])
  )
}

function uniqById(items) {
  return Array.from(new Map((items || []).filter(Boolean).map(item => [String(item.id), item])).values())
}

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

  const clampOffset = useCallback((ox, oy, s) => {
    const halfW = (imgSize.w * s) / 2
    const halfH = (imgSize.h * s) / 2
    const half = CIRCLE / 2
    return {
      x: Math.min(halfW - half, Math.max(-(halfW - half), ox)),
      y: Math.min(halfH - half, Math.max(-(halfH - half), oy)),
    }
  }, [imgSize])

  function onMouseDown(e) {
    e.preventDefault()
    setDrag({ sx: e.clientX - offset.x, sy: e.clientY - offset.y })
  }

  const onMouseMove = useCallback((e) => {
    if (!drag) return
    const raw = { x: e.clientX - drag.sx, y: e.clientY - drag.sy }
    setOffset(clampOffset(raw.x, raw.y, scale))
  }, [clampOffset, drag, scale])

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
  }, [clampOffset, drag, scale])

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
                alt="Avatar kirpma onizlemesi"
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
  const bannerPointerRef = useRef(null)
  const [profil, setProfil] = useState(null)
  const [sessionUser, setSessionUser] = useState(null)
  const [securityCaptchaToken, setSecurityCaptchaToken] = useState('')
  const [form, setForm] = useState({ kullanici_adi: '', bio: '', avatar_url: '', banner_url: '' })
  const [sifreForm, setSifreForm] = useState({ mevcut: '', yeni: '', tekrar: '' })
  const [emailForm, setEmailForm] = useState({ yeni: '', sifre: '' })
  const [acilanUnvanlar, setAcilanUnvanlar] = useState([])
  const [seciliUnvanId, setSeciliUnvanId] = useState(null)
  const [acilanRozetler, setAcilanRozetler] = useState([])
  const [seciliRozetler, setSeciliRozetler] = useState([])
  const [seriHavuzu, setSeriHavuzu] = useState([])
  const [seriArama, setSeriArama] = useState('')
  const [seriAramaSonuclari, setSeriAramaSonuclari] = useState([])
  const [seriAramaYukleniyor, setSeriAramaYukleniyor] = useState(false)
  const [oneCikanSeriIds, setOneCikanSeriIds] = useState([])
  const [vitrinAyarlari, setVitrinAyarlari] = useState(DEFAULT_VITRIN_AYARLARI)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [avatarYukleniyor, setAvatarYukleniyor] = useState(false)
  const [bannerYukleniyor, setBannerYukleniyor] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const [hata, setHata] = useState('')
  const [avatarOnizleme, setAvatarOnizleme] = useState(null)
  const [bannerOnizleme, setBannerOnizleme] = useState(null)
  const [bannerPozisyon, setBannerPozisyon] = useState({ x: 50, y: 50 })
  const [bannerZoom, setBannerZoom] = useState(1.12)
  const [bannerDrag, setBannerDrag] = useState(false)
  const [onizlemeModu, setOnizlemeModu] = useState('desktop')
  const [modalSrc, setModalSrc] = useState(null)
  const securityCaptchaRef = useRef(null)
  const router = useRouter()
  const captchaActive = isCaptchaEnabled()

  useEffect(() => {
    async function fetchProfil() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/giris'); return }
      setSessionUser(session.user)
      const [{ data }, { data: unvanlar }, { data: rozetler }, { data: liste }] = await Promise.all([
        supabase.from('profiller').select('*').eq('id', session.user.id).single(),
        supabase
          .from('kullanici_unvanlari')
          .select('id, unvan_id, one_cikarildi, acildi_at, unvan_tanimlari(id, isim, aciklama, nadirlik)')
          .eq('kullanici_id', session.user.id)
          .order('acildi_at', { ascending: false }),
        supabase
          .from('kullanici_rozetleri')
          .select('id, rozet_id, kazanildi_at, rozet_tanimlari(id, isim, aciklama, ikon)')
          .eq('kullanici_id', session.user.id)
          .order('kazanildi_at', { ascending: false }),
        supabase
          .from('okuma_listesi')
          .select('seri_id, updated_at, seriler(id, baslik, slug, kapak_url, kategori)')
          .eq('kullanici_id', session.user.id)
          .order('updated_at', { ascending: false }),
      ])
      if (data) {
        const parsedBanner = parseBannerMeta(data.banner_url)
        setProfil(data)
        setForm({ kullanici_adi: data.kullanici_adi, bio: data.bio || '', avatar_url: data.avatar_url || '', banner_url: parsedBanner.src || '' })
        setAvatarOnizleme(data.avatar_url)
        setBannerOnizleme(parsedBanner.src)
        setBannerPozisyon({ x: parsedBanner.x, y: parsedBanner.y })
        setBannerZoom(parsedBanner.z)
        setOneCikanSeriIds(Array.isArray(data.one_cikan_seri_ids) ? data.one_cikan_seri_ids.map(String) : [])
        setVitrinAyarlari(normalizeVitrinAyarlari(data.profil_vitrin_ayarlari))
      }
      setAcilanUnvanlar(unvanlar || [])
      setAcilanRozetler(rozetler || [])
      const benzersizSeriler = uniqById((liste || []).map(item => item.seriler).filter(item => item?.id))
      setSeriHavuzu(benzersizSeriler)
      setSeciliRozetler(Array.isArray(data?.favori_turler) ? data.favori_turler : [])
      const aktifUnvan = (unvanlar || []).find(item => item.one_cikarildi)
      setSeciliUnvanId(aktifUnvan?.unvan_id || null)
    }
    fetchProfil()
  }, [router])

  useEffect(() => {
    if (!profil?.id) return
    const missingIds = oneCikanSeriIds.filter(id => !seriHavuzu.some(item => String(item.id) === String(id)))
    if (missingIds.length === 0) return

    async function fetchSeciliSeriler() {
      const { data } = await supabase
        .from('seriler')
        .select('id, baslik, slug, kapak_url, kategori')
        .in('id', missingIds)
      if (data?.length) {
        setSeriHavuzu(prev => uniqById([...prev, ...data]))
      }
    }

    fetchSeciliSeriler()
  }, [oneCikanSeriIds, profil?.id, seriHavuzu])

  useEffect(() => {
    const query = seriArama.trim()
    if (query.length < 2) {
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('seriler')
        .select('id, baslik, slug, kapak_url, kategori')
        .ilike('baslik', `%${query}%`)
        .order('baslik')
        .limit(8)

      if (cancelled) return
      setSeriAramaSonuclari(data || [])
      if (data?.length) {
        setSeriHavuzu(prev => uniqById([...prev, ...data]))
      }
      setSeriAramaYukleniyor(false)
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [seriArama])

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

  async function handleBannerSec(e) {
    const file = e.target.files?.[0]
    if (!file || !profil?.id) return

    setBannerYukleniyor(true)
    const onizleme = URL.createObjectURL(file)
    setBannerOnizleme(onizleme)

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `banner-${profil.id}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('avatarlar').upload(path, file, {
      contentType: file.type || 'image/jpeg',
      upsert: true,
    })

    if (error) {
      setHata(error.message)
      setBannerYukleniyor(false)
      return
    }

    const { data } = supabase.storage.from('avatarlar').getPublicUrl(path)
    setForm(f => ({ ...f, banner_url: data.publicUrl }))
    setBannerPozisyon({ x: 50, y: 50 })
    setBannerZoom(1.12)
    setBannerYukleniyor(false)
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
      banner_url: buildBannerMeta(form.banner_url, bannerPozisyon.x, bannerPozisyon.y, bannerZoom),
      favori_turler: seciliRozetler,
      one_cikan_seri_ids: oneCikanSeriIds,
      profil_vitrin_ayarlari: vitrinAyarlari,
      updated_at: new Date().toISOString(),
    }).eq('id', profil.id)
    if (error) {
      setHata(error.message.includes('unique') ? 'Bu kullanıcı adı zaten alınmış.' : error.message)
      setYukleniyor(false)
      return
    }

    const seciliSatirIds = acilanUnvanlar.map(item => item.id)
    if (seciliSatirIds.length) {
      const { error: resetError } = await supabase
        .from('kullanici_unvanlari')
        .update({ one_cikarildi: false })
        .eq('kullanici_id', profil.id)
        .in('id', seciliSatirIds)

      if (resetError) {
        setHata(resetError.message)
        setYukleniyor(false)
        return
      }

      if (seciliUnvanId) {
        const { error: secimError } = await supabase
          .from('kullanici_unvanlari')
          .update({ one_cikarildi: true })
          .eq('kullanici_id', profil.id)
          .eq('unvan_id', seciliUnvanId)

        if (secimError) {
          setHata(secimError.message)
          setYukleniyor(false)
          return
        }
      }
    }

    setMesaj('Profil güncellendi!')
    setYukleniyor(false)
  }

  function toggleRozetSecimi(rozetId) {
    const id = String(rozetId)
    setSeciliRozetler(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id)
      }
      if (prev.length >= 3) {
        setHata('En fazla 3 rozet öne çıkarabilirsin.')
        return prev
      }
      setHata('')
      return [...prev, id]
    })
  }

  function toggleOneCikanSeri(seriId) {
    const id = String(seriId)
    setOneCikanSeriIds(prev => {
      if (prev.includes(id)) return prev.filter(item => item !== id)
      if (prev.length >= 3) {
        setHata('En fazla 3 seri öne çıkarabilirsin.')
        return prev
      }
      setHata('')
      return [...prev, id]
    })
  }

  function updateVitrinAyari(key, value) {
    setVitrinAyarlari(prev => ({ ...prev, [key]: value }))
  }

  async function handleSifreDegistir(e) {
    e.preventDefault()
    if (!sessionUser?.email) { setHata('Hesap bilgileri yüklenemedi. Sayfayı yenileyip tekrar dene.'); return }
    if (!sifreForm.mevcut) { setHata('Mevcut şifreni gir.'); return }
    if (sifreForm.yeni !== sifreForm.tekrar) { setHata('Şifreler eşleşmiyor.'); return }
    if (captchaActive && !securityCaptchaToken) { setHata(getCaptchaErrorMessage()); return }

    const passwordError = validatePassword(sifreForm.yeni)
    if (passwordError) { setHata(passwordError); return }
    if (sifreForm.mevcut === sifreForm.yeni) { setHata('Yeni şifre mevcut şifreyle aynı olamaz.'); return }

    setYukleniyor(true); setHata(''); setMesaj('')
    const { error: mevcutSifreError } = await supabase.auth.signInWithPassword({
      email: sessionUser.email,
      password: sifreForm.mevcut,
      options: securityCaptchaToken ? { captchaToken: securityCaptchaToken } : undefined,
    })
    if (mevcutSifreError) {
      setHata(mapAuthError(mevcutSifreError, 'password-check'))
      securityCaptchaRef.current?.reset?.()
      setSecurityCaptchaToken('')
      setYukleniyor(false)
      return
    }
    const { error } = await supabase.auth.updateUser({ password: sifreForm.yeni })
    if (error) setHata(mapAuthError(error, 'password-update'))
    else {
      setMesaj('Şifre güncellendi!')
      setSifreForm({ mevcut: '', yeni: '', tekrar: '' })
    }
    securityCaptchaRef.current?.reset?.()
    setSecurityCaptchaToken('')
    setYukleniyor(false)
  }

  async function handleEmailDegistir(e) {
    e.preventDefault()
    if (!sessionUser?.email) { setHata('Hesap bilgileri yüklenemedi. Sayfayı yenileyip tekrar dene.'); return }
    if (!emailForm.yeni) { setHata('Yeni e-posta adresini gir.'); return }
    if (emailForm.yeni.toLowerCase() === sessionUser.email.toLowerCase()) { setHata('Yeni e-posta mevcut adresle aynı olamaz.'); return }
    if (!emailForm.sifre) { setHata('E-posta değişimi için mevcut şifreni doğrula.'); return }
    if (captchaActive && !securityCaptchaToken) { setHata(getCaptchaErrorMessage()); return }

    setYukleniyor(true); setHata(''); setMesaj('')
    const { error: mevcutSifreError } = await supabase.auth.signInWithPassword({
      email: sessionUser.email,
      password: emailForm.sifre,
      options: securityCaptchaToken ? { captchaToken: securityCaptchaToken } : undefined,
    })
    if (mevcutSifreError) {
      setHata(mapAuthError(mevcutSifreError, 'password-check'))
      securityCaptchaRef.current?.reset?.()
      setSecurityCaptchaToken('')
      setYukleniyor(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      email: emailForm.yeni.trim().toLowerCase(),
    })

    if (error) {
      console.error('Email update init failed:', error)
      setHata(mapAuthError(error, 'email-update'))
    } else {
      setMesaj('E-posta değişikliği başlatıldı. Yeni adresini onayladıktan sonra hesabın güncellenecek.')
      setEmailForm({ yeni: '', sifre: '' })
    }
    securityCaptchaRef.current?.reset?.()
    setSecurityCaptchaToken('')
    setYukleniyor(false)
  }

  const I = {
    width: '100%',
    minHeight: '54px',
    padding: '0 16px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    fontSize: '15px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    color: '#fff',
  }
  const L = {
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.9px',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.46)',
    marginBottom: '8px',
    display: 'block',
  }

  if (!profil) return <><Navbar /><div style={{ padding: '80px 24px', color: 'var(--text-muted)' }}>Yükleniyor...</div></>

  const heroBackground = bannerOnizleme || form.banner_url || avatarOnizleme || form.avatar_url || parseBannerMeta(profil.banner_url).src || profil.avatar_url || ''
  const seciliUnvanOnizleme = acilanUnvanlar.find(item => item.unvan_id === seciliUnvanId)?.unvan_tanimlari || null
  const seciliRozetOnizleme = acilanRozetler
    .filter(item => seciliRozetler.includes(String(item.rozet_id)))
    .slice(0, 3)
  const seciliOneCikanSeriler = oneCikanSeriIds
    .map(id => seriHavuzu.find(item => String(item.id) === String(id)))
    .filter(Boolean)
  const filtreliAramaSonuclari = seriAramaSonuclari.filter(item => !oneCikanSeriIds.includes(String(item.id)))
  const onizlemeIstatistikleri = [
    { label: 'Okundu', value: 1 },
    { label: 'Takip', value: profil.takip_sayisi || 0 },
    { label: 'Takipçi', value: profil.takipci_sayisi || 1 },
  ]
  const anaVitrinSecenekleri = [
    ['show_featured_series', 'Öne Çıkan Seriler', 'Profilindeki seçili seri vitrini görünsün.'],
    ['show_reading_shelf', 'Okuma Rafı', 'Okuma rafın profil sayfanda yer alsın.'],
    ['show_comments', 'Yorumlar', 'Bıraktığın son yorumlar profilde görünsün.'],
    ['show_stats', 'İstatistikler', 'Okundu, takip ve takipçi sayıları profilde yer alsın.'],
  ]
  const rafDetaylari = [
    ['show_reading_okunuyor', 'Okunuyor', 'Devam eden serileri rafta goster.'],
    ['show_reading_okundu', 'Okundu', 'Bitirdigin serileri rafta goster.'],
    ['show_reading_okuyacak', 'Okuyacak', 'Daha sonra okuyacagin serileri rafta goster.'],
  ]
  const istatistikDetaylari = [
    ['show_stats_okundu', 'Okundu sayısı', 'Toplam bitirdiğin seri adedi görünsün.'],
    ['show_stats_takip', 'Takip sayısı', 'Takip ettiğin üye sayısı görünsün.'],
    ['show_stats_takipci', 'Takipçi sayısı', 'Seni takip eden üye sayısı görünsün.'],
  ]

  function handleBannerPointerDown(e) {
    if (!(bannerOnizleme || form.banner_url)) return
    bannerPointerRef.current = { x: e.clientX, y: e.clientY }
    setBannerDrag(true)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function handleBannerPointerMove(e) {
    if (!bannerDrag || !bannerPointerRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const dx = e.clientX - bannerPointerRef.current.x
    const dy = e.clientY - bannerPointerRef.current.y
    bannerPointerRef.current = { x: e.clientX, y: e.clientY }
    setBannerPozisyon(prev => ({
      x: Math.max(0, Math.min(100, prev.x + (dx / rect.width) * 100)),
      y: Math.max(0, Math.min(100, prev.y + (dy / rect.height) * 100)),
    }))
  }

  function handleBannerPointerUp(e) {
    bannerPointerRef.current = null
    setBannerDrag(false)
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  function renderHeroPreview(mod = 'desktop') {
    const mobil = mod === 'mobile'

    return (
      <div
        style={{
          borderRadius: '24px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          background: '#050505',
          width: '100%',
          maxWidth: mobil ? '390px' : 'none',
          justifySelf: mobil ? 'center' : 'stretch',
        }}
      >
        <div
          onPointerDown={handleBannerPointerDown}
          onPointerMove={handleBannerPointerMove}
          onPointerUp={handleBannerPointerUp}
          onPointerCancel={handleBannerPointerUp}
          style={{
            position: 'relative',
            height: mobil ? '210px' : '240px',
            overflow: 'hidden',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: '#111',
            cursor: (bannerOnizleme || form.banner_url) ? (bannerDrag ? 'grabbing' : 'grab') : 'default',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          {(bannerOnizleme || form.banner_url) ? (
            <img
              src={bannerOnizleme || form.banner_url}
              alt={`Profil arka plan ${mobil ? 'mobil' : 'masaustu'} onizleme`}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: `${bannerPozisyon.x}% ${bannerPozisyon.y}%`,
                transform: `scale(${bannerZoom})`,
                transformOrigin: 'center',
                pointerEvents: 'none',
              }}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                color: 'rgba(255,255,255,0.42)',
                fontSize: '14px',
              }}
            >
              Henüz arka plan görseli seçilmedi
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(4,4,4,0.08) 0%, rgba(4,4,4,0.34) 54%, rgba(4,4,4,0.84) 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(5,5,5,0.48) 0%, rgba(5,5,5,0.12) 38%, rgba(5,5,5,0.48) 100%)',
            }}
          />
          {(bannerOnizleme || form.banner_url) && (
            <div
              style={{
                position: 'absolute',
                left: '14px',
                bottom: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: '28px',
                padding: '0 10px',
                borderRadius: '999px',
                background: 'rgba(10,10,10,0.76)',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
              }}
            >
              Surukleyerek kadraj ayarla
            </div>
          )}
          {bannerYukleniyor && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center' }}>
              <div style={{ width: '22px', height: '22px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            </div>
          )}
        </div>

        <div
          style={{
            maxWidth: mobil ? '100%' : '760px',
            margin: mobil ? '-66px auto 0' : '-74px auto 0',
            padding: mobil ? '0 18px 24px' : '0 24px 28px',
            display: 'grid',
            justifyItems: 'center',
            textAlign: 'center',
            gap: mobil ? '12px' : '14px',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: mobil ? '132px' : '148px',
              height: mobil ? '132px' : '148px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '5px solid rgba(255,255,255,0.16)',
              background: 'rgba(255,255,255,0.05)',
              boxShadow: '0 24px 44px rgba(0,0,0,0.42)',
            }}
          >
            {avatarOnizleme ? (
              <img
                src={avatarOnizleme}
                alt={profil.kullanici_adi}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: mobil ? '42px' : '48px',
                }}
              >
                {form.kullanici_adi?.[0]?.toUpperCase() || 'K'}
              </div>
            )}
          </div>

          <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: mobil ? '10px' : '11px', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase' }}>
            Seviye {profil.seviye || 1} • Mart 2026 tarihinden beri aramizda
          </div>

          <div style={{ display: 'grid', gap: mobil ? '8px' : '10px', justifyItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div
                style={{
                  margin: 0,
                  color: '#fff',
                  fontFamily: 'inherit',
                  fontSize: mobil ? '64px' : 'clamp(52px, 7vw, 88px)',
                  fontWeight: 900,
                  lineHeight: 0.95,
                  letterSpacing: '-0.03em',
                }}
              >
                {form.kullanici_adi || 'KullanıcıAdı'}
              </div>
              {!mobil && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    minHeight: '32px',
                    padding: '0 12px',
                    borderRadius: '999px',
                    background: '#ede9fe',
                    color: '#5b21b6',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                  }}
                >
                  {formatRol(profil.rol)}
                </span>
              )}
            </div>

            {seciliUnvanOnizleme?.isim && (
              <div
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: mobil ? '16px' : '18px',
                  fontWeight: 500,
                  letterSpacing: '0.1px',
                }}
              >
                {seciliUnvanOnizleme.isim}
              </div>
            )}

            <div
              style={{
                width: mobil ? '84px' : '96px',
                height: '1px',
                background: 'rgba(255,255,255,0.16)',
              }}
            />

            <div
              style={{
                margin: 0,
                maxWidth: mobil ? '30ch' : '38ch',
                color: 'rgba(255,255,255,0.68)',
                fontSize: mobil ? '14px' : '15px',
                lineHeight: 1.7,
              }}
            >
              {form.bio || `${form.kullanici_adi || 'Bu kullanici'}, Konsey evreninde kendi arsivini kuran ve topluluga iz birakan bir uye.`}
            </div>
          </div>

          {seciliRozetOnizleme.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              {seciliRozetOnizleme.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    minHeight: '32px',
                    padding: '0 14px',
                    borderRadius: '999px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(9,9,9,0.86)',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{item.rozet_tanimlari?.ikon}</span>
                  <span>{item.rozet_tanimlari?.isim}</span>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: mobil ? '28px' : '56px',
              paddingTop: '6px',
              flexWrap: 'wrap',
            }}
          >
            {onizlemeIstatistikleri.map((item) => (
              <div key={item.label} style={{ display: 'grid', gap: '4px', justifyItems: 'center', minWidth: mobil ? '56px' : '70px' }}>
                <div style={{ color: '#fff', fontSize: mobil ? '30px' : '36px', lineHeight: 1, fontWeight: 700 }}>{item.value}</div>
                <div style={{ color: 'rgba(255,255,255,0.82)', fontSize: mobil ? '13px' : '15px', fontWeight: 700 }}>{item.label}</div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '52px',
              minWidth: '180px',
              padding: '0 24px',
              borderRadius: '999px',
              background: '#fff',
              color: '#111',
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: '0.7px',
              textTransform: 'uppercase',
            }}
          >
            {form.kullanici_adi === profil.kullanici_adi ? 'Profili Duzenle' : 'Takip Et'}
          </div>
        </div>
      </div>
    )
  }

  function renderOneCikanSerilerEditor() {
    return (
      <div style={{ display: 'grid', gap: '12px' }}>
        <label style={L}>Öne Çıkan Seriler</label>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
          Profil vitrininin ilk bölümünde yer alacak serileri tüm seri arşivinden arayarak seç. En fazla <strong style={{ color: '#fff' }}>3</strong> seri öne çıkabilir.
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          <input
            value={seriArama}
            onChange={(e) => {
              const value = e.target.value
              setSeriArama(value)
              if (value.trim().length < 2) {
                setSeriAramaSonuclari([])
                setSeriAramaYukleniyor(false)
              } else {
                setSeriAramaYukleniyor(true)
              }
            }}
            placeholder="Seri ara..."
            style={I}
          />

          {seciliOneCikanSeriler.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {seciliOneCikanSeriler.map((seri) => (
                <button
                  key={seri.id}
                  type="button"
                  onClick={() => toggleOneCikanSeri(seri.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    minHeight: '34px',
                    padding: '0 12px',
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <span>{seri.baslik}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'uppercase' }}>Kaldır</span>
                </button>
              ))}
            </div>
          )}

          {seriArama.trim().length >= 2 ? (
            <div style={{ display: 'grid', gap: '10px' }}>
              {seriAramaYukleniyor ? (
                <div style={{ minHeight: '54px', display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.48)', fontSize: '13px' }}>
                  Seri aranıyor...
                </div>
              ) : filtreliAramaSonuclari.length > 0 ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {filtreliAramaSonuclari.map((seri) => (
                    <div
                      key={seri.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700, lineHeight: 1.4 }}>{seri.baslik}</div>
                        <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '11px', marginTop: '4px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                          {seri.kategori || 'Seri'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleOneCikanSeri(seri.id)}
                        disabled={oneCikanSeriIds.length >= 3}
                        style={{
                          flexShrink: 0,
                          minHeight: '34px',
                          padding: '0 12px',
                          borderRadius: '999px',
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: '#fff',
                          color: '#111',
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '0.8px',
                          textTransform: 'uppercase',
                          cursor: oneCikanSeriIds.length >= 3 ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        Ekle
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ minHeight: '54px', display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.48)', fontSize: '13px' }}>
                  Bu arama için sonuç bulunamadı.
                </div>
              )}
            </div>
          ) : (
            <div style={{ minHeight: '54px', display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.48)', fontSize: '13px' }}>
              Tüm seriler arasından seçmek için en az 2 karakter yaz.
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderVitrinAyarlariEditor() {
    return (
      <div style={{ display: 'grid', gap: '14px' }}>
        <label style={L}>Vitrin ve Gizlilik Ayarları</label>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
          Profil sayfanda hangi bölümlerin görüneceğini ve bu bölümlerin içindeki detayları buradan yönetebilirsin.
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          {anaVitrinSecenekleri.map(([key, label, desc]) => (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                padding: '16px',
                borderRadius: '18px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>{label}</div>
                <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '12px', lineHeight: 1.6, marginTop: '4px' }}>{desc}</div>
              </div>
              <button
                type="button"
                onClick={() => updateVitrinAyari(key, !vitrinAyarlari[key])}
                style={{
                  flexShrink: 0,
                  minWidth: '82px',
                  minHeight: '34px',
                  padding: '0 12px',
                  borderRadius: '999px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: vitrinAyarlari[key] ? '#fff' : 'rgba(255,255,255,0.06)',
                  color: vitrinAyarlari[key] ? '#111' : '#fff',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {vitrinAyarlari[key] ? 'Acik' : 'Gizli'}
              </button>
            </div>
          ))}
        </div>

        {vitrinAyarlari.show_reading_shelf && (
          <div style={{ display: 'grid', gap: '10px', padding: '16px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)' }}>
            <div style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>Okuma Rafı Detayları</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              {rafDetaylari.map(([key, label, desc]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateVitrinAyari(key, !vitrinAyarlari[key])}
                  style={{
                    textAlign: 'left',
                    padding: '14px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: vitrinAyarlari[key] ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'grid',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{label}</span>
                    <span style={{ color: vitrinAyarlari[key] ? '#bbf7d0' : 'rgba(255,255,255,0.42)', fontSize: '11px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                      {vitrinAyarlari[key] ? 'Goster' : 'Gizle'}
                    </span>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.48)', fontSize: '11px', lineHeight: 1.6 }}>{desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {vitrinAyarlari.show_stats && (
          <div style={{ display: 'grid', gap: '10px', padding: '16px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)' }}>
            <div style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>İstatistik Detayları</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              {istatistikDetaylari.map(([key, label, desc]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateVitrinAyari(key, !vitrinAyarlari[key])}
                  style={{
                    textAlign: 'left',
                    padding: '14px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: vitrinAyarlari[key] ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'grid',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{label}</span>
                    <span style={{ color: vitrinAyarlari[key] ? '#bbf7d0' : 'rgba(255,255,255,0.42)', fontSize: '11px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                      {vitrinAyarlari[key] ? 'Goster' : 'Gizle'}
                    </span>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.48)', fontSize: '11px', lineHeight: 1.6 }}>{desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

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

      <main style={{ background: '#050505', minHeight: '100vh' }}>
        <section
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            background:
              'linear-gradient(180deg, rgba(6,6,6,0.86) 0%, rgba(6,6,6,0.94) 45%, rgba(6,6,6,1) 100%)',
          }}
        >
          {heroBackground && (
            <img
              src={heroBackground}
              alt={profil.kullanici_adi}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0.16,
                filter: 'blur(10px)',
                transform: 'scale(1.08)',
              }}
            />
          )}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(5,5,5,0.98) 0%, rgba(5,5,5,0.9) 44%, rgba(5,5,5,0.76) 100%)',
            }}
          />

          <div
            style={{
              position: 'relative',
              maxWidth: '1360px',
              margin: '0 auto',
              padding: '34px 24px 42px',
            }}
          >
            <div
              className="edit-hero-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.05fr) minmax(300px, 0.95fr)',
                gap: '28px',
                alignItems: 'end',
              }}
            >
              <div style={{ display: 'grid', gap: '18px' }}>
                <button
                  onClick={() => router.push(`/profil/${profil.kullanici_adi}`)}
                  style={{
                    justifySelf: 'start',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    color: 'rgba(255,255,255,0.58)',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                  }}
                >
                  ← Profile Dön
                </button>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '112px minmax(0, 1fr)',
                    gap: '22px',
                    alignItems: 'center',
                  }}
                  className="edit-title-wrap"
                >
                  <div
                    style={{
                      width: '112px',
                      height: '112px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      position: 'relative',
                      border: '3px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.04)',
                      boxShadow: '0 22px 36px rgba(0,0,0,0.32)',
                    }}
                  >
                    {avatarOnizleme ? (
                      <img src={avatarOnizleme} alt={profil.kullanici_adi} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'grid',
                          placeItems: 'center',
                          color: '#fff',
                          fontFamily: "'Bebas Neue', sans-serif",
                          fontSize: '44px',
                        }}
                      >
                        {profil.kullanici_adi[0].toUpperCase()}
                      </div>
                    )}
                    {avatarYukleniyor && (
                      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '20px', height: '20px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      </div>
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        minHeight: '32px',
                        padding: '0 14px',
                        borderRadius: '999px',
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.04)',
                        color: 'rgba(255,255,255,0.74)',
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        marginBottom: '12px',
                      }}
                    >
                      Konsey Profili
                    </div>
                    <h1
                      style={{
                        margin: 0,
                        color: '#fff',
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: 'clamp(52px, 8vw, 92px)',
                        lineHeight: 0.9,
                        letterSpacing: '0.02em',
                      }}
                    >
                      PROFİL DÜZENLE
                    </h1>
                    <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.62)', fontSize: '15px', lineHeight: 1.8, maxWidth: '52ch' }}>
                      Avatarını, kullanıcı adını ve biyografini yeni profil vitrinine uygun şekilde burada düzenleyebilirsin.
                    </p>
                  </div>
                </div>
              </div>

              <aside
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '28px',
                  background: 'rgba(255,255,255,0.04)',
                  padding: '24px',
                  display: 'grid',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    color: 'rgba(255,255,255,0.46)',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                  }}
                >
                  Profil Önerisi
                </div>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.62)', fontSize: '14px', lineHeight: 1.75 }}>
                  Kısa, akılda kalıcı bir kullanıcı adı ve net bir bio profile çok daha güçlü bir vitrin etkisi verir.
                  Görsel seçiminde kontrastı yüksek avatarlar daha iyi durur.
                </p>
              </aside>
            </div>
          </div>
        </section>

        <section
          style={{
            maxWidth: '1360px',
            margin: '0 auto',
            padding: '28px 24px 110px',
            display: 'grid',
            gap: '18px',
          }}
        >
          {hata && <div style={{ fontSize: '13px', color: '#fecaca', padding: '12px 16px', background: 'rgba(127,29,29,0.28)', borderRadius: '14px', border: '1px solid rgba(248,113,113,0.28)' }}>{hata}</div>}
          {mesaj && <div style={{ fontSize: '13px', color: '#bbf7d0', padding: '12px 16px', background: 'rgba(20,83,45,0.28)', borderRadius: '14px', border: '1px solid rgba(74,222,128,0.2)' }}>{mesaj}</div>}

          <div style={{ display: 'grid', gap: '24px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '26px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Profil Arka Planı</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.46)', marginTop: '6px' }}>
                    Masaüstü ve mobil görünümü aynı kadraj verisiyle burada düzenleyebilirsin.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'desktop', label: 'Masaüstü Önizleme' },
                    { key: 'mobile', label: 'Mobil Önizleme' },
                  ].map((item) => {
                    const aktif = onizlemeModu === item.key
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setOnizlemeModu(item.key)}
                        style={{
                          minHeight: '34px',
                          padding: '0 14px',
                          borderRadius: '999px',
                          border: aktif ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.08)',
                          background: aktif ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                          color: aktif ? '#fff' : 'rgba(255,255,255,0.56)',
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '0.9px',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gap: '18px' }}>
                <div style={{ display: 'grid', gap: '10px', justifyItems: onizlemeModu === 'mobile' ? 'center' : 'stretch' }}>
                  {renderHeroPreview(onizlemeModu)}
                </div>

                <div className="edit-avatar-row" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: '46px', padding: '0 18px', background: '#fff', color: '#111', borderRadius: '14px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.7px', textTransform: 'uppercase', width: 'fit-content' }}>
                    Arka Plan Yukle
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleBannerSec} style={{ display: 'none' }} />
                  </label>

                  {(bannerOnizleme || form.banner_url) && (
                    <button
                      type="button"
                      onClick={() => {
                        setBannerOnizleme(null)
                        setBannerPozisyon({ x: 50, y: 50 })
                        setBannerZoom(1.12)
                        setForm(f => ({ ...f, banner_url: '' }))
                      }}
                      style={{
                        minHeight: '46px',
                        padding: '0 18px',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                        borderRadius: '14px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        letterSpacing: '0.7px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Temizle
                    </button>
                  )}

                  <button
                    type="submit"
                    form="profil-form"
                    disabled={yukleniyor}
                    style={{ minHeight: '46px', padding: '0 18px', background: '#fff', color: '#111', border: 'none', borderRadius: '14px', fontSize: '13px', fontWeight: 800, fontFamily: 'inherit', cursor: yukleniyor ? 'not-allowed' : 'pointer', letterSpacing: '0.7px', textTransform: 'uppercase' }}
                  >
                    {yukleniyor ? 'Kaydediliyor...' : 'Degisiklikleri Kaydet'}
                  </button>
                </div>

                {(bannerOnizleme || form.banner_url) && (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: 'rgba(255,255,255,0.52)', fontSize: '12px' }}>
                      <span>Kadraj / Yakınlık</span>
                      <span>X {Math.round(bannerPozisyon.x)} · Y {Math.round(bannerPozisyon.y)} · %{Math.round(bannerZoom * 100)}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="2.5"
                      step="0.01"
                      value={bannerZoom}
                      onChange={(e) => setBannerZoom(Number(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                )}

                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.46)' }}>
                  Bu gorsel profil sayfasinin ust kismindaki arka plan vitrini olarak kullanilir. Surukleyerek kadraji,
                  kaydirici ile de yakinligi ayarlayabilirsin.
                </div>
              </div>
            </div>

            <div
              className="edit-bottom-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                gap: '24px',
                alignItems: 'start',
              }}
            >
              <div style={{ display: 'grid', gap: '24px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '26px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>Profil Fotografi</div>
                  <div className="edit-avatar-row" style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: '96px', height: '96px', borderRadius: '50%', overflow: 'hidden', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue', sans-serif", fontSize: '36px', color: '#fff', border: '3px solid rgba(255,255,255,0.08)' }}>
                        {avatarOnizleme
                          ? <img src={avatarOnizleme} alt={profil.kullanici_adi} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : profil.kullanici_adi[0].toUpperCase()
                        }
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '10px' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: '46px', padding: '0 18px', background: '#fff', color: '#111', borderRadius: '14px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.7px', textTransform: 'uppercase', width: 'fit-content' }}>
                        Fotograf Degistir
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleResimSec} style={{ display: 'none' }} />
                      </label>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.46)' }}>JPG, PNG veya WEBP · Maks 5MB</div>
                    </div>
                  </div>
                </div>

                <form id="profil-form" onSubmit={handleKaydet}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '26px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Profil Bilgileri</div>
                  <div>
                    <label style={L}>Kullanıcı Adı</label>
                    <input value={form.kullanici_adi} onChange={e => setForm(f => ({ ...f, kullanici_adi: e.target.value }))} style={I} />
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.42)', marginTop: '6px' }}>konseycomics.com/profil/{form.kullanici_adi}</div>
                  </div>
                  <div>
                    <label style={L}>Hakkimda</label>
                    <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Kendinden kısaca bahset..." rows={4} maxLength={200} style={{ ...I, minHeight: '150px', padding: '14px 16px', resize: 'none', lineHeight: 1.7 }} />
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.42)', marginTop: '6px', textAlign: 'right' }}>{form.bio.length}/200</div>
                  </div>

                  <div style={{ display: 'grid', gap: '12px' }}>
                    <label style={L}>Aktif Unvan</label>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                      Seçtiğin ünvan profilinde kullanıcı adının altında, yorumlarda ise kullanıcı adının hemen altında görünür.
                      Sadece <strong style={{ color: '#fff' }}>1</strong> unvan aktif olabilir.
                    </div>

                    {acilanUnvanlar.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        {acilanUnvanlar.map((item) => {
                          const aktif = seciliUnvanId === item.unvan_id
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setSeciliUnvanId(aktif ? null : item.unvan_id)}
                              style={{
                                textAlign: 'left',
                                border: aktif ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '18px',
                                background: aktif ? 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))' : 'rgba(255,255,255,0.03)',
                                padding: '16px',
                                display: 'grid',
                                gap: '10px',
                                cursor: 'pointer',
                                color: '#fff',
                                fontFamily: 'inherit',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.46)', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>
                                  {item.unvan_tanimlari?.nadirlik || 'common'}
                                </span>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    minHeight: '24px',
                                    padding: '0 10px',
                                    borderRadius: '999px',
                                    background: aktif ? '#fff' : 'rgba(255,255,255,0.05)',
                                    color: aktif ? '#111' : 'rgba(255,255,255,0.68)',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    letterSpacing: '0.8px',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {aktif ? 'Aktif' : 'Seç'}
                                </span>
                              </div>
                              <div style={{ color: '#fff', fontFamily: "'Bebas Neue', sans-serif", fontSize: '30px', lineHeight: 0.95 }}>
                                {item.unvan_tanimlari?.isim}
                              </div>
                              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', lineHeight: 1.6 }}>
                                {item.unvan_tanimlari?.aciklama || 'Bu unvan profil vitrininde görünebilir.'}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{ minHeight: '54px', display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.48)', fontSize: '13px' }}>
                        Henüz açılmış bir ünvanın yok. Okumaya ve etkileşime devam ettikçe burada seçim yapabileceksin.
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gap: '12px' }}>
                    <label style={L}>Rozet Vitrini</label>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                      Profilinde küçük rozet vitrini olarak görünecek rozetleri seçebilirsin. En fazla <strong style={{ color: '#fff' }}>3</strong> rozet öne çıkarılır.
                    </div>

                    {acilanRozetler.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        {acilanRozetler.map((item) => {
                          const aktif = seciliRozetler.includes(String(item.rozet_id))
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggleRozetSecimi(item.rozet_id)}
                              style={{
                                textAlign: 'left',
                                border: aktif ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '18px',
                                background: aktif ? 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))' : 'rgba(255,255,255,0.03)',
                                padding: '16px',
                                display: 'grid',
                                gap: '10px',
                                cursor: 'pointer',
                                color: '#fff',
                                fontFamily: 'inherit',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '18px' }}>{item.rozet_tanimlari?.ikon}</span>
                                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>{item.rozet_tanimlari?.isim}</span>
                                </span>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    minHeight: '24px',
                                    padding: '0 10px',
                                    borderRadius: '999px',
                                    background: aktif ? '#fff' : 'rgba(255,255,255,0.05)',
                                    color: aktif ? '#111' : 'rgba(255,255,255,0.68)',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    letterSpacing: '0.8px',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {aktif ? 'Vitrinde' : 'Seç'}
                                </span>
                              </div>
                              <div style={{ color: 'rgba(255,255,255,0.58)', fontSize: '12px', lineHeight: 1.6 }}>
                                {item.rozet_tanimlari?.aciklama || 'Bu rozet profil vitrininde küçük başarı işareti olarak görünür.'}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{ minHeight: '54px', display: 'flex', alignItems: 'center', padding: '0 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.48)', fontSize: '13px' }}>
                        Henüz açılmış bir rozetin yok. Rozet kazandıkça bu alandan vitrinde göstereceklerini seçebileceksin.
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      position: 'sticky',
                      bottom: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      flexWrap: 'wrap',
                      padding: '16px 18px',
                      borderRadius: '18px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(8,8,8,0.92)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 18px 40px rgba(0,0,0,0.28)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>Değişiklikleri Kaydet</div>
                      <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '12px', lineHeight: 1.6, marginTop: '4px' }}>
                        Profil bilgileri, vitrin seçimleri ve gizlilik ayarları tek seferde kaydedilir.
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={yukleniyor}
                      style={{
                        minHeight: '48px',
                        minWidth: '220px',
                        padding: '0 20px',
                        background: '#fff',
                        color: '#111',
                        border: 'none',
                        borderRadius: '14px',
                        fontSize: '13px',
                        fontWeight: 800,
                        fontFamily: 'inherit',
                        cursor: yukleniyor ? 'not-allowed' : 'pointer',
                        letterSpacing: '0.7px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {yukleniyor ? 'Kaydediliyor...' : 'Tüm Değişiklikleri Kaydet'}
                    </button>
                  </div>
                </div>
                </form>
              </div>

              <div style={{ display: 'grid', gap: '24px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '26px', display: 'grid', gap: '18px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Profil Vitrini</div>
                  {renderOneCikanSerilerEditor()}
                  {renderVitrinAyarlariEditor()}
                </div>

                <form onSubmit={handleSifreDegistir}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '26px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Hesap Güvenliği</div>
                    <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '12px', lineHeight: 1.7 }}>
                      Şifre değiştirirken mevcut şifreni doğruluyoruz. E-posta adresi değişimi ise onay bağlantısı tamamlanmadan uygulanmaz.
                    </div>
                    {captchaActive && (
                      <div style={{ padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <TurnstileWidget
                          ref={securityCaptchaRef}
                          action="profile-security"
                          onVerify={setSecurityCaptchaToken}
                          onExpire={() => setSecurityCaptchaToken('')}
                        />
                      </div>
                    )}
                    <div>
                      <label style={L}>Mevcut Şifre</label>
                      <input type="password" value={sifreForm.mevcut} onChange={e => setSifreForm(f => ({ ...f, mevcut: e.target.value }))} placeholder="Şu an kullandığın şifre" style={I} />
                    </div>
                    <div>
                      <label style={L}>Yeni Şifre</label>
                      <input type="password" value={sifreForm.yeni} onChange={e => setSifreForm(f => ({ ...f, yeni: e.target.value }))} placeholder="En az 10 karakter, büyük/küçük harf ve rakam" style={I} />
                    </div>
                    <div>
                      <label style={L}>Şifre Tekrar</label>
                      <input type="password" value={sifreForm.tekrar} onChange={e => setSifreForm(f => ({ ...f, tekrar: e.target.value }))} placeholder="Yeni şifreyi tekrar gir" style={I} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.7 }}>
                      Güçlü bir şifre için en az 10 karakter, 1 büyük harf, 1 küçük harf ve 1 rakam kullan.
                    </div>
                    <button type="submit" disabled={yukleniyor} style={{ minHeight: '52px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: '14px', fontSize: '13px', fontWeight: 800, fontFamily: 'inherit', cursor: yukleniyor ? 'not-allowed' : 'pointer', letterSpacing: '0.7px', textTransform: 'uppercase' }}>
                      Şifreyi Güncelle
                    </button>
                  </div>
                </form>

                <form onSubmit={handleEmailDegistir}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '26px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>E-posta Değiştir</div>
                    <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '12px', lineHeight: 1.7 }}>
                      Giriş zorunluluğu için e-posta onayı istemiyoruz; ama e-posta adresini değiştirmek istediğinde güvenli onay bağlantısı şart.
                    </div>
                    <div>
                      <label style={L}>Mevcut E-posta</label>
                      <input value={sessionUser?.email || ''} readOnly style={{ ...I, color: 'rgba(255,255,255,0.56)' }} />
                    </div>
                    <div>
                      <label style={L}>Yeni E-posta</label>
                      <input type="email" value={emailForm.yeni} onChange={e => setEmailForm(f => ({ ...f, yeni: e.target.value }))} placeholder="yeniadres@email.com" style={I} />
                    </div>
                    <div>
                      <label style={L}>Mevcut Şifre</label>
                      <input type="password" value={emailForm.sifre} onChange={e => setEmailForm(f => ({ ...f, sifre: e.target.value }))} placeholder="Kimlik doğrulaması için şifren" style={I} />
                    </div>
                    <button type="submit" disabled={yukleniyor} style={{ minHeight: '52px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: '14px', fontSize: '13px', fontWeight: 800, fontFamily: 'inherit', cursor: yukleniyor ? 'not-allowed' : 'pointer', letterSpacing: '0.7px', textTransform: 'uppercase' }}>
                      E-posta Değişimini Başlat
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 1100px) {
          .edit-hero-grid,
          .edit-bottom-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 760px) {
          .edit-title-wrap {
            grid-template-columns: 1fr !important;
          }
          .edit-avatar-row {
            align-items: flex-start !important;
          }
        }
      `}</style>

      <Footer />
    </>
  )
}
