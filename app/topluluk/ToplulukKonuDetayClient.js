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

function ReplyCard({
  reply,
  childReplies = [],
  sessionUser,
  onReplySubmit,
  depth = 0,
}) {
  const avatarLetter = reply?.profil?.kullanici_adi?.[0]?.toUpperCase() || 'K'
  const [spoilerVisible, setSpoilerVisible] = useState(!reply?.spoiler)
  const [isReplying, setIsReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [spoiler, setSpoiler] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  async function submitNestedReply() {
    if (!sessionUser) {
      setMessage('Yanıta yanıt vermek için giriş yapman gerekiyor.')
      return
    }

    if (replyText.trim().length < 2) {
      setMessage('Yanıt çok kısa.')
      return
    }

    setIsSubmitting(true)
    setMessage('')

    const ok = await onReplySubmit({
      icerik: replyText,
      spoiler,
      parentYanitId: reply.id,
    })

    setIsSubmitting(false)

    if (!ok) {
      setMessage('Yanıt gönderilemedi.')
      return
    }

    setReplyText('')
    setSpoiler(false)
    setIsReplying(false)
  }

  return (
    <article
      style={{
        padding: '18px',
        borderRadius: '18px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
        marginLeft: depth > 0 ? `${Math.min(depth, 3) * 18}px` : 0,
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '48px minmax(0, 1fr)', gap: '14px', alignItems: 'start' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            background: '#111',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontWeight: 800,
          }}
        >
          {reply?.profil?.avatar_url ? (
            <img src={reply.profil.avatar_url} alt={reply.profil.kullanici_adi || 'Profil'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            avatarLetter
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>
              {reply?.profil?.kullanici_adi || 'Konsey Üyesi'}
            </span>
            {reply?.profil?.unvan ? (
              <span style={{ color: '#bca66a', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {reply.profil.unvan}
              </span>
            ) : null}
            <span style={{ color: '#9f9f98', fontSize: '12px' }}>
              {formatDateTime(reply.created_at)}
            </span>
          </div>
          {reply?.spoiler && !spoilerVisible ? (
            <div style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(243,210,135,0.22)', background: 'rgba(243,210,135,0.08)' }}>
              <div style={{ color: '#f3d287', fontSize: '13px', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Spoilerlı Yorum
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSpoilerVisible(true)}
                  style={{ minHeight: '38px', padding: '0 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: '#fff', color: '#111', fontSize: '13px', fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  Göster
                </button>
              </div>
            </div>
          ) : (
            <div>
              {reply?.spoiler ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <div style={{ color: '#f3d287', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Spoilerlı Yorum
                  </div>
                  <button
                    onClick={() => setSpoilerVisible(false)}
                    style={{ minHeight: '34px', padding: '0 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '12px', fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}
                  >
                    Kapat
                  </button>
                </div>
              ) : null}
              <div style={{ color: '#d4d4ce', fontSize: '14px', lineHeight: 1.75 }}>
                {reply.icerik}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsReplying((prev) => !prev)}
              style={{ minHeight: '34px', padding: '0 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: isReplying ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '12px', fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              {isReplying ? 'Vazgeç' : 'Yanıtla'}
            </button>
          </div>
          {isReplying ? (
            <div style={{ marginTop: '14px', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)' }}>
              <textarea
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="Bu yanıta cevabını yaz..."
                rows={3}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '14px', lineHeight: 1.7, resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: '10px' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#bdbdb7', fontSize: '12px' }}>
                  <input type="checkbox" checked={spoiler} onChange={(event) => setSpoiler(event.target.checked)} />
                  Spoiler içeriyor
                </label>
                <button
                  onClick={submitNestedReply}
                  disabled={isSubmitting}
                  style={{ minHeight: '38px', padding: '0 16px', borderRadius: '12px', border: 'none', background: '#fff', color: '#111', fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {isSubmitting ? 'Gönderiliyor' : 'Yanıtı Gönder'}
                </button>
              </div>
              {message ? <div style={{ marginTop: '10px', color: '#ffb4b4', fontSize: '12px' }}>{message}</div> : null}
            </div>
          ) : null}
        </div>
      </div>
      {childReplies.length > 0 ? (
        <div style={{ display: 'grid', gap: '12px', marginTop: '14px' }}>
          {childReplies.map((childReply) => (
            <ReplyCard
              key={childReply.id}
              reply={childReply}
              childReplies={childReply.children || []}
              sessionUser={sessionUser}
              onReplySubmit={onReplySubmit}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </article>
  )
}

export default function ToplulukKonuDetayClient({ topic, initialReplies = [] }) {
  const [replies, setReplies] = useState(initialReplies)
  const [sessionUser, setSessionUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [spoiler, setSpoiler] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [begendim, setBegendim] = useState(false)
  const [likeCount, setLikeCount] = useState(Number(topic?.begeni_sayisi || 0))
  const [pollResults, setPollResults] = useState(topic?.anket_sonuclari || [])
  const [pollTotalVotes, setPollTotalVotes] = useState(Number(topic?.anket_toplam_oy || 0))
  const [pollSelection, setPollSelection] = useState(null)
  const [topicSpoilerVisible, setTopicSpoilerVisible] = useState(!topic?.spoiler)

  useEffect(() => {
    let active = true

    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return

      const user = session?.user || null
      setSessionUser(user)

      if (user?.id) {
        const requests = [
          supabase
            .from('public_profiller')
            .select('id, kullanici_adi, avatar_url, rol')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('topluluk_begenileri')
            .select('id')
            .eq('kullanici_id', user.id)
            .eq('konu_id', topic.id)
            .maybeSingle(),
        ]

        if (topic?.anket_aktif) {
          requests.push(
            supabase
              .from('topluluk_anket_oylari')
              .select('secenek_index')
              .eq('kullanici_id', user.id)
              .eq('konu_id', topic.id)
              .maybeSingle()
          )
        }

        const [profileResult, likedResult, votedResult] = await Promise.all(requests)

        if (!active) return
        setProfile(profileResult?.data || null)
        setBegendim(Boolean(likedResult?.data?.id))
        setPollSelection(votedResult?.data?.secenek_index ?? null)
      } else {
        setProfile(null)
      }
    }

    loadSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user || null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function toggleLike() {
    if (!sessionUser) {
      setMessage('Bu etkileşim için giriş yapman gerekiyor.')
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch('/api/community/reactions/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({ konuId: topic.id, type: 'like' }),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setMessage(result?.error || 'İşlem tamamlanamadı.')
      return
    }

    setBegendim(result.active)
    setLikeCount((prev) => Math.max(0, prev + (result.active ? 1 : -1)))
  }

  async function manageTopic(action) {
    if (!sessionUser) {
      setMessage('Bu işlem için giriş yapman gerekiyor.')
      return
    }

    const confirmed = window.confirm(
      action === 'hide'
        ? 'Bu konuyu topluluk akışından gizlemek istiyor musun?'
        : 'Bu konuyu silmek istiyor musun? Bu işlem görünümden kaldırır.'
    )

    if (!confirmed) return

    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch('/api/community/topics/manage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({ konuId: topic.id, action }),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setMessage(result?.error || 'Konu işlemi tamamlanamadı.')
      return
    }

    window.location.href = '/topluluk'
  }

  async function submitReply({ icerik, spoiler: replySpoiler, parentYanitId = null }) {
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch('/api/community/replies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({
        konuId: topic.id,
        icerik,
        spoiler: replySpoiler,
        parentYanitId,
      }),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setMessage(result?.error || 'Yanıt gönderilemedi.')
      return false
    }

    setReplies((prev) => [...prev, result.reply])
    return true
  }

  async function handleReplySubmit() {
    if (!sessionUser) {
      setMessage('Yanıt yazmak için giriş yapman gerekiyor.')
      return
    }

    if (replyText.trim().length < 2) {
      setMessage('Yanıt çok kısa kaldı.')
      return
    }

    setIsSubmitting(true)
    setMessage('')

    const ok = await submitReply({
      icerik: replyText,
      spoiler,
      parentYanitId: null,
    })

    setIsSubmitting(false)

    if (!ok) return

    setReplyText('')
    setSpoiler(false)
    setMessage('Yanıtın paylaşıldı.')
  }

  async function handlePollVote(index) {
    if (!sessionUser) {
      setMessage('Oy vermek için giriş yapman gerekiyor.')
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch('/api/community/polls/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({
        konuId: topic.id,
        secenekIndex: index,
      }),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setMessage(result?.error || 'Oy verilemedi.')
      return
    }

    setPollSelection(result.seciliIndex)
    setPollResults(result.sonuclar || [])
    setPollTotalVotes(Number(result.toplamOy || 0))
  }

  const avatarLetter = topic?.profil?.kullanici_adi?.[0]?.toUpperCase() || 'K'
  const isOwner = Boolean(sessionUser?.id && sessionUser.id === topic?.profil?.id)
  const isAdmin = ['admin', 'yonetici'].includes(String(profile?.rol || '').toLowerCase())
  const replyTree = useMemo(() => {
    const byParent = new Map()
    for (const reply of replies) {
      const parentId = reply.parent_yanit_id || 'root'
      if (!byParent.has(parentId)) byParent.set(parentId, [])
      byParent.get(parentId).push({ ...reply, children: [] })
    }

    function attach(parentId = 'root') {
      return (byParent.get(parentId) || []).map((reply) => ({
        ...reply,
        children: attach(reply.id),
      }))
    }

    return attach('root')
  }, [replies])

  return (
    <>
      <section
        style={{
          padding: '22px',
          borderRadius: '22px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
          marginBottom: '18px',
        }}
      >
        <Link href="/topluluk" style={{ color: '#b7b7b0', textDecoration: 'none', fontSize: '13px', fontWeight: 700, display: 'inline-flex', gap: '8px', alignItems: 'center', marginBottom: '18px' }}>
          ← Topluluk akışına dön
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: '60px minmax(0, 1fr)', gap: '16px', alignItems: 'start' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#111',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontWeight: 800,
            }}
          >
            {topic?.profil?.avatar_url ? (
              <img src={topic.profil.avatar_url} alt={topic.profil.kullanici_adi || 'Profil'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              avatarLetter
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>{topic?.profil?.kullanici_adi || 'Konsey Üyesi'}</span>
              {topic?.profil?.unvan ? (
                <span style={{ color: '#bca66a', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  {topic.profil.unvan}
                </span>
              ) : null}
              <span style={{ color: '#9f9f98', fontSize: '12px' }}>{formatDateTime(topic?.created_at)}</span>
              <span style={{ color: '#8f8f89', fontSize: '12px' }}>• {topic?.kategori || 'Genel Sohbet'}</span>
              {topic?.spoiler ? (
                <span style={{ color: '#f3d287', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Spoilerlı Konu
                </span>
              ) : null}
            </div>

            <h1 style={{ margin: '0 0 12px', color: '#fff', fontSize: 'clamp(26px, 3vw, 40px)', lineHeight: 1.05, fontFamily: 'var(--font-display)' }}>
              {topic?.baslik}
            </h1>

            {topic?.spoiler && !topicSpoilerVisible ? (
              <div style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(243,210,135,0.22)', background: 'rgba(243,210,135,0.08)', marginBottom: '16px' }}>
                <div style={{ color: '#f3d287', fontSize: '13px', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Spoilerlı Konu
                </div>
                <div style={{ color: '#ddd7c4', fontSize: '14px', lineHeight: 1.75, marginBottom: '10px' }}>
                  Bu konu spoiler içeriyor. Açmak istersen içeriği gösterebilirsin.
                </div>
                <button
                  onClick={() => setTopicSpoilerVisible(true)}
                  style={{ minHeight: '38px', padding: '0 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: '#fff', color: '#111', fontSize: '13px', fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  Göster
                </button>
              </div>
            ) : (
              <div>
                {topic?.spoiler ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <div style={{ color: '#f3d287', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      Spoilerlı Konu
                    </div>
                    <button
                      onClick={() => setTopicSpoilerVisible(false)}
                      style={{ minHeight: '34px', padding: '0 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '12px', fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}
                    >
                      Kapat
                    </button>
                  </div>
                ) : null}
                <div style={{ color: '#d0d0ca', fontSize: '15px', lineHeight: 1.85, marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
                  {topic?.icerik_tam || topic?.icerik}
                </div>
              </div>
            )}

            {(topic?.etiketler || []).length > 0 ? (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {topic.etiketler.map((tag) => (
                  <span key={tag} style={{ minHeight: '30px', display: 'inline-flex', alignItems: 'center', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#d9d9d4', fontSize: '11px', fontWeight: 700 }}>
                    {String(tag).toLowerCase()}
                  </span>
                ))}
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', color: '#c8c8c1', fontSize: '13px' }}>
              <span>◔ {Number(topic?.yanit_sayisi || replies.length)} yorum</span>
              <button
                onClick={toggleLike}
                style={{ background: 'transparent', border: 'none', padding: 0, color: begendim ? '#ff9ea1' : '#c8c8c1', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}
              >
                {begendim ? '♥' : '♡'} {likeCount} beğeni
              </button>
              <span>⌕ {Number(topic?.goruntulenme_sayisi || 0)} görüntülenme</span>
            </div>
            {(isOwner || isAdmin) ? (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
                {isOwner ? (
                  <button
                    onClick={() => manageTopic('delete')}
                    style={{ minHeight: '38px', padding: '0 14px', borderRadius: '12px', border: '1px solid rgba(255,120,120,0.2)', background: 'rgba(255,120,120,0.08)', color: '#ffb2b2', fontSize: '13px', fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}
                  >
                    Konuyu Sil
                  </button>
                ) : null}
                {isAdmin ? (
                  <button
                    onClick={() => manageTopic('hide')}
                    style={{ minHeight: '38px', padding: '0 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '13px', fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}
                  >
                    Konuyu Gizle
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {topic?.anket_aktif && Array.isArray(topic?.anket_sonuclari) && (!topic?.spoiler || topicSpoilerVisible) ? (
          <section style={{ marginTop: '20px', padding: '18px', borderRadius: '18px', border: '1px solid rgba(243,210,135,0.18)', background: 'rgba(243,210,135,0.06)' }}>
            <div style={{ color: '#f3d287', fontSize: '12px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
              Anket
            </div>
            <div style={{ color: '#fff', fontSize: '22px', fontWeight: 800, marginBottom: '14px' }}>
              {topic.anket_sorusu || topic.baslik}
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              {pollResults.map((option) => (
                <button
                  key={option.index}
                  onClick={() => handlePollVote(option.index)}
                  style={{ padding: '14px 16px', borderRadius: '14px', border: `1px solid ${pollSelection === option.index ? 'rgba(243,210,135,0.34)' : 'rgba(255,255,255,0.08)'}`, background: pollSelection === option.index ? 'rgba(243,210,135,0.12)' : 'rgba(255,255,255,0.03)', color: '#fff', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700 }}>{option.label}</span>
                    <span style={{ color: '#d6d6d0', fontSize: '13px', fontWeight: 700 }}>%{option.yuzde}</span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ width: `${option.yuzde}%`, height: '100%', background: 'linear-gradient(90deg, rgba(243,210,135,0.9), rgba(255,255,255,0.45))' }} />
                  </div>
                  <div style={{ color: '#bdbdb7', fontSize: '12px' }}>{option.oy} oy</div>
                </button>
              ))}
            </div>
            <div style={{ color: '#bdbdb7', fontSize: '12px', marginTop: '12px' }}>
              Toplam oy: {pollTotalVotes}
            </div>
          </section>
        ) : null}
      </section>

      <section
        style={{
          padding: '18px',
          borderRadius: '18px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
          marginBottom: '18px',
        }}
      >
        <div style={{ color: '#fff', fontSize: '22px', fontWeight: 800, marginBottom: '10px' }}>Yanıt Yaz</div>
        <div style={{ color: '#b8b8b2', fontSize: '14px', lineHeight: 1.7, marginBottom: '14px' }}>
          Bu konuyu büyütmek için düşünceni bırak. Şimdilik yazı tabanlı gidiyoruz; ilk çalışan sürümümüz burada.
        </div>
        <textarea
          value={replyText}
          onChange={(event) => setReplyText(event.target.value)}
          placeholder="Yanıtını yaz..."
          rows={5}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            color: '#fff',
            fontSize: '14px',
            lineHeight: 1.7,
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: '12px',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#bdbdb7', fontSize: '13px' }}>
            <input type="checkbox" checked={spoiler} onChange={(event) => setSpoiler(event.target.checked)} />
            Spoiler içeriyor
          </label>
          <button
            onClick={handleReplySubmit}
            disabled={isSubmitting}
            style={{
              minHeight: '42px',
              padding: '0 18px',
              borderRadius: '12px',
              border: 'none',
              background: '#fff',
              color: '#111',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {isSubmitting ? 'Paylaşılıyor' : 'Yanıtı Paylaş'}
          </button>
        </div>
        {message ? (
          <div style={{ marginTop: '12px', color: message === 'Yanıtın paylaşıldı.' ? '#8fda8f' : '#ffb4b4', fontSize: '13px' }}>
            {message}
          </div>
        ) : null}
      </section>

      <section style={{ display: 'grid', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ color: '#fff', fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
            Yanıtlar
          </div>
          <div style={{ color: '#9f9f98', fontSize: '13px' }}>
            {replies.length} adet yanıt
          </div>
        </div>

        {replies.length === 0 ? (
          <div style={{ padding: '20px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#b8b8b2', fontSize: '14px' }}>
            Bu konuya ilk yanıtı sen bırakabilirsin.
          </div>
        ) : (
          replyTree.map((reply) => (
            <ReplyCard
              key={reply.id}
              reply={reply}
              childReplies={reply.children || []}
              sessionUser={sessionUser}
              onReplySubmit={submitReply}
            />
          ))
        )}
      </section>
    </>
  )
}
