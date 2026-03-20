import Link from 'next/link'
import Navbar from './components/Navbar'

export default function NotFound() {
  return (
    <>
      <Navbar />
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '120px', lineHeight: 1, color: 'var(--border)' }}>404</div>
        <div style={{ fontSize: '20px', fontWeight: 500, marginTop: '-16px' }}>Sayfa bulunamadı</div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '320px', lineHeight: 1.6 }}>
          Aradığın sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir.
        </div>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--text)', color: '#fff', fontSize: '14px', fontWeight: 500, padding: '11px 22px', borderRadius: '100px', textDecoration: 'none', marginTop: '8px' }}>
          Ana Sayfaya Dön
        </Link>
      </div>
    </>
  )
}