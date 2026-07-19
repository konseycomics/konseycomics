'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Clapperboard,
  Clock3,
  Flame,
  FolderOpen,
  Megaphone,
  MessageSquare,
  ImageIcon,
  PenLine,
  Pin,
  Search,
  PanelsTopLeft,
  Users,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { FORUMS, FORUM_SECTIONS, getForumBySlug, topicBelongsToForum } from '../lib/forumConfig'
import ForumAuthModal from './ForumAuthModal'

const FORUM_ICONS = {
  megaphone: Megaphone,
  panels: PanelsTopLeft,
  book: BookOpen,
  film: Clapperboard,
  message: MessageSquare,
  help: CircleHelp,
  pen: PenLine,
}

function formatDate(value) {
  if (!value) return 'Henüz mesaj yok'
  return new Date(value).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  })
}

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR')
}

function topicScore(topic) {
  return Number(topic.yanit_sayisi || 0) * 4 + Number(topic.begeni_sayisi || 0) * 2 + Number(topic.goruntulenme_sayisi || 0)
}

function forumTopics(topics, forum) {
  return topics.filter((topic) => topicBelongsToForum(topic, forum))
}

function Avatar({ profile, size = 38 }) {
  const letter = profile?.kullanici_adi?.[0]?.toUpperCase() || 'K'
  return (
    <div className="forum-avatar" style={{ width: size, height: size }}>
      {profile?.avatar_url ? <Image src={profile.avatar_url} alt="" width={size} height={size} unoptimized /> : letter}
    </div>
  )
}

function TeamMark({ profile }) {
  return profile?.ekip_uyesi ? <span className="forum-team-mark">Konsey Ekibi · {profile.ekip_rolu || 'Ekip Üyesi'}</span> : null
}

export default function ForumHomeClient({ initialTopics = [], planetPosts = [], activeUsers = [], welcomeProfile = null }) {
  const [topics, setTopics] = useState(initialTopics)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [selectedForum, setSelectedForum] = useState('Tümü')
  const [sort, setSort] = useState('latest')
  const [query, setQuery] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('Genel Sohbet')
  const [spoiler, setSpoiler] = useState(false)
  const [pollOpen, setPollOpen] = useState(false)
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [tags, setTags] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [authPrompt, setAuthPrompt] = useState('')

  useEffect(() => {
    let active = true

    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return
      const currentUser = session?.user || null
      setUser(currentUser)

      if (currentUser?.id) {
        const { data } = await supabase
          .from('public_profiller')
          .select('id, kullanici_adi, avatar_url')
          .eq('id', currentUser.id)
          .maybeSingle()
        if (active) setProfile(data || null)
      }
    }

    loadSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const targetForum = getForumBySlug(params.get('forum'))
    const timer = window.setTimeout(() => {
      if (targetForum) {
        setCategory(targetForum.category)
        setSelectedForum(targetForum.slug)
      }
      if (params.get('compose') === '1') {
        setCategory(targetForum?.category || 'Genel Sohbet')
        setComposerOpen(true)
        requestAnimationFrame(() => requestAnimationFrame(() => {
          document.getElementById('konu-olustur')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }))
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const listedTopics = useMemo(() => {
    let rows = [...topics]
    if (selectedForum !== 'Tümü') rows = forumTopics(rows, getForumBySlug(selectedForum))

    const cleanQuery = normalize(query)
    if (cleanQuery) {
      rows = rows.filter((topic) => [topic.baslik, topic.icerik, topic.kategori, ...(topic.etiketler || [])]
        .some((value) => normalize(value).includes(cleanQuery)))
    }

    if (sort === 'popular') rows.sort((a, b) => topicScore(b) - topicScore(a))
    if (sort === 'unanswered') rows = rows.filter((topic) => Number(topic.yanit_sayisi || 0) === 0)
    if (sort === 'latest' || sort === 'unanswered') {
      rows.sort((a, b) => new Date(b.son_aktivite_at || b.created_at) - new Date(a.son_aktivite_at || a.created_at))
    }
    return rows
  }, [topics, selectedForum, query, sort])

  const totalReplies = topics.reduce((sum, topic) => sum + Number(topic.yanit_sayisi || 0), 0)
  const popularTopics = [...topics].sort((a, b) => topicScore(b) - topicScore(a)).slice(0, 5)

  function openComposer(targetCategory = 'Genel Sohbet') {
    if (!user) {
      setAuthPrompt('yeni konu açmak')
      return
    }
    setCategory(targetCategory)
    setComposerOpen(true)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.getElementById('konu-olustur')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }))
  }

  async function uploadForumImage(file) {
    if (!file) return
    if (!user) return setAuthPrompt('görsel yüklemek')
    setUploading(true)
    setMessage('Görsel hazırlanıyor...')
    const { data: { session } } = await supabase.auth.getSession()
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'forum')
    formData.append('prefix', 'konu')
    const response = await fetch('/api/media/upload', { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token || ''}` }, body: formData })
    const result = await response.json().catch(() => ({}))
    setUploading(false)
    if (!response.ok) return setMessage(result.error || 'Görsel yüklenemedi.')
    setContent((current) => `${current}${current ? '\n\n' : ''}![Görsel](${result.url})`)
    setMessage('Görsel mesaja eklendi.')
  }

  async function createTopic() {
    if (!user) {
      setAuthPrompt('yeni konu açmak')
      return
    }
    if (title.trim().length < 4 || content.trim().length < 10) {
      setMessage('Başlık en az 4, mesaj en az 10 karakter olmalı.')
      return
    }

    setSubmitting(true)
    setMessage('')
    const { data: { session } } = await supabase.auth.getSession()
    const response = await fetch('/api/community/topics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({
        baslik: title,
        icerik: content,
        kategori: category,
        etiketler: tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 5),
        spoiler,
        anket: pollOpen ? { aktif: true, secenekler: pollOptions } : null,
      }),
    })
    const result = await response.json().catch(() => ({}))
    setSubmitting(false)

    if (!response.ok) {
      setMessage(result.error || 'Konu oluşturulamadı.')
      return
    }

    setTopics((current) => [{
      ...result.topic,
      profil: result.topic.profil || profile,
      source: 'topic',
    }, ...current])
    setTitle('')
    setContent('')
    setSpoiler(false)
    setPollOpen(false)
    setPollOptions(['', ''])
    setTags('')
    setSelectedForum(FORUMS.find((forum) => forum.category === category)?.slug || 'genel-sohbet')
    setComposerOpen(false)
  }

  return (
    <div className="forum-home">
      <header className="forum-header">
        <div>
          <div className="forum-eyebrow"><span /> KONSEY FORUMU</div>
          <h1>Konsey Forum</h1>
          <p>Okuduklarımızı konuştuğumuz, teorileri büyüttüğümüz ve yeni dünyalar keşfettiğimiz yer.</p>
          <div className="forum-header-stats">
            <span><strong>{FORUMS.length}</strong> forum</span>
            <span><strong>{topics.length}</strong> konu</span>
            <span><strong>{totalReplies}</strong> yanıt</span>
          </div>
        </div>
        <button className="forum-primary-button" type="button" onClick={() => composerOpen ? setComposerOpen(false) : openComposer()}>
          <PenLine size={17} />
          {composerOpen ? 'Formu Kapat' : 'Yeni Konu'}
        </button>
      </header>

      <section className="forum-welcome-note" aria-labelledby="forum-welcome-title">
        <Link className="forum-welcome-avatar" href="/forum/uye/peter-parker" aria-label="Peter Parker profilini aç">
          <Avatar profile={welcomeProfile} size={64} />
        </Link>
        <div className="forum-welcome-copy">
          <div className="forum-welcome-author">
            <Link href="/forum/uye/peter-parker">{welcomeProfile?.kullanici_adi || 'Peter Parker'}</Link>
            <span>Konsey Ekibi</span>
            <small><Pin size={11} /> Sabit mesaj</small>
          </div>
          <h2 id="forum-welcome-title">Konsey Forum’a hoş geldin.</h2>
          <p>Okuduğunu anlat, merak ettiğini sor, fikrini paylaş. Söz artık sende.</p>
        </div>
        <div className="forum-welcome-actions">
          <Link href="/forum/duyurular"><BookOpen size={15} /> Forum Kuralları</Link>
          <button type="button" onClick={() => openComposer()}><PenLine size={15} /> Konu Aç</button>
        </div>
      </section>

      <div className="forum-toolbar">
        <label className="forum-search">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Forumlarda ara..." />
        </label>
        <div className="forum-quick-links">
          <button type="button" onClick={() => { setSelectedForum('Tümü'); setSort('latest') }}><Clock3 size={16} /> Yeni mesajlar</button>
          <button type="button" onClick={() => { setSelectedForum('Tümü'); setSort('unanswered') }}><CircleHelp size={16} /> Cevapsız konular</button>
        </div>
      </div>

      {composerOpen ? (
        <section className="forum-composer" id="konu-olustur">
          <div className="forum-section-title">
            <div><PenLine size={18} /> Yeni konu oluştur</div>
            <span>Mesajın seçtiğin forumda yayınlanır</span>
          </div>
          <div className="forum-composer-grid">
            <label>
              <span>Forum</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {FORUMS.map((forum) => <option key={forum.slug} value={forum.category}>{forum.name}</option>)}
              </select>
            </label>
            <label className="wide">
              <span>Konu başlığı</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Kısa ve anlaşılır bir başlık yaz" />
            </label>
            <label className="wide">
              <span>Mesaj</span>
              <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={6} placeholder="Düşünceni paylaş..." />
            </label>
            <label className="wide">
              <span>Etiketler</span>
              <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Örn. teori, öneri, koleksiyon" />
            </label>
          </div>
          <div className="forum-composer-options">
            <label><input type="checkbox" checked={spoiler} onChange={(event) => setSpoiler(event.target.checked)} /> Spoiler içeriyor</label>
            <label><input type="checkbox" checked={pollOpen} onChange={(event) => setPollOpen(event.target.checked)} /> Anket ekle</label>
            <label className="forum-image-upload"><ImageIcon size={15} /> {uploading ? 'Yükleniyor...' : 'Görsel ekle'}<input type="file" accept="image/*" disabled={uploading} onChange={(event) => uploadForumImage(event.target.files?.[0])} /></label>
          </div>
          {pollOpen ? (
            <div className="forum-poll-fields">
              {pollOptions.map((option, index) => (
                <input key={index} value={option} onChange={(event) => setPollOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`Seçenek ${index + 1}`} />
              ))}
              {pollOptions.length < 4 ? <button type="button" onClick={() => setPollOptions((current) => [...current, ''])}>Seçenek ekle</button> : null}
            </div>
          ) : null}
          <div className="forum-composer-footer">
            <span className={message ? 'visible' : ''}>{message}</span>
            <button type="button" onClick={createTopic} disabled={submitting}>{submitting ? 'Yayınlanıyor...' : 'Konuyu Yayınla'}</button>
          </div>
        </section>
      ) : null}

      <div className="forum-layout">
        <main className="forum-main-column">
          <div className="forum-index-head">
            <span>Forum</span><span>Konular</span><span>Mesajlar</span><span>Son mesaj</span>
          </div>
          {FORUM_SECTIONS.map((group) => (
            <section className="forum-group" key={group.group}>
              <h2>{group.group}</h2>
              {group.group === 'Konsey' ? (
                <div className="forum-row forum-planet-inline">
                  <Link className="forum-icon gold" href={planetPosts[0]?.href || '/forum'} aria-label="Konsey Planet'i aç">
                    <Bell size={21} />
                  </Link>
                  <Link className="forum-description" href={planetPosts[0]?.href || '/forum'}>
                    <strong>Konsey Planet</strong>
                    <span>Konsey ekibinden haberler, yazılar ve son gelişmeler.</span>
                  </Link>
                  <div className="forum-count"><strong>{planetPosts.length}</strong><span>yayın</span></div>
                  <div className="forum-count"><strong>—</strong><span>mesaj</span></div>
                  <div className="forum-last-post">
                    {planetPosts[0] ? <Link href={planetPosts[0].href}><strong>{planetPosts[0].baslik}</strong><span>{formatDate(planetPosts[0].created_at)}</span></Link> : <span>Henüz yayın yok</span>}
                  </div>
                  <ChevronRight className="forum-row-arrow" size={18} />
                </div>
              ) : null}
              {group.forums.map((forum) => {
                const rows = forumTopics(topics, forum)
                const latest = rows[0]
                const replyCount = rows.reduce((sum, topic) => sum + Number(topic.yanit_sayisi || 0), 0)
                const Icon = FORUM_ICONS[forum.icon] || FolderOpen
                const latestHref = latest?.href || (latest?.slug ? `/forum/konu/${latest.slug}` : '')
                return (
                  <div className="forum-row" key={forum.slug}>
                    <Link className={`forum-icon ${forum.tone}`} href={`/forum/${forum.slug}`} aria-label={`${forum.name} forumunu aç`}>
                      <Icon size={21} />
                    </Link>
                    <Link className="forum-description" href={`/forum/${forum.slug}`}>
                      <strong>{forum.name}</strong>
                      <span>{forum.description}</span>
                    </Link>
                    <div className="forum-count"><strong>{rows.length}</strong><span>konu</span></div>
                    <div className="forum-count"><strong>{replyCount}</strong><span>mesaj</span></div>
                    <div className="forum-last-post">
                      {latest ? (
                        <Link href={latestHref || '#'}>
                          <strong>{latest.baslik}</strong>
                          <span>{latest.profil?.kullanici_adi || 'Konsey Üyesi'} · {formatDate(latest.son_aktivite_at || latest.created_at)}</span>
                        </Link>
                      ) : <span>Henüz konu açılmadı</span>}
                    </div>
                    <ChevronRight className="forum-row-arrow" size={18} />
                  </div>
                )
              })}
            </section>
          ))}

          <section className="forum-topics" id="forum-topics">
            <div className="forum-section-title">
              <div><MessageSquare size={18} /> {selectedForum === 'Tümü' ? 'Son Konular' : getForumBySlug(selectedForum)?.name || 'Son Konular'}</div>
              <div className="forum-sort-tabs">
                <button className={sort === 'latest' ? 'active' : ''} onClick={() => setSort('latest')}>En son</button>
                <button className={sort === 'popular' ? 'active' : ''} onClick={() => setSort('popular')}>Popüler</button>
                <button className={sort === 'unanswered' ? 'active' : ''} onClick={() => setSort('unanswered')}>Cevapsız</button>
              </div>
            </div>
            {listedTopics.length > 0 ? listedTopics.map((topic) => (
              <article className="forum-topic-row" key={topic.id}>
                <Avatar profile={topic.profil} />
                <div className="forum-topic-copy">
                  <div className="forum-topic-flags">
                    {topic.sabitlendi ? <Pin size={13} /> : null}
                    {topic.spoiler ? <span>Spoiler</span> : null}
                    {topic.anket_aktif ? <span>Anket</span> : null}
                  </div>
                  <Link href={topic.href || `/forum/konu/${topic.slug}`}>{topic.spoiler ? 'Spoiler içeren konu' : topic.baslik}</Link>
                  <span>{topic.profil?.kullanici_adi || 'Konsey Üyesi'} · {topic.kategori || 'Genel Sohbet'} <TeamMark profile={topic.profil} /></span>
                </div>
                <div className="forum-topic-stat"><strong>{Number(topic.yanit_sayisi || 0)}</strong><span>yanıt</span></div>
                <div className="forum-topic-stat"><strong>{Number(topic.goruntulenme_sayisi || 0)}</strong><span>görüntüleme</span></div>
                <div className="forum-topic-time"><Clock3 size={14} /><span>{formatDate(topic.son_aktivite_at || topic.created_at)}</span></div>
              </article>
            )) : (
              <div className="forum-empty">
                <MessageSquare size={24} />
                <strong>İlk tartışmayı sen başlat</strong>
                <span>Bu forumda henüz konu yok. Merak ettiğin şeyi sor veya fikrini paylaş.</span>
                <button type="button" onClick={() => openComposer(selectedForum === 'Tümü' ? 'Genel Sohbet' : getForumBySlug(selectedForum)?.category || 'Genel Sohbet')}>
                  <PenLine size={15} /> Yeni Konu Aç
                </button>
              </div>
            )}
          </section>
        </main>

        <aside className="forum-sidebar">
          <section>
            <div className="forum-side-title"><Flame size={17} /> Gündemde</div>
            <div className="forum-side-list">
              {popularTopics.map((topic, index) => (
                <Link href={topic.href || `/forum/konu/${topic.slug}`} key={topic.id}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{topic.baslik}</strong><small>{Number(topic.yanit_sayisi || 0)} yanıt · {topic.kategori}</small></div>
                </Link>
              ))}
              {popularTopics.length === 0 ? <div className="forum-side-empty">İlk popüler tartışma burada yerini alacak.</div> : null}
            </div>
          </section>

          <section>
            <div className="forum-side-title"><Users size={17} /> Aktif Üyeler</div>
            <div className="forum-active-users">
              {activeUsers.slice(0, 5).map((member) => (
                <Link href={`/profil/${encodeURIComponent(member.kullanici_adi)}`} key={member.id}>
                  <Avatar profile={member} size={34} />
                  <span><strong>{member.kullanici_adi}</strong><small>{member.ekip_uyesi ? `Konsey Ekibi · ${member.ekip_rolu || 'Ekip Üyesi'}` : member.unvan || 'Konsey Üyesi'}</small></span>
                  <i aria-label="Bugün aktif" />
                </Link>
              ))}
              {activeUsers.length === 0 ? <div className="forum-side-empty">Aktif üyeler burada görünecek.</div> : null}
            </div>
          </section>

          <section>
            <div className="forum-side-title"><Users size={17} /> Forum İstatistikleri</div>
            <dl className="forum-stats">
              <div><dt>Toplam konu</dt><dd>{topics.length}</dd></div>
              <div><dt>Toplam yanıt</dt><dd>{totalReplies}</dd></div>
              <div><dt>Forum bölümü</dt><dd>{FORUMS.length}</dd></div>
            </dl>
          </section>
        </aside>
      </div>
      <ForumAuthModal open={Boolean(authPrompt)} action={authPrompt} onClose={() => setAuthPrompt('')} />
    </div>
  )
}
