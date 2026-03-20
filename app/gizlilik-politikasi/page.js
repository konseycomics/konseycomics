import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function GizlilikPolitikasi() {
  return (
    <>
      <Navbar />
      <div style={{ maxWidth: '680px', margin: '48px auto', padding: '0 24px 60px' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '40px', marginBottom: '32px' }}>GİZLİLİK POLİTİKASI</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '32px' }}>Son güncelleme: Ocak 2026</div>
        {[
          ['Toplanan Veriler', 'Sitemizi ziyaret ettiğinizde IP adresiniz ve tarayıcı bilgileriniz kaydedilebilir.'],
          ['Çerezler', 'Sitemiz kullanıcı deneyimini iyileştirmek için çerez kullanmaktadır.'],
          ['Google AdSense', 'Sitemizde Google AdSense reklamları gösterilmektedir. Google reklamları kişiselleştirmek için çerez kullanabilir.'],
          ['Veri Paylaşımı', 'Kişisel verileriniz yasal zorunluluklar dışında üçüncü taraflarla paylaşılmaz.'],
          ['İletişim', 'Sorularınız için: iletisim@konseycomics.com'],
        ].map(([baslik, icerik]) => (
          <div key={baslik} style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '10px' }}>{baslik}</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7 }}>{icerik}</div>
          </div>
        ))}
      </div>
      <Footer />
    </>
  )
}