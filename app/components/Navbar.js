'use client'
import { useState } from 'react'
import AuthModal from './AuthModal'

export default function Navbar() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(245,244,240,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 40px',
        display: 'flex', alignItems: 'center', gap: '40px',
        height: '56px',
      }}>
        <a href="/" style={{
          fontWeight: 600, fontSize: '17px',
          letterSpacing: '-0.3px',
          textDecoration: 'none', color: 'var(--text)',
          flexShrink: 0,
        }}>
          Konsey<span style={{ fontWeight: 300 }}>Comics</span>
        </a>

        <ul style={{ display: 'flex', gap: '6px', listStyle: 'none', flex: 1 }}>
          {['Seriler', 'Çizgi Romanlar', 'Manga', 'Webtoon', 'Hakkımızda', 'İletişim'].map(item => (
            <li key={item}>
              <a href="#" style={{
                fontSize: '13px', fontWeight: 500,
                color: 'var(--text-muted)',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.target.style.background = 'var(--border)'; e.target.style.color = 'var(--text)' }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--text-muted)' }}
              >{item}</a>
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <button onClick={() => setModalOpen(true)} style={{
            height: '34px', padding: '0 14px',
            background: 'var(--text)', color: '#fff',
            border: 'none', borderRadius: '8px',
            fontSize: '13px', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Giriş Yap
          </button>
        </div>
      </nav>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}