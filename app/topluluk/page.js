import Link from 'next/link'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { buildMetadata, createSeoDescription } from '../lib/seo'
import { getCommunityTopics } from '../lib/communityData'
import { getPlanetPosts } from '../lib/planetData'
import ToplulukFeedClient from './ToplulukFeedClient'

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function trimText(value, max = 150) {
  const text = String(value || '').trim()
  return text.length > max ? `${text.slice(0, max - 3).trim()}...` : text
}

function tipEtiketi(tip) {
  if (tip === 'manset') return 'Manşet'
  if (tip === 'duyuru') return 'Duyuru'
  if (tip === 'editor') return 'Editör'
  if (tip === 'secki') return 'Seçki'
  return 'Planet'
}

export async function generateMetadata() {
  return buildMetadata({
    title: 'Topluluk | Konsey Planet',
    description: createSeoDescription(
      '',
      'Konsey Planet haberleri ve topluluk akışı. Yöneticilerin manşetleriyle okurların tartışmaları aynı yerde buluşur.'
    ),
    path: '/topluluk',
    keywords: ['Konsey Planet', 'Konsey topluluk', 'çizgi roman topluluğu', 'manga topluluğu', 'webtoon forumu'],
  })
}

export default async function ToplulukPage() {
  const [{ topics }, planetPosts] = await Promise.all([
    getCommunityTopics({ limit: 18 }),
    getPlanetPosts({ limit: 6 }),
  ])

  const sliderPosts = (planetPosts || []).slice(0, 3)

  return (
    <>
      <Navbar />

      <div className="planet-reset-shell">
        <main className="site-section planet-reset-main">
          <section className="planet-reset-hero">
            <div className="planet-reset-mark">
              <span className="planet-reset-orbit" />
              <div className="planet-reset-wordmark">
                <strong>KONSEY</strong>
                <span>PLANET</span>
              </div>
            </div>

            <p className="planet-reset-kicker">Konsey’in resmi haber masası ve topluluk alanı</p>
          </section>

          <section className="planet-reset-news">
            <div className="planet-reset-section-head">
              <div>
                <p className="planet-reset-mini">Son Manşetler</p>
                <h1>Konsey Planet</h1>
              </div>
              <Link href="/topluluk" className="planet-reset-link">
                Tüm Haberler
              </Link>
            </div>

            <div className="planet-reset-slider">
              {sliderPosts.length > 0 ? (
                sliderPosts.map((item, index) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`planet-reset-slide ${index === 0 ? 'featured' : ''}`}
                    style={{
                      background: item.kapak_url
                        ? `linear-gradient(180deg, rgba(7,8,8,0.12), rgba(7,8,8,0.88)), url(${item.kapak_url}) center/cover no-repeat`
                        : undefined,
                    }}
                  >
                    <div className="planet-reset-slide-top">
                      <span className="planet-reset-pill">{tipEtiketi(item.tip)}</span>
                      <span className="planet-reset-date">{formatDate(item.created_at)}</span>
                    </div>

                    <div className="planet-reset-slide-copy">
                      <h2>{item.baslik}</h2>
                      <p>{trimText(item.ozet || item.icerik, index === 0 ? 170 : 110)}</p>
                    </div>

                    <span className="planet-reset-cta">Haberi Aç</span>
                  </Link>
                ))
              ) : (
                <div className="planet-reset-empty">
                  <strong>Konsey Planet hazır.</strong>
                  <p>İlk 3 manşet yönetici panelinden girildiğinde burada dönecek.</p>
                </div>
              )}
            </div>
          </section>

          <section className="planet-reset-feed-shell">
            <div className="planet-reset-section-head feed">
              <div>
                <p className="planet-reset-mini">Okurlar burada buluşuyor</p>
                <h2>Topluluk Akışı</h2>
              </div>
            </div>

            <ToplulukFeedClient initialTopics={topics || []} />
          </section>
        </main>
      </div>

      <Footer />

      <style>{`
        .planet-reset-shell {
          min-height: calc(100vh - 90px);
          background:
            radial-gradient(circle at top center, rgba(245, 185, 66, 0.06), transparent 22%),
            radial-gradient(circle at top right, rgba(255, 255, 255, 0.03), transparent 16%),
            #000;
        }

        .planet-reset-main {
          padding-top: 26px;
          padding-bottom: 14px;
        }

        .planet-reset-hero {
          display: grid;
          justify-items: center;
          gap: 12px;
          text-align: center;
          padding: 18px 0 10px;
        }

        .planet-reset-mark {
          display: inline-flex;
          align-items: center;
          gap: 16px;
        }

        .planet-reset-orbit {
          width: 56px;
          height: 56px;
          border: 4px solid rgba(245, 198, 87, 0.92);
          border-left-color: transparent;
          border-radius: 999px;
          box-shadow: 0 0 30px rgba(245, 198, 87, 0.14);
        }

        .planet-reset-wordmark {
          display: grid;
          gap: 4px;
          text-align: left;
          line-height: 1;
        }

        .planet-reset-wordmark strong {
          color: #fff;
          font-family: var(--font-display);
          font-size: clamp(30px, 4vw, 46px);
          letter-spacing: 0.4px;
        }

        .planet-reset-wordmark span {
          color: rgba(255, 255, 255, 0.76);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.42em;
          text-transform: uppercase;
        }

        .planet-reset-kicker {
          margin: 0;
          max-width: 56ch;
          color: var(--text-muted);
          font-size: 15px;
          line-height: 1.8;
        }

        .planet-reset-news,
        .planet-reset-feed-shell {
          margin-top: 24px;
        }

        .planet-reset-section-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .planet-reset-section-head.feed {
          margin-bottom: 14px;
        }

        .planet-reset-mini {
          margin: 0 0 8px;
          color: #f5b942;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .planet-reset-section-head h1,
        .planet-reset-section-head h2 {
          margin: 0;
          color: #fff;
          font-family: var(--font-display);
          font-size: clamp(34px, 4vw, 54px);
          line-height: 0.96;
          text-transform: uppercase;
        }

        .planet-reset-link {
          color: #d8d8d4;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }

        .planet-reset-slider {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .planet-reset-slide,
        .planet-reset-empty {
          min-height: 340px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 16px;
          padding: 24px;
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,0.08);
          background:
            radial-gradient(circle at top right, rgba(245, 198, 87, 0.07), transparent 24%),
            linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
          text-decoration: none;
          box-shadow: 0 24px 60px rgba(0,0,0,0.24);
        }

        .planet-reset-slide.featured {
          min-height: 390px;
        }

        .planet-reset-slide-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .planet-reset-pill {
          min-height: 32px;
          display: inline-flex;
          align-items: center;
          padding: 0 12px;
          border-radius: 999px;
          background: rgba(245, 198, 87, 0.12);
          border: 1px solid rgba(245, 198, 87, 0.22);
          color: #f5c657;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        .planet-reset-date {
          color: rgba(255,255,255,0.68);
          font-size: 12px;
          font-weight: 600;
        }

        .planet-reset-slide-copy h2 {
          margin: 0 0 12px;
          color: #fff;
          font-size: clamp(26px, 2.5vw, 40px);
          line-height: 1.04;
          font-weight: 900;
        }

        .planet-reset-slide-copy p,
        .planet-reset-empty p {
          margin: 0;
          color: var(--text-muted);
          font-size: 15px;
          line-height: 1.8;
        }

        .planet-reset-cta {
          min-height: 46px;
          width: fit-content;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          border-radius: 12px;
          background: #fff;
          color: #111;
          font-size: 14px;
          font-weight: 800;
          box-shadow: 0 14px 34px rgba(255,255,255,0.08);
        }

        .planet-reset-empty strong {
          color: #fff;
          font-size: 24px;
          font-weight: 900;
        }

        .planet-reset-feed-shell {
          padding-top: 8px;
        }

        @media (max-width: 1100px) {
          .planet-reset-slider {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .planet-reset-main {
            padding-top: 20px;
          }

          .planet-reset-mark {
            gap: 12px;
          }

          .planet-reset-orbit {
            width: 46px;
            height: 46px;
          }

          .planet-reset-kicker {
            font-size: 13px;
            line-height: 1.7;
          }

          .planet-reset-section-head {
            align-items: start;
            flex-direction: column;
          }

          .planet-reset-slider {
            grid-auto-flow: column;
            grid-auto-columns: 85%;
            overflow-x: auto;
            padding-bottom: 6px;
            scroll-snap-type: x proximity;
          }

          .planet-reset-slide,
          .planet-reset-empty {
            min-height: 300px;
            scroll-snap-align: start;
          }

          .planet-reset-slide.featured {
            min-height: 340px;
          }
        }
      `}</style>
    </>
  )
}
