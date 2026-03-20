'use client'
import Link from 'next/link'

export default function Hero({ seriler = [] }) {
  const one = seriler[0]

  if (!one) return (
    <div style={{ margin: '24px 24px 0', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '36px 40px', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Yükleniyor...</div>
    </div>
  )

  return (
    <div style={{ margin: '24px 24px 0', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '36px 40px', display: 'flex', alignItems: 'center', gap: '32px', minHeight: '240px', overflow: 'hidden' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef3c7', color: '#92400e', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', marginBottom: '16px', textTransform: 'uppercase' }}>
          ⭐ Öne Çıkan
        </div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(32px, 5vw, 52px)', lineHeight: 0.95, letterSpacing: '0.5px', marginBottom: '12px' }}>
          {one.baslik.toUpperCase()}
        </div>
        {one.ozet && (
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
            {one.ozet}
          </div>
        )}
        <Link href={`/seri/${one.slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--text)', color: '#fff', fontSize: '14px', fontWeight: 500, padding: '10px 20px', borderRadius: '100px', textDecoration: 'none' }}>
          İncele →
        </Link>
      </div>
      <div style={{ width: 'clamp(120px, 18vw, 200px)', aspectRatio: '2/3', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', color: '#fff', textAlign: 'center', padding: '8px' }}>
        {one.kapak_url
          ? <img src={one.kapak_url} alt={one.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : one.baslik
        }
      </div>
    </div>
  )
}