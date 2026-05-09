'use client'

import Link from 'next/link'
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
  const [topics, setTopics] = useState(initialTopics)
  const [aktifTab, setAktifTab] = useState('yeni')
  const [kullanici, setKullanici] = useState(null)
  const [profil, setProfil] = useState(null)
  const [baslik, setBaslik] = useState('')
  const [icerik, setIcerik] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [mesaj, setMesaj] = useState('')
  const [katilimKonuIdleri, setKatilimKonuIdleri] = useState([])
  const [begeniKonuIdleri, setBegeniKonuIdleri] = useState([])
  const [yerImiKonuIdleri, setYerImiKonuIdleri] = useState([])

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
          { data: repliesData, error: repliesError },
          { data: ownTopics, error: ownTopicsError },
          { data: likeRows, error: likeError },
          { data: bookmarkRows, error: bookmarkError },
        ] = await Promise.all([
          supabase.from('public_profiller').select('id, kullanici_adi, avatar_url').eq('id', user.id).maybeSingle(),
          supabase.from('topluluk_yanitlari').select('konu_id').eq('kullanici_id', user.id),
          supabase.from('topluluk_konulari').select('id').eq('kullanici_id', user.id),
          supabase.from('topluluk_begenileri').select('konu_id').eq('kullanici_id', user.id),
          supabase.from('topluluk_yer_imleri').select('konu_id').eq('kullanici_id', user.id),
        ])

        if (!active) return
        setProfil(profileData || null)
        const ids = [
          ...((repliesError ? [] : repliesData) || []).map((item) => item.konu_id),
          ...((ownTopicsError ? [] : ownTopics) || []).map((item) => item.id),
          ...((bookmarkError ? [] : bookmarkRows) || []).map((item) => item.konu_id),
        ].filter(Boolean)
        setKatilimKonuIdleri([...new Set(ids)])
        setBegeniKonuIdleri([...
          new Set((((likeError ? [] : likeRows) || []).map((item) => item.konu_id)).filter(Boolean)),
        ])
        setYerImiKonuIdleri([...
          new Set((((bookmarkError ? [] : bookmarkRows) || []).map((item) => item.konu_id)).filter(Boolean)),
        ])
      } else {
        setProfil(null)
        setKatilimKonuIdleri([])
        setBegeniKonuIdleri([])
        setYerImiKonuIdleri([])
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

    if (aktifTab === 'takip') {
      listed = topics.filter((item) => katilimKonuIdleri.includes(item.id) || yerImiKonuIdleri.includes(item.id))
    }

    if (aktifTab === 'populer') {
      listed = [...topics].sort((a, b) => topicScore(b) - topicScore(a) || new Date(b.son_aktivite_at || b.created_at) - new Date(a.son_aktivite_at || a.created_at))
    }

    if (aktifTab === 'yeni') {
      listed = [...topics].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }

    return listed
  }, [aktifTab, katilimKonuIdleri, topics, yerImiKonuIdleri])

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

    setYerImiKonuIdleri((prev) => result.active ? [...new Set([...prev, konuId])] : prev.filter((id) => id !== konuId))
    setKatilimKonuIdleri((prev) => result.active ? [...new Set([...prev, konuId])] : prev)
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
      body: JSON.stringify({ baslik, icerik, kategori: 'Genel Sohbet', etiketler: [] }),
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
    setKatilimKonuIdleri((prev) => [...new Set([yeniKonu.id, ...prev])])
    setBaslik('')
    setIcerik('')
    setMesaj('Konun paylaşıldı.')
    setAktifTab('yeni')
  }

  const sekmeler = [
    { id: 'tumu', label: 'Tümü' },
    { id: 'yeni', label: 'En Son' },
    { id: 'populer', label: 'Popüler' },
  ]

  return (
    <>
      <div id="konu-olustur" style={{ padding: '22px', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))', marginBottom: '22px', scrollMarginTop: '120px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '52px minmax(0, 1fr) auto', gap: '14px', alignItems: 'start' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800 }}>
            {profil?.avatar_url
              ? <img src={profil.avatar_url} alt={profil.kullanici_adi || 'Profil'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (profil?.kullanici_adi?.[0]?.toUpperCase() || 'K')}
          </div>
          <div style={{ minWidth: 0 }}>
            <input
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              placeholder="Konu başlığı"
              style={{ width: '100%', minHeight: '50px', padding: '0 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '16px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' }}
            />
            <textarea
              value={icerik}
              onChange={(e) => setIcerik(e.target.value)}
              placeholder="Ne hakkında konuşmak istersin?"
              rows={4}
              style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '15px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', color: '#b3b3ad', fontSize: '13px', marginTop: '4px' }}>
              {['◫ Fotoğraf', '≣ Anket', '# Etiket'].map((item) => (
                <span key={item} style={{ minHeight: '34px', display: 'inline-flex', alignItems: 'center', padding: '0 12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', gap: '8px' }}>
                  {item}
                </span>
              ))}
            </div>
            {mesaj ? (
              <div style={{ marginTop: '12px', color: mesaj === 'Konun paylaşıldı.' ? '#8fda8f' : '#ffb4b4', fontSize: '13px' }}>
                {mesaj}
              </div>
            ) : null}
          </div>
          <button
            onClick={konuOlustur}
            disabled={yukleniyor}
            style={{ minHeight: '50px', padding: '0 18px', borderRadius: '14px', border: 'none', background: '#fff', color: '#111', fontSize: '15px', fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer', alignSelf: 'center' }}
          >
            {yukleniyor ? 'Paylaşılıyor' : 'Paylaş'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '22px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '14px', paddingBottom: '10px', color: '#b3b3ad', fontSize: '14px', overflowX: 'auto' }}>
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

      <div id="son-aktiviteler" style={{ display: 'grid', gap: '14px' }}>
        {gorunenKonular.length === 0 ? (
          <div style={{ padding: '22px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#b8b8b2', fontSize: '14px' }}>
            Bu filtrede henüz konu yok. İlk konuyu sen açabilirsin.
          </div>
        ) : gorunenKonular.map((seri, index) => (
            <article key={`${seri.source}-${seri.id}`} style={{ padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '52px minmax(0, 1fr) auto', gap: '14px', alignItems: 'start' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {seri.profil?.avatar_url
                    ? <img src={seri.profil.avatar_url} alt={seri.profil.kullanici_adi || 'Profil'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800 }}>{seri.profil?.kullanici_adi?.[0]?.toUpperCase() || 'K'}</div>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <span style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>{seri.profil?.kullanici_adi || 'Konsey Üyesi'}</span>
                    <span style={{ color: '#a4a49e', fontSize: '12px' }}>{formatDateTime(seri.son_aktivite_at || seri.created_at)}</span>
                    {index === 0 ? <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6fd96f', display: 'inline-block' }} /> : null}
                  </div>
                  <Link href={seri.href || `/seri/${seri.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{ color: '#fff', fontSize: '18px', fontWeight: 800, lineHeight: 1.35, marginBottom: '8px' }}>
                      {seri.baslik}
                    </div>
                    <div style={{ color: '#c2c2bc', fontSize: '14px', lineHeight: 1.75, marginBottom: '12px' }}>
                      {trimPreview(seri.icerik)}
                    </div>
                  </Link>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(seri.etiketler || []).slice(0, 3).map((tag) => (
                      <span key={tag} style={{ minHeight: '28px', display: 'inline-flex', alignItems: 'center', padding: '0 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#d5d5d0', fontSize: '11px', fontWeight: 700 }}>
                        {tag.toLowerCase()}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#d2d2cc', fontSize: '14px', marginTop: '18px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => toggleReaction(seri.id, 'like')}
                      style={{ minHeight: '40px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: begeniKonuIdleri.includes(seri.id) ? 'rgba(255,112,118,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${begeniKonuIdleri.includes(seri.id) ? 'rgba(255,112,118,0.28)' : 'rgba(255,255,255,0.08)'}`, color: begeniKonuIdleri.includes(seri.id) ? '#ff9ea1' : '#f0f0eb', fontSize: '14px', cursor: 'pointer', borderRadius: '999px', fontFamily: 'inherit', fontWeight: 700 }}
                    >
                      {begeniKonuIdleri.includes(seri.id) ? '♥' : '♡'} {Number(seri.begeni_sayisi || 0)}
                    </button>
                    <Link href={seri.href || `/seri/${seri.slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#d2d2cc', textDecoration: 'none' }}>
                      <span style={{ minHeight: '40px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#f0f0eb', fontSize: '14px', borderRadius: '999px', fontWeight: 700 }}>
                        ◔ {Number(seri.yanit_sayisi || 0)} yorum
                      </span>
                    </Link>
                    <button
                      onClick={() => toggleReaction(seri.id, 'bookmark')}
                      style={{ minHeight: '40px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: yerImiKonuIdleri.includes(seri.id) ? 'rgba(243,210,135,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${yerImiKonuIdleri.includes(seri.id) ? 'rgba(243,210,135,0.28)' : 'rgba(255,255,255,0.08)'}`, color: yerImiKonuIdleri.includes(seri.id) ? '#f3d287' : '#f0f0eb', fontSize: '14px', cursor: 'pointer', borderRadius: '999px', fontFamily: 'inherit', fontWeight: 700 }}
                    >
                      {yerImiKonuIdleri.includes(seri.id) ? '▣' : '▢'} Yer imi
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '10px', minWidth: '110px' }}>
                  <div style={{ color: '#8f8f89', fontSize: '18px', textAlign: 'right' }}>⋯</div>
                  <Link href={seri.href || `/seri/${seri.slug}`} style={{ padding: '14px 12px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', textDecoration: 'none' }}>
                    <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: '34px', lineHeight: 0.9 }}>{Number(seri.yanit_sayisi || 0)}</div>
                    <div style={{ color: '#a7a7a1', fontSize: '10px', letterSpacing: '0.7px', textTransform: 'uppercase', marginTop: '4px' }}>yorumu aç</div>
                  </Link>
                </div>
              </div>
            </article>
        ))}
      </div>
    </>
  )
}
