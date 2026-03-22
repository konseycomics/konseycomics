'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getPublicProfilesByIds } from '../lib/publicProfiles'
import Link from 'next/link'

export default function YorumSistemi({ bolumId, seriId }) {
  const [yorumlar, setYorumlar] = useState([])
  const [yeniYorum, setYeniYorum] = useState('')
  const [spoiler, setSpoiler] = useState(false)
  const [kullanici, setKullanici] = useState(null)
  const [profil, setProfil] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cevapVerilenId, setCevapVerilenId] = useState(null)
  const [begeniler, setBegeniler] = useState({})

  const fetchYorumlar = useCallback(async () => {
    const { data } = await supabase
      .from('yorumlar')
      .select('*')
      .eq('bolum_id', bolumId)
      .is('ust_yorum_id', null)
      .eq('silindi', false)
      .order('begeni_sayisi', { ascending: false })
    const profilMap = await getPublicProfilesByIds((data || []).map(yorum => yorum.kullanici_id))
    setYorumlar((data || []).map(yorum => ({ ...yorum, profiller: profilMap[yorum.kullanici_id] || null })))
    setLoading(false)
  }, [bolumId])

  useEffect(() => {
    fetchYorumlar()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setKullanici(session.user)
        supabase.from('profiller').select('*').eq('id', session.user.id).single()
          .then(({ data }) => setProfil(data))
        // Kullanıcının beğenilerini al
        supabase.from('yorum_begenileri').select('yorum_id').eq('kullanici_id', session.user.id)
          .then(({ data }) => {
            if (data) {
              const map = {}
              data.forEach(b => { map[b.yorum_id] = true })
              setBegeniler(map)
            }
          })
      }
    })
  }, [bolumId, fetchYorumlar])

  async function yorumGonder(ustYorumId = null) {
    if (!yeniYorum.trim() || !kullanici) return
    setYukleniyor(true)
    const { error } = await supabase.from('yorumlar').insert([{
      kullanici_id: kullanici.id,
      bolum_id: bolumId,
      seri_id: seriId,
      icerik: yeniYorum.trim(),
      spoiler,
      ust_yorum_id: ustYorumId,
    }])
    if (!error) {
      setYeniYorum('')
      setSpoiler(false)
      setCevapVerilenId(null)
      fetchYorumlar()
    }
    setYukleniyor(false)
  }

  async function toggleBegeni(yorumId) {
    if (!kullanici) return
    if (begeniler[yorumId]) {
      await supabase.from('yorum_begenileri').delete()
        .eq('kullanici_id', kullanici.id).eq('yorum_id', yorumId)
      setBegeniler(b => ({ ...b, [yorumId]: false }))
      setYorumlar(y => y.map(yr => yr.id === yorumId ? { ...yr, begeni_sayisi: yr.begeni_sayisi - 1 } : yr))
    } else {
      await supabase.from('yorum_begenileri').insert([{ kullanici_id: kullanici.id, yorum_id: yorumId }])
      setBegeniler(b => ({ ...b, [yorumId]: true }))
      setYorumlar(y => y.map(yr => yr.id === yorumId ? { ...yr, begeni_sayisi: yr.begeni_sayisi + 1 } : yr))
    }
  }

  const YorumKarti = ({ yorum, girintili = false }) => {
    const [cevaplar, setCevaplar] = useState([])
    const [cevapAcik, setCevapAcik] = useState(false)
    const [cevapMetni, setCevapMetni] = useState('')
    const [spoilerAcik, setSpoilerAcik] = useState(false)

    async function cevaplariGetir() {
      if (cevapAcik) { setCevapAcik(false); return }
      const { data } = await supabase.from('yorumlar')
        .select('*')
        .eq('ust_yorum_id', yorum.id).eq('silindi', false).order('created_at')
      const profilMap = await getPublicProfilesByIds((data || []).map(cevap => cevap.kullanici_id))
      setCevaplar((data || []).map(cevap => ({ ...cevap, profiller: profilMap[cevap.kullanici_id] || null })))
      setCevapAcik(true)
    }

    async function cevapGonder() {
      if (!cevapMetni.trim() || !kullanici) return
      await supabase.from('yorumlar').insert([{
        kullanici_id: kullanici.id, bolum_id: bolumId, seri_id: seriId,
        icerik: cevapMetni.trim(), ust_yorum_id: yorum.id,
      }])
      setCevapMetni('')
      cevaplariGetir()
    }

    const tarih = new Date(yorum.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })

    return (
      <div style={{ marginLeft: girintili ? '40px' : 0, borderLeft: girintili ? '2px solid var(--border)' : 'none', paddingLeft: girintili ? '16px' : 0 }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          {/* Avatar */}
          <Link href={`/profil/${yorum.profiller?.kullanici_adi}`} style={{ flexShrink: 0 }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#111', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#fff', fontFamily: "'Bebas Neue', sans-serif" }}>
              {yorum.profiller?.avatar_url
                ? <img src={yorum.profiller.avatar_url} alt={yorum.profiller.kullanici_adi || 'Kullanici avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : yorum.profiller?.kullanici_adi?.[0]?.toUpperCase()
              }
            </div>
          </Link>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <Link href={`/profil/${yorum.profiller?.kullanici_adi}`} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>
                {yorum.profiller?.kullanici_adi}
              </Link>
              <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>Sv.{yorum.profiller?.seviye || 1}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>{tarih}</span>
              {yorum.spoiler && (
                <span style={{ fontSize: '10px', padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: '4px', fontWeight: 600 }}>SPOILER</span>
              )}
            </div>

            {/* İçerik */}
            {yorum.spoiler && !spoilerAcik ? (
              <div onClick={() => setSpoilerAcik(true)} style={{ cursor: 'pointer', padding: '8px 12px', background: '#111', borderRadius: '8px', fontSize: '13px', color: '#888', userSelect: 'none' }}>
                👁 Spoiler içerik — görmek için tıkla
              </div>
            ) : (
              <div style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6 }}>{yorum.icerik}</div>
            )}

            {/* Aksiyonlar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
              <button onClick={() => toggleBegeni(yorum.id)} style={{ background: 'none', border: 'none', cursor: kullanici ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: begeniler[yorum.id] ? '#ef4444' : 'var(--text-muted)', fontFamily: 'inherit', padding: 0 }}>
                {begeniler[yorum.id] ? '❤️' : '🤍'} {yorum.begeni_sayisi > 0 ? yorum.begeni_sayisi : ''}
              </button>
              {kullanici && !girintili && (
                <button onClick={cevaplariGetir} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'inherit', padding: 0 }}>
                  💬 Yanıtla
                </button>
              )}
            </div>

            {/* Cevaplar */}
            {cevapAcik && (
              <div style={{ marginTop: '12px' }}>
                {cevaplar.map(c => <YorumKarti key={c.id} yorum={c} girintili={true} />)}
                {kullanici && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input value={cevapMetni} onChange={e => setCevapMetni(e.target.value)} placeholder="Yanıt yaz..." onKeyDown={e => e.key === 'Enter' && cevapGonder()} style={{ flex: 1, padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                    <button onClick={cevapGonder} style={{ padding: '8px 14px', background: '#111', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Gönder</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: '32px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>
        Yorumlar {yorumlar.length > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({yorumlar.length})</span>}
      </div>

      {/* Yorum formu */}
      {kullanici ? (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#111', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#fff', fontFamily: "'Bebas Neue', sans-serif" }}>
            {profil?.avatar_url ? <img src={profil.avatar_url} alt={profil.kullanici_adi || 'Profil avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profil?.kullanici_adi?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <textarea value={yeniYorum} onChange={e => setYeniYorum(e.target.value)} placeholder="Bu bölüm hakkında ne düşünüyorsun?" rows={3} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input type="checkbox" checked={spoiler} onChange={e => setSpoiler(e.target.checked)} />
                Spoiler içerik
              </label>
              <button onClick={() => yorumGonder()} disabled={yukleniyor || !yeniYorum.trim()} style={{ padding: '8px 20px', background: yeniYorum.trim() ? '#111' : 'var(--border)', color: yeniYorum.trim() ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: yeniYorum.trim() ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                {yukleniyor ? 'Gönderiliyor...' : 'Yorum Yap'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
          Yorum yapmak için <Link href="/giris" style={{ color: 'var(--text)', fontWeight: 500, textDecoration: 'none' }}>giriş yap</Link>
        </div>
      )}

      {/* Yorum listesi */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Yorumlar yükleniyor...</div>
      ) : yorumlar.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '14px' }}>
          Henüz yorum yok. İlk yorumu sen yap!
        </div>
      ) : (
        <div>
          {yorumlar.map(y => <YorumKarti key={y.id} yorum={y} />)}
        </div>
      )}
    </div>
  )
}
