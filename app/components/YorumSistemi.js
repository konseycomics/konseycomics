'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getPublicProfilesByIds } from '../lib/publicProfiles'
import Link from 'next/link'
import { trackIssueCommentAndUnlock, trackSeriesCommentAndUnlock } from '../lib/unvanClient'

export default function YorumSistemi({ bolumId, seriId }) {
  const [yorumlar, setYorumlar] = useState([])
  const [yeniYorum, setYeniYorum] = useState('')
  const [spoiler, setSpoiler] = useState(false)
  const [kullanici, setKullanici] = useState(null)
  const [profil, setProfil] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [loading, setLoading] = useState(true)
  const [begeniler, setBegeniler] = useState({})
  const [acilanUnvanlar, setAcilanUnvanlar] = useState([])
  const seriModu = !bolumId && !!seriId
  const baslik = seriModu ? 'Seri Yorumlari' : 'Yorumlar'
  const placeholder = seriModu ? 'Bu seri hakkında ne düşünüyorsun?' : 'Bu bölüm hakkında ne düşünüyorsun?'

  function formatTarihSaat(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
  }

  const fetchYorumlar = useCallback(async () => {
    const query = supabase
      .from('yorumlar')
      .select('*')
      .eq('seri_id', seriId)
      .is('ust_yorum_id', null)
      .eq('silindi', false)
      .order('begeni_sayisi', { ascending: false })

    if (bolumId) query.eq('bolum_id', bolumId)
    else query.is('bolum_id', null)

    const { data } = await query
    const profilMap = await getPublicProfilesByIds((data || []).map(yorum => yorum.kullanici_id))
    setYorumlar((data || []).map(yorum => ({ ...yorum, profiller: profilMap[yorum.kullanici_id] || null })))
    setLoading(false)
  }, [bolumId, seriId])

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
      const unlocked = bolumId
        ? await trackIssueCommentAndUnlock({ userId: kullanici.id, seriId, bolumId })
        : await trackSeriesCommentAndUnlock({ userId: kullanici.id, seriId })
      if (unlocked.length > 0) {
        setAcilanUnvanlar(unlocked)
        window.setTimeout(() => setAcilanUnvanlar([]), 5200)
      }
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

  const YorumKarti = ({ yorum, girintili = false, onSilindi = null, onGuncellendi = null }) => {
    const [cevaplar, setCevaplar] = useState([])
    const [cevapAcik, setCevapAcik] = useState(false)
    const [cevapMetni, setCevapMetni] = useState('')
    const [spoilerAcik, setSpoilerAcik] = useState(false)
    const [duzenlemeModu, setDuzenlemeModu] = useState(false)
    const [duzenlemeMetni, setDuzenlemeMetni] = useState(yorum.icerik || '')
    const [duzenlemeSpoiler, setDuzenlemeSpoiler] = useState(Boolean(yorum.spoiler))
    const [islemYapiliyor, setIslemYapiliyor] = useState(false)
    const yorumSahibi = kullanici?.id && yorum.kullanici_id === kullanici.id

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

    async function yorumDuzenle() {
      if (!yorumSahibi || !duzenlemeMetni.trim()) return
      setIslemYapiliyor(true)
      const { error } = await supabase
        .from('yorumlar')
        .update({
          icerik: duzenlemeMetni.trim(),
          spoiler: duzenlemeSpoiler,
          updated_at: new Date().toISOString(),
        })
        .eq('id', yorum.id)
        .eq('kullanici_id', kullanici.id)

      setIslemYapiliyor(false)
      if (!error) {
        onGuncellendi?.(yorum.id, {
          icerik: duzenlemeMetni.trim(),
          spoiler: duzenlemeSpoiler,
          updated_at: new Date().toISOString(),
        })
        setDuzenlemeModu(false)
        if (!onGuncellendi) fetchYorumlar()
      }
    }

    async function yorumSil() {
      if (!yorumSahibi) return
      if (!window.confirm('Yorumunu silmek istediğine emin misin?')) return
      setIslemYapiliyor(true)
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/comments/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ yorumId: yorum.id }),
      })
      const result = await response.json().catch(() => ({}))

      setIslemYapiliyor(false)
      if (response.ok) {
        onSilindi?.(yorum.id)
        if (!onSilindi) fetchYorumlar()
      } else {
        window.alert(result?.error || 'Yorum silinemedi.')
      }
    }

    const tarih = formatTarihSaat(yorum.created_at)
    const guncellemeVar = yorum.updated_at && yorum.created_at && new Date(yorum.updated_at).getTime() - new Date(yorum.created_at).getTime() > 1000

    return (
      <div style={{ marginLeft: girintili ? '40px' : 0, borderLeft: girintili ? '2px solid var(--border)' : 'none', paddingLeft: girintili ? '16px' : 0 }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          {/* Avatar */}
          <Link href={`/profil/${yorum.profiller?.kullanici_adi}`} style={{ flexShrink: 0 }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#111', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#fff', fontFamily: "'Bebas Neue', sans-serif" }}>
              {yorum.profiller?.avatar_url
                ? <img src={yorum.profiller.avatar_url} alt={yorum.profiller.kullanici_adi || 'Kullanıcı avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
              {guncellemeVar && (
                <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>• düzenlendi</span>
              )}
              {yorum.spoiler && (
                <span style={{ fontSize: '10px', padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: '4px', fontWeight: 600 }}>SPOILER</span>
              )}
            </div>

            {yorum.profiller?.secili_unvan?.isim && (
              <div
                style={{
                  marginBottom: '6px',
                  color: 'rgba(255,255,255,0.64)',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase',
                }}
              >
                {yorum.profiller.secili_unvan.isim}
              </div>
            )}

            {/* İçerik */}
            {duzenlemeModu ? (
              <div style={{ display: 'grid', gap: '8px' }}>
                <textarea
                  value={duzenlemeMetni}
                  onChange={(e) => setDuzenlemeMetni(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <input type="checkbox" checked={duzenlemeSpoiler} onChange={(e) => setDuzenlemeSpoiler(e.target.checked)} />
                  Spoiler içerik
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={yorumDuzenle} disabled={islemYapiliyor || !duzenlemeMetni.trim()} style={{ padding: '8px 14px', background: '#111', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {islemYapiliyor ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                  <button onClick={() => { setDuzenlemeModu(false); setDuzenlemeMetni(yorum.icerik || ''); setDuzenlemeSpoiler(Boolean(yorum.spoiler)) }} style={{ padding: '8px 14px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Vazgeç
                  </button>
                </div>
              </div>
            ) : yorum.spoiler && !spoilerAcik ? (
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
              {yorumSahibi && !duzenlemeModu && (
                <>
                  <button onClick={() => setDuzenlemeModu(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'inherit', padding: 0 }}>
                    ✏️ Düzenle
                  </button>
                  <button onClick={yorumSil} disabled={islemYapiliyor} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#fca5a5', fontFamily: 'inherit', padding: 0 }}>
                    🗑 Sil
                  </button>
                </>
              )}
            </div>

            {/* Cevaplar */}
            {cevapAcik && (
              <div style={{ marginTop: '12px' }}>
                {cevaplar.map(c => (
                  <YorumKarti
                    key={c.id}
                    yorum={c}
                    girintili={true}
                    onSilindi={(silinenId) => setCevaplar(current => current.filter(item => item.id !== silinenId))}
                    onGuncellendi={(guncellenenId, patch) => setCevaplar(current => current.map(item => item.id === guncellenenId ? { ...item, ...patch } : item))}
                  />
                ))}
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
      {acilanUnvanlar.length > 0 && (
        <div style={{ display: 'grid', gap: '10px', marginBottom: '18px' }}>
          {acilanUnvanlar.map((unvan) => (
            <div key={`${unvan.unvanId}-${unvan.kod}`} style={{ padding: '14px 16px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(255,255,255,0.06))', border: '1px solid rgba(245,158,11,0.22)', color: '#fff' }}>
              <div style={{ fontSize: '11px', letterSpacing: '1.2px', textTransform: 'uppercase', fontWeight: 800, color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>Yeni Unvan</div>
              <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>{unvan.isim}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.72)' }}>{unvan.aciklama || 'Yorumun yeni bir unvanin kilidini acti.'}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>
        {baslik} {yorumlar.length > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({yorumlar.length})</span>}
      </div>

      {/* Yorum formu */}
      {kullanici ? (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#111', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#fff', fontFamily: "'Bebas Neue', sans-serif" }}>
            {profil?.avatar_url ? <img src={profil.avatar_url} alt={profil.kullanici_adi || 'Profil avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profil?.kullanici_adi?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <textarea value={yeniYorum} onChange={e => setYeniYorum(e.target.value)} placeholder={placeholder} rows={3} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box' }} />
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
          {yorumlar.map(y => (
            <YorumKarti
              key={y.id}
              yorum={y}
              onSilindi={(silinenId) => setYorumlar(current => current.filter(item => item.id !== silinenId))}
              onGuncellendi={(guncellenenId, patch) => setYorumlar(current => current.map(item => item.id === guncellenenId ? { ...item, ...patch } : item))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
