export default function Footer() {
  return (
    <>
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '40px',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '40px',
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '17px', marginBottom: '12px' }}>
            Konsey<span style={{ fontWeight: 300 }}>Comics</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Sanatı, hikayeyi ve çizgi roman kültürünü en estetik haliyle okuyucularla buluşturmayı hedefleyen dijital platform.
          </p>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>
            Seriler & Kategoriler
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['Devam Eden Serilerimiz', 'Tamamlanan Serilerimiz', 'Oku/Bitir Tek Sayılar', 'Marvel & DC'].map(item => (
              <li key={item}><a href="#" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>{item}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>
            Kurumsal
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['Hakkımızda', 'İletişim', 'Kullanım Koşulları'].map(item => (
              <li key={item}><a href="#" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>{item}</a></li>
            ))}
          </ul>
        </div>
      </footer>
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '16px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>© 2026 Konsey Comics. Tüm hakları saklıdır.</span>
        <div style={{ display: 'flex', gap: '16px' }}>
          {['Twitter', 'Instagram', 'Discord'].map(s => (
            <a key={s} href="#" style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}>{s}</a>
          ))}
        </div>
      </div>
    </>
  )
}