import Link from 'next/link'
import Image from 'next/image'

const kesfet = [
  { label: 'Tüm Seriler', href: '/seriler' },
  { label: 'Çizgi Roman', href: '/kategori/cizgi-roman' },
  { label: 'Manga', href: '/kategori/manga' },
  { label: 'Webtoon', href: '/kategori/webtoon' },
]

const kurumsal = [
  { label: 'Hakkımızda', href: '/hakkimizda' },
  { label: 'İletişim', href: '/iletisim' },
  { label: 'Kullanım Koşulları', href: '/kullanim-kosullari' },
  { label: 'Gizlilik Politikası', href: '/gizlilik-politikasi' },
]

const sosyal = [
  { label: 'Twitter', href: 'https://twitter.com/konseycomics' },
  { label: 'Instagram', href: 'https://instagram.com/konseycomics' },
  { label: 'Discord', href: 'https://discord.gg/konseycomics' },
]

export default function Footer() {
  return (
    <footer style={{ marginTop: '84px', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#050505' }}>
      <div className="site-section" style={{ paddingTop: '34px', paddingBottom: '28px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
          gap: '36px',
          paddingBottom: '28px',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }} className="footer-hero">
          <div>
            <Link href="/" style={{ display: 'inline-flex', textDecoration: 'none', marginBottom: '18px' }}>
              <Image src="/demo/logo.png" alt="Konsey Comics" width={340} height={124} style={{ width: 'min(340px, 100%)', height: 'auto', display: 'block' }} />
            </Link>

            <div style={{ maxWidth: '42ch', color: '#d2d2cd', fontSize: '15px', lineHeight: 1.75 }}>
              Türkçe çizgi roman, manga ve webtoon dünyasını tek yerde bir araya getiren dijital okuma alanı.
              Güçlü evrenler, temiz arayüz ve arşiv hissi bir arada.
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '22px',
            alignContent: 'start'
          }} className="footer-columns">
            <div>
              <div style={{ color: '#fff', fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '14px' }}>
                Keşfet
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {kesfet.map(item => (
                  <Link key={item.href} href={item.href} style={{ color: '#ababaa', fontSize: '14px', textDecoration: 'none' }}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div style={{ color: '#fff', fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '14px' }}>
                Kurumsal
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {kurumsal.map(item => (
                  <Link key={item.href} href={item.href} style={{ color: '#ababaa', fontSize: '14px', textDecoration: 'none' }}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: '16px',
          alignItems: 'center',
          paddingTop: '18px'
        }} className="footer-bottom">
          <div style={{ color: '#777773', fontSize: '12px', lineHeight: 1.6 }}>
            © 2026 Konsey Comics. Tüm hakları saklıdır.
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', justifyContent: 'flex-end' }}>
            {sosyal.map(item => (
              <a key={item.label} href={item.href} target="_blank" rel="noreferrer" style={{ color: '#9b9b97', fontSize: '12px', textDecoration: 'none', letterSpacing: '0.3px' }}>
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .footer-hero {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          .footer-columns,
          .footer-bottom {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  )
}
