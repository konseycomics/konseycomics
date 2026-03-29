'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { trackSeriesRatingAndUnlock } from '../lib/unvanClient'

export default function SeriPuan({ seriId, ortalama, puanSayisi }) {
  const [benimPuan, setBenimPuan] = useState(0)
  const [hover, setHover] = useState(0)
  const [kullanici, setKullanici] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [acilanUnvanlar, setAcilanUnvanlar] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      setKullanici(session.user)
      supabase.from('seri_puanlari').select('puan').eq('kullanici_id', session.user.id).eq('seri_id', seriId).single()
        .then(({ data }) => { if (data) setBenimPuan(data.puan) })
    })
  }, [seriId])

  async function puanVer(p) {
    if (!kullanici) return
    setYukleniyor(true)
    await supabase.from('seri_puanlari').upsert([{ kullanici_id: kullanici.id, seri_id: seriId, puan: p, updated_at: new Date().toISOString() }])
    setBenimPuan(p)
    const unlocked = await trackSeriesRatingAndUnlock({ userId: kullanici.id, seriId })
    if (unlocked.length > 0) {
      setAcilanUnvanlar(unlocked)
      window.setTimeout(() => setAcilanUnvanlar([]), 4200)
    }
    setYukleniyor(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {acilanUnvanlar.length > 0 && (
        <div style={{ display: 'grid', gap: '8px', marginBottom: '8px' }}>
          {acilanUnvanlar.map((unvan) => (
            <div
              key={`${unvan.unvanId}-${unvan.kod}`}
              style={{
                borderRadius: '14px',
                padding: '10px 12px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
              }}
            >
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                Yeni Unvan
              </div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', lineHeight: 1, color: '#fff' }}>
                {unvan.isim}
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px', fontWeight: 700 }}>{ortalama > 0 ? ortalama : '—'}</span>
        <div>
          <div style={{ display: 'flex', gap: '2px' }}>
            {[1,2,3,4,5].map(s => (
              <span key={s} style={{ fontSize: '14px', color: (ortalama || 0) >= s * 2 ? '#f59e0b' : '#e8e6e0' }}>★</span>
            ))}
          </div>
          {puanSayisi > 0 && <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>{puanSayisi} değerlendirme</div>}
        </div>
      </div>

      {kullanici && (
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            {benimPuan > 0 ? `Puanın: ${benimPuan}/10` : 'Puanla:'}
          </div>
          <div style={{ display: 'flex', gap: '3px' }}>
            {[1,2,3,4,5,6,7,8,9,10].map(p => (
              <button key={p} onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(0)} onClick={() => puanVer(p)} disabled={yukleniyor}
                style={{ width: '22px', height: '22px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, transition: 'all 0.1s',
                  background: (hover || benimPuan) >= p ? '#f59e0b' : '#f0ede8',
                  color: (hover || benimPuan) >= p ? '#fff' : 'var(--text-muted)',
                }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
