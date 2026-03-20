import Link from 'next/link'

export default function Footer() {
  return (
    <>
      <footer style={{ borderTop: '1px solid var(--border)', padding: '40px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '17px', marginBottom: '12px' }}>Konsey<span style={{ fontWeight: 300 }}>Comics</span></div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>Sanatı, hikayeyi ve çizgi roman kültürünü en estetik haliyle okuyucularla buluşturan dijital platform.</p>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>Kategoriler</div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[{ label: 'Tüm Seriler', href: '/seriler' }, { label: 'Çizgi Roman', href: '/kategori/cizgi-roman' }, { label: 'Manga', href: '/kategori/manga' }, { label: 'Webtoon', href: '/kategori/webtoon' }].map(item => (
              <li key={item.href}><Link href={item.href} style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>{item.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>Kurumsal</div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[{ label: 'Hakkımızda', href: '/hakkimizda' }, { label: 'İletişim', href: '/iletisim' }, { label: 'Kullanım Koşulları', href: '/kullanim-kosullari' }, { label: 'Gizlilik Politikası', href: '/gizlilik-politikasi' }].map(item => (
              <li key={item.href}><Link href={item.href} style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>{item.label}</Link></li>
            ))}
          </ul>
        </div>
      </footer>
      <div style={{ borderTop: '1px solid var(--border)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>© 2026 Konsey Comics. Tüm hakları saklıdır.</span>
        <div style={{ display: 'flex', gap: '16px' }}>
          {[{ label: 'Twitter', href: 'https://twitter.com/konseycomics' }, { label: 'Instagram', href: 'https://instagram.com/konseycomics' }, { label: 'Discord', href: 'https://discord.gg/konseycomics' }].map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}>{s.label}</a>
          ))}
        </div>
      </div>
    </>
  )
}