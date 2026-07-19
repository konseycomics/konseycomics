'use client'

import Link from 'next/link'
import { LockKeyhole, X } from 'lucide-react'

export default function ForumAuthModal({ open, onClose, action = 'bu işlemi yapmak' }) {
  if (!open) return null
  const returnTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/forum'
  return (
    <div className="forum-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="forum-modal" role="dialog" aria-modal="true" aria-labelledby="forum-auth-title">
        <button className="forum-modal-close" type="button" onClick={onClose} aria-label="Pencereyi kapat"><X size={18} /></button>
        <div className="forum-modal-icon"><LockKeyhole size={22} /></div>
        <span className="forum-modal-eyebrow">KONSEY FORUMU</span>
        <h2 id="forum-auth-title">Aramıza katıl</h2>
        <p>{action.charAt(0).toUpperCase() + action.slice(1)} için Konsey hesabına giriş yapman veya ücretsiz hesap oluşturman gerekiyor.</p>
        <div className="forum-modal-actions">
          <Link className="primary" href={`/giris?mod=kayit&returnTo=${encodeURIComponent(returnTo)}`}>Kayıt Ol</Link>
          <Link href={`/giris?mod=giris&returnTo=${encodeURIComponent(returnTo)}`}>Giriş Yap</Link>
        </div>
      </section>
    </div>
  )
}
