'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

export default function AdminYorumlar() {
  const [yorumlar, setYorumlar] = useState([])
  const [filtre, setFiltre] = useState('aktif')
  const [yukleniyor, setYukleniyor] = useState(true)
  const [silOnayi, setSilOnayi] = useState(null)

  const yukle = async () => {
    setYukleniyor(true)
    let query = supabase
      .from('yorumlar')
      .select(`
        id, icerik, spoiler, silindi, begeni_sayisi, created_at,
        kullanici_id,
        profiller(kullanici_adi, avatar_url),
        seriler(baslik, slug),
        bolumler(sayi, baslik)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (filtre === 'aktif') query = query.eq('silindi', false)
    else if (filtre === 'silindi') query = query.eq('silindi', true)

    const { data } = await query
    setYorumlar(data || [])
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [filtre])

  const yorumSil = async (id) => {
    await supabase.from('yorumlar').update({ silindi: true }).eq('id', id)
    setSilOnayi(null)
    yukle()
  }

  const yorumGeriAl = async (id) => {
    await supabase.from('yorumlar').update({ silindi: false }).eq('id', id)
    yukle()
  }

  const yorumKaliciSil = async (id) => {
    await supabase.from('yorumlar').delete().eq('id', id)
    setSilOnayi(null)
    yukle()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, margin: 0 }}>Yorumlar</h1>
          <p style={{ color: '#555', fontSize: '14px', marginTop: '4px' }}>{yorumlar.length} yorum gösteriliyor</p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { val: 'aktif', label: '✅ Aktif' },
            { val: 'silindi', label: '🗑 Silinmiş' },
            { val: 'hepsi', label: '📋 Hepsi' }
          ].map(f => (
            <button key={f.val} onClick={() => setFiltre(f.val)} style={{
              padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
              background: filtre === f.val ? '#e63946' : '#111',
              border: `1px solid ${filtre === f.val ? '#e63946' : '#333'}`,
              color: filtre === f.val ? '#fff' : '#888',
              fontWeight: filtre === f.val ? 600 : 400
            }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {yukleniyor ? (
        <div style={{ color: '#555', padding: '40px', textAlign: 'center' }}>Yükleniyor...</div>
      ) : yorumlar.length === 0 ? (
        <div style={{ color: '#555', padding: '40px', textAlign: 'center', background: '#111', borderRadius: '12px', border: '1px solid #222' }}>
          Yorum bulunamadı
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {yorumlar.map(yorum => (
            <div key={yorum.id} style={{
              background: yorum.silindi ? '#0d0d0d' : '#111',
              border: `1px solid ${yorum.silindi ? '#1a1a1a' : '#222'}`,
              borderRadius: '10px',
              padding: '16px 20px',
              opacity: yorum.silindi ? 0.6 : 1
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1a1a1a', overflow: 'hidden', flexShrink: 0 }}>
                      {yorum.profiller?.avatar_url
                        ? <img src={yorum.profiller.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '12px', fontWeight: 600 }}>
                            {yorum.profiller?.kullanici_adi?.[0]?.toUpperCase()}
                          </div>
                      }
                    </div>
                    <span style={{ color: '#aaa', fontSize: '13px', fontWeight: 600 }}>
                      {yorum.profiller?.kullanici_adi || 'Bilinmeyen'}
                    </span>
                    <span style={{ color: '#444', fontSize: '12px' }}>
                      {yorum.created_at ? new Date(yorum.created_at).toLocaleString('tr-TR') : ''}
                    </span>
                    {yorum.spoiler && (
                      <span style={{ padding: '2px 6px', background: '#2e2a00', border: '1px solid #4a4000', borderRadius: '4px', color: '#ffc107', fontSize: '11px' }}>
                        SPOILER
                      </span>
                    )}
                    {yorum.silindi && (
                      <span style={{ padding: '2px 6px', background: '#2e1a1a', border: '1px solid #4a2a2a', borderRadius: '4px', color: '#e63946', fontSize: '11px' }}>
                        SİLİNMİŞ
                      </span>
                    )}
                  </div>

                  <div style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.5', marginBottom: '10px' }}>
                    {yorum.icerik}
                  </div>

                  <div style={{ color: '#555', fontSize: '12px' }}>
                    📚 {yorum.seriler?.baslik || '—'}
                    {yorum.bolumler && <span> · Bölüm #{yorum.bolumler.sayi}</span>}
                    <span style={{ marginLeft: '12px' }}>❤️ {yorum.begeni_sayisi || 0}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {yorum.silindi ? (
                    <>
                      <button onClick={() => yorumGeriAl(yorum.id)} style={{
                        padding: '5px 10px', background: '#1a2e1a', border: '1px solid #2a4a2a',
                        borderRadius: '5px', color: '#4caf50', fontSize: '12px', cursor: 'pointer'
                      }}>Geri Al</button>
                      <button onClick={() => setSilOnayi({ ...yorum, kalici: true })} style={{
                        padding: '5px 10px', background: '#2e1a1a', border: '1px solid #4a2a2a',
                        borderRadius: '5px', color: '#e63946', fontSize: '12px', cursor: 'pointer'
                      }}>Kalıcı Sil</button>
                    </>
                  ) : (
                    <button onClick={() => setSilOnayi(yorum)} style={{
                      padding: '5px 10px', background: '#2e1a1a', border: '1px solid #4a2a2a',
                      borderRadius: '5px', color: '#e63946', fontSize: '12px', cursor: 'pointer'
                    }}>Sil</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {silOnayi && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{ background: '#111', border: '1px solid #333', borderRadius: '12px', padding: '28px', maxWidth: '440px', width: '90%' }}>
            <h3 style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '18px' }}>
              {silOnayi.kalici ? 'Kalıcı Olarak Sil' : 'Yorumu Gizle'}
            </h3>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '8px' }}>
              {silOnayi.kalici
                ? 'Bu yorum veritabanından tamamen silinecek. Geri alınamaz!'
                : 'Bu yorum kullanıcılara gösterilmeyecek. İstersen geri alabilirsin.'}
            </p>
            <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '6px', padding: '10px', marginBottom: '20px', color: '#999', fontSize: '13px', maxHeight: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              "{silOnayi.icerik}"
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setSilOnayi(null)} style={{
                padding: '8px 18px', background: '#1a1a1a', border: '1px solid #333',
                borderRadius: '6px', color: '#888', fontSize: '14px', cursor: 'pointer'
              }}>İptal</button>
              <button onClick={() => silOnayi.kalici ? yorumKaliciSil(silOnayi.id) : yorumSil(silOnayi.id)} style={{
                padding: '8px 18px', background: '#e63946', border: 'none',
                borderRadius: '6px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer'
              }}>
                {silOnayi.kalici ? 'Kalıcı Sil' : 'Gizle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
                    }
