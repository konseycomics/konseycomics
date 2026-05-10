'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function formatDateTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function trimPreview(value, max = 230) {
  const text = String(value || '').trim()
  return text.length > max ? `${text.slice(0, max - 3).trim()}...` : text
}

function topicScore(topic) {
  return Number(topic.yanit_sayisi || 0) * 3 + Number(topic.begeni_sayisi || 0) * 2 + Number(topic.goruntulenme_sayisi || 0)
}

export default function ToplulukFeedClient({ initialTopics = [] }) {
  const router = useRouter()
  const [topics, setTopics] = useState(initialTopics)
  const [aktifTab, setAktifTab] = useState('yeni')
  const [kullanici, setKullanici] = useState(null)
  const [profil, setProfil] = useState(null)
  const [baslik, setBaslik] = useState('')
  const [icerik, setIcerik] = useState('')
  const [spoilerKonu, setSpoilerKonu] = useState(false)
  const [anketAcik, setAnketAcik] = useState(false)
  const [anketSecenekleri, setAnketSecenekleri] = useState(['', ''])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const [begeniKonuIdleri, setBegeniKonuIdleri] = useState([])
  const [spoilerVisibleTopicIds, setSpoilerVisibleTopicIds] = useState([])

  useEffect(() => {
    let active = true

    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return
      const user = session?.user || null
      setKullanici(user)

      if (user?.id) {
        const [
          { data: profileData },
          { data: likeRows, error: likeError },
        ] = await Promise.all([
          supabase.from('public_profiller').select('id, kullanici_adi, avatar_url').eq('id', user.id).maybeSingle(),
          supabase.from('topluluk_begenileri').select('konu_id').eq('kullanici_id', user.id),
        ])

        if (!active) return
        setProfil(profileData || null)
        setBegeniKonuIdleri([...
          new Set((((likeError ? [] : likeRows) || []).map((item) => item.konu_id)).filter(Boolean)),
        ])
      } else {
        setProfil(null)
        setBegeniKonuIdleri([])
      }
    }

    loadSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setKullanici(session?.user || null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const gorunenKonular = useMemo(() => {
    let listed = topics

    if (aktifTab === 'populer') {
      listed = [...topics].sort((a, b) => topicScore(b) - topicScore(a) || new Date(b.son_aktivite_at || b.created_at) - new Date(a.son_aktivite_at || a.created_at))
    }

    if (aktifTab === 'yeni') {
      listed = [...topics].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }

    return listed
  }, [aktifTab, topics])

  async function toggleReaction(konuId, type) {
    if (!kullanici) {
      setMesaj('Bu etkileşim için giriş yapman gerekiyor.')
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch('/api/community/reactions/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({ konuId, type }),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setMesaj(result?.error || 'İşlem tamamlanamadı.')
      return
    }

    if (type === 'like') {
      setBegeniKonuIdleri((prev) => result.active ? [...new Set([...prev, konuId])] : prev.filter((id) => id !== konuId))
      setTopics((prev) => prev.map((item) => item.id === konuId ? {
        ...item,
        begeni_sayisi: Math.max(0, Number(item.begeni_sayisi || 0) + (result.active ? 1 : -1)),
      } : item))
      return
    }

  }

  async function konuOlustur() {
    if (!kullanici) {
      setMesaj('Konu açmak için giriş yapman gerekiyor.')
      return
    }

    setYukleniyor(true)
    setMesaj('')

    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch('/api/community/topics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({
        baslik,
        icerik,
        kategori: 'Genel Sohbet',
        etiketler: [],
        spoiler: spoilerKonu,
        anket: anketAcik ? { aktif: true, secenekler: anketSecenekleri } : null,
      }),
    })

    const result = await response.json().catch(() => ({}))
    setYukleniyor(false)

    if (!response.ok) {
      setMesaj(result?.error || 'Konu oluşturulamadı.')
      return
    }

    const yeniKonu = {
      ...result.topic,
      etiketler: Array.isArray(result.topic.etiketler) ? result.topic.etiketler : [],
      profil: result.topic.profil || profil,
      created_at: result.topic.created_at,
      son_aktivite_at: result.topic.son_aktivite_at || result.topic.created_at,
      yanit_sayisi: Number(result.topic.yanit_sayisi || 0),
      begeni_sayisi: Number(result.topic.begeni_sayisi || 0),
      goruntulenme_sayisi: Number(result.topic.goruntulenme_sayisi || 0),
      source: 'topic',
    }

    setTopics((prev) => [yeniKonu, ...prev.filter((item) => item.id !== yeniKonu.id)])
    setBaslik('')
    setIcerik('')
    setSpoilerKonu(false)
    setAnketAcik(false)
    setAnketSecenekleri(['', ''])
    setMesaj('Konun paylaşıldı.')
    setAktifTab('yeni')
  }

  function updatePollOption(index, value) {
    setAnketSecenekleri((prev) => prev.map((item, itemIndex) => itemIndex === index ? value : item))
  }

  function addPollOption() {
    setAnketSecenekleri((prev) => prev.length >= 4 ? prev : [...prev, ''])
  }

  function removePollOption(index) {
    setAnketSecenekleri((prev) => prev.length <= 2 ? prev : prev.filter((_, itemIndex) => itemIndex !== index))
  }

  function toggleSpoilerTopic(topicId) {
    setSpoilerVisibleTopicIds((prev) => prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId])
  }

  const sekmeler = [
    { id: 'tumu', label: 'Tümü' },
    { id: 'yeni', label: 'En Son' },
    { id: 'populer', label: 'Popüler' },
  ]

  return (
    <>
      <div id="konu-olustur" className="community-composer" style={{ padding: '28px', borderRadius: '26px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))', boxShadow: '0 18px 50px rgba(0,0,0,0.22)', marginBottom: '24px', scrollMarginTop: '120px' }}>
        <div className="community-composer-grid" style={{ display: 'grid', gridTemplateColumns: '60px minmax(0, 1fr) auto', gap: '16px', alignItems: 'start' }}>
          <div className="community-composer-avatar" style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            {profil?.avatar_url
              ? <img src={profil.avatar_url} alt={profil.kullanici_adi || 'Profil'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (profil?.kullanici_adi?.[0]?.toUpperCase() || 'K')}
          </div>
          <div className="community-composer-fields" style={{ minWidth: 0 }}>
            <div style={{ color: '#8f8f89', fontSize: '11px', fontWeight: 800, letterSpacing: '0.9px', textTransform: 'uppercase', marginBottom: '10px' }}>
              Konsey Sosyal Akışı
            </div>
            <input
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              placeholder="Konu başlığı"
              style={{ width: '100%', minHeight: '56px', padding: '0 18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.035)', color: '#fff', fontSize: '17px', fontWeight: 600, outline: 'none', marginBottom: '12px', boxSizing: 'border-box' }}
            />
            <textarea
              value={icerik}
              onChange={(e) => setIcerik(e.target.value)}
              placeholder="Ne hakkında konuşmak istersin?"
              rows={5}
              style={{ width: '100%', padding: '16px 18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.035)', color: '#fff', fontSize: '15px', lineHeight: 1.7, outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: '14px' }}
            />
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', color: '#b3b3ad', fontSize: '13px', marginTop: '4px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#bdbdb7', fontSize: '13px' }}>
                <input type="checkbox" checked={spoilerKonu} onChange={(event) => setSpoilerKonu(event.target.checked)} />
                Bu konu spoiler içeriyor
              </label>
              <button
                type="button"
                onClick={() => setAnketAcik((prev) => !prev)}
                style={{ minHeight: '38px', display: 'inline-flex', alignItems: 'center', padding: '0 14px', borderRadius: '999px', border: `1px solid ${anketAcik ? 'rgba(243,210,135,0.28)' : 'rgba(255,255,255,0.08)'}`, background: anketAcik ? 'rgba(243,210,135,0.1)' : 'rgba(255,255,255,0.045)', color: anketAcik ? '#f3d287' : '#b3b3ad', gap: '8px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
              >
                ≣ Anket
              </button>
            </div>
            {anketAcik ? (
              <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
                {anketSecenekleri.map((secenek, index) => (
                  <div key={index} className="community-poll-option-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '10px', alignItems: 'center' }}>
                    <input
                      value={secenek}
                      onChange={(event) => updatePollOption(index, event.target.value)}
                      placeholder={`Anket seçeneği ${index + 1}`}
                      style={{ width: '100%', minHeight: '46px', padding: '0 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    />
                    {anketSecenekleri.length > 2 ? (
                      <button
                        type="button"
                        onClick={() => removePollOption(index)}
                        style={{ minHeight: '46px', padding: '0 14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#ffb8b8', fontSize: '13px', fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}
                      >
                        Sil
                      </button>
                    ) : null}
                  </div>
                ))}
                {anketSecenekleri.length < 4 ? (
                  <button
                    type="button"
                    onClick={addPollOption}
                    style={{ minHeight: '40px', width: 'fit-content', padding: '0 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
                  >
                    + Seçenek Ekle
                  </button>
                ) : null}
              </div>
            ) : null}
            {mesaj ? (
              <div style={{ marginTop: '12px', color: mesaj === 'Konun paylaşıldı.' ? '#8fda8f' : '#ffb4b4', fontSize: '13px' }}>
                {mesaj}
              </div>
            ) : null}
          </div>
          <button
            className="community-composer-submit"
            onClick={konuOlustur}
            disabled={yukleniyor}
            style={{ minHeight: '56px', padding: '0 22px', borderRadius: '16px', border: 'none', background: '#fff', color: '#111', fontSize: '15px', fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer', alignSelf: 'center', boxShadow: '0 16px 30px rgba(255,255,255,0.08)' }}
          >
            {yukleniyor ? 'Paylaşılıyor' : 'Paylaş'}
          </button>
        </div>
      </div>

      <div className="community-tabs" style={{ display: 'flex', gap: '22px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '14px', paddingBottom: '10px', color: '#b3b3ad', fontSize: '14px', overflowX: 'auto' }}>
        {sekmeler.map((sekme) => (
          <button
            key={sekme.id}
            onClick={() => setAktifTab(sekme.id)}
            style={{
              color: aktifTab === sekme.id ? '#fff' : '#b3b3ad',
              fontWeight: aktifTab === sekme.id ? 700 : 500,
              paddingBottom: '10px',
              borderBottom: aktifTab === sekme.id ? '2px solid #fff' : '2px solid transparent',
              background: 'transparent',
              borderInline: 'none',
              borderTop: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            {sekme.label}
          </button>
        ))}
      </div>

      <div id="son-aktiviteler" style={{ display: 'grid', gap: '16px' }}>
        {gorunenKonular.length === 0 ? (
          <div style={{ padding: '22px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#b8b8b2', fontSize: '14px' }}>
            Bu filtrede henüz konu yok. İlk konuyu sen açabilirsin.
          </div>
        ) : gorunenKonular.map((seri, index) => (
            <article
              className="community-topic-card"
              key={`${seri.source}-${seri.id}`}
              onClick={() => router.push(seri.href || `/topluluk/konu/${seri.slug}`)}
              style={{ padding: '22px', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))', cursor: 'pointer', transition: 'transform 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease', boxShadow: '0 14px 34px rgba(0,0,0,0.18)' }}
            >
              <div className="community-topic-grid" style={{ display: 'grid', gridTemplateColumns: '52px minmax(0, 1fr)', gap: '14px', alignItems: 'start' }}>
                <div className="community-topic-avatar" style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {seri.profil?.avatar_url
                    ? <img src={seri.profil.avatar_url} alt={seri.profil.kullanici_adi || 'Profil'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800 }}>{seri.profil?.kullanici_adi?.[0]?.toUpperCase() || 'K'}</div>}
                </div>
                <div className="community-topic-main" style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ color: '#fff', fontSize: '15px', fontWeight: 800 }}>{seri.profil?.kullanici_adi || 'Konsey Üyesi'}</span>
                    <span style={{ color: '#a4a49e', fontSize: '12px' }}>{formatDateTime(seri.son_aktivite_at || seri.created_at)}</span>
                    {index === 0 ? <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6fd96f', display: 'inline-block' }} /> : null}
                  </div>
                  <Link href={seri.href || `/topluluk/konu/${seri.slug}`} onClick={(event) => event.stopPropagation()} style={{ textDecoration: 'none', display: 'block' }}>
                    <div className="community-topic-title" style={{ color: '#fff', fontSize: '22px', fontWeight: 900, lineHeight: 1.25, marginBottom: '10px' }}>
                      {seri.spoiler && !spoilerVisibleTopicIds.includes(seri.id) ? 'Spoilerlı Konu' : seri.baslik}
                    </div>
                  </Link>
                  {seri.spoiler && !spoilerVisibleTopicIds.includes(seri.id) ? (
                    <div style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(243,210,135,0.22)', background: 'rgba(243,210,135,0.08)', marginBottom: '12px' }}>
                      <div style={{ color: '#f3d287', fontSize: '13px', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        Spoilerlı Konu
                      </div>
                      <div style={{ color: '#ddd7c4', fontSize: '14px', lineHeight: 1.7, marginBottom: '10px' }}>
                        Başlık ve içerik spoiler içeriyor. Görmek istersen açabilirsin.
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          toggleSpoilerTopic(seri.id)
                        }}
                        style={{ minHeight: '38px', padding: '0 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: '#fff', color: '#111', fontSize: '13px', fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}
                      >
                        Göster
                      </button>
                    </div>
                  ) : (
                    <>
                      {seri.spoiler ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                          <div style={{ color: '#f3d287', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                            Spoilerlı Konu
                          </div>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              toggleSpoilerTopic(seri.id)
                            }}
                            style={{ minHeight: '34px', padding: '0 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '12px', fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}
                          >
                            Kapat
                          </button>
                        </div>
                      ) : null}
                      <Link href={seri.href || `/topluluk/konu/${seri.slug}`} onClick={(event) => event.stopPropagation()} style={{ textDecoration: 'none', display: 'block' }}>
                        <div className="community-topic-preview" style={{ color: '#c2c2bc', fontSize: '15px', lineHeight: 1.8, marginBottom: '12px' }}>
                          {trimPreview(seri.icerik)}
                        </div>
                      </Link>
                    </>
                  )}
                  {seri.anket_aktif && (!seri.spoiler || spoilerVisibleTopicIds.includes(seri.id)) ? (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ minHeight: '34px', width: 'fit-content', display: 'inline-flex', alignItems: 'center', padding: '0 12px', borderRadius: '999px', background: 'rgba(243,210,135,0.1)', border: '1px solid rgba(243,210,135,0.22)', color: '#f3d287', fontSize: '12px', fontWeight: 800, marginBottom: '10px' }}>
                        Anket Konusu
                      </div>
                      <div style={{ display: 'grid', gap: '8px', maxWidth: '560px' }}>
                        {((seri.anket_sonuclari && seri.anket_sonuclari.length > 0)
                          ? seri.anket_sonuclari
                          : (seri.anket_secenekleri || []).map((secenek, secenekIndex) => ({
                              index: secenekIndex,
                              label: String(secenek || ''),
                              oy: 0,
                              yuzde: 0,
                            }))
                        ).slice(0, 4).map((secenek) => (
                          <div
                            key={`${seri.id}-poll-${secenek.index}`}
                            style={{ padding: '11px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.035)' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ color: '#e1e1db', fontSize: '13px', fontWeight: 700 }}>{secenek.label}</span>
                              <span style={{ color: '#d6d6d0', fontSize: '12px', fontWeight: 700 }}>%{Number(secenek.yuzde || 0)}</span>
                            </div>
                            <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '7px' }}>
                              <div style={{ width: `${Number(secenek.yuzde || 0)}%`, height: '100%', background: 'linear-gradient(90deg, rgba(243,210,135,0.92), rgba(255,255,255,0.45))' }} />
                            </div>
                            <div style={{ color: '#a9a9a3', fontSize: '11px' }}>{Number(secenek.oy || 0)} oy</div>
                          </div>
                        ))}
                        <div style={{ color: '#b8b8b2', fontSize: '12px', marginTop: '2px' }}>
                          Toplam oy: {Number(seri.anket_toplam_oy || 0)}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div className="community-topic-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#d2d2cc', fontSize: '14px', marginTop: '20px', flexWrap: 'wrap' }}>
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        toggleReaction(seri.id, 'like')
                      }}
                      style={{ minHeight: '48px', padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: '10px', background: begeniKonuIdleri.includes(seri.id) ? 'rgba(255,112,118,0.15)' : 'rgba(255,255,255,0.055)', border: `1px solid ${begeniKonuIdleri.includes(seri.id) ? 'rgba(255,112,118,0.34)' : 'rgba(255,255,255,0.12)'}`, color: begeniKonuIdleri.includes(seri.id) ? '#ffb2b5' : '#ffffff', fontSize: '14px', cursor: 'pointer', borderRadius: '16px', fontFamily: 'inherit', fontWeight: 800, boxShadow: begeniKonuIdleri.includes(seri.id) ? '0 10px 28px rgba(255,112,118,0.14)' : '0 8px 22px rgba(0,0,0,0.16)' }}
                    >
                      <span style={{ fontSize: '16px' }}>{begeniKonuIdleri.includes(seri.id) ? '♥' : '♡'}</span>
                      <span>{Number(seri.begeni_sayisi || 0)} beğeni</span>
                    </button>
                    <Link
                      className="community-topic-action-link"
                      href={seri.href || `/topluluk/konu/${seri.slug}`}
                      onClick={(event) => event.stopPropagation()}
                      style={{ minHeight: '48px', padding: '0 18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', fontSize: '14px', borderRadius: '16px', fontWeight: 800, boxShadow: '0 8px 22px rgba(0,0,0,0.16)', textDecoration: 'none', boxSizing: 'border-box' }}
                    >
                      <span style={{ fontSize: '16px' }}>◔</span>
                      <span>{Number(seri.yanit_sayisi || 0)} yorum</span>
                    </Link>
                  </div>
                </div>
              </div>
            </article>
        ))}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .community-composer {
            padding: 22px !important;
            border-radius: 22px !important;
          }

          .community-composer-grid {
            grid-template-columns: 52px minmax(0, 1fr) !important;
            gap: 14px !important;
          }

          .community-composer-avatar {
            width: 52px !important;
            height: 52px !important;
          }

          .community-composer-submit {
            width: 100% !important;
            align-self: stretch !important;
            grid-column: 1 / -1 !important;
          }

          .community-topic-card {
            padding: 18px !important;
          }

          .community-topic-grid {
            grid-template-columns: 48px minmax(0, 1fr) !important;
          }
        }

        @media (max-width: 720px) {
          .community-composer {
            padding: 18px !important;
          }

          .community-poll-option-row {
            grid-template-columns: 1fr !important;
          }

          .community-tabs {
            gap: 16px !important;
            font-size: 13px !important;
          }

          .community-topic-card {
            padding: 16px !important;
            border-radius: 18px !important;
          }

          .community-topic-grid {
            grid-template-columns: 44px minmax(0, 1fr) !important;
            gap: 10px !important;
          }

          .community-topic-avatar {
            width: 44px !important;
            height: 44px !important;
          }

          .community-topic-main {
            min-width: 0 !important;
          }

          .community-topic-actions {
            width: 100% !important;
            gap: 10px !important;
          }

          .community-topic-actions a,
          .community-topic-actions button {
            flex: 0 1 auto;
            justify-content: center !important;
          }

        }

        @media (max-width: 640px) {
          .community-composer {
            padding: 16px !important;
            margin-bottom: 18px !important;
            border-radius: 20px !important;
          }

          .community-composer-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }

          .community-composer-avatar {
            display: none !important;
          }

          .community-composer-fields input,
          .community-composer-fields textarea {
            font-size: 14px !important;
          }

          .community-composer-submit {
            width: 100% !important;
            min-height: 52px !important;
            border-radius: 14px !important;
          }

          .community-tabs {
            margin-bottom: 10px !important;
            padding-bottom: 8px !important;
            gap: 14px !important;
          }

          .community-topic-card {
            padding: 14px !important;
            border-radius: 18px !important;
          }

          .community-topic-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }

          .community-topic-title {
            font-size: 18px !important;
            line-height: 1.3 !important;
          }

          .community-topic-preview {
            font-size: 14px !important;
            line-height: 1.65 !important;
            margin-bottom: 10px !important;
          }

          .community-topic-actions {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
            margin-top: 16px !important;
          }

          .community-topic-actions a,
          .community-topic-actions button {
            width: 100% !important;
            min-height: 46px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 12px !important;
            box-sizing: border-box !important;
          }

        }

        @media (max-width: 520px) {
          .community-composer {
            padding: 14px !important;
          }

          .community-composer-fields textarea {
            min-height: 132px !important;
          }

          .community-topic-card {
            padding: 13px !important;
          }

          .community-tabs {
            gap: 12px !important;
            font-size: 12px !important;
          }

          .community-topic-actions {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </>
  )
}
