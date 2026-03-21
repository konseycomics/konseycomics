'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

export default function AdminSeriler() {
  const [seriler, setSeriler] = useState([])
  const [aramaMetni, setAramaMetni] = useState('')
  const [yukleniyor, setYukleniyor] = useState(true)
  const [silOnayi, setSilOnayi] = useState(null)

  const yukle = async () => {
    setYukleniyor(true)
    const { data } = await supabase
      .from('seriler')
      .select('id, baslik, slug, kapak_url, durum, goruntuleme_sayisi, ortalama_puan, created_at')
      .order('created_at', { ascending: false })
    setSeriler(data || [])
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [])

  const sil = async (id) => {
    await supabase.from('bolumler').delete().eq('seri_id', id)
    await supabase.from('seriler').delete().eq('id', id)
    setSilOnayi(null)
    yukle()
  }

  const filtrelenmis = seriler.filter(s =>
    s.baslik?.toLowerCase().includes(aramaMetni.toLowerCase()) ||
    s.slug?.toLowerCase().includes(aramaMetni.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, margin: 0 }}>Seriler</h1>
          <p style={{ color: '#555', fontSize: '14px', marginTop: '4px' }}>Toplam {seriler.length} seri</p>
        </div>
        <Link href="/admin/seriler/yeni" style={{
          textDecoration: 'none', background: '#e63946', color: '#fff',
          padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600
        }}>
          + Yeni Seri
        </Link>
      </div>

      <input
        type="text"
        placeholder="Seri ara..."
        value={aramaMetni}
        onChange={e => setAramaMetni(e.target.value)}
        style={{
          width: '100%', padding: '10px 14px', background: '#111', border: '1px solid #222',
          borderRadius: '8px', color: '#ddd', fontSize: '14px', marginBottom: '16px',
          outline: 'none', boxSizing: 'border-box'
        }}
      />

      <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #222' }}>
              {['Kapak', 'Başlık', 'Slug', 'Durum', 'Görüntüleme', 'Puan', 'İşlem'].map(h => (
                <th key={h} style={{ padding: '12px 16px', color: '#555', fontSize: '12px', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {yukleniyor ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#555' }}>Yükleniyor...</td></tr>
            ) : filtrelenmis.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#555' }}>
                {aramaMetni ? 'Sonuç bulunamadı' : 'Henüz seri yok'}
              </td></tr>
            ) : (
              filtrelenmis.map(seri => (
                <tr key={seri.id} style={{ borderBottom: '1px solid #1a1a1a' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#151515'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ width: '36px', height: '48px', background: '#1a1a1a', borderRadius: '4px', overflow: 'hidden' }}>
                      {seri.kapak_url && <img src={seri.kapak_url} alt={seri.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ color: '#ddd', fontSize: '14px', fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {seri.baslik}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <code style={{ color: '#888', fontSize: '12px', background: '#1a1a1a', padding: '2px 6px', borderRadius: '4px' }}>
                      {seri.slug}
                    </code>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500,
                      background: seri.durum === 'devam' ? '#1a2e1a' : seri.durum === 'tamamlandi' ? '#1a1a2e' : '#2e1a1a',
                      color: seri.durum === 'devam' ? '#4caf50' : seri.durum === 'tamamlandi' ? '#6c6ce8' : '#e63946'
                    }}>
                      {seri.durum || 'belirsiz'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#888', fontSize: '13px' }}>
                    👁 {seri.goruntuleme_sayisi || 0}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#888', fontSize: '13px' }}>
                    ⭐ {seri.ortalama_puan ? parseFloat(seri.ortalama_puan).toFixed(1) : '-'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Link href={`/seri/${seri.slug}`} target="_blank" style={{
                        textDecoration: 'none', padding: '5px 10px', background: '#1a1a1a',
                        border: '1px solid #333', borderRadius: '5px', color: '#888', fontSize: '12px'
                      }}>👁</Link>
                      <Link href={`/admin/seriler/${seri.id}/duzenle`} style={{
                        textDecoration: 'none', padding: '5px 10px', background: '#1a2e1a',
                        border: '1px solid #2a4a2a', borderRadius: '5px', color: '#4caf50', fontSize: '12px'
                      }}>Düzenle</Link>
                      <button onClick={() => setSilOnayi(seri)} style={{
                        padding: '5px 10px', background: '#2e1a1a', border: '1px solid #4a2a2a',
                        borderRadius: '5px', color: '#e63946', fontSize: '12px', cursor: 'pointer'
                      }}>Sil</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {silOnayi && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{ background: '#111', border: '1px solid #333', borderRadius: '12px', padding: '28px', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '18px' }}>Seriyi Sil</h3>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>
              <strong style={{ color: '#e63946' }}>{silOnayi.baslik}</strong> adlı seri ve tüm bölümleri kalıcı olarak silinecek. Emin misin?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setSilOnayi(null)} style={{
                padding: '8px 18px', background: '#1a1a1a', border: '1px solid #333',
                borderRadius: '6px', color: '#888', fontSize: '14px', cursor: 'pointer'
              }}>İptal</button>
              <button onClick={() => sil(silOnayi.id)} style={{
                padding: '8px 18px', background: '#e63946', border: 'none',
                borderRadius: '6px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer'
              }}>Evet, Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
                    }
