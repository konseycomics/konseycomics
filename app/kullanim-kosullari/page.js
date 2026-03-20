import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function KullanimKosullari() {
  return (
    <>
      <Navbar />
      <div style={{ maxWidth: '680px', margin: '48px auto', padding: '0 24px 60px' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '40px', marginBottom: '32px' }}>KULLANIM KOŞULLARI</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '32px' }}>Son güncelleme: Ocak 2026</div>
        {[
          ['1. Hizmetin Kapsamı', 'KonseyComics, çizgi roman ve manga içeriklerini kullanıcılarıyla paylaşan dijital bir platformdur.'],
          ['2. Kullanım Şartları', 'Sitemizi kullanarak bu koşulları kabul etmiş sayılırsınız. İçeriklerimizi ticari amaçla kullanamazsınız.'],
          ['3. Telif Hakları', 'Sitede yayınlanan içerikler ilgili yayınevleri ve yaratıcılarına aittir. Çeviriler KonseyComics ekibine aittir.'],
          ['4. Sorumluluk Reddi', 'Üçüncü taraf içeriklerinden KonseyComics sorumlu tutulamaz.'],
          ['5. Değişiklikler', 'Bu koşullar önceden bildirim yapılmaksızın değiştirilebilir.'],
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