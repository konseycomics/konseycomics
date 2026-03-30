'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

function normalizeText(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export default function Hakkimizda() {
  const [ekip, setEkip] = useState([])
  const [profiller, setProfiller] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [ekipRes, profilRes] = await Promise.all([
        supabase.from('ekip').select('*').order('isim'),
        supabase.from('public_profiller').select('id, kullanici_adi, avatar_url, bio, rol, seviye')
      ])

      setEkip(ekipRes.data || [])
      setProfiller(profilRes.data || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  const ekipKartlari = useMemo(() => {
    return ekip.map(uye => {
      const eslesenProfil =
        profiller.find(profil => normalizeText(profil.kullanici_adi) === normalizeText(uye.isim)) ||
        profiller.find(profil => normalizeText(profil.kullanici_adi).includes(normalizeText(uye.isim))) ||
        null

      return {
        ...uye,
        profil: eslesenProfil,
        profilHref: eslesenProfil ? `/profil/${eslesenProfil.kullanici_adi}` : null,
        gorsel: eslesenProfil?.avatar_url || uye.avatar_url || null,
      }
    })
  }, [ekip, profiller])

  return (
    <>
      <Navbar />
      <main style={{ background: '#000', minHeight: '100vh' }}>
        <style>{`
          .about-page {
            position: relative;
            overflow: hidden;
          }
          .about-page::before {
            content: '';
            position: absolute;
            inset: 0;
            background:
              radial-gradient(circle at top left, rgba(255,255,255,0.06), transparent 24%),
              radial-gradient(circle at top right, rgba(255,255,255,0.04), transparent 18%),
              linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0) 22%);
            pointer-events: none;
          }
          .about-hero {
            border-bottom: 1px solid rgba(255,255,255,0.08);
            padding-top: 38px;
            padding-bottom: 30px;
            position: relative;
          }
          .about-hero-shell {
            display: grid;
            justify-items: center;
            text-align: center;
            gap: 18px;
          }
          .about-kicker {
            display: inline-flex;
            align-items: center;
            min-height: 36px;
            padding: 0 14px;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.04);
            color: rgba(255,255,255,0.72);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1.2px;
            text-transform: uppercase;
          }
          .about-hero h1 {
            font-family: 'Bebas Neue', sans-serif;
            font-size: clamp(56px, 10vw, 104px);
            line-height: 0.92;
            color: #fff;
          }
          .about-shell {
            padding-top: 34px;
            padding-bottom: 80px;
            display: grid;
            gap: 26px;
          }
          .about-spotlight {
            position: relative;
            overflow: hidden;
          }
          .about-spotlight::before {
            content: '';
            position: absolute;
            inset: 0;
            background:
              radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 28%),
              linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0));
            pointer-events: none;
          }
          .about-story {
            display: grid;
            grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
            gap: 24px;
            align-items: start;
          }
          .about-left-stack {
            display: grid;
            gap: 18px;
          }
          .about-panel {
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 24px;
            background: rgba(255,255,255,0.03);
            padding: 28px;
          }
          .about-panel h2 {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 46px;
            line-height: 0.92;
            color: #fff;
            margin-bottom: 14px;
          }
          .about-panel p {
            color: rgba(255,255,255,0.62);
            font-size: 15px;
            line-height: 1.85;
          }
          .about-section-head {
            display: grid;
            justify-items: center;
            text-align: center;
            gap: 10px;
            margin-bottom: 20px;
          }
          .about-section-head h2 {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 50px;
            line-height: 0.92;
            color: #fff;
            margin-bottom: 6px;
          }
          .about-section-head p {
            color: rgba(255,255,255,0.58);
            font-size: 14px;
            line-height: 1.7;
            max-width: 56ch;
          }
          .about-team-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 18px;
          }
          .about-team-card {
            display: grid;
            grid-template-rows: auto 1fr auto;
            gap: 14px;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 22px;
            background: rgba(255,255,255,0.03);
            padding: 18px;
            transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
            text-decoration: none;
            min-height: 100%;
          }
          .about-team-card.is-link:hover {
            transform: translateY(-4px);
            border-color: rgba(255,255,255,0.16);
            background: rgba(255,255,255,0.05);
          }
          .about-team-media {
            display: grid;
            place-items: center;
            width: 100%;
            aspect-ratio: 1 / 1;
            border-radius: 24px;
            background: transparent;
          }
          .about-team-media img {
            width: min(176px, 100%);
            height: min(176px, 100%);
            object-fit: cover;
            display: block;
            border-radius: 50%;
            overflow: hidden;
            box-shadow: 0 20px 36px rgba(0,0,0,0.22);
          }
          .about-team-fallback {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 56px;
            color: #fff;
            width: 100%;
            height: 100%;
            display: grid;
            place-items: center;
            border-radius: 50%;
            background:
              radial-gradient(circle at top, rgba(255,255,255,0.12), rgba(255,255,255,0.02)),
              rgba(255,255,255,0.04);
          }
          .about-team-content {
            display: grid;
            align-content: start;
            gap: 12px;
          }
          .about-team-role {
            display: inline-flex;
            align-items: center;
            min-height: 30px;
            width: fit-content;
            padding: 0 10px;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.05);
            color: rgba(255,255,255,0.72);
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.8px;
            text-transform: uppercase;
          }
          .about-team-card h3 {
            color: #fff;
            font-size: 24px;
            line-height: 1.15;
            font-weight: 700;
          }
          .about-team-card p {
            color: rgba(255,255,255,0.56);
            font-size: 14px;
            line-height: 1.7;
          }
          .about-team-link {
            color: #fff;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.4px;
            justify-self: center;
            text-align: center;
            width: 100%;
            margin-top: 6px;
          }
          .about-team-profile-meta {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
          }
          .about-team-profile-chip {
            display: inline-flex;
            align-items: center;
            min-height: 28px;
            padding: 0 10px;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.05);
            color: rgba(255,255,255,0.72);
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.8px;
            text-transform: uppercase;
          }
          .about-metrics {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 18px;
          }
          .about-metric {
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 22px;
            background: rgba(255,255,255,0.03);
            padding: 22px;
          }
          .about-metric-label {
            color: rgba(255,255,255,0.46);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
          }
          .about-metric-value {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 42px;
            line-height: 0.92;
            color: #fff;
            margin-bottom: 10px;
          }
          .about-metric-copy {
            color: rgba(255,255,255,0.56);
            font-size: 13px;
            line-height: 1.7;
          }
          .about-right-stack {
            display: grid;
            gap: 24px;
          }
          .about-contact-list {
            display: grid;
            gap: 12px;
          }
          .about-contact-item {
            display: grid;
            gap: 5px;
            padding: 14px 16px;
            border-radius: 16px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
          }
          .about-contact-item span:first-child {
            color: rgba(255,255,255,0.44);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .about-contact-item a,
          .about-contact-item span:last-child {
            color: #fff;
            font-size: 15px;
            text-decoration: none;
            line-height: 1.5;
          }
          @media (max-width: 960px) {
            .about-story,
            .about-metrics {
              grid-template-columns: 1fr;
            }
          }
          @media (max-width: 720px) {
            .about-hero {
              padding-top: 30px;
            }
            .about-section-head h2 {
              font-size: 42px;
            }
            .about-panel {
              padding: 22px;
            }
            .about-team-grid {
              grid-template-columns: 1fr 1fr;
            }
          }
          @media (max-width: 560px) {
            .about-team-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        <section className="about-page">
          <header className="about-hero">
            <div className="site-shell about-hero-shell">
              <div className="about-kicker">Konsey Arşivi</div>
              <h1>Hakkımızda</h1>
            </div>
          </header>

          <section className="site-shell about-shell">
            <div className="about-story">
              <div className="about-left-stack">
                <div className="about-panel about-spotlight">
                  <h2>Konsey Nedir?</h2>
                  <p>
                    Konsey Comics, çizgi roman, manga ve webtoon dünyasını Türkçe okuyucu için daha düzenli, daha temiz ve daha güçlü bir arşiv deneyimine dönüştürmek isteyen bir yayın topluluğu.
                    Bizim için mesele sadece içerik yüklemek değil; doğru kapağı, doğru sunumu ve doğru okuma hissini bir araya getirmek.
                  </p>
                  <p style={{ marginTop: '16px' }}>
                    Bu yüzden sitede yaptığımız her sayfa, okuyucunun içerikte kaybolmadan ama atmosferi hissederek gezebileceği bir kurgu üstüne inşa ediliyor.
                    Konsey tarafı da tam olarak bunun mutfağı: çeviri, edit, düzen, kalite kontrol ve topluluk emeği.
                  </p>
                </div>

                <div className="about-metrics">
                  <div className="about-metric">
                    <div className="about-metric-label">Odak</div>
                    <div className="about-metric-value">Kalite</div>
                    <div className="about-metric-copy">Çeviri ruhu, sunum hissi ve düzen temizliği aynı anda korunur.</div>
                  </div>
                  <div className="about-metric">
                    <div className="about-metric-label">Yaklaşım</div>
                    <div className="about-metric-value">Arşiv</div>
                    <div className="about-metric-copy">Seriler, bölümler ve okuma alanları tek bir dil içinde düzenlenir.</div>
                  </div>
                  <div className="about-metric">
                    <div className="about-metric-label">Topluluk</div>
                    <div className="about-metric-value">Konsey</div>
                    <div className="about-metric-copy">Bu dünya, sadece içerik değil emek veren insanların da görünür olduğu bir alan.</div>
                  </div>
                </div>
              </div>

              <div className="about-right-stack">
                <div className="about-panel">
                  <h2>Telif & İşbirlikleri</h2>
                  <p>
                    Telif konusunda son derece hassas davranıyoruz. Hak sahiplerinden, yayıncılardan ya da temsilcilerden gelen bildirimleri ciddiyetle ele alıyor; gerekli durumlarda inceleme ve kaldırma süreçlerini hızlı biçimde işletiyoruz.
                  </p>
                  <p style={{ marginTop: '14px' }}>
                    İşbirliği, iletişim, telif bildirimi ya da resmi talepler için bizimle doğrudan aşağıdaki kanallar üzerinden iletişime geçebilirsiniz. Konseycomics bir fansub projeisidir.
                  </p>

                  <div className="about-contact-list" style={{ marginTop: '18px' }}>
                    <div className="about-contact-item">
                      <span>E-posta</span>
                      <a href="mailto:destek@konseycomics.com">destek@konseycomics.com</a>
                    </div>
                    <div className="about-contact-item">
                      <span>İletişim Sayfası</span>
                      <Link href="/iletisim">konseycomics.com/iletisim</Link>
                    </div>
                    <div className="about-contact-item">
                      <span>Not</span>
                      <span>Resmi telif ve işbirliği başvurularında mümkünse eser, bağlantı ve talep detaylarını açık şekilde paylaşın.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="about-section-head">
                <div>
                  <h2>Konsey</h2>
                  <p>
                    Ekibin üyeleri burada. Profili olanlara doğrudan geçebilir, yaptıkları işlere ve topluluktaki rollerine daha yakından bakabilirsin.
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="about-panel" style={{ color: 'rgba(255,255,255,0.58)', fontSize: '14px' }}>Ekip hazırlanıyor...</div>
              ) : ekipKartlari.length === 0 ? (
                <div className="about-panel" style={{ color: 'rgba(255,255,255,0.58)', fontSize: '14px' }}>Henüz ekip üyesi eklenmemiş.</div>
              ) : (
                <div className="about-team-grid">
                  {ekipKartlari.map((uye) => {
                    const body = (
                      <>
                        <div className="about-team-media">
                          {uye.gorsel ? (
                            <img src={uye.gorsel} alt={uye.isim} />
                          ) : (
                            <div className="about-team-fallback">{String(uye.isim || '?')[0]?.toUpperCase()}</div>
                          )}
                        </div>

                        <div className="about-team-content">
                          <div className="about-team-profile-meta">
                            <div className="about-team-role">Konsey Üyesi</div>
                            {uye.profil?.rol && <div className="about-team-profile-chip">{uye.profil.rol}</div>}
                          </div>
                          <h3>{uye.isim}</h3>
                          <p>
                            {uye.profil?.bio || `${uye.isim}, Konsey ekibinde ${normalizeText(uye.unvan || '').replace(/^\w/, c => c.toUpperCase()) || 'ekip üyesi'} olarak yer alıyor.`}
                          </p>
                        </div>
                        <div className="about-team-link">
                          {uye.profilHref ? 'Profile Git →' : 'Profil bağlantısı yakında'}
                        </div>
                      </>
                    )

                    if (uye.profilHref) {
                      return (
                        <Link key={uye.id} href={uye.profilHref} className="about-team-card is-link">
                          {body}
                        </Link>
                      )
                    }

                    return (
                      <article key={uye.id} className="about-team-card">
                        {body}
                      </article>
                    )
                  })}
                </div>
              )}
            </div>

          </section>
        </section>
      </main>
      <Footer />
    </>
  )
}
