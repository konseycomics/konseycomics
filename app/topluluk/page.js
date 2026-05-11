import Link from 'next/link'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { buildMetadata, createSeoDescription } from '../lib/seo'
import { getCommunityTopics } from '../lib/communityData'
import { buildPlanetView, getPlanetPosts } from '../lib/planetData'
import ToplulukHubClient from './ToplulukHubClient'
import ToplulukFeedClient from './ToplulukFeedClient'

export async function generateMetadata() {
  return buildMetadata({
    title: 'Topluluk | KonseyComics',
    description: createSeoDescription(
      '',
      'Konsey Planet manşetleri ile topluluk akışını aynı yerde keşfet. Resmi duyurular, editör notları ve okur tartışmaları KonseyComics topluluk alanında.'
    ),
    path: '/topluluk',
    keywords: ['KonseyComics topluluk', 'Konsey Planet', 'çizgi roman yorumları', 'seri tartışmaları', 'okur topluluğu'],
  })
}

export default async function ToplulukPage() {
  const { topics: feedTopics } = await getCommunityTopics({ limit: 12 })
  const planetPosts = await getPlanetPosts({ limit: 10 })
  const planetView = buildPlanetView(planetPosts)

  const kurallar = [
    {
      title: 'Spoiler Dengesini Koru',
      text: 'Yeni çıkan bölümler ve büyük kırılma anlarında spoiler uyarısı koy. Herkesin okuma keyfini birlikte koruyalım.',
    },
    {
      title: 'İşi Değil Fikri Tartış',
      text: 'Eleştiri serbest ama kişiselleştirmeden. Yorum değil tartışma kalitesi öne çıksın istiyoruz.',
    },
    {
      title: 'Kaynak ve Emeğe Saygı',
      text: 'Çeviri, edit ve topluluk emeğine saygılı kal. Kısa, net ve katkı sağlayan paylaşımlar en çok öne çıkar.',
    },
  ]

  const kategoriListesi = [
    'Genel Sohbet',
    'Çizgi Roman Tartışmaları',
    'Seri Önerileri',
    'Haberler & Duyurular',
    'Etkinlikler',
    'Çizimler & Fanart',
    'Teknik Destek',
  ]

  const populerKonular = [...feedTopics]
    .sort((a, b) => Number(b.yanit_sayisi || 0) - Number(a.yanit_sayisi || 0) || new Date(b.son_aktivite_at || b.created_at) - new Date(a.son_aktivite_at || a.created_at))
    .slice(0, 3)

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', minHeight: '100vh' }}>
        <section className="site-shell" style={{ paddingTop: '28px', paddingBottom: '34px' }}>
          <div style={{ maxWidth: '1520px', margin: '0 auto' }}>
            <div style={{ marginBottom: '38px' }}>
              <ToplulukHubClient planetView={planetView} />
            </div>

            <div className="community-below-grid" style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: '40px', alignItems: 'start' }}>
              <aside className="community-sidebar-v3" style={{ position: 'sticky', top: '106px', alignSelf: 'start', display: 'grid', gap: '12px' }}>
                {kurallar.map((kural) => (
                  <section className="community-sidebar-card community-rule-card" key={kural.title} style={{ padding: '18px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.025))', boxShadow: '0 14px 36px rgba(0,0,0,0.16)' }}>
                    <div style={{ color: '#fff', fontSize: '17px', fontWeight: 800, marginBottom: '8px' }}>{kural.title}</div>
                    <div style={{ color: '#b8b8b2', fontSize: '13px', lineHeight: 1.7 }}>{kural.text}</div>
                  </section>
                ))}

                <details open className="community-sidebar-card community-sidebar-group" style={{ padding: '18px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.025))' }}>
                  <summary className="community-sidebar-summary" style={{ color: '#fff', fontSize: '12px', fontWeight: 800, letterSpacing: '0.9px', textTransform: 'uppercase', marginBottom: '12px', listStyle: 'none', cursor: 'pointer' }}>
                    Kategoriler
                  </summary>
                  <div className="community-category-list" style={{ display: 'grid', gap: '8px' }}>
                    {kategoriListesi.map((kategori) => (
                      <div className="community-category-item" key={kategori} style={{ minHeight: '44px', display: 'flex', alignItems: 'center', padding: '0 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', color: '#d9d9d3', fontSize: '14px', fontWeight: 600 }}>
                        {kategori}
                      </div>
                    ))}
                  </div>
                </details>

                <details open className="community-sidebar-card community-sidebar-group" style={{ padding: '18px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.025))' }}>
                  <summary className="community-sidebar-summary" style={{ color: '#fff', fontSize: '12px', fontWeight: 800, letterSpacing: '0.9px', textTransform: 'uppercase', marginBottom: '12px', listStyle: 'none', cursor: 'pointer' }}>
                    Popüler Konular
                  </summary>
                  <div className="community-popular-list" style={{ display: 'grid', gap: '12px' }}>
                    {populerKonular.map((konu) => (
                      <Link key={konu.id} href={konu.href || `/topluluk/konu/${konu.slug}`} style={{ textDecoration: 'none' }}>
                        <div className="community-popular-item" style={{ padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700, lineHeight: 1.4, marginBottom: '4px' }}>{konu.baslik}</div>
                          <div style={{ color: '#a9a9a3', fontSize: '12px' }}>{Number(konu.yanit_sayisi || 0)} yorum</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link href="/topluluk" style={{ marginTop: '14px', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '13px', fontWeight: 800, textDecoration: 'none', background: 'rgba(255,255,255,0.025)' }}>
                    Tümünü Gör
                  </Link>
                </details>
              </aside>

              <section className="community-feed-column">
                <div className="community-feed-intro" style={{ marginBottom: '18px' }}>
                  <div style={{ color: '#9f9f98', fontSize: '11px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Topluluk Akışı
                  </div>
                  <div style={{ color: '#fff', fontSize: '32px', fontWeight: 900, lineHeight: 1.04, marginBottom: '10px' }}>
                    Okurlar Ne Konuşuyor?
                  </div>
                  <div style={{ color: '#b8b8b2', fontSize: '14px', lineHeight: 1.75, maxWidth: '760px' }}>
                    Planet manşetlerinin hemen altında kullanıcı konularını, anketleri ve tartışmaları tek akışta takip et.
                  </div>
                </div>
                <ToplulukFeedClient initialTopics={feedTopics} />
              </section>
            </div>
          </div>
        </section>

        <style>{`
          @media (max-width: 1180px) {
            .community-below-grid {
              grid-template-columns: 1fr !important;
            }

            .community-sidebar-v3 {
              position: static !important;
              top: auto !important;
              order: 2 !important;
            }

            .community-feed-column {
              order: 1 !important;
            }
          }

          @media (max-width: 980px) {
            .planet-featured {
              grid-template-columns: 1fr !important;
            }

            .planet-grid {
              grid-template-columns: 1fr !important;
            }
          }

          @media (max-width: 900px) {
            .community-below-grid {
              gap: 20px !important;
            }

            .community-feed-intro {
              margin-bottom: 14px !important;
            }
          }

          @media (max-width: 720px) {
            .community-below-grid {
              gap: 16px !important;
            }

            .community-sidebar-v3 {
              gap: 10px !important;
            }

            .community-sidebar-card {
              padding: 14px !important;
              border-radius: 16px !important;
            }
          }

          @media (max-width: 640px) {
            .community-category-list {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 8px !important;
            }

            .community-category-item {
              min-height: 40px !important;
              padding: 0 12px !important;
              font-size: 13px !important;
            }

            .community-popular-list {
              gap: 10px !important;
            }

            .community-popular-item {
              padding: 12px !important;
            }

            .community-sidebar-group {
              padding: 0 !important;
              overflow: hidden !important;
            }

            .community-sidebar-summary {
              min-height: 48px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: space-between !important;
              padding: 0 14px !important;
              margin-bottom: 0 !important;
            }

            .community-sidebar-summary::-webkit-details-marker {
              display: none !important;
            }

            .community-sidebar-group > *:not(summary) {
              padding: 0 14px 14px !important;
            }

            .community-sidebar-group:not([open]) > *:not(summary) {
              display: none !important;
            }
          }

          @media (max-width: 560px) {
            .community-sidebar-v3 {
              display: grid !important;
              grid-template-columns: 1fr !important;
            }

            .community-rule-card {
              padding: 12px !important;
            }
          }

          @media (max-width: 520px) {
            .community-below-grid {
              gap: 14px !important;
            }

            .community-category-list {
              grid-template-columns: 1fr !important;
            }

            .community-sidebar-card {
              padding: 12px !important;
            }

            .community-feed-intro > div:nth-child(2) {
              font-size: 24px !important;
            }
          }
        `}</style>
      </main>
      <Footer />
    </>
  )
}
