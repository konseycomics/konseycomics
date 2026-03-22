'use client'
import Link from 'next/link'

export default function Hero({ seriler = [] }) {
  const seri = seriler.find(s => s.one_cikan) || seriler[0]
  if (!seri) return (
    <div style={{ height: '420px', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Yükleniyor...</div>
    </div>
  )

  return (
    <div style={{ position: 'relative', width: '100%', height: 'clamp(340px, 52vh, 520px)', overflow: 'hidden', background: '#0a0a0a' }}>
      {seri.kapak_url && (
        <img
          src={seri.kapak_url}
          alt={seri.baslik}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%', opacity: 0.55 }}
        />
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to right, rgba(0,0,0,0.88) 35%, rgba(0,0,0,0.3) 70%, transparent 100%), linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)'
      }} />
      <div style={{
        position: 'relative', zIndex: 1,
        height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: 'clamp(24px, 4vw, 60px)', maxWidth: '640px'
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(245,158,11,0.95)', color: '#fff',
          fontSize: '10px', fontWeight: 700, padding: '4px 12px',
          borderRadius: '100px', marginBottom: '14px',
          textTransform: 'uppercase', letterSpacing: '1px', width: 'fit-content'
        }}>
          ⭐ Öne Çıkan
        </div>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(36px, 5.5vw, 64px)',
          color: '#fff', margin: '0 0 12px 0',
          lineHeight: 0.95, letterSpacing: '1px',
          textShadow: '0 2px 20px rgba(0,0,0,0.5)'
        }}>
          {seri.baslik.toUpperCase()}
        </h1>
        {seri.ozet && (
          <p style={{
            fontSize: '14px', color: 'rgba(255,255,255,0.75)',
            margin: '0 0 24px 0', lineHeight: 1.6,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
            maxWidth: '480px'
          }}>
            {seri.ozet}
          </p>
        )}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link href={`/seri/${seri.slug}`} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#fff', color: '#111',
            fontSize: '13px', fontWeight: 600,
            padding: '11px 24px', borderRadius: '100px',
            textDecoration: 'none', letterSpacing: '0.2px'
          }}>
            İncele →
          </Link>
          <Link href={`/seriler`} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.15)', color: '#fff',
            fontSize: '13px', fontWeight: 500,
            padding: '11px 24px', borderRadius: '100px',
            textDecoration: 'none', border: '1px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(4px)'
          }}>
            Tüm Seriler
          </Link>
        </div>
        {seri.kategoriler?.isim && (
          <div style={{ marginTop: '16px', display: 'flex', gap: '6px' }}>
            <span style={{
              fontSize: '11px', color: 'rgba(255,255,255,0.5)',
              background: 'rgba(255,255,255,0.1)', padding: '3px 10px',
              borderRadius: '100px', letterSpacing: '0.5px', textTransform: 'uppercase'
            }}>
              {seri.kategoriler.isim}
            </span>
            {seri.durum && (
              <span style={{
                fontSize: '11px', color: 'rgba(255,255,255,0.5)',
                background: 'rgba(255,255,255,0.1)', padding: '3px 10px',
                borderRadius: '100px'
              }}>
                {seri.durum}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
