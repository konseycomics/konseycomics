'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, MessageSquareText, X } from 'lucide-react'

const STORAGE_KEY = 'konsey-forum-launch-v1'

export default function ForumLaunchNotice() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY)) return
    const timer = window.setTimeout(() => setOpen(true), 650)
    return () => window.clearTimeout(timer)
  }, [])

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, 'seen')
    setOpen(false)
  }

  return (
    <>
      <Link className="forum-launch-strip" href="/forum" aria-label="Konsey Comics forumuna git">
        <span className="forum-launch-track" aria-hidden="true">
          <span>KONSEY COMICS FORUMU AÇILDI</span><i>•</i><span>SOHBETE KATIL</span><i>•</i>
          <span>KONSEY COMICS FORUMU AÇILDI</span><i>•</i><span>SOHBETE KATIL</span><i>•</i>
          <span>KONSEY COMICS FORUMU AÇILDI</span><i>•</i><span>SOHBETE KATIL</span><i>•</i>
          <span>KONSEY COMICS FORUMU AÇILDI</span><i>•</i><span>SOHBETE KATIL</span><i>•</i>
        </span>
      </Link>

      {open ? (
        <div className="forum-launch-overlay" role="dialog" aria-modal="true" aria-labelledby="forum-launch-title" onMouseDown={(event) => { if (event.target === event.currentTarget) dismiss() }}>
          <section className="forum-launch-modal">
            <button type="button" className="forum-launch-close" onClick={dismiss} aria-label="Duyuruyu kapat"><X size={18} /></button>
            <span className="forum-launch-icon"><MessageSquareText size={24} /></span>
            <span className="forum-launch-kicker">Konsey Forum</span>
            <h2 id="forum-launch-title">Forum açıldı.</h2>
            <p>Yeni konular, okur tartışmaları ve Konsey duyuruları artık tek bir yerde.</p>
            <Link href="/forum" onClick={dismiss}>Foruma Git <ArrowRight size={17} /></Link>
          </section>
        </div>
      ) : null}
    </>
  )
}
