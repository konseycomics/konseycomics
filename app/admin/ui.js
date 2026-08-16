'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export const ADMIN_BG = '#050505'
export const PANEL_BG = 'rgba(255,255,255,0.04)'
export const PANEL_BG_STRONG = 'rgba(255,255,255,0.06)'
export const PANEL_BORDER = '1px solid rgba(255,255,255,0.08)'
export const TEXT_SUBTLE = 'rgba(255,255,255,0.56)'
export const TEXT_SOFT = 'rgba(255,255,255,0.72)'
export const ACCENT = '#f4efe7'
export const PURPLE = '#8b5cf6'

export const LB = { fontSize: '11px', fontWeight: 700, letterSpacing: '0.9px', textTransform: 'uppercase', color: TEXT_SUBTLE, marginBottom: '8px' }
export const I = { width: '100%', padding: '11px 13px', background: PANEL_BG, border: PANEL_BORDER, borderRadius: '12px', fontSize: '13px', color: '#fff', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
export const S = { width: '100%', padding: '11px 13px', background: PANEL_BG, border: PANEL_BORDER, borderRadius: '12px', fontSize: '13px', color: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' }
export const BP = { padding: '11px 18px', background: ACCENT, color: '#111', border: 'none', borderRadius: '999px', fontSize: '12px', fontWeight: 800, letterSpacing: '0.5px', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase' }
export const BS = { padding: '8px 12px', background: PANEL_BG, border: PANEL_BORDER, borderRadius: '999px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', color: '#fff' }
export const BD = { padding: '8px 12px', background: 'rgba(220, 38, 38, 0.12)', border: '1px solid rgba(220, 38, 38, 0.32)', borderRadius: '999px', color: '#fca5a5', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }
export const CARD = { background: PANEL_BG, border: PANEL_BORDER, borderRadius: '24px', boxShadow: '0 24px 80px rgba(0,0,0,0.28)' }
export const CARD_INNER = { background: PANEL_BG_STRONG, border: PANEL_BORDER, borderRadius: '18px' }
export const TABLE_WRAP = { background: PANEL_BG, border: PANEL_BORDER, borderRadius: '20px', overflow: 'hidden' }
export const TABLE_ROW = { background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.06)' }

export function SectionTitle({ eyebrow, title, description, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
      <div>
        {eyebrow && <div style={{ ...LB, marginBottom: '10px' }}>{eyebrow}</div>}
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '52px', lineHeight: 0.9, letterSpacing: '0.02em', color: '#fff', marginBottom: description ? '8px' : 0 }}>{title}</div>
        {description && <div style={{ maxWidth: '60ch', fontSize: '14px', color: TEXT_SOFT, lineHeight: 1.7 }}>{description}</div>}
      </div>
      {action}
    </div>
  )
}

export function Surface({ children, style = {} }) {
  return <div style={{ ...CARD_INNER, padding: '22px', ...style }}>{children}</div>
}

export function Msg({ text }) {
  if (!text) return null
  const err = text.includes('❌')
  return <div style={{ background: err ? '#fff0f0' : '#f0fdf4', border: `1px solid ${err ? '#fecaca' : '#bbf7d0'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: err ? '#dc2626' : '#166534' }}>{text}</div>
}

export async function uploadAdminImage(file, { bucket, prefix }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Oturum bulunamadı.')

  const formData = new FormData()
  formData.append('file', file)
  formData.append('bucket', bucket)
  formData.append('prefix', prefix)

  const res = await fetch('/api/media/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
  })

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(payload.error || 'Görsel yüklenemedi.')
  return payload.url
}

export function ResimYukle({ onizleme, onChange, bucket = 'kapaklar', width = '100px', height = '133px' }) {
  const [yukleniyor, setYukleniyor] = useState(false)

  async function handle(e) {
    const file = e.target.files[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setYukleniyor(true)
    try {
      const url = await uploadAdminImage(file, { bucket, prefix: 'resim' })
      onChange(url, preview)
    } catch (error) {
      alert(error.message || 'Görsel yüklenemedi.')
      URL.revokeObjectURL(preview)
    } finally {
      setYukleniyor(false)
      e.target.value = ''
    }
  }

  return (
    <label style={{ width, height, border: '1px dashed rgba(255,255,255,0.18)', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: PANEL_BG_STRONG, flexShrink: 0 }}>
      {yukleniyor ? (
        <span style={{ fontSize: '12px', color: TEXT_SUBTLE, fontWeight: 700 }}>Yükleniyor</span>
      ) : onizleme ? (
        <img src={onizleme} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: '28px', color: TEXT_SUBTLE }}>+</span>
      )}
      <input type="file" accept="image/*" onChange={handle} disabled={yukleniyor} style={{ display: 'none' }} />
    </label>
  )
}

export function CokluResimYukle({ gorseller = [], onChange, bucket = 'kapaklar' }) {
  const [yukleniyor, setYukleniyor] = useState(false)
  const [ilerleme, setIlerleme] = useState({ tamamlanan: 0, toplam: 0 })
  const [surukleniyor, setSurukleniyor] = useState(false)

  async function dosyalariYukle(gelenDosyalar) {
    const siralayici = new Intl.Collator('tr', { numeric: true, sensitivity: 'base' })
    const files = Array.from(gelenDosyalar || [])
      .filter(file => String(file.type || '').startsWith('image/'))
      .sort((a, b) => siralayici.compare(a.webkitRelativePath || a.name, b.webkitRelativePath || b.name))
    if (files.length === 0) return

    setYukleniyor(true)
    setIlerleme({ tamamlanan: 0, toplam: files.length })
    try {
      const yuklenenler = new Array(files.length)
      let siradaki = 0
      async function worker() {
        while (siradaki < files.length) {
          const index = siradaki
          siradaki += 1
          yuklenenler[index] = await uploadAdminImage(files[index], { bucket, prefix: 'sayfa' })
          setIlerleme(current => ({ ...current, tamamlanan: current.tamamlanan + 1 }))
        }
      }
      await Promise.all(Array.from({ length: Math.min(3, files.length) }, () => worker()))
      onChange([...(gorseller || []), ...yuklenenler.filter(Boolean)])
    } catch (error) {
      alert(error.message || 'Görseller yüklenemedi.')
    } finally {
      setYukleniyor(false)
      setSurukleniyor(false)
    }
  }

  async function handle(e) {
    await dosyalariYukle(e.target.files)
    e.target.value = ''
  }

  async function handleDrop(e) {
    e.preventDefault()
    await dosyalariYukle(e.dataTransfer.files)
  }

  function kaldir(index) {
    onChange(gorseller.filter((_, i) => i !== index))
  }

  function tasi(index, direction) {
    const hedef = index + direction
    if (hedef < 0 || hedef >= gorseller.length) return
    const yeni = [...gorseller]
    const gecici = yeni[index]
    yeni[index] = yeni[hedef]
    yeni[hedef] = gecici
    onChange(yeni)
  }

  return (
    <div>
      <div
        onDragEnter={e => { e.preventDefault(); setSurukleniyor(true) }}
        onDragOver={e => e.preventDefault()}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setSurukleniyor(false) }}
        onDrop={handleDrop}
        style={{ padding:'18px', border:`1px dashed ${surukleniyor ? '#d6ad4d' : 'rgba(255,255,255,0.18)'}`, borderRadius:'14px', background:surukleniyor ? 'rgba(214,173,77,0.08)' : PANEL_BG_STRONG }}
      >
        <div style={{ display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap' }}>
          <label style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', minHeight:'38px', padding:'0 14px', border:PANEL_BORDER, borderRadius:'10px', cursor:'pointer', background:'rgba(255,255,255,0.07)', fontSize:'12px', fontWeight:700, color:'#fff' }}>
            Görselleri Seç
            <input type="file" accept="image/*" multiple onChange={handle} disabled={yukleniyor} style={{ display:'none' }} />
          </label>
          <label style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', minHeight:'38px', padding:'0 14px', border:PANEL_BORDER, borderRadius:'10px', cursor:'pointer', background:'rgba(255,255,255,0.04)', fontSize:'12px', fontWeight:700, color:'#fff' }}>
            Klasör Seç
            <input type="file" accept="image/*" multiple webkitdirectory="" directory="" onChange={handle} disabled={yukleniyor} style={{ display:'none' }} />
          </label>
          <span style={{ color:TEXT_SUBTLE,fontSize:'12px' }}>{yukleniyor ? `${ilerleme.tamamlanan} / ${ilerleme.toplam} yüklendi` : 'Sürükleyip bırak'}</span>
        </div>
        {yukleniyor && <div style={{ height:'4px',marginTop:'14px',overflow:'hidden',borderRadius:'4px',background:'rgba(255,255,255,0.08)' }}><div style={{ width:`${ilerleme.toplam ? (ilerleme.tamamlanan / ilerleme.toplam) * 100 : 0}%`,height:'100%',background:'#d6ad4d',transition:'width 180ms ease' }} /></div>}
      </div>
      <div style={{ fontSize:'11px', color:TEXT_SUBTLE, marginTop:'9px', marginBottom:'12px' }}>Dosya adlarına göre sıralanır: 1, 2, 3…</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:'12px' }}>
        {gorseller.map((url, index) => (
          <div key={`${url}-${index}`} style={{ border:PANEL_BORDER, borderRadius:'14px', overflow:'hidden', background:PANEL_BG_STRONG }}>
            <div style={{ aspectRatio:'3 / 4', background:'rgba(255,255,255,0.06)' }}>
              <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            </div>
            <div style={{ padding:'8px' }}>
              <div style={{ fontSize:'11px', color:TEXT_SUBTLE, marginBottom:'8px' }}>Sayfa {index + 1}</div>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                <button type="button" onClick={() => tasi(index, -1)} style={BS}>↑</button>
                <button type="button" onClick={() => tasi(index, 1)} style={BS}>↓</button>
                <button type="button" onClick={() => kaldir(index)} style={BD}>Sil</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AramaSecim({ liste, secili, onChange, placeholder }) {
  const [ara, setAra] = useState('')
  const [acik, setAcik] = useState(false)
  const ref = useRef()
  useEffect(() => {
    function kapat(e) { if (ref.current && !ref.current.contains(e.target)) setAcik(false) }
    document.addEventListener('mousedown', kapat)
    return () => document.removeEventListener('mousedown', kapat)
  }, [])
  const filtrelendi = liste.filter(x => x.isim.toLowerCase().includes(ara.toLowerCase()) && !secili.includes(x.id))
  const seciliOlanlar = liste.filter(x => secili.includes(x.id))
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px', background: PANEL_BG_STRONG, border: PANEL_BORDER, borderRadius: '12px', minHeight: '42px', cursor: 'text' }} onClick={() => setAcik(true)}>
        {seciliOlanlar.map(x => (
          <span key={x.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: '100px', padding: '3px 10px', fontSize: '12px', border:'1px solid rgba(255,255,255,0.08)' }}>
            {x.isim}<span onClick={e => { e.stopPropagation(); onChange(secili.filter(id => id !== x.id)) }} style={{ cursor: 'pointer', opacity: 0.6 }}>×</span>
          </span>
        ))}
        <input value={ara} onChange={e => setAra(e.target.value)} onFocus={() => setAcik(true)} placeholder={seciliOlanlar.length === 0 ? placeholder : ''} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontFamily: 'inherit', minWidth: '120px', flex: 1, color:'#fff' }} />
      </div>
      {acik && filtrelendi.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: PANEL_BG, border: PANEL_BORDER, borderRadius: '12px', boxShadow: '0 18px 40px rgba(0,0,0,0.32)', zIndex: 50, maxHeight: '200px', overflowY: 'auto', marginTop: '6px' }}>
          {filtrelendi.map(x => (
            <div key={x.id} onClick={() => { onChange([...secili, x.id]); setAra('') }} style={{ padding: '10px 14px', fontSize: '13px', cursor: 'pointer', color:'#fff' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{x.isim}</div>
          ))}
        </div>
      )}
    </div>
  )
}

export function AramaSecimTek({ liste, secili, onChange, placeholder }) {
  const [ara, setAra] = useState('')
  const [acik, setAcik] = useState(false)
  const ref = useRef()
  useEffect(() => {
    function kapat(e) { if (ref.current && !ref.current.contains(e.target)) setAcik(false) }
    document.addEventListener('mousedown', kapat)
    return () => document.removeEventListener('mousedown', kapat)
  }, [])
  const seciliOlan = liste.find(x => x.id === secili)
  const filtrelendi = liste.filter(x => x.isim.toLowerCase().includes(ara.toLowerCase()))
  return (
    <div ref={ref} style={{ position: 'relative', maxWidth: '320px' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: PANEL_BG_STRONG, border: PANEL_BORDER, borderRadius: '12px', cursor: 'pointer', gap: '8px' }} onClick={() => { setAcik(!acik); setAra('') }}>
        {acik ? <input autoFocus value={ara} onChange={e => { setAra(e.target.value); setAcik(true) }} onClick={e => e.stopPropagation()} placeholder="Ara..." style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontFamily: 'inherit', flex: 1, color:'#fff' }} />
          : <span style={{ fontSize: '13px', flex: 1, color: seciliOlan ? '#fff' : TEXT_SUBTLE }}>{seciliOlan ? seciliOlan.isim : placeholder}</span>}
        <span style={{ color: TEXT_SUBTLE, fontSize: '10px' }}>▼</span>
      </div>
      {acik && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: PANEL_BG, border: PANEL_BORDER, borderRadius: '12px', boxShadow: '0 18px 40px rgba(0,0,0,0.32)', zIndex: 50, maxHeight: '240px', overflowY: 'auto', marginTop: '6px' }}>
          {filtrelendi.length === 0 && <div style={{ padding: '12px 14px', fontSize: '13px', color: TEXT_SUBTLE }}>Sonuç yok</div>}
          {filtrelendi.map(x => (
            <div key={x.id} onClick={() => { onChange(x.id); setAcik(false); setAra('') }} style={{ padding: '10px 14px', fontSize: '13px', cursor: 'pointer', background: secili === x.id ? 'rgba(139,92,246,0.14)' : 'transparent', fontWeight: secili === x.id ? 600 : 400, color:'#fff' }} onMouseEnter={e => e.currentTarget.style.background = secili === x.id ? 'rgba(139,92,246,0.14)' : 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = secili === x.id ? 'rgba(139,92,246,0.14)' : 'transparent'}>{x.isim}</div>
          ))}
        </div>
      )}
    </div>
  )
}
