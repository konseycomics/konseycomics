import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Hakkimizda() {
  return (
    <>
      <Navbar />
      <div style={{ maxWidth: '680px', margin: '48px auto', padding: '0 24px 60px' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '48px', marginBottom: '32px' }}>HAKKIMIZDA</div>
        <div style={{ fontSize: '15px', lineHeight: 1.8, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p>KonseyComics, çizgi roman ve manga kültürünü Türk okuyuculara en kaliteli şekilde ulaştırmayı hedefleyen bir çeviri ve yayın platformudur.</p>
          <p>2022 yılında küçük bir meraklı grup olarak başladığımız yolculuğumuzda binlerce okuyucuya ulaştık. Marvel, DC, bağımsız Amerikan çizgi romanları ve Japon mangaları alanında kapsamlı bir kütüphane oluşturduk.</p>
          <p>Ekibimiz; çevirmen, balonlamacı ve grafik uzmanlarından oluşmakta olup her çeviride orijinal metnin ruhunu korumayı önceliğimiz olarak görüyoruz.</p>
        </div>
      </div>
      <Footer />
    </>
  )
}