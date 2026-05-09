'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
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

function ReplyCard({ reply }) {
  const avatarLetter = reply?.profil?.kullanici_adi?.[0]?.toUpperCase() || 'K'

  return (
    <article
      style={{
        padding: '18px',
        borderRadius: '18px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
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
          <div style={{ color: '#d4d4ce', fontSize: '14px', lineHeight: 1.75 }}>
            {reply.icerik}
          </div>
        </div>
      </div>
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

  useEffect(() => {
    let active = true

    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return

      const user = session?.user || null
      setSessionUser(user)

      if (user?.id) {
        const { data } = await supabase
          .from('public_profiller')
          .select('id, kullanici_adi, avatar_url')
          .eq('id', user.id)
          .maybeSingle()

        if (!active) return
        setProfile(data || null)
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

    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch('/api/community/replies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({
        konuId: topic.id,
        icerik: replyText,
        spoiler,
      }),
    })

    const result = await response.json().catch(() => ({}))
    setIsSubmitting(false)

    if (!response.ok) {
      setMessage(result?.error || 'Yanıt gönderilemedi.')
      return
    }

    setReplies((prev) => [...prev, result.reply])
    setReplyText('')
    setSpoiler(false)
    setMessage('Yanıtın paylaşıldı.')
  }

  const avatarLetter = topic?.profil?.kullanici_adi?.[0]?.toUpperCase() || 'K'

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
            </div>

            <h1 style={{ margin: '0 0 12px', color: '#fff', fontSize: 'clamp(26px, 3vw, 40px)', lineHeight: 1.05, fontFamily: 'var(--font-display)' }}>
              {topic?.baslik}
            </h1>

            <div style={{ color: '#d0d0ca', fontSize: '15px', lineHeight: 1.85, marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
              {topic?.icerik_tam || topic?.icerik}
            </div>

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
              <span>♡ {Number(topic?.begeni_sayisi || 0)} beğeni</span>
              <span>⌕ {Number(topic?.goruntulenme_sayisi || 0)} görüntülenme</span>
            </div>
          </div>
        </div>
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
          replies.map((reply) => <ReplyCard key={reply.id} reply={reply} />)
        )}
      </section>
    </>
  )
}
