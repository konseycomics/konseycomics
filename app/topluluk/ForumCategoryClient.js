'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Clock3, Eye, MessageSquare, PenLine, Pin, Search, Tags } from 'lucide-react'

const PAGE_SIZE = 12

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR')
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })
}

function score(topic) {
  return Number(topic.yanit_sayisi || 0) * 4 + Number(topic.begeni_sayisi || 0) * 2 + Number(topic.goruntulenme_sayisi || 0)
}

export default function ForumCategoryClient({ forum, initialTopics = [] }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('activity')
  const [tag, setTag] = useState('Tümü')
  const [page, setPage] = useState(1)

  const tags = useMemo(() => ['Tümü', ...new Set(initialTopics.flatMap((topic) => topic.etiketler || []).filter(Boolean))], [initialTopics])
  const topics = useMemo(() => {
    const search = normalize(query)
    let rows = initialTopics.filter((topic) => !search || [topic.baslik, topic.icerik, topic.profil?.kullanici_adi, ...(topic.etiketler || [])].some((value) => normalize(value).includes(search)))
    if (tag !== 'Tümü') rows = rows.filter((topic) => (topic.etiketler || []).includes(tag))
    if (sort === 'popular') rows = [...rows].sort((a, b) => score(b) - score(a))
    if (sort === 'unanswered') rows = rows.filter((topic) => Number(topic.yanit_sayisi || 0) === 0)
    if (sort === 'activity' || sort === 'unanswered') rows = [...rows].sort((a, b) => new Date(b.son_aktivite_at || b.created_at) - new Date(a.son_aktivite_at || a.created_at))
    return rows
  }, [initialTopics, query, sort, tag])

  const pageCount = Math.max(1, Math.ceil(topics.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visibleTopics = topics.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const totalReplies = initialTopics.reduce((sum, topic) => sum + Number(topic.yanit_sayisi || 0), 0)

  function changeFilter(callback) {
    callback()
    setPage(1)
  }

  return (
    <div className="forum-category-page">
      <nav className="forum-breadcrumb"><Link href="/topluluk"><ArrowLeft size={15} /> Forumlar</Link><span>/</span><span>{forum.name}</span></nav>

      <header className="forum-category-header">
        <div>
          <div className="forum-eyebrow"><span /> {forum.group || 'KONSEY FORUM'}</div>
          <h1>{forum.name}</h1>
          <p>{forum.description}</p>
          <div className="forum-header-stats"><span><strong>{initialTopics.length}</strong> konu</span><span><strong>{totalReplies}</strong> yanıt</span></div>
        </div>
        <Link className="forum-primary-button" href={`/topluluk?compose=1&forum=${forum.slug}`}><PenLine size={17} /> Yeni Konu</Link>
      </header>

      <div className="forum-category-toolbar">
        <label className="forum-search"><Search size={18} /><input value={query} onChange={(event) => changeFilter(() => setQuery(event.target.value))} placeholder={`${forum.name} içinde ara...`} /></label>
        <div className="forum-sort-tabs">
          <button className={sort === 'activity' ? 'active' : ''} onClick={() => changeFilter(() => setSort('activity'))}>Son hareket</button>
          <button className={sort === 'popular' ? 'active' : ''} onClick={() => changeFilter(() => setSort('popular'))}>Popüler</button>
          <button className={sort === 'unanswered' ? 'active' : ''} onClick={() => changeFilter(() => setSort('unanswered'))}>Cevapsız</button>
        </div>
      </div>

      {tags.length > 1 ? <div className="forum-tag-filter"><Tags size={15} />{tags.map((item) => <button className={tag === item ? 'active' : ''} key={item} onClick={() => changeFilter(() => setTag(item))}>{item}</button>)}</div> : null}

      <section className="forum-category-topics">
        <div className="forum-category-table-head"><span>Konu</span><span>Yanıt</span><span>Görüntüleme</span><span>Son hareket</span></div>
        {visibleTopics.length > 0 ? visibleTopics.map((topic) => (
          <article className="forum-category-topic" key={topic.id}>
            <div className="forum-category-avatar">
              {topic.profil?.avatar_url ? <Image src={topic.profil.avatar_url} alt="" width={44} height={44} unoptimized /> : topic.profil?.kullanici_adi?.[0]?.toUpperCase() || 'K'}
            </div>
            <div className="forum-category-copy">
              <div>{topic.sabitlendi ? <Pin size={13} /> : null}{topic.spoiler ? <span>Spoiler</span> : null}{topic.anket_aktif ? <span>Anket</span> : null}</div>
              <Link href={topic.href || `/topluluk/konu/${topic.slug}`}>{topic.spoiler ? 'Spoiler içeren konu' : topic.baslik}</Link>
              <small>{topic.profil?.kullanici_adi || 'Konsey Üyesi'} · {formatDate(topic.created_at)}</small>
            </div>
            <div className="forum-category-stat"><MessageSquare size={14} /><strong>{Number(topic.yanit_sayisi || 0)}</strong></div>
            <div className="forum-category-stat"><Eye size={14} /><strong>{Number(topic.goruntulenme_sayisi || 0)}</strong></div>
            <div className="forum-category-date"><Clock3 size={14} />{formatDate(topic.son_aktivite_at || topic.created_at)}</div>
          </article>
        )) : <div className="forum-empty"><MessageSquare size={24} /><strong>Henüz konu yok</strong><span>Bu forumdaki ilk tartışmayı sen başlatabilirsin.</span><Link href={`/topluluk?compose=1&forum=${forum.slug}`}><PenLine size={15} /> Yeni Konu Aç</Link></div>}
      </section>

      {pageCount > 1 ? <nav className="forum-pagination" aria-label="Konu sayfaları">
        <button disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /></button>
        <span>{currentPage} / {pageCount}</span>
        <button disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ChevronRight size={16} /></button>
      </nav> : null}
    </div>
  )
}
