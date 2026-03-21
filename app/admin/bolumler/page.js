'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

export default function AdminBolumler() {
  const [bolumler, setBolumler] = useState([])
  const [seriler, setSeriler] = useState([])
  const [seciliSeri, setSeciliSeri] = useState('')
  const [yukleniyor, setYukleniyor] = useState(true)
  const [silOnayi, setSilOnayi] = useState(null)

  const yukle = async () => {
    setYukleniyor(true)
    let query = supabase
      .from('bolumler')
      .select('id, sayi, baslik, kapak_url, drive_link, goruntuleme_sayisi, created_at, seri_id, seriler(baslik, slug)')
      .order('created_at', { ascending: false })

    if (seciliSeri) query = query.eq('seri_id', seciliSeri)

    const { data } = await query
    setBolumler(data || [])
    setYukleniyor(false)
  }

  useEffect(() => {
    const yukleSeri = async () => {
      const { data } = await supabase.from('seriler').select('id, baslik').order('baslik')
      setSeriler(data || [])
    }
    yukleSeri()
  }, [])

  useEffect(() => { yukle() }, [seciliSeri])

  const sil = async (id) => {
    await supabase.from('bolumler').delete().eq('id', id)
    setSilOnayi(null)
    yukle()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, margin: 0 }}>Bölümler</h1>
          <p style={{ color: '#555', fontSize: '14px', marginTop: '4px' }}>Toplam {bolumler.length} bölüm{seciliSeri ? ' (filtrelenmiş)' : ''}</p>
        </div>
        <Link href="/admin/bolumler/yeni" style={{
          textDecoration: 'none', background: '#e63946', color: '#fff',
          padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600
        }}>
          + Yeni Bölüm
        </Link>
      </div>

      <select
        value={seciliSeri}
        onChange={e => setSeciliSeri(e.target.value)}
        style={{
          padding: '10px 14px', background: '#111', border: '1px solid #222',
          borderRadius: '8px', color: '#ddd', fontSize: '14px', marginBottom: '16px',
          cursor: 'pointer', outline: 'none', minWidth: '220px'
        }}
      >
        <option value="">Tüm Seriler</option>
        {seriler.map(s => <option key={s.id} value={s.id}>{s.baslik}</option>)}
      </select>

      <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #222' }}>
              {['Kapak', 'Seri', 'Bölüm', 'Başlık', 'Drive Link', 'Görüntüleme', 'İşlem'].map(h => (
                <th key={h} style={{ padding: '12px 16px', color: '#555', fontSize: '12px', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {yukleniyor ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#555' }}>Yükleniyor...</td></tr>
            ) : bolumler.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#555' }}>Henüz bölüm yok</td></tr>
            ) : (
              bolumler.map(bolum => (
                <tr key={bolum.id} style={{ borderBottom: '1px solid #1a1a1a' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#151515'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ width: '36px', height: '48px', background: '#1a1a1a', borderRadius: '4px', overflow: 'hidden' }}>
                      {bolum.kapak_url && <img src={bolum.kapak_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ color: '#888', fontSize: '13px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {bolum.seriler?.baslik || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ color: '#6c6ce8', fontWeight: 600, fontSize: '14px' }}>#{bolum.sayi}</span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ color: '#ddd', fontSize: '14px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {bolum.baslik}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {bolum.drive_link ? (
                      <a href={bolum.drive_link} target="_blank" rel="noreferrer" style={{ color: '#4caf50', fontSize: '13px', textDecoration: 'none' }}>
                        🔗 Drive
                      </a>
                    ) : (
                      <span style={{ color: '#333', fontSize: '13px' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#888', fontSize: '13px' }}>
                    👁 {bolum.goruntuleme_sayisi || 0}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {bolum.seriler?.slug && (
                        <Link href={`/oku/${bolum.seriler.slug}/${bolum.sayi}`} target="_blank" style={{
                          textDecoration: 'none', padding: '5px 10px', background: '#1a1a1a',
                          border: '1px solid #333', borderRadius: '5px', color: '#888', fontSize: '12px'
                        }}>👁</Link>
                      )}
                      <Link href={`/admin/bolumler/${bolum.id}/duzenle`} style={{
                        textDecoration: 'none', padding: '5px 10px', background: '#1a2e1a',
                        border: '1px solid #2a4a2a', borderRadius: '5px', color: '#4caf50', fontSize: '12px'
                      }}>Düzenle</Link>
                      <button onClick={() => setSilOnayi(bolum)} style={{
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
            <h3 style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '18px' }}>Bölümü Sil</h3>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>
              <strong style={{ color: '#e63946' }}>Bölüm #{silOnayi.sayi} - {silOnayi.baslik}</strong> kalıcı olarak silinecek. Emin misin?
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
