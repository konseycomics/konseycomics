import Link from 'next/link'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { buildMetadata, createSeoDescription } from '../lib/seo'
import { getCommunityTopics } from '../lib/communityData'
import { buildPlanetView, getPlanetPosts } from '../lib/planetData'
import ToplulukFeedClient from './ToplulukFeedClient'

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function trimText(value, max = 120) {
  const text = String(value || '').trim()
  return text.length > max ? `${text.slice(0, max - 3).trim()}...` : text
}

export async function generateMetadata() {
  return buildMetadata({
    title: 'Konsey Planet | Topluluk',
    description: createSeoDescription(
      '',
      'Konsey Planet manşetleri, topluluk anketleri, son haberler ve okur akışı tek sayfada. Çizgi roman, manga ve webtoon dünyasının sosyal yüzü burada.'
    ),
    path: '/topluluk',
    keywords: ['Konsey Planet', 'Konsey topluluk', 'çizgi roman haberleri', 'topluluk anketi', 'okur akışı'],
  })
}

export default async function ToplulukPage() {
  const [{ topics: rawTopics }, planetPosts] = await Promise.all([
    getCommunityTopics({ limit: 12 }),
    getPlanetPosts({ limit: 10 }),
  ])

  const feedTopics = rawTopics || []
  const planetView = buildPlanetView(planetPosts)
  const featured = planetView.featured || null
  const spotlights = planetView.spotlight.slice(0, 4)
  const latestNews = planetView.all.slice(0, 3)
  const communityPoll = feedTopics.find((topic) => topic.anket_aktif) || null
  const highlightedTopics = feedTopics.slice(0, 3)
  const quickLinks = [
    { label: 'Okurlar Ne Konuşuyor?', href: '#community-feed' },
    { label: 'Editör Masası', href: featured ? featured.href : '/topluluk' },
    { label: 'Etkinlik Takvimi', href: '#planet-news' },
    { label: 'Kurallar & Rehber', href: '#community-guidelines' },
  ]
  const categoryCards = [
    { title: 'Çizgi Roman', text: 'Binlerce seri', icon: '◫', href: '/cizgi-roman' },
    { title: 'Manga', text: 'En popüler seriler', icon: '✦', href: '/manga' },
    { title: 'Webtoon', text: 'Dijital maceralar', icon: '◎', href: '/webtoon' },
    { title: 'Topluluk', text: 'Tartış, paylaş, oy ver', icon: '◌', href: '#community-feed' },
    { title: 'Haberler', text: 'En yeni gelişmeler', icon: '▣', href: '#planet-news' },
  ]

  return (
    <>
      <Navbar />
      <main style={{ background: 'radial-gradient(circle at top, #0b1220 0%, #050505 32%, #050505 100%)', minHeight: '100vh' }}>
        <section className="site-shell" style={{ paddingTop: '24px', paddingBottom: '42px' }}>
          <div style={{ maxWidth: '1500px', margin: '0 auto' }}>
            <section
              className="planet-landing-hero"
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '30px',
                border: '1px solid rgba(255,255,255,0.08)',
                background:
                  'radial-gradient(circle at 72% 18%, rgba(255,235,180,0.22), transparent 24%), radial-gradient(circle at 76% 28%, rgba(255,255,255,0.1), transparent 12%), linear-gradient(135deg, rgba(11,18,32,0.96), rgba(6,10,18,0.96))',
                boxShadow: '0 28px 80px rgba(0,0,0,0.28)',
                padding: '52px 42px 46px',
                marginBottom: '22px',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 'auto 7% -18% auto',
                  width: '44%',
                  aspectRatio: '1 / 1',
                  borderRadius: '50%',
                  background:
                    featured?.kapak_url
                      ? `radial-gradient(circle at 38% 34%, rgba(255,255,255,0.22), transparent 18%), url(${featured.kapak_url}) center/cover no-repeat`
                      : 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.3), rgba(245,201,122,0.12) 28%, rgba(255,255,255,0.03) 54%, transparent 58%)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: '0 0 0 16px rgba(255,255,255,0.02), 0 24px 80px rgba(0,0,0,0.35)',
                  opacity: 0.95,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: '26% 20% auto auto',
                  width: '84px',
                  aspectRatio: '1 / 1',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.72), rgba(255,229,170,0.18) 52%, transparent 68%)',
                  opacity: 0.9,
                }}
              />
              <div className="planet-hero-content" style={{ position: 'relative', zIndex: 1, maxWidth: '640px' }}>
                <div style={{ color: '#f1c769', fontSize: '14px', fontWeight: 800, letterSpacing: '0.9px', textTransform: 'uppercase', marginBottom: '16px' }}>
                  Konsey Planet
                </div>
                <h1 style={{ margin: 0, color: '#fff', fontSize: 'clamp(48px, 6vw, 82px)', lineHeight: 0.95, fontWeight: 900, maxWidth: '640px' }}>
                  Evrenin en iyi hikayeleri burada.
                </h1>
                <p style={{ margin: '20px 0 0', color: '#d2d3d7', fontSize: '18px', lineHeight: 1.7, maxWidth: '520px' }}>
                  Konsey Planet; çizgi roman, manga, webtoon ve daha fazlasını sevenlerin buluştuğu bir topluluktur.
                </p>
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '28px' }}>
                  <Link href="#planet-highlights" style={{ minHeight: '52px', display: 'inline-flex', alignItems: 'center', padding: '0 22px', borderRadius: '14px', background: '#f1c769', color: '#111', fontWeight: 900, textDecoration: 'none', boxShadow: '0 12px 34px rgba(241,199,105,0.18)' }}>
                    Keşfet →
                  </Link>
                  <Link href="#community-feed" style={{ minHeight: '52px', display: 'inline-flex', alignItems: 'center', padding: '0 22px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 800, textDecoration: 'none' }}>
                    Topluluğa Katıl
                  </Link>
                </div>
              </div>
            </section>

            <section className="planet-category-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '14px', marginBottom: '22px' }}>
              {categoryCards.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  style={{
                    minHeight: '94px',
                    padding: '18px 18px 16px',
                    borderRadius: '18px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
                    textDecoration: 'none',
                    display: 'grid',
                    gridTemplateColumns: '36px minmax(0, 1fr)',
                    gap: '12px',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '12px', display: 'grid', placeItems: 'center', border: '1px solid rgba(241,199,105,0.22)', background: 'rgba(241,199,105,0.08)', color: '#f1c769', fontSize: '18px', fontWeight: 800 }}>
                    {card.icon}
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontSize: '17px', fontWeight: 800, marginBottom: '4px' }}>{card.title}</div>
                    <div style={{ color: '#aeb0b6', fontSize: '13px' }}>{card.text}</div>
                  </div>
                </Link>
              ))}
            </section>

            <section className="planet-feature-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(340px, 0.85fr)', gap: '22px', marginBottom: '22px' }}>
              <section id="planet-highlights" style={{ padding: '18px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '14px' }}>
                  <div style={{ color: '#fff', fontSize: '32px', fontWeight: 900 }}>Öne Çıkanlar</div>
                  <Link href={featured?.href || '/topluluk'} style={{ color: '#bfc2ca', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
                    Tümünü Gör →
                  </Link>
                </div>

                <div className="planet-highlight-body" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(300px, 0.95fr)', gap: '14px' }}>
                  <div
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      borderRadius: '20px',
                      minHeight: '420px',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      background:
                        featured?.kapak_url
                          ? `linear-gradient(180deg, rgba(5,8,15,0.18), rgba(5,8,15,0.88)), url(${featured.kapak_url}) center/cover no-repeat`
                          : 'linear-gradient(135deg, rgba(15,20,34,0.96), rgba(7,10,18,0.92))',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div style={{ minHeight: '30px', width: 'fit-content', display: 'inline-flex', alignItems: 'center', padding: '0 12px', borderRadius: '999px', background: 'rgba(241,199,105,0.14)', border: '1px solid rgba(241,199,105,0.24)', color: '#f1c769', fontSize: '11px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                      {featured ? tipEtiketi(featured.tip) : 'Yeni Bölüm'}
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontSize: '46px', lineHeight: 0.98, fontWeight: 900, marginBottom: '10px' }}>
                        {featured?.baslik || 'Konsey Planet'}
                      </div>
                      <div style={{ color: '#dddfe5', fontSize: '17px', lineHeight: 1.75, maxWidth: '420px', marginBottom: '22px' }}>
                        {trimText(featured?.fullPreview || 'Beklenen yeni bölüm yayında! Evrenin dengesi yeniden değişiyor.', 160)}
                      </div>
                      <Link href={featured?.href || '/topluluk'} style={{ minHeight: '46px', display: 'inline-flex', alignItems: 'center', padding: '0 18px', borderRadius: '14px', border: '1px solid rgba(241,199,105,0.24)', background: 'rgba(15,15,15,0.42)', color: '#f1c769', fontWeight: 800, textDecoration: 'none' }}>
                        Oku →
                      </Link>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '12px' }}>
                    {(spotlights.length > 0 ? spotlights : latestNews).map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        style={{
                          padding: '12px',
                          borderRadius: '18px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: 'rgba(255,255,255,0.025)',
                          display: 'grid',
                          gridTemplateColumns: item.kapak_url ? '72px minmax(0, 1fr)' : '1fr',
                          gap: '12px',
                          textDecoration: 'none',
                          alignItems: 'center',
                        }}
                      >
                        {item.kapak_url ? (
                          <div style={{ width: '72px', height: '88px', borderRadius: '14px', overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
                            <img src={item.kapak_url} alt={item.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : null}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#fff', fontSize: '20px', lineHeight: 1.15, fontWeight: 800, marginBottom: '6px' }}>{item.baslik}</div>
                          <div style={{ color: '#aeb0b6', fontSize: '14px', marginBottom: '8px' }}>{item.tip === 'manset' ? 'Manşet' : tipEtiketi(item.tip)}</div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                            <div style={{ color: '#8f9299', fontSize: '12px' }}>{formatDate(item.created_at)}</div>
                            <span style={{ minHeight: '24px', display: 'inline-flex', alignItems: 'center', padding: '0 8px', borderRadius: '999px', background: 'rgba(241,199,105,0.12)', color: '#f1c769', fontSize: '10px', fontWeight: 800 }}>
                              YENİ
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>

              <section style={{ display: 'grid', gap: '22px' }}>
                <section style={{ padding: '18px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '18px' }}>
                    <div style={{ color: '#fff', fontSize: '20px', fontWeight: 900 }}>Topluluk Anketi</div>
                    <Link href={communityPoll?.href || '#community-feed'} style={{ color: '#bfc2ca', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                      Tümünü Gör →
                    </Link>
                  </div>
                  {communityPoll ? (
                    <>
                      <div style={{ color: '#fff', fontSize: '18px', fontWeight: 800, lineHeight: 1.45, marginBottom: '16px' }}>
                        {communityPoll.baslik}
                      </div>
                      <div style={{ display: 'grid', gap: '10px', marginBottom: '18px' }}>
                        {(communityPoll.anket_sonuclari || []).map((option) => (
                          <div key={`${communityPoll.id}-${option.index}`}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: '#d4d6dc', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                              <span>{option.label}</span>
                              <span>{option.yuzde}%</span>
                            </div>
                            <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                              <div style={{ width: `${option.yuzde}%`, height: '100%', background: 'linear-gradient(90deg, #f1c769, rgba(255,255,255,0.55))' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ color: '#aeb0b6', fontSize: '14px' }}>Toplam {communityPoll.anket_toplam_oy || 0} oy</div>
                        <Link href={communityPoll.href} style={{ minHeight: '42px', display: 'inline-flex', alignItems: 'center', padding: '0 16px', borderRadius: '12px', background: 'rgba(241,199,105,0.14)', border: '1px solid rgba(241,199,105,0.22)', color: '#f1c769', fontWeight: 800, textDecoration: 'none' }}>
                          Oy Ver
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div style={{ color: '#aeb0b6', fontSize: '14px', lineHeight: 1.7 }}>Topluluk anketi henüz açılmadı. İlk anket burada öne çıkacak.</div>
                  )}
                </section>

                <section id="planet-news" style={{ padding: '18px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '18px' }}>
                    <div style={{ color: '#fff', fontSize: '20px', fontWeight: 900 }}>Son Haberler</div>
                    <Link href={latestNews[0]?.href || '/topluluk'} style={{ color: '#bfc2ca', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                      Tümünü Gör →
                    </Link>
                  </div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {latestNews.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: item.kapak_url ? '78px minmax(0, 1fr)' : '1fr',
                          gap: '12px',
                          textDecoration: 'none',
                          paddingBottom: '12px',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        {item.kapak_url ? (
                          <div style={{ width: '78px', height: '78px', borderRadius: '14px', overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
                            <img src={item.kapak_url} alt={item.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : null}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#fff', fontSize: '18px', fontWeight: 800, lineHeight: 1.35, marginBottom: '6px' }}>{item.baslik}</div>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', color: '#aeb0b6', fontSize: '12px' }}>
                            <span>{tipEtiketi(item.tip)}</span>
                            <span>{formatDate(item.created_at)}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>

                <section style={{ padding: '18px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' }}>
                  <div style={{ color: '#fff', fontSize: '20px', fontWeight: 900, marginBottom: '16px' }}>Hızlı Bağlantılar</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                    {quickLinks.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        style={{
                          minHeight: '54px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0 14px',
                          borderRadius: '14px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          color: '#fff',
                          fontSize: '14px',
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        <span>{item.label}</span>
                        <span style={{ color: '#bfc2ca' }}>›</span>
                      </Link>
                    ))}
                  </div>
                </section>
              </section>
            </section>

            <section id="community-feed" className="planet-community-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.65fr) minmax(300px, 0.75fr)', gap: '22px', marginBottom: '24px', alignItems: 'start' }}>
              <section style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', marginBottom: '18px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ color: '#fff', fontSize: '32px', fontWeight: 900, marginBottom: '8px' }}>Topluluk Akışı</div>
                    <div style={{ color: '#aeb0b6', fontSize: '14px', lineHeight: 1.7 }}>Okurların açtığı konular, anketler ve tartışmalar burada akıyor.</div>
                  </div>
                </div>
                <ToplulukFeedClient initialTopics={feedTopics} />
              </section>

              <section style={{ display: 'grid', gap: '18px' }}>
                <section style={{ padding: '18px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' }}>
                  <div style={{ color: '#fff', fontSize: '18px', fontWeight: 900, marginBottom: '12px' }}>Topluluğun bir parçası ol!</div>
                  <div style={{ color: '#bfc2ca', fontSize: '14px', lineHeight: 1.75, marginBottom: '16px' }}>
                    Binlerce okurla tanış, tartışmalara katıl, favori serilerin hakkında konuş ve gelişmelerden ilk sen haberdar ol.
                  </div>
                  <Link href="#konu-olustur" style={{ minHeight: '46px', display: 'inline-flex', alignItems: 'center', padding: '0 18px', borderRadius: '14px', background: '#f1c769', color: '#111', fontWeight: 800, textDecoration: 'none' }}>
                    Topluluğa Katıl
                  </Link>
                </section>

                <section style={{ padding: '18px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' }}>
                  <div style={{ color: '#fff', fontSize: '18px', fontWeight: 900, marginBottom: '12px' }}>Editör Masası</div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {(planetView.editorials.length > 0 ? planetView.editorials : latestNews.slice(0, 2)).map((item) => (
                      <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
                        <div style={{ padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ color: '#fff', fontSize: '15px', fontWeight: 700, lineHeight: 1.45, marginBottom: '6px' }}>{item.baslik}</div>
                          <div style={{ color: '#aeb0b6', fontSize: '13px', lineHeight: 1.7 }}>{trimText(item.preview, 90)}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              </section>
            </section>

            <section
              style={{
                borderRadius: '28px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                padding: '28px 28px 26px',
                display: 'grid',
                gridTemplateColumns: '120px minmax(0, 1fr) auto',
                gap: '22px',
                alignItems: 'center',
                marginBottom: '30px',
              }}
            >
              <div style={{ width: '96px', height: '96px', borderRadius: '50%', border: '1px solid rgba(241,199,105,0.22)', background: 'rgba(241,199,105,0.08)', display: 'grid', placeItems: 'center', color: '#f1c769', fontSize: '34px', fontWeight: 800 }}>
                ◌
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: '32px', fontWeight: 900, lineHeight: 1.05, marginBottom: '10px' }}>Topluluğun bir parçası ol!</div>
                <div style={{ color: '#c9ccd3', fontSize: '16px', lineHeight: 1.75, maxWidth: '640px' }}>
                  Binlerce okurla tanış, tartışmalara katıl, favori serilerin hakkında konuş ve gelişmelerden ilk sen haberdar ol.
                </div>
              </div>
              <Link href="#community-feed" style={{ minHeight: '52px', display: 'inline-flex', alignItems: 'center', padding: '0 22px', borderRadius: '14px', background: '#f1c769', color: '#111', fontWeight: 900, textDecoration: 'none' }}>
                Topluluğa Katıl
              </Link>
            </section>
          </div>
        </section>

        <style>{`
          @media (max-width: 1260px) {
            .planet-category-strip {
              grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            }

            .planet-feature-grid,
            .planet-community-grid {
              grid-template-columns: 1fr !important;
            }

            .planet-highlight-body {
              grid-template-columns: 1fr !important;
            }
          }

          @media (max-width: 980px) {
            .planet-landing-hero {
              padding: 34px 24px 28px !important;
            }

            .planet-category-strip {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }

          @media (max-width: 760px) {
            .planet-landing-hero {
              padding: 28px 18px 22px !important;
              border-radius: 24px !important;
            }

            .planet-feature-grid,
            .planet-community-grid {
              gap: 16px !important;
            }
          }

          @media (max-width: 640px) {
            .planet-category-strip {
              grid-template-columns: 1fr !important;
            }
          }

          @media (max-width: 560px) {
            .planet-cta-strip {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </main>
      <Footer />
    </>
  )
}
