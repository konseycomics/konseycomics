'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ArrowLeft, BarChart3, Bell, BellOff, Clock3, Eye, Flag, Heart, ImageIcon, Lock, MessageSquare, Pin, Reply, Send, ShieldAlert, Trash2, Unlock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getForumForCategory } from '../lib/forumConfig'

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })
}

function UserPanel({ profile, label }) {
  const letter = profile?.kullanici_adi?.[0]?.toUpperCase() || 'K'
  return (
    <aside className="forum-post-user">
      <div className="forum-post-avatar">
        {profile?.avatar_url ? <Image src={profile.avatar_url} alt="" width={74} height={74} unoptimized /> : letter}
      </div>
      <strong>{profile?.kullanici_adi || 'Konsey Üyesi'}</strong>
      <span className="forum-user-rank">{profile?.unvan || label || 'Okuyucu'}</span>
      <small>Konsey üyesi</small>
    </aside>
  )
}

function SpoilerContent({ active, children }) {
  const [visible, setVisible] = useState(!active)
  if (active && !visible) {
    return (
      <div className="forum-spoiler-box">
        <strong>Spoiler içeren mesaj</strong>
        <span>İçeriği görmek için onaylaman gerekiyor.</span>
        <button type="button" onClick={() => setVisible(true)}>Mesajı göster</button>
      </div>
    )
  }
  return (
    <>
      {active ? <button className="forum-hide-spoiler" type="button" onClick={() => setVisible(false)}>Spoileri gizle</button> : null}
      {children}
    </>
  )
}

function RichContent({ value }) {
  return String(value || '').split(/\n{2,}/).map((block, index) => {
    const imageMatch = block.trim().match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/)
    if (imageMatch) {
      return <a className="forum-post-image" href={imageMatch[2]} target="_blank" rel="noreferrer" key={index}><Image src={imageMatch[2]} alt={imageMatch[1] || 'Forum görseli'} width={1200} height={800} unoptimized /></a>
    }
    if (block.trim().startsWith('>')) return <blockquote key={index}>{block.replace(/^>\s?/gm, '')}</blockquote>
    return <p key={index}>{block}</p>
  })
}

export default function ForumTopicClient({ topic, initialReplies = [] }) {
  const [replies, setReplies] = useState(initialReplies)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replyTarget, setReplyTarget] = useState(null)
  const [spoiler, setSpoiler] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(Number(topic?.begeni_sayisi || 0))
  const [pollResults, setPollResults] = useState(topic?.anket_sonuclari || [])
  const [pollTotal, setPollTotal] = useState(Number(topic?.anket_toplam_oy || 0))
  const [pollSelection, setPollSelection] = useState(null)
  const [subscribed, setSubscribed] = useState(false)
  const [topicState, setTopicState] = useState({ pinned: Boolean(topic.sabitlendi), locked: Boolean(topic.kilitli) })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return
      const currentUser = session?.user || null
      setUser(currentUser)
      if (!currentUser?.id) return

      const requests = [
        supabase.from('public_profiller').select('id, kullanici_adi, avatar_url, rol').eq('id', currentUser.id).maybeSingle(),
        supabase.from('topluluk_begenileri').select('id').eq('kullanici_id', currentUser.id).eq('konu_id', topic.id).maybeSingle(),
        supabase.from('topluluk_abonelikleri').select('id').eq('kullanici_id', currentUser.id).eq('konu_id', topic.id).maybeSingle(),
      ]
      if (topic.anket_aktif) requests.push(supabase.from('topluluk_anket_oylari').select('secenek_index').eq('kullanici_id', currentUser.id).eq('konu_id', topic.id).maybeSingle())
      const [profileResult, likeResult, subscriptionResult, voteResult] = await Promise.all(requests)
      if (!active) return
      setProfile(profileResult.data || null)
      setLiked(Boolean(likeResult.data?.id))
      setSubscribed(Boolean(subscriptionResult.data?.id))
      setPollSelection(voteResult?.data?.secenek_index ?? null)
    }
    load()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null))
    return () => { active = false; subscription.unsubscribe() }
  }, [topic.id, topic.anket_aktif])

  async function authFetch(url, payload) {
    const { data: { session } } = await supabase.auth.getSession()
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify(payload),
    })
  }

  async function toggleLike() {
    if (!user) return setMessage('Beğenmek için giriş yapman gerekiyor.')
    const response = await authFetch('/api/community/reactions/toggle', { konuId: topic.id, type: 'like' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) return setMessage(result.error || 'İşlem tamamlanamadı.')
    setLiked(result.active)
    setLikeCount((count) => Math.max(0, count + (result.active ? 1 : -1)))
  }

  async function toggleSubscription() {
    if (!user) return setMessage('Konuyu takip etmek için giriş yapman gerekiyor.')
    const response = await authFetch('/api/community/subscriptions/toggle', { konuId: topic.id })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) return setMessage(result.error || 'Takip durumu değiştirilemedi.')
    setSubscribed(result.active)
    setMessage(result.active ? 'Bu konudaki yeni yanıtları takip ediyorsun.' : 'Konu takibi kapatıldı.')
  }

  async function reportContent(yanitId = null) {
    if (!user) return setMessage('Bildirim göndermek için giriş yapman gerekiyor.')
    const reason = window.prompt('Bildirim nedenini kısaca yaz:')
    if (!reason?.trim()) return
    const response = await authFetch('/api/community/reports', { konuId: topic.id, yanitId, neden: reason.trim() })
    const result = await response.json().catch(() => ({}))
    setMessage(response.ok ? 'Bildirimin moderasyon ekibine ulaştı.' : result.error || 'Bildirim gönderilemedi.')
  }

  async function uploadReplyImage(file) {
    if (!file) return
    if (!user) return setMessage('Görsel yüklemek için giriş yapman gerekiyor.')
    setUploading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'forum')
    formData.append('prefix', 'yanit')
    const response = await fetch('/api/media/upload', { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token || ''}` }, body: formData })
    const result = await response.json().catch(() => ({}))
    setUploading(false)
    if (!response.ok) return setMessage(result.error || 'Görsel yüklenemedi.')
    setReplyText((current) => `${current}${current ? '\n\n' : ''}![Görsel](${result.url})`)
    setMessage('Görsel yanıtına eklendi.')
  }

  async function submitReply() {
    if (!user) return setMessage('Yanıt yazmak için giriş yapman gerekiyor.')
    if (replyText.trim().length < 2) return setMessage('Yanıt çok kısa kaldı.')
    setSubmitting(true)
    setMessage('')
    const response = await authFetch('/api/community/replies', { konuId: topic.id, icerik: replyText, spoiler, parentYanitId: replyTarget?.id || null })
    const result = await response.json().catch(() => ({}))
    setSubmitting(false)
    if (!response.ok) return setMessage(result.error || 'Yanıt gönderilemedi.')
    setReplies((current) => [...current, result.reply])
    setReplyText('')
    setReplyTarget(null)
    setSpoiler(false)
    setMessage('Yanıtın paylaşıldı.')
  }

  async function vote(index) {
    if (!user) return setMessage('Oy vermek için giriş yapman gerekiyor.')
    const response = await authFetch('/api/community/polls/vote', { konuId: topic.id, secenekIndex: index })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) return setMessage(result.error || 'Oy verilemedi.')
    setPollSelection(result.seciliIndex)
    setPollResults(result.sonuclar || [])
    setPollTotal(Number(result.toplamOy || 0))
  }

  async function manageTopic(action) {
    if (['hide', 'delete'].includes(action) && !window.confirm(action === 'hide' ? 'Bu konuyu gizlemek istiyor musun?' : 'Bu konuyu silmek istiyor musun?')) return
    const response = await authFetch('/api/community/topics/manage', { konuId: topic.id, action })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) return setMessage(result.error || 'İşlem tamamlanamadı.')
    if (['hide', 'delete'].includes(action)) return window.location.href = '/topluluk'
    if (action === 'pin' || action === 'unpin') setTopicState((current) => ({ ...current, pinned: action === 'pin' }))
    if (action === 'lock' || action === 'unlock') setTopicState((current) => ({ ...current, locked: action === 'lock' }))
    setMessage('Konu ayarı güncellendi.')
  }

  const isOwner = Boolean(user?.id && user.id === topic?.profil?.id)
  const isAdmin = ['admin', 'yonetici', 'moderator'].includes(String(profile?.rol || '').toLowerCase())
  const forum = getForumForCategory(topic?.kategori)

  return (
    <div className="forum-topic-page">
      <nav className="forum-breadcrumb">
        <Link href="/topluluk"><ArrowLeft size={15} /> Forumlar</Link>
        <span>/</span><Link href={`/topluluk/forum/${forum.slug}`}>{forum.name}</Link>
      </nav>

      <header className="forum-topic-header">
        <div>
          <span>{topicState.pinned ? 'Sabit konu · ' : ''}{topic.kategori || 'Genel Sohbet'}{topicState.locked ? ' · Kilitli' : ''}</span>
          <h1>{topic.spoiler ? 'Spoiler içeren konu' : topic.baslik}</h1>
          <div><Clock3 size={14} /> {formatDate(topic.created_at)} <Eye size={14} /> {Number(topic.goruntulenme_sayisi || 0)} görüntüleme</div>
        </div>
        <a href="#yanit-yaz" className="forum-primary-button"><Reply size={16} /> Yanıtla</a>
      </header>

      <article className="forum-post original">
        <UserPanel profile={topic.profil} label="Konu sahibi" />
        <div className="forum-post-body">
          <div className="forum-post-meta"><span>{formatDate(topic.created_at)}</span><strong>#1</strong></div>
          <SpoilerContent active={topic.spoiler}>
            <div className="forum-post-content"><RichContent value={topic.icerik_tam || topic.icerik} /></div>
          </SpoilerContent>

          {topic.anket_aktif && pollResults.length > 0 ? (
            <section className="forum-topic-poll">
              <div><BarChart3 size={17} /> {topic.anket_sorusu || topic.baslik}</div>
              {pollResults.map((option) => (
                <button className={pollSelection === option.index ? 'selected' : ''} key={option.index} onClick={() => vote(option.index)}>
                  <span><strong>{option.label}</strong><small>{option.oy} oy</small></span>
                  <span className="forum-poll-track"><i style={{ width: `${option.yuzde}%` }} /></span>
                  <b>%{option.yuzde}</b>
                </button>
              ))}
              <small>Toplam {pollTotal} oy</small>
            </section>
          ) : null}

          <div className="forum-post-actions">
            <button className={liked ? 'active' : ''} onClick={toggleLike}><Heart size={15} fill={liked ? 'currentColor' : 'none'} /> {likeCount} beğeni</button>
            <button className={subscribed ? 'active' : ''} onClick={toggleSubscription}>{subscribed ? <BellOff size={15} /> : <Bell size={15} />} {subscribed ? 'Takibi bırak' : 'Takip et'}</button>
            <button onClick={() => reportContent()}><Flag size={14} /> Bildir</button>
            {(isOwner || isAdmin) ? <span className="forum-post-admin-actions">
              {isOwner ? <button onClick={() => manageTopic('delete')}><Trash2 size={14} /> Sil</button> : null}
              {isAdmin ? <button onClick={() => manageTopic('hide')}><ShieldAlert size={14} /> Gizle</button> : null}
              {isAdmin ? <button onClick={() => manageTopic(topicState.pinned ? 'unpin' : 'pin')}><Pin size={14} /> {topicState.pinned ? 'Sabiti kaldır' : 'Sabitle'}</button> : null}
              {isAdmin ? <button onClick={() => manageTopic(topicState.locked ? 'unlock' : 'lock')}>{topicState.locked ? <Unlock size={14} /> : <Lock size={14} />} {topicState.locked ? 'Kilidi aç' : 'Kilitle'}</button> : null}
            </span> : null}
          </div>
        </div>
      </article>

      <div className="forum-replies-head"><div><MessageSquare size={17} /> Yanıtlar</div><span>{replies.length} mesaj</span></div>

      {replies.length > 0 ? replies.map((reply, index) => {
        const parent = reply.parent_yanit_id ? replies.find((item) => item.id === reply.parent_yanit_id) : null
        return (
          <article className="forum-post" key={reply.id}>
            <UserPanel profile={reply.profil} />
            <div className="forum-post-body">
              <div className="forum-post-meta"><span>{formatDate(reply.created_at)}</span><strong>#{index + 2}</strong></div>
              {parent ? <div className="forum-quoted-user">{parent.profil?.kullanici_adi || 'Bir kullanıcı'} adlı üyeye yanıt</div> : null}
              <SpoilerContent active={reply.spoiler}><div className="forum-post-content"><RichContent value={reply.icerik} /></div></SpoilerContent>
              <div className="forum-post-actions">
                <button onClick={() => { setReplyTarget(reply); document.getElementById('yanit-yaz')?.scrollIntoView({ behavior: 'smooth' }) }}><Reply size={15} /> Yanıtla</button>
                <button onClick={() => reportContent(reply.id)}><Flag size={14} /> Bildir</button>
              </div>
            </div>
          </article>
        )
      }) : <div className="forum-no-replies">Bu konuya henüz yanıt yazılmadı.</div>}

      {topicState.locked && !isAdmin ? <div className="forum-topic-locked"><Lock size={17} /> Bu konu yeni yanıtlara kapatıldı.</div> : <section className="forum-reply-editor" id="yanit-yaz">
        <div className="forum-section-title"><div><Send size={17} /> Yanıt yaz</div>{replyTarget ? <button onClick={() => setReplyTarget(null)}>Yanıtı iptal et</button> : null}</div>
        {replyTarget ? <div className="forum-reply-target">{replyTarget.profil?.kullanici_adi || 'Konsey Üyesi'} adlı kullanıcıya yanıt veriyorsun.</div> : null}
        <textarea value={replyText} onChange={(event) => setReplyText(event.target.value)} rows={7} placeholder="Mesajını yaz..." />
        <div className="forum-reply-footer">
          <label><input type="checkbox" checked={spoiler} onChange={(event) => setSpoiler(event.target.checked)} /> Spoiler içeriyor</label>
          <label className="forum-image-upload"><ImageIcon size={15} /> {uploading ? 'Yükleniyor...' : 'Görsel ekle'}<input type="file" accept="image/*" disabled={uploading} onChange={(event) => uploadReplyImage(event.target.files?.[0])} /></label>
          {message ? <span>{message}</span> : null}
          <button onClick={submitReply} disabled={submitting}><Send size={15} /> {submitting ? 'Gönderiliyor...' : 'Yanıtı Gönder'}</button>
        </div>
      </section>}
    </div>
  )
}
