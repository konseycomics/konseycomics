'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
)

const ROLLER = ['uye', 'yonetici', 'admin']

export default function AdminKullanicilar() {
  const [kullanicilar, setKullanicilar] = useState([])
  const [aramaMetni, setAramaMetni] = useState('')
  const [yukleniyor, setYukleniyor] = useState(true)
  const [rolGuncelleniyor, setRolGuncelleniyor] = useState(null)

  const yukle = async () => {
    setYukleniyor(true)
    const { data } = await supabase
      .from('profiller')
      .select('id, kullanici_adi, avatar_url, rol, xp, seviye, created_at')
      .order('created_at', { ascending: false })
    setKullanicilar(data || [])
    setYukleniyor(false)
  }

  useEffect(() => { yukle() }, [])

  const rolGuncelle = async (id, yeniRol) => {
    setRolGuncelleniyor(id)
    await supabase.from('profiller').update({ rol: yeniRol }).eq('id', id)
    setKullanicilar(prev => prev.map(k => k.id === id ? { ...k, rol: yeniRol } : k))
    setRolGuncelleniyor(null)
  }

  const filtrelenmis = kullanicilar.filter(k =>
    k.kullanici_adi?.toLowerCase().includes(aramaMetni.toLowerCase())
  )

  const rolRenk = (rol) => {
    if (rol === 'admin') return { bg: '#2e1a2e', color: '#e040fb', border: '#4a2a4a' }
    if (rol === 'yonetici') return { bg: '#1a1a2e', color: '#6c6ce8', border: '#2a2a4a' }
    return { bg: '#1a1a1a', color: '#888', border: '#2a2a2a' }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, margin: 0 }}>Kullanıcılar</h1>
          <p style={{ color: '#555', fontSize: '14px', marginTop: '4px' }}>Toplam {kullanicilar.length} kullanıcı</p>
        </div>
      </div>

      <input
        type="text"
        placeholder="Kullanıcı adı ara..."
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
              {['Avatar', 'Kullanıcı Adı', 'Rol', 'Seviye / XP', 'Kayıt Tarihi', 'Rol Değiştir'].map(h => (
                <th key={h} style={{ padding: '12px 16px', color: '#555', fontSize: '12px', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {yukleniyor ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#555' }}>Yükleniyor...</td></tr>
            ) : filtrelenmis.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#555' }}>Kullanıcı bulunamadı</td></tr>
            ) : (
              filtrelenmis.map(k => {
                const rk = rolRenk(k.rol)
                return (
                  <tr key={k.id} style={{ borderBottom: '1px solid #1a1a1a' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#151515'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1a1a1a', overflow: 'hidden' }}>
                        {k.avatar_url
                          ? <img src={k.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '14px', fontWeight: 600 }}>
                              {k.kullanici_adi?.[0]?.toUpperCase()}
                            </div>
                        }
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ color: '#ddd', fontSize: '14px', fontWeight: 500 }}>{k.kullanici_adi}</div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500,
                        background: rk.bg, color: rk.color, border: `1px solid ${rk.border}`
                      }}>
                        {k.rol}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ color: '#888', fontSize: '13px' }}>
                        Seviye {k.seviye || 1} · {k.xp || 0} XP
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#555', fontSize: '12px' }}>
                      {k.created_at ? new Date(k.created_at).toLocaleDateString('tr-TR') : '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {ROLLER.map(rol => (
                          <button
                            key={rol}
                            disabled={k.rol === rol || rolGuncelleniyor === k.id}
                            onClick={() => rolGuncelle(k.id, rol)}
                            style={{
                              padding: '4px 10px', borderRadius: '4px', fontSize: '11px',
                              cursor: k.rol === rol ? 'default' : 'pointer',
                              fontWeight: k.rol === rol ? 700 : 400,
                              background: k.rol === rol ? rolRenk(rol).bg : '#1a1a1a',
                              border: `1px solid ${k.rol === rol ? rolRenk(rol).border : '#2a2a2a'}`,
                              color: k.rol === rol ? rolRenk(rol).color : '#666',
                              opacity: rolGuncelleniyor === k.id && k.rol !== rol ? 0.5 : 1,
                              transition: 'all 0.15s'
                            }}
                          >
                            {rol}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
