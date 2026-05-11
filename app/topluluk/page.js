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

function tipEtiketi(tip) {
  if (tip === 'manset') return 'Manşet'
  if (tip === 'duyuru') return 'Duyuru'
  if (tip === 'editor') return 'Editör Yazısı'
  if (tip === 'secki') return 'Seçki'
  return 'Planet'
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
  const editorials = planetView.editorials.slice(0, 3)
  const announcements = planetView.bulletins.slice(0, 3)
  const communityPoll = feedTopics.find((topic) => topic.anket_aktif) || null

  const categories = [
    { title: 'Çizgi Roman', text: 'Binlerce seri', icon: '◫', href: '/cizgi-roman' },
    { title: 'Manga', text: 'En popüler seriler', icon: '✦', href: '/manga' },
    { title: 'Webtoon', text: 'Dijital maceralar', icon: '◎', href: '/webtoon' },
    { title: 'Topluluk', text: 'Tartış, paylaş, oy ver', icon: '◌', href: '#community-feed' },
    { title: 'Haberler', text: 'Gelişmeleri kaçırma', icon: '▣', href: '#planet-news' },
  ]

  const quickLinks = [
    { label: 'Okurlar Ne Konuşuyor?', href: '#community-feed' },
    { label: 'Editör Masası', href: '#planet-editor' },
    { label: 'Etkinlik Takvimi', href: '#planet-news' },
    { label: 'Kurallar & Rehber', href: '#community-cta' },
  ]

  return (
    <>
      <Navbar />
      <main
        style={{
          minHeight: '100vh',
          background:
            'radial-gradient(circle at top, rgba(18,26,43,0.96) 0%, rgba(8,10,15,0.98) 26%, #050505 56%, #050505 100%)',
        }}
      >
        <section className="site-shell" style={{ paddingTop: '24px', paddingBottom: '42px' }}>
          <div className="planet-page">
            <section className="planet-hero">
              <div className="planet-hero-copy">
                <div className="planet-eyebrow">Konsey Planet</div>
                <h1>Evrenin en iyi hikayeleri burada.</h1>
                <p>
                  Konsey Planet; çizgi roman, manga, webtoon ve daha fazlasını sevenlerin
                  buluştuğu, yeni bölümlerle topluluk akışını aynı yerde birleştiren canlı yayın
                  alanı.
                </p>
                <div className="planet-hero-actions">
                  <Link href="#planet-highlights" className="planet-primary-link">
                    Keşfet →
                  </Link>
                  <Link href="#community-feed" className="planet-secondary-link">
                    Topluluğa Katıl
                  </Link>
                </div>
              </div>

              <div className="planet-hero-visual">
                <div className="planet-visual-orbit planet-orbit-one" />
                <div className="planet-visual-orbit planet-orbit-two" />
                <div className="planet-visual-orbit planet-orbit-three" />
                <div className="planet-visual-small" />
                <div
                  className="planet-visual-core"
                  style={{
                    background: featured?.kapak_url
                      ? `radial-gradient(circle at 36% 30%, rgba(255,255,255,0.24), rgba(255,255,255,0.02) 45%, transparent 56%), url(${featured.kapak_url}) center/cover no-repeat`
                      : undefined,
                  }}
                />
              </div>
            </section>

            <section className="planet-category-strip">
              {categories.map((card) => (
                <Link key={card.title} href={card.href} className="planet-category-card">
                  <div className="planet-category-icon">{card.icon}</div>
                  <div>
                    <div className="planet-category-title">{card.title}</div>
                    <div className="planet-category-text">{card.text}</div>
                  </div>
                </Link>
              ))}
            </section>

            <section id="planet-highlights" className="planet-top-grid">
              <section className="planet-panel">
                <div className="planet-panel-head">
                  <h2>Öne Çıkanlar</h2>
                  <Link href={featured?.href || '/topluluk'}>Tümünü Gör →</Link>
                </div>

                <div className="planet-highlights-grid">
                  <article
                    className="planet-featured-card"
                    style={{
                      background: featured?.kapak_url
                        ? `linear-gradient(180deg, rgba(6,8,16,0.18), rgba(6,8,16,0.88)), url(${featured.kapak_url}) center/cover no-repeat`
                        : undefined,
                    }}
                  >
                    <div className="planet-badge">
                      {featured ? tipEtiketi(featured.tip) : 'Yeni Bölüm'}
                    </div>
                    <div className="planet-featured-copy">
                      <h3>{featured?.baslik || 'Konsey Planet'}</h3>
                      <p>
                        {trimText(
                          featured?.fullPreview ||
                            'Beklenen yeni bölüm yayında. Evrenin dengesi yeniden değişiyor.',
                          180
                        )}
                      </p>
                    </div>
                    <Link href={featured?.href || '/topluluk'} className="planet-featured-link">
                      Oku →
                    </Link>
                  </article>

                  <div className="planet-highlight-list">
                    {(spotlights.length > 0 ? spotlights : latestNews).map((item, index) => (
                      <Link key={item.id} href={item.href} className="planet-highlight-item">
                        {item.kapak_url ? (
                          <div className="planet-highlight-thumb">
                            <img src={item.kapak_url} alt={item.baslik} />
                          </div>
                        ) : null}
                        <div className="planet-highlight-copy">
                          <div className="planet-highlight-title">{item.baslik}</div>
                          <div className="planet-highlight-meta">
                            <span>{tipEtiketi(item.tip)}</span>
                            <span>{formatDate(item.created_at)}</span>
                            {index < 3 ? <strong>YENİ</strong> : null}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>

              <section className="planet-stack">
                <section className="planet-panel">
                  <div className="planet-panel-head">
                    <h2>Topluluk Anketi</h2>
                    <Link href={communityPoll?.href || '#community-feed'}>Tümünü Gör →</Link>
                  </div>
                  {communityPoll ? (
                    <>
                      <div className="planet-poll-title">{communityPoll.baslik}</div>
                      <div className="planet-poll-list">
                        {(communityPoll.anket_sonuclari || []).map((option) => (
                          <div key={`${communityPoll.id}-${option.index}`} className="planet-poll-item">
                            <div className="planet-poll-row">
                              <span>{option.label}</span>
                              <strong>{option.yuzde}%</strong>
                            </div>
                            <div className="planet-poll-bar">
                              <div style={{ width: `${option.yuzde}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="planet-poll-footer">
                        <span>Toplam {communityPoll.anket_toplam_oy || 0} oy</span>
                        <Link href={communityPoll.href} className="planet-mini-action">
                          Oy Ver
                        </Link>
                      </div>
                    </>
                  ) : (
                    <p className="planet-empty">Topluluk anketi henüz açılmadı. İlk anket burada öne çıkacak.</p>
                  )}
                </section>

                <section id="planet-news" className="planet-panel">
                  <div className="planet-panel-head">
                    <h2>Son Haberler</h2>
                    <Link href={latestNews[0]?.href || '/topluluk'}>Tümünü Gör →</Link>
                  </div>
                  <div className="planet-news-list">
                    {latestNews.map((item) => (
                      <Link key={item.id} href={item.href} className="planet-news-item">
                        {item.kapak_url ? (
                          <div className="planet-news-thumb">
                            <img src={item.kapak_url} alt={item.baslik} />
                          </div>
                        ) : null}
                        <div className="planet-news-copy">
                          <div className="planet-news-title">{item.baslik}</div>
                          <div className="planet-news-meta">
                            <span>{tipEtiketi(item.tip)}</span>
                            <span>{formatDate(item.created_at)}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              </section>
            </section>

            <section className="planet-bottom-grid">
              <section id="community-feed" className="planet-panel">
                <div className="planet-panel-head">
                  <h2>Topluluk Akışı</h2>
                  <Link href="#community-feed">Akışa Git ↓</Link>
                </div>
                <ToplulukFeedClient initialTopics={feedTopics} />
              </section>

              <aside className="planet-sidebar">
                <section className="planet-panel">
                  <div className="planet-panel-head">
                    <h2>Kısa Duyurular</h2>
                  </div>
                  <div className="planet-sidebar-list">
                    {(announcements.length > 0 ? announcements : latestNews.slice(0, 2)).map((item) => (
                      <Link key={item.id} href={item.href} className="planet-sidebar-item">
                        <div className="planet-sidebar-title">{item.baslik}</div>
                        <div className="planet-sidebar-text">{trimText(item.preview, 90)}</div>
                      </Link>
                    ))}
                  </div>
                </section>

                <section id="planet-editor" className="planet-panel">
                  <div className="planet-panel-head">
                    <h2>Editör Masası</h2>
                  </div>
                  <div className="planet-sidebar-list">
                    {(editorials.length > 0 ? editorials : latestNews.slice(0, 2)).map((item) => (
                      <Link key={item.id} href={item.href} className="planet-sidebar-item">
                        <div className="planet-sidebar-title">{item.baslik}</div>
                        <div className="planet-sidebar-text">{trimText(item.preview, 90)}</div>
                      </Link>
                    ))}
                  </div>
                </section>

                <section className="planet-panel">
                  <div className="planet-panel-head">
                    <h2>Hızlı Bağlantılar</h2>
                  </div>
                  <div className="planet-links-grid">
                    {quickLinks.map((item) => (
                      <Link key={item.label} href={item.href} className="planet-quick-link">
                        <span>{item.label}</span>
                        <span>›</span>
                      </Link>
                    ))}
                  </div>
                </section>
              </aside>
            </section>

            <section id="community-cta" className="planet-cta">
              <div className="planet-cta-icon">◌</div>
              <div>
                <h2>Topluluğun bir parçası ol!</h2>
                <p>
                  Binlerce okurla tanış, tartışmalara katıl, favori serilerin hakkında konuş ve
                  gelişmelerden ilk sen haberdar ol.
                </p>
              </div>
              <Link href="#community-feed" className="planet-primary-link">
                Topluluğa Katıl
              </Link>
            </section>
          </div>
        </section>

        <style>{`
          .planet-page {
            max-width: 1680px;
            margin: 0 auto;
          }

          .planet-hero {
            position: relative;
            overflow: hidden;
            display: grid;
            grid-template-columns: minmax(0, 1.1fr) minmax(420px, 0.9fr);
            gap: 24px;
            min-height: 620px;
            padding: 46px 42px 36px;
            margin-bottom: 22px;
            border-radius: 30px;
            border: 1px solid rgba(255,255,255,0.08);
            background:
              radial-gradient(circle at 78% 18%, rgba(255,235,180,0.18), transparent 16%),
              radial-gradient(circle at 72% 28%, rgba(255,255,255,0.08), transparent 8%),
              linear-gradient(135deg, rgba(11,18,32,0.96), rgba(5,7,12,0.98));
            box-shadow: 0 28px 80px rgba(0,0,0,0.28);
          }

          .planet-hero-copy {
            align-self: center;
            position: relative;
            z-index: 2;
            max-width: 640px;
          }

          .planet-eyebrow {
            margin-bottom: 16px;
            color: #f1c769;
            font-size: 14px;
            font-weight: 800;
            letter-spacing: 0.9px;
            text-transform: uppercase;
          }

          .planet-hero-copy h1 {
            margin: 0;
            color: #fff;
            font-size: clamp(56px, 7vw, 86px);
            line-height: 0.94;
            font-weight: 900;
          }

          .planet-hero-copy p {
            margin: 22px 0 0;
            max-width: 560px;
            color: #d2d3d7;
            font-size: 20px;
            line-height: 1.72;
          }

          .planet-hero-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 14px;
            margin-top: 28px;
          }

          .planet-primary-link,
          .planet-secondary-link {
            min-height: 52px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0 22px;
            border-radius: 14px;
            font-weight: 900;
            text-decoration: none;
          }

          .planet-primary-link {
            background: #f1c769;
            color: #111;
            box-shadow: 0 12px 34px rgba(241,199,105,0.18);
          }

          .planet-secondary-link {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            color: #fff;
          }

          .planet-hero-visual {
            position: relative;
            min-height: 520px;
          }

          .planet-visual-core {
            position: absolute;
            right: 0;
            bottom: -4%;
            width: 92%;
            aspect-ratio: 1 / 1;
            border-radius: 50%;
            border: 1px solid rgba(255,255,255,0.12);
            background:
              radial-gradient(circle at 34% 30%, rgba(255,255,255,0.4), rgba(245,201,122,0.14) 26%, rgba(255,255,255,0.03) 48%, transparent 54%);
            box-shadow: 0 0 0 18px rgba(255,255,255,0.02), 0 26px 80px rgba(0,0,0,0.32);
          }

          .planet-visual-small {
            position: absolute;
            top: 12%;
            left: 12%;
            width: 16%;
            aspect-ratio: 1 / 1;
            border-radius: 50%;
            background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.72), rgba(255,229,170,0.18) 52%, transparent 68%);
            opacity: 0.92;
          }

          .planet-visual-orbit {
            position: absolute;
            inset: auto 4% 0 auto;
            border-radius: 50%;
            border: 1px solid rgba(241,199,105,0.12);
            transform: rotate(-12deg);
          }

          .planet-orbit-one {
            width: 94%;
            height: 44%;
            bottom: 8%;
          }

          .planet-orbit-two {
            width: 84%;
            height: 34%;
            bottom: 14%;
            right: 8%;
          }

          .planet-orbit-three {
            width: 70%;
            height: 24%;
            bottom: 20%;
            right: 14%;
          }

          .planet-category-strip {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 14px;
            margin-bottom: 22px;
          }

          .planet-category-card,
          .planet-panel,
          .planet-cta {
            border-radius: 22px;
            border: 1px solid rgba(255,255,255,0.08);
            background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
            box-shadow: 0 14px 36px rgba(0,0,0,0.14);
          }

          .planet-category-card {
            min-height: 96px;
            padding: 18px 18px 16px;
            display: grid;
            grid-template-columns: 38px minmax(0, 1fr);
            gap: 12px;
            align-items: center;
            text-decoration: none;
          }

          .planet-category-icon {
            width: 38px;
            height: 38px;
            border-radius: 12px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(241,199,105,0.24);
            background: rgba(241,199,105,0.08);
            color: #f1c769;
            font-size: 18px;
            font-weight: 800;
          }

          .planet-category-title {
            margin-bottom: 4px;
            color: #fff;
            font-size: 17px;
            font-weight: 800;
          }

          .planet-category-text {
            color: #aeb0b6;
            font-size: 13px;
          }

          .planet-top-grid,
          .planet-bottom-grid {
            display: grid;
            gap: 22px;
            margin-bottom: 22px;
          }

          .planet-top-grid {
            grid-template-columns: minmax(0, 1.6fr) minmax(360px, 0.85fr);
          }

          .planet-bottom-grid {
            grid-template-columns: minmax(0, 1.55fr) minmax(320px, 0.7fr);
            align-items: start;
          }

          .planet-stack,
          .planet-sidebar {
            display: grid;
            gap: 22px;
          }

          .planet-panel {
            padding: 18px;
          }

          .planet-panel-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 16px;
          }

          .planet-panel-head h2 {
            margin: 0;
            color: #fff;
            font-size: 28px;
            font-weight: 900;
          }

          .planet-panel-head a {
            color: #bfc2ca;
            font-size: 13px;
            font-weight: 700;
            text-decoration: none;
          }

          .planet-highlights-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.95fr);
            gap: 14px;
          }

          .planet-featured-card {
            position: relative;
            min-height: 440px;
            padding: 24px;
            overflow: hidden;
            border-radius: 20px;
            border: 1px solid rgba(255,255,255,0.08);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: linear-gradient(135deg, rgba(15,20,34,0.96), rgba(7,10,18,0.92));
          }

          .planet-badge {
            min-height: 30px;
            width: fit-content;
            display: inline-flex;
            align-items: center;
            padding: 0 12px;
            border-radius: 999px;
            background: rgba(241,199,105,0.14);
            border: 1px solid rgba(241,199,105,0.24);
            color: #f1c769;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.8px;
            text-transform: uppercase;
          }

          .planet-featured-copy h3 {
            margin: 0 0 10px;
            color: #fff;
            font-size: 50px;
            line-height: 0.98;
            font-weight: 900;
          }

          .planet-featured-copy p {
            margin: 0 0 20px;
            max-width: 460px;
            color: #dddfe5;
            font-size: 17px;
            line-height: 1.74;
          }

          .planet-featured-link {
            min-height: 46px;
            width: fit-content;
            display: inline-flex;
            align-items: center;
            padding: 0 18px;
            border-radius: 14px;
            border: 1px solid rgba(241,199,105,0.24);
            background: rgba(15,15,15,0.42);
            color: #f1c769;
            font-weight: 800;
            text-decoration: none;
          }

          .planet-highlight-list,
          .planet-news-list,
          .planet-sidebar-list {
            display: grid;
            gap: 12px;
          }

          .planet-highlight-item,
          .planet-news-item,
          .planet-sidebar-item {
            text-decoration: none;
          }

          .planet-highlight-item {
            padding: 12px;
            border-radius: 18px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.025);
            display: grid;
            grid-template-columns: 72px minmax(0, 1fr);
            gap: 12px;
            align-items: center;
          }

          .planet-highlight-thumb,
          .planet-news-thumb {
            overflow: hidden;
            border-radius: 14px;
            background: rgba(255,255,255,0.04);
          }

          .planet-highlight-thumb {
            width: 72px;
            height: 88px;
          }

          .planet-news-thumb {
            width: 78px;
            height: 78px;
          }

          .planet-highlight-thumb img,
          .planet-news-thumb img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .planet-highlight-title,
          .planet-news-title,
          .planet-sidebar-title {
            color: #fff;
            font-weight: 800;
            line-height: 1.35;
          }

          .planet-highlight-title {
            font-size: 20px;
            margin-bottom: 6px;
          }

          .planet-highlight-meta,
          .planet-news-meta {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            color: #aeb0b6;
            font-size: 12px;
          }

          .planet-highlight-meta strong {
            color: #f1c769;
            font-weight: 800;
          }

          .planet-poll-title {
            margin-bottom: 16px;
            color: #fff;
            font-size: 18px;
            font-weight: 800;
            line-height: 1.45;
          }

          .planet-poll-list {
            display: grid;
            gap: 10px;
            margin-bottom: 18px;
          }

          .planet-poll-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 6px;
            color: #d4d6dc;
            font-size: 13px;
            font-weight: 700;
          }

          .planet-poll-bar {
            height: 6px;
            overflow: hidden;
            border-radius: 999px;
            background: rgba(255,255,255,0.06);
          }

          .planet-poll-bar div {
            height: 100%;
            background: linear-gradient(90deg, #f1c769, rgba(255,255,255,0.55));
          }

          .planet-poll-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
            color: #aeb0b6;
            font-size: 14px;
          }

          .planet-mini-action {
            min-height: 42px;
            display: inline-flex;
            align-items: center;
            padding: 0 16px;
            border-radius: 12px;
            background: rgba(241,199,105,0.14);
            border: 1px solid rgba(241,199,105,0.22);
            color: #f1c769;
            font-weight: 800;
            text-decoration: none;
          }

          .planet-news-item {
            display: grid;
            grid-template-columns: 78px minmax(0, 1fr);
            gap: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
          }

          .planet-news-title {
            margin-bottom: 6px;
            font-size: 18px;
          }

          .planet-links-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .planet-quick-link {
            min-height: 54px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 14px;
            border-radius: 14px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.06);
            color: #fff;
            font-size: 14px;
            font-weight: 700;
            text-decoration: none;
          }

          .planet-sidebar-item {
            padding: 12px 0;
            border-top: 1px solid rgba(255,255,255,0.06);
          }

          .planet-sidebar-title {
            margin-bottom: 6px;
            font-size: 15px;
          }

          .planet-sidebar-text,
          .planet-empty {
            color: #aeb0b6;
            font-size: 13px;
            line-height: 1.7;
          }

          .planet-cta {
            display: grid;
            grid-template-columns: 120px minmax(0, 1fr) auto;
            gap: 22px;
            align-items: center;
            padding: 28px;
            margin-bottom: 30px;
          }

          .planet-cta-icon {
            width: 96px;
            height: 96px;
            border-radius: 50%;
            display: grid;
            place-items: center;
            border: 1px solid rgba(241,199,105,0.22);
            background: rgba(241,199,105,0.08);
            color: #f1c769;
            font-size: 34px;
            font-weight: 800;
          }

          .planet-cta h2 {
            margin: 0 0 10px;
            color: #fff;
            font-size: 32px;
            font-weight: 900;
            line-height: 1.05;
          }

          .planet-cta p {
            margin: 0;
            max-width: 640px;
            color: #c9ccd3;
            font-size: 16px;
            line-height: 1.75;
          }

          @media (max-width: 1420px) {
            .planet-top-grid,
            .planet-bottom-grid,
            .planet-hero {
              grid-template-columns: 1fr !important;
            }

            .planet-hero {
              min-height: unset;
            }

            .planet-hero-visual {
              min-height: 420px;
            }
          }

          @media (max-width: 1200px) {
            .planet-category-strip {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            .planet-highlights-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 900px) {
            .planet-hero {
              padding: 34px 24px 28px;
              border-radius: 24px;
            }

            .planet-hero-copy h1 {
              font-size: 54px;
            }

            .planet-category-strip,
            .planet-links-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .planet-cta {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 640px) {
            .planet-category-strip,
            .planet-links-grid {
              grid-template-columns: 1fr;
            }

            .planet-hero {
              padding: 28px 18px 22px;
            }

            .planet-hero-copy h1 {
              font-size: 42px;
            }

            .planet-panel-head {
              flex-direction: column;
              align-items: flex-start;
            }

            .planet-highlight-item,
            .planet-news-item {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </main>
      <Footer />
    </>
  )
}
