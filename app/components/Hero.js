'use client'

export default function Hero() {
  return (
    <div style={{
      margin: '24px 40px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '20px',
      padding: '36px 40px',
      display: 'flex', alignItems: 'center',
      gap: '32px', minHeight: '280px',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: '#fef3c7', color: '#92400e',
          fontSize: '11px', fontWeight: 600, letterSpacing: '0.4px',
          padding: '4px 10px', borderRadius: '20px',
          marginBottom: '16px', textTransform: 'uppercase',
        }}>
          ⭐ Haftanın Önerisi
        </div>

        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '58px', lineHeight: 0.95,
          letterSpacing: '0.5px', marginBottom: '12px',
        }}>
          KARANLIK<br />ŞÖVALYE:<br />DÖNÜŞ
        </div>

        <div style={{
          fontSize: '14px', color: 'var(--text-muted)',
          marginBottom: '24px', lineHeight: 1.5,
        }}>
          Yaşlı Bruce Wayne'in Gotham'a geri dönüşü.
        </div>

        <a href="/seri/batman" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'var(--text)', color: '#fff',
          fontSize: '14px', fontWeight: 500,
          padding: '10px 20px', borderRadius: '100px',
          textDecoration: 'none', transition: 'opacity 0.15s',
        }}>
          İncele →
        </a>
      </div>

      <div style={{
        width: '220px', height: '290px', flexShrink: 0,
        borderRadius: '12px', overflow: 'hidden',
        background: '#111',
        boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '36px', color: '#fff', letterSpacing: '2px',
      }}>
        BATMAN
      </div>
    </div>
  )
}