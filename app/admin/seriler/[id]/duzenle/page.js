'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

const INPUT_STYLE = {
  width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid #2a2a2a',
  borderRadius: '8px', color: '#ddd', fontSize: '14px', outline: 'none',
  boxSizing: 'border-box'
}
const LABEL_STYLE = { display: 'block', color: '#888', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }

export default function SeriDuzenle() {
  const router = useRouter()
  const { id } = useParams()
  const [kategoriler, setKategoriler] = useState([])
  const [turler, setTurler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState('')
  const [basari, setBasari] = useState('')
  const [form, setForm] = useState(null)

  useEffect(() => {
    const yukle = async () => {
      const [{ data: seri }, { data: kat }, { data: tur }] = await Promise.all([
        supabase.from('seriler').select('*').eq('id', id).single(),
        supabase.from('kategoriler').select('id, isim').order('isim'),
        supabase.from('turler').select('id, isim').order('isim')
      ])
      if (seri) setForm({
        baslik: seri.baslik || '',
        slug: seri.slug || '',
        ozet: seri.ozet || '',
        kapak_url: seri.kapak_url || '',
        durum: seri.durum || 'devam',
        kategori_id: seri.kategori_id || '',
        yil: seri.yil || new Date().getFullYear(),
        turler: seri.turler || []
      })
      setKategoriler(kat || [])
      setTurler(tur || [])
      setYukleniyor(false)
    }
    yukle()
  }, [id])

  const turToggle = (turId) => {
    setForm(f => ({
      ...f,
      turler: f.turler.includes(turId)
        ? f.turler.filter(t => t !== turId)
        : [...f.turler, turId]
    }))
  }

  const kaydet = async (e) => {
    e.preventDefault()
    setKaydediliyor(true)
    setHata('')
    setBasari('')

    const { error } = await supabase.from('seriler').update({
      baslik: form.baslik,
      slug: form.slug,
      ozet: form.ozet || null,
      kapak_url: form.kapak_url || null,
      durum: form.durum,
      kategori_id: form.kategori_id || null,
      yil: form.yil || null,
      turler: form.turler.length > 0 ? form.turler : null
    }).eq('id', id)

    if (error) {
      setHata(error.message)
    } else {
      setBasari('Değişiklikler kaydedildi!')
      setTimeout(() => setBasari(''), 3000)
    }
    setKaydediliyor(false)
  }

  if (yukleniyor) return <div style={{ color: '#555', padding: '40px' }}>Yükleniyor...</div>
  if (!form) return <div style={{ color: '#e63946', padding: '40px' }}>Seri bulunamadı</div>

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <Link href="/admin/seriler" style={{ textDecoration: 'none', color: '#555', fontSize: '20px' }}>←</Link>
        <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, margin: 0 }}>Seri Düzenle</h1>
      </div>

      {hata && (
        <div style={{ background: '#2e1a1a', border: '1px solid #e63946', borderRadius: '8px', padding: '12px 16px', color: '#e63946', fontSize: '14px', marginBottom: '20px' }}>
          ⚠️ {hata}
        </div>
      )}
      {basari && (
        <div style={{ background: '#1a2e1a', border: '1px solid #4caf50', borderRadius: '8px', padding: '12px 16px', color: '#4caf50', fontSize: '14px', marginBottom: '20px' }}>
          ✅ {basari}
        </div>
      )}

      <form onSubmit={kaydet}>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '28px', marginBottom: '16px' }}>
          <h2 style={{ color: '#ddd', fontSize: '16px', fontWeight: 600, margin: '0 0 20px 0' }}>Temel Bilgiler</h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={LABEL_STYLE}>Başlık *</label>
            <input style={INPUT_STYLE} value={form.baslik} onChange={e => setForm(f => ({ ...f, baslik: e.target.value }))} required />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={LABEL_STYLE}>Slug</label>
            <input style={INPUT_STYLE} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
            <div style={{ color: '#555', fontSize: '12px', marginTop: '4px' }}>
              konseycomics.vercel.app/seri/<strong style={{ color: '#888' }}>{form.slug}</strong>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={LABEL_STYLE}>Özet</label>
            <textarea style={{ ...INPUT_STYLE, minHeight: '100px', resize: 'vertical' }}
              value={form.ozet} onChange={e => setForm(f => ({ ...f, ozet: e.target.value }))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={LABEL_STYLE}>Durum</label>
              <select style={{ ...INPUT_STYLE, cursor: 'pointer' }} value={form.durum} onChange={e => setForm(f => ({ ...f, durum: e.target.value }))}>
                <option value="devam">Devam Ediyor</option>
                <option value="tamamlandi">Tamamlandı</option>
                <option value="beklemede">Beklemede</option>
                <option value="iptal">İptal Edildi</option>
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>Yıl</label>
              <input type="number" style={INPUT_STYLE} value={form.yil}
                onChange={e => setForm(f => ({ ...f, yil: parseInt(e.target.value) }))} min={1900} max={2099} />
            </div>
          </div>
        </div>

        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '28px', marginBottom: '16px' }}>
          <h2 style={{ color: '#ddd', fontSize: '16px', fontWeight: 600, margin: '0 0 20px 0' }}>Görsel & Kategori</h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={LABEL_STYLE}>Kapak Görseli URL</label>
            <input style={INPUT_STYLE} value={form.kapak_url} onChange={e => setForm(f => ({ ...f, kapak_url: e.target.value }))} placeholder="https://..." />
            {form.kapak_url && (
              <img src={form.kapak_url} alt="Kapak" style={{ width: '80px', height: '110px', objectFit: 'cover', borderRadius: '6px', marginTop: '10px' }}
                onError={e => e.target.style.display = 'none'} />
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={LABEL_STYLE}>Kategori</label>
            <select style={{ ...INPUT_STYLE, cursor: 'pointer' }} value={form.kategori_id} onChange={e => setForm(f => ({ ...f, kategori_id: e.target.value }))}>
              <option value="">— Seç —</option>
              {kategoriler.map(k => <option key={k.id} value={k.id}>{k.isim}</option>)}
            </select>
          </div>

          <div>
            <label style={LABEL_STYLE}>Türler</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {turler.map(t => (
                <button type="button" key={t.id} onClick={() => turToggle(t.id)} style={{
                  padding: '6px 12px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                  border: '1px solid',
                  background: form.turler.includes(t.id) ? '#e63946' : '#1a1a1a',
                  borderColor: form.turler.includes(t.id) ? '#e63946' : '#333',
                  color: form.turler.includes(t.id) ? '#fff' : '#888',
                  transition: 'all 0.15s'
                }}>
                  {t.isim}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Link href="/admin/seriler" style={{
            textDecoration: 'none', padding: '10px 24px', background: '#1a1a1a',
            border: '1px solid #333', borderRadius: '8px', color: '#888', fontSize: '14px'
          }}>İptal</Link>
          <button type="submit" disabled={kaydediliyor} style={{
            padding: '10px 28px', background: kaydediliyor ? '#555' : '#e63946', border: 'none',
            borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: kaydediliyor ? 'not-allowed' : 'pointer'
          }}>
            {kaydediliyor ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
                  }
