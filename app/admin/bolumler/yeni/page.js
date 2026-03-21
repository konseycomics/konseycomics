'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

const INPUT_STYLE = {
  width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid #2a2a2a',
  borderRadius: '8px', color: '#ddd', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
}
const LABEL_STYLE = { display: 'block', color: '#888', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }

export default function YeniBolum() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [seriler, setSeriler] = useState([])
  const [ekip, setEkip] = useState([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState('')
  const [form, setForm] = useState({
    seri_id: searchParams.get('seri_id') || '',
    sayi: '',
    baslik: '',
    kapak_url: '',
    drive_link: '',
    indirme_link: '',
    cevirmen_id: '',
    balonlama_id: '',
    grafik_id: ''
  })

  useEffect(() => {
    const yukle = async () => {
      const [{ data: ser }, { data: ek }] = await Promise.all([
        supabase.from('seriler').select('id, baslik').order('baslik'),
        supabase.from('ekip').select('id, isim').order('isim')
      ])
      setSeriler(ser || [])
      setEkip(ek || [])

      if (form.seri_id) {
        const { data: sonBolum } = await supabase
          .from('bolumler')
          .select('sayi')
          .eq('seri_id', form.seri_id)
          .order('sayi', { ascending: false })
          .limit(1)
          .single()
        if (sonBolum) setForm(f => ({ ...f, sayi: sonBolum.sayi + 1 }))
      }
    }
    yukle()
  }, [])

  const handleSeriChange = async (seriId) => {
    setForm(f => ({ ...f, seri_id: seriId, sayi: '' }))
    if (seriId) {
      const { data: sonBolum } = await supabase
        .from('bolumler')
        .select('sayi')
        .eq('seri_id', seriId)
        .order('sayi', { ascending: false })
        .limit(1)
        .single()
      if (sonBolum) setForm(f => ({ ...f, seri_id: seriId, sayi: sonBolum.sayi + 1 }))
    }
  }

  const kaydet = async (e) => {
    e.preventDefault()
    if (!form.seri_id) { setHata('Seri seçmelisin!'); return }
    if (!form.sayi) { setHata('Bölüm sayısı zorunlu!'); return }
    if (!form.baslik) { setHata('Başlık zorunlu!'); return }
    if (!form.drive_link) { setHata('Google Drive linki zorunlu!'); return }

    setYukleniyor(true)
    setHata('')

    const { error } = await supabase.from('bolumler').insert({
      seri_id: form.seri_id,
      sayi: parseInt(form.sayi),
      baslik: form.baslik,
      kapak_url: form.kapak_url || null,
      drive_link: form.drive_link,
      indirme_link: form.indirme_link || null,
      cevirmen_id: form.cevirmen_id || null,
      balonlama_id: form.balonlama_id || null,
      grafik_id: form.grafik_id || null,
      goruntuleme_sayisi: 0
    })

    if (error) {
      setHata(error.message.includes('unique') ? 'Bu bölüm numarası zaten var!' : error.message)
      setYukleniyor(false)
      return
    }

    router.push('/admin/bolumler')
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <Link href="/admin/bolumler" style={{ textDecoration: 'none', color: '#555', fontSize: '20px' }}>←</Link>
        <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, margin: 0 }}>Yeni Bölüm Ekle</h1>
      </div>

      {hata && (
        <div style={{ background: '#2e1a1a', border: '1px solid #e63946', borderRadius: '8px', padding: '12px 16px', color: '#e63946', fontSize: '14px', marginBottom: '20px' }}>
          ⚠️ {hata}
        </div>
      )}

      <form onSubmit={kaydet}>
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '28px', marginBottom: '16px' }}>
          <h2 style={{ color: '#ddd', fontSize: '16px', fontWeight: 600, margin: '0 0 20px 0' }}>Bölüm Bilgileri</h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={LABEL_STYLE}>Seri *</label>
            <select style={{ ...INPUT_STYLE, cursor: 'pointer' }} value={form.seri_id} onChange={e => handleSeriChange(e.target.value)} required>
              <option value="">— Seri Seç —</option>
              {seriler.map(s => <option key={s.id} value={s.id}>{s.baslik}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={LABEL_STYLE}>Bölüm Sayısı *</label>
              <input type="number" style={INPUT_STYLE} value={form.sayi}
                onChange={e => setForm(f => ({ ...f, sayi: e.target.value }))} min={1} required />
            </div>
            <div>
              <label style={LABEL_STYLE}>Başlık *</label>
              <input style={INPUT_STYLE} value={form.baslik}
                onChange={e => setForm(f => ({ ...f, baslik: e.target.value }))}
                placeholder={`Bölüm ${form.sayi || '?'}`} required />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={LABEL_STYLE}>Google Drive Linki * <span style={{ color: '#555', fontWeight: 400 }}>(okuyucuların göreceği link)</span></label>
            <input style={INPUT_STYLE} value={form.drive_link}
              onChange={e => setForm(f => ({ ...f, drive_link: e.target.value }))}
              placeholder="https://drive.google.com/..." required />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={LABEL_STYLE}>İndirme Linki <span style={{ color: '#555', fontWeight: 400 }}>(opsiyonel)</span></label>
            <input style={INPUT_STYLE} value={form.indirme_link}
              onChange={e => setForm(f => ({ ...f, indirme_link: e.target.value }))}
              placeholder="https://..." />
          </div>

          <div style={{ marginBottom: '0' }}>
            <label style={LABEL_STYLE}>Kapak Görseli URL <span style={{ color: '#555', fontWeight: 400 }}>(opsiyonel)</span></label>
            <input style={INPUT_STYLE} value={form.kapak_url}
              onChange={e => setForm(f => ({ ...f, kapak_url: e.target.value }))}
              placeholder="https://..." />
            {form.kapak_url && (
              <img src={form.kapak_url} alt="Önizleme" style={{ width: '80px', height: '110px', objectFit: 'cover', borderRadius: '6px', marginTop: '10px' }}
                onError={e => e.target.style.display = 'none'} />
            )}
          </div>
        </div>

        {ekip.length > 0 && (
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '28px', marginBottom: '16px' }}>
            <h2 style={{ color: '#ddd', fontSize: '16px', fontWeight: 600, margin: '0 0 20px 0' }}>Ekip <span style={{ color: '#555', fontWeight: 400, fontSize: '13px' }}>(opsiyonel)</span></h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {[
                { key: 'cevirmen_id', label: 'Çevirmen' },
                { key: 'balonlama_id', label: 'Balonlama' },
                { key: 'grafik_id', label: 'Grafik' }
              ].map(({ key, label }) => (
                <div key={key}>
                  <label style={LABEL_STYLE}>{label}</label>
                  <select style={{ ...INPUT_STYLE, cursor: 'pointer' }} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}>
                    <option value="">— Seç —</option>
                    {ekip.map(e => <option key={e.id} value={e.id}>{e.isim}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Link href="/admin/bolumler" style={{
            textDecoration: 'none', padding: '10px 24px', background: '#1a1a1a',
            border: '1px solid #333', borderRadius: '8px', color: '#888', fontSize: '14px'
          }}>İptal</Link>
          <button type="submit" disabled={yukleniyor} style={{
            padding: '10px 28px', background: yukleniyor ? '#555' : '#e63946', border: 'none',
            borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: yukleniyor ? 'not-allowed' : 'pointer'
          }}>
            {yukleniyor ? 'Kaydediliyor...' : 'Bölüm Ekle'}
          </button>
        </div>
      </form>
    </div>
  )
}
