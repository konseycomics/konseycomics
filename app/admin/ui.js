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

export function ResimYukle({ onizleme, onChange, bucket = 'kapaklar', width = '100px', height = '133px' }) {
  async function handle(e) {
    const file = e.target.files[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    const path = `resim-${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      onChange(data.publicUrl, preview)
    }
  }

  return (
    <label style={{ width, height, border: '1px dashed rgba(255,255,255,0.18)', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: PANEL_BG_STRONG, flexShrink: 0 }}>
      {onizleme ? <img src={onizleme} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '28px', color: TEXT_SUBTLE }}>+</span>}
      <input type="file" accept="image/*" onChange={handle} style={{ display: 'none' }} />
    </label>
  )
}

export function CokluResimYukle({ gorseller = [], onChange, bucket = 'kapaklar' }) {
  async function handle(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const yuklenenler = await Promise.all(files.map(async (file) => {
      const path = `sayfa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${file.name.split('.').pop()}`
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
      if (error) return null
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      return data.publicUrl
    }))

    onChange([...(gorseller || []), ...yuklenenler.filter(Boolean)])
    e.target.value = ''
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
      <label style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'10px 16px', border:'1px dashed rgba(255,255,255,0.18)', borderRadius:'12px', cursor:'pointer', background:PANEL_BG_STRONG, fontSize:'13px', fontWeight:600, color:'#fff' }}>
        + Sayfa Gorselleri Yukle
        <input type="file" accept="image/*" multiple onChange={handle} style={{ display:'none' }} />
      </label>
      <div style={{ fontSize:'12px', color:TEXT_SUBTLE, lineHeight:1.6, marginTop:'10px', marginBottom:'12px' }}>
        Gorselleri yukleme sirasi okuyucudaki okuma sirasi olur. Sonradan asagi yukari tasiyabilirsin.
      </div>
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
