'use client'

export default function AuthModal({ open, onClose }) {
  if (!open) return null

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '36px', width: '380px',
        position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '16px',
          width: '28px', height: '28px',
          background: 'var(--border)', border: 'none', borderRadius: '50%',
          cursor: 'pointer', fontSize: '14px',
        }}>✕</button>

        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', marginBottom: '6px' }}>Hoş geldin</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '28px' }}>Devam etmek için giriş yap.</div>

        <button style={{
          width: '100%', padding: '11px',
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: '10px', cursor: 'pointer',
          fontSize: '14px', fontWeight: 500, fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          marginBottom: '16px',
        }}>
          🔵 Google ile devam et
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>veya</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {['E-posta', 'Şifre'].map(label => (
          <div key={label} style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>{label}</label>
            <input
              type={label === 'Şifre' ? 'password' : 'email'}
              placeholder={label === 'Şifre' ? '••••••••' : 'ornek@email.com'}
              style={{
                width: '100%', padding: '10px 13px',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: '8px', outline: 'none',
                fontSize: '14px', fontFamily: 'inherit',
              }}
            />
          </div>
        ))}

        <button style={{
          width: '100%', padding: '11px',
          background: 'var(--text)', color: '#fff',
          border: 'none', borderRadius: '10px',
          fontSize: '14px', fontWeight: 500, fontFamily: 'inherit',
          cursor: 'pointer', marginTop: '4px',
        }}>
          Giriş Yap
        </button>

        <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '16px' }}>
          Hesabın yok mu? <a href="#" style={{ color: 'var(--text)', fontWeight: 500 }}>Kayıt ol</a>
        </div>
      </div>
    </div>
  )
}