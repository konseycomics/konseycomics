import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Iletisim() {
  return (
    <>
      <Navbar />
      <div style={{ maxWidth: '680px', margin: '48px auto', padding: '0 24px 60px' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '48px', marginBottom: '32px' }}>İLETİŞİM</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {[
            { baslik: 'E-posta', deger: 'iletisim@konseycomics.com', link: 'mailto:iletisim@konseycomics.com' },
            { baslik: 'Discord', deger: 'discord.gg/konseycomics', link: 'https://discord.gg/konseycomics' },
            { baslik: 'Twitter', deger: '@konseycomics', link: 'https://twitter.com/konseycomics' },
            { baslik: 'Instagram', deger: '@konseycomics', link: 'https://instagram.com/konseycomics' },
          ].map(item => (
            <a key={item.baslik} href={item.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <div style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '8px' }}>{item.baslik}</div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>{item.deger}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
      <Footer />
    </>
  )
}