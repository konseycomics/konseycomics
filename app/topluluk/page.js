import Link from 'next/link'
import { buildMetadata, createSeoDescription } from '../lib/seo'
import { getCommunityTopics } from '../lib/communityData'
import { buildPlanetView, getPlanetPosts } from '../lib/planetData'

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function trimText(value, max = 140) {
  const text = String(value || '').trim()
  return text.length > max ? `${text.slice(0, max - 3).trim()}...` : text
}

function tipEtiketi(tip) {
  if (tip === 'manset') return 'Manşet'
  if (tip === 'duyuru') return 'Haber'
  if (tip === 'editor') return 'Editör'
  if (tip === 'secki') return 'Seçki'
  return 'Planet'
}

function avatarInitial(topic) {
  return topic?.profil?.kullanici_adi?.charAt(0)?.toUpperCase() || 'K'
}

export async function generateMetadata() {
  return buildMetadata({
    title: 'Konsey Planet | Topluluk',
    description: createSeoDescription(
      '',
      'Konsey Planet; manşetler, topluluk anketleri, trend konular ve okur akışıyla çizgi roman, manga ve webtoon evreninin sosyal merkezi.'
    ),
    path: '/topluluk',
    keywords: ['Konsey Planet', 'Konsey topluluk', 'çizgi roman haberleri', 'topluluk anketi', 'okur akışı'],
  })
}

export default async function ToplulukPage() {
  const [{ topics: rawTopics }, planetPosts] = await Promise.all([
    getCommunityTopics({ limit: 16 }),
    getPlanetPosts({ limit: 10 }),
  ])

  const topics = rawTopics || []
  const planetView = buildPlanetView(planetPosts)
  const featured = planetView.featured || planetView.all[0] || null
  const spotlight = (planetView.spotlight.length > 0 ? planetView.spotlight : planetView.all.slice(1)).slice(0, 4)
  const pollTopic = topics.find((topic) => topic.anket_aktif && (topic.anket_sonuclari || []).length > 0) || null
  const feedCards = [...topics]
    .sort((a, b) => ((b.begeni_sayisi || 0) + (b.yanit_sayisi || 0)) - ((a.begeni_sayisi || 0) + (a.yanit_sayisi || 0)))
    .slice(0, 3)
  const trendTopics = [...topics].sort((a, b) => (b.yanit_sayisi || 0) - (a.yanit_sayisi || 0)).slice(0, 4)

  const categories = [
    ['📖', 'Çizgi Roman', 'Binlerce seri', '/cizgi-roman'],
    ['⚔️', 'Manga', 'En popüler seriler', '/manga'],
    ['💬', 'Webtoon', 'Dijital maceralar', '/webtoon'],
    ['👥', 'Topluluk', 'Tartış, paylaş, oy ver', '#community-feed'],
    ['📰', 'Haberler', 'En yeni gelişmeler', '#trendler'],
  ]

  const summaryCards = [
    `${topics.length || 0} Aktif Konu`,
    `${topics.reduce((sum, topic) => sum + (topic.yanit_sayisi || 0), 0)} Yeni Yorum`,
    `${planetView.all.length || 0} Planet Yazısı`,
    `${pollTopic?.anket_toplam_oy || 0} Bugünkü Oy`,
  ]

  return (
    <div className="planet-page">
      <header className="planet-header">
        <div className="planet-shell planet-header-inner">
          <Link href="/" className="planet-brand">
            <div className="planet-ring" />
            <div className="planet-brand-copy">
              <span>KONSEY</span>
              <strong>PLANET</strong>
            </div>
          </Link>

          <nav className="planet-nav">
            <Link href="/">Ana Sayfa</Link>
            <Link href="/seriler">Seriler</Link>
            <Link href="/cizgi-roman">Çizgi Roman</Link>
            <Link href="/manga">Manga</Link>
            <Link href="/webtoon">Webtoon</Link>
            <Link href="/topluluk">Topluluk</Link>
            <Link href="/hakkimizda">Hakkımızda</Link>
          </nav>

          <div className="planet-header-actions">
            <button type="button" className="planet-search">Ara...</button>
            <Link href="/giris" className="planet-login">Giriş Yap</Link>
            <Link href="/giris" className="planet-register">Üye Ol</Link>
          </div>
        </div>
      </header>

      <main className="planet-shell planet-main">
        <section className="planet-hero">
          <div className="planet-hero-copy">
            <p className="planet-label">KONSEY PLANET</p>
            <h1>Evrenin en iyi hikayeleri burada.</h1>
            <p>
              Konsey Planet; çizgi roman, manga, webtoon ve daha fazlasını sevenlerin buluştuğu
              güçlü ve yaşayan bir merkez.
            </p>
            <div className="planet-hero-actions">
              <Link href="#featured" className="planet-register">Keşfet →</Link>
              <Link href="#community-feed" className="planet-login">Topluluğa Katıl</Link>
            </div>
          </div>
          <div className="planet-hero-visual" aria-hidden="true" />
        </section>

        <section className="planet-category-strip">
          {categories.map(([icon, title, text, href]) => (
            <Link key={title} href={href} className="planet-category-item">
              <div className="planet-category-icon">{icon}</div>
              <div>
                <div className="planet-category-title">{title}</div>
                <div className="planet-category-text">{text}</div>
              </div>
            </Link>
          ))}
        </section>

        <section className="planet-grid-top">
          <div className="planet-panel">
            <div className="planet-section-head">
              <h2>Öne Çıkanlar</h2>
              <Link href={featured?.href || '/topluluk'}>Tümünü Gör →</Link>
            </div>

            <div className="planet-featured">
              <article
                id="featured"
                className="planet-featured-card"
                style={{
                  background: featured?.kapak_url
                    ? `linear-gradient(180deg, rgba(5,7,12,0.2), rgba(5,7,12,0.92)), url(${featured.kapak_url}) center/cover no-repeat`
                    : undefined,
                }}
              >
                <span className="planet-pill">YENİ BÖLÜM</span>
                <h3>{featured?.baslik || 'Konsey Planet'}</h3>
                <p className="planet-featured-meta">
                  {tipEtiketi(featured?.tip)} · {formatDate(featured?.created_at)}
                </p>
                <p>{trimText(featured?.fullPreview || 'Konsey Planet için ilk manşet burada yer alacak.', 150)}</p>
                <Link href={featured?.href || '/topluluk'} className="planet-outline">Oku</Link>
              </article>

              <div className="planet-featured-list">
                {spotlight.map((item, index) => (
                  <Link key={item.id} href={item.href} className="planet-featured-row">
                    <div className="planet-featured-thumb">
                      {item.kapak_url ? <img src={item.kapak_url} alt={item.baslik} /> : null}
                    </div>
                    <div className="planet-featured-copy">
                      <div className="planet-featured-row-title">{item.baslik}</div>
                      <div className="planet-featured-row-meta">
                        <span>{tipEtiketi(item.tip)}</span>
                        <strong>{index < 3 ? 'YENİ' : 'KLASİK'}</strong>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="planet-top-side">
            <section className="planet-panel">
              <div className="planet-section-head compact">
                <h2>Topluluk Özeti</h2>
              </div>
              <div className="planet-summary-grid">
                {summaryCards.map((item) => (
                  <div key={item} className="planet-summary-card">{item}</div>
                ))}
              </div>
              <Link href="#community-feed" className="planet-login wide">Topluluğa Git →</Link>
            </section>

            <section className="planet-panel">
              <div className="planet-section-head compact">
                <h2>Günün Anketi</h2>
              </div>
              {pollTopic ? (
                <>
                  <p className="planet-poll-question">{pollTopic.baslik}</p>
                  <div className="planet-poll-list">
                    {(pollTopic.anket_sonuclari || []).map((option) => (
                      <div key={`${pollTopic.id}-${option.index}`} className="planet-poll-item">
                        <div className="planet-poll-line">
                          <span>{option.label}</span>
                          <strong>{option.yuzde}%</strong>
                        </div>
                        <div className="planet-poll-track">
                          <div style={{ width: `${option.yuzde}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href={pollTopic.href} className="planet-register wide">Oy Ver</Link>
                </>
              ) : (
                <p className="planet-muted">Henüz topluluk anketi yok.</p>
              )}
            </section>
          </div>
        </section>

        <section className="planet-grid-bottom">
          <section id="community-feed" className="planet-panel">
            <div className="planet-section-head">
              <h2>Topluluk Akışı</h2>
              <div className="planet-feed-tabs">
                <button type="button" className="active">Popüler</button>
                <button type="button">En Yeni</button>
                <button type="button">Takip Edilen</button>
              </div>
            </div>

            <div className="planet-feed-list">
              {feedCards.map((post) => (
                <article key={post.id} className="planet-feed-card">
                  <Link href={post.href} className="planet-feed-header">
                    <div className="planet-feed-avatar">
                      {post.profil?.avatar_url ? (
                        <img src={post.profil.avatar_url} alt={post.profil?.kullanici_adi || post.baslik} />
                      ) : (
                        <span>{avatarInitial(post)}</span>
                      )}
                    </div>
                    <div className="planet-feed-copy">
                      <div className="planet-feed-userline">
                        <strong>{post.profil?.kullanici_adi || 'okur'}</strong>
                        <span>{post.created_at ? formatDate(post.created_at) : ''}</span>
                      </div>
                      <h3>{post.baslik}</h3>
                      <p>{trimText(post.icerik, 170)}</p>
                    </div>
                  </Link>

                  {post.anket_aktif && Array.isArray(post.anket_sonuclari) && post.anket_sonuclari.length > 0 ? (
                    <div className="planet-inline-poll">
                      {post.anket_sonuclari.slice(0, 4).map((option) => (
                        <div key={`${post.id}-${option.index}`} className="planet-inline-poll-row">
                          <div className="planet-poll-line">
                            <span>{option.label}</span>
                            <strong>{option.yuzde}%</strong>
                          </div>
                          <div className="planet-poll-track">
                            <div style={{ width: `${option.yuzde}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="planet-feed-footer">
                    <span className="planet-topic-type">{post.anket_aktif ? 'Anket Konusu' : 'Tartışma'}</span>
                    <div className="planet-feed-stats">
                      <span>♡ {post.begeni_sayisi || 0}</span>
                      <span>💬 {post.yanit_sayisi || 0}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <button type="button" className="planet-load-more">Daha Fazlasını Yükle</button>
          </section>

          <div className="planet-bottom-side">
            <section id="latest-news" className="planet-panel">
              <div className="planet-section-head compact">
                <h2>Son Haberler</h2>
                <Link href={latestNews[0]?.href || '/topluluk'}>Tümünü Gör →</Link>
              </div>
              <div className="planet-news-list">
                {latestNews.map((item) => (
                  <Link key={item.id} href={item.href} className="planet-news-row">
                    <div className="planet-news-thumb">
                      {item.kapak_url ? <img src={item.kapak_url} alt={item.baslik} /> : null}
                    </div>
                    <div>
                      <div className="planet-news-title">{item.baslik}</div>
                      <div className="planet-news-meta">{tipEtiketi(item.tip)} · {formatDate(item.created_at)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section id="trendler" className="planet-panel">
              <div className="planet-section-head compact">
                <h2>Trend Konular</h2>
              </div>
              <div className="planet-trend-list">
                {trendTopics.map((topic) => (
                  <Link key={topic.id} href={topic.href} className="planet-trend-row">
                    <span>{topic.baslik}</span>
                    <strong>{topic.yanit_sayisi || 0} yorum</strong>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="planet-bottom-cta">
          <div>
            <h2>Topluluğun bir parçası ol!</h2>
            <p>
              Binlerce okurla tanış, tartışmalara katıl, favori serilerin hakkında konuş ve
              gelişmelerden ilk sen haberdar ol.
            </p>
          </div>
          <Link href="#community-feed" className="planet-register">Topluluğa Katıl</Link>
        </section>
      </main>

      <footer className="planet-footer">
        <div className="planet-shell planet-footer-grid">
          <div>
            <div className="planet-footer-logo">KONSEY PLANET</div>
            <p>Çizgi roman, manga, webtoon ve daha fazlası için en büyük Türkçe topluluk platformu.</p>
          </div>
          <div>
            <h4>Keşfet</h4>
            <p>Seriler<br />Çizgi Roman<br />Manga<br />Webtoon</p>
          </div>
          <div>
            <h4>Topluluk</h4>
            <p>Topluluk Akışı<br />Okurlar Ne Konuşuyor?<br />Etkinlikler</p>
          </div>
          <div>
            <h4>Bülten</h4>
            <div className="planet-newsletter">
              <input placeholder="E-posta adresiniz" />
              <button type="button">→</button>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        .planet-page {
          min-height: 100vh;
          background: #070808;
          color: #fff;
        }

        .planet-shell {
          width: min(100%, 1320px);
          margin: 0 auto;
          padding-left: 24px;
          padding-right: 24px;
        }

        .planet-header {
          position: sticky;
          top: 0;
          z-index: 50;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background: rgba(7,8,8,0.88);
          backdrop-filter: blur(16px);
        }

        .planet-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 18px 24px;
        }

        .planet-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #fff;
          text-decoration: none;
        }

        .planet-ring {
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: 4px solid rgba(241,199,105,0.9);
          border-left-color: transparent;
        }

        .planet-brand-copy span {
          display: block;
          font-size: 17px;
          line-height: 0.95;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .planet-brand-copy strong {
          display: block;
          margin-top: 3px;
          font-size: 11px;
          letter-spacing: 0.42em;
          color: rgba(255,255,255,0.7);
        }

        .planet-nav {
          display: none;
          align-items: center;
          gap: 30px;
        }

        .planet-nav a {
          color: rgba(255,255,255,0.84);
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
        }

        .planet-nav a:hover {
          color: #f1c769;
        }

        .planet-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .planet-search,
        .planet-login,
        .planet-register,
        .planet-outline,
        .planet-load-more {
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          border-radius: 14px;
          text-decoration: none;
          font-weight: 800;
        }

        .planet-search {
          display: none;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.52);
        }

        .planet-login,
        .planet-load-more {
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          background: transparent;
        }

        .planet-login.wide,
        .planet-register.wide {
          width: 100%;
          margin-top: 18px;
        }

        .planet-register {
          border: 0;
          color: #111;
          background: #f1c769;
          box-shadow: 0 12px 30px rgba(241,199,105,0.12);
        }

        .planet-main {
          padding-top: 34px;
          padding-bottom: 40px;
        }

        .planet-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(420px, 0.92fr);
          gap: 28px;
          padding: 48px;
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,0.08);
          background:
            radial-gradient(circle at 72% 32%, rgba(241,199,105,0.16), transparent 24%),
            linear-gradient(135deg, #0d1118, #070808 58%);
          overflow: hidden;
        }

        .planet-label {
          margin: 0 0 12px;
          color: #f1c769;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .planet-hero h1 {
          margin: 0;
          font-size: clamp(48px, 6vw, 76px);
          line-height: 0.95;
          letter-spacing: -0.05em;
          font-weight: 900;
        }

        .planet-hero-copy > p:last-of-type {
          max-width: 560px;
          margin: 20px 0 0;
          color: rgba(255,255,255,0.72);
          font-size: 20px;
          line-height: 1.7;
        }

        .planet-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 28px;
        }

        .planet-hero-visual {
          position: relative;
          min-height: 420px;
          overflow: hidden;
          border-radius: 24px;
          background:
            radial-gradient(circle at 66% 28%, rgba(255,255,255,0.34), rgba(255,255,255,0.03) 30%, transparent 35%),
            radial-gradient(circle at 48% 40%, rgba(255,255,255,0.08), transparent 5%),
            linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0));
        }

        .planet-hero-visual::before {
          content: '';
          position: absolute;
          right: -4%;
          top: 6%;
          width: 78%;
          aspect-ratio: 1 / 1;
          border-radius: 50%;
          background: radial-gradient(circle at 36% 34%, rgba(255,255,255,0.56), rgba(241,199,105,0.13) 34%, rgba(255,255,255,0.03) 58%, transparent 63%);
          box-shadow: 0 0 120px rgba(241,199,105,0.18);
        }

        .planet-hero-visual::after {
          content: '';
          position: absolute;
          right: 2%;
          bottom: 17%;
          width: 94%;
          height: 36%;
          border-radius: 50%;
          border: 1px solid rgba(241,199,105,0.12);
          transform: rotate(-10deg);
        }

        .planet-category-strip,
        .planet-grid-top,
        .planet-grid-bottom,
        .planet-bottom-cta {
          margin-top: 24px;
        }

        .planet-category-strip {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }

        .planet-category-item,
        .planet-panel,
        .planet-bottom-cta {
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
        }

        .planet-category-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px;
          text-decoration: none;
        }

        .planet-category-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          border: 1px solid rgba(241,199,105,0.25);
          font-size: 22px;
          color: #f1c769;
        }

        .planet-category-title {
          color: #fff;
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .planet-category-text {
          color: rgba(255,255,255,0.52);
          font-size: 14px;
        }

        .planet-grid-top,
        .planet-grid-bottom {
          display: grid;
          gap: 24px;
          grid-template-columns: minmax(0, 1.5fr) minmax(340px, 0.9fr);
        }

        .planet-top-side,
        .planet-bottom-side {
          display: grid;
          gap: 24px;
          align-content: start;
        }

        .planet-panel {
          padding: 24px;
        }

        .planet-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .planet-section-head.compact {
          margin-bottom: 16px;
        }

        .planet-section-head h2 {
          margin: 0;
          font-size: 30px;
          font-weight: 900;
        }

        .planet-section-head a {
          color: rgba(255,255,255,0.58);
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
        }

        .planet-featured {
          display: grid;
          gap: 18px;
          grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
        }

        .planet-featured-card {
          min-height: 420px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          background:
            radial-gradient(circle at 72% 80%, rgba(241,199,105,0.18), transparent 30%),
            linear-gradient(135deg,#101314,#050505);
        }

        .planet-pill,
        .planet-topic-type {
          width: fit-content;
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          padding: 0 10px;
          border-radius: 999px;
          background: rgba(241,199,105,0.12);
          color: #f1c769;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.03em;
        }

        .planet-featured-card h3 {
          margin: 18px 0 0;
          font-size: 48px;
          line-height: 1;
          font-weight: 900;
        }

        .planet-featured-meta {
          margin: 10px 0 0;
          color: rgba(255,255,255,0.5);
          font-size: 14px;
        }

        .planet-featured-card p {
          margin: 16px 0 0;
          max-width: 460px;
          color: rgba(255,255,255,0.72);
          line-height: 1.72;
        }

        .planet-outline {
          width: fit-content;
          margin-top: 24px;
          border: 1px solid rgba(241,199,105,0.42);
          color: #f1c769;
          background: transparent;
        }

        .planet-featured-list,
        .planet-news-list,
        .planet-trend-list,
        .planet-feed-list,
        .planet-poll-list,
        .planet-inline-poll {
          display: grid;
          gap: 14px;
        }

        .planet-featured-row,
        .planet-news-row,
        .planet-trend-row,
        .planet-feed-header {
          color: inherit;
          text-decoration: none;
        }

        .planet-featured-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px;
          border-radius: 16px;
        }

        .planet-featured-thumb,
        .planet-news-thumb {
          overflow: hidden;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04));
          flex-shrink: 0;
        }

        .planet-featured-thumb {
          width: 72px;
          height: 72px;
        }

        .planet-news-thumb {
          width: 84px;
          height: 84px;
        }

        .planet-featured-thumb img,
        .planet-news-thumb img,
        .planet-feed-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .planet-featured-row-title,
        .planet-news-title {
          font-size: 20px;
          line-height: 1.25;
          font-weight: 800;
          color: #fff;
        }

        .planet-featured-row-meta,
        .planet-news-meta {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 6px;
          color: rgba(255,255,255,0.5);
          font-size: 13px;
        }

        .planet-featured-row-meta strong {
          color: #f1c769;
        }

        .planet-summary-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .planet-summary-card {
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.2);
          padding: 18px;
          text-align: center;
          font-weight: 800;
          color: rgba(255,255,255,0.88);
        }

        .planet-poll-question {
          margin: 0 0 18px;
          font-size: 20px;
          font-weight: 700;
          line-height: 1.5;
        }

        .planet-poll-line {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .planet-poll-track {
          height: 8px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
        }

        .planet-poll-track div {
          height: 100%;
          background: linear-gradient(90deg, #f1c769, rgba(255,255,255,0.52));
        }

        .planet-muted {
          color: rgba(255,255,255,0.58);
          line-height: 1.72;
        }

        .planet-feed-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .planet-feed-tabs button {
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: rgba(255,255,255,0.5);
          padding: 10px 14px;
          font-weight: 700;
        }

        .planet-feed-tabs button.active {
          background: #f1c769;
          color: #111;
        }

        .planet-feed-card {
          padding: 22px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.025);
        }

        .planet-feed-header {
          display: flex;
          gap: 16px;
        }

        .planet-feed-avatar {
          width: 42px;
          height: 42px;
          overflow: hidden;
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(241,199,105,0.3), rgba(255,255,255,0.08));
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .planet-feed-avatar span {
          font-size: 15px;
          font-weight: 900;
        }

        .planet-feed-userline {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          color: rgba(255,255,255,0.48);
          font-size: 13px;
        }

        .planet-feed-userline strong {
          color: rgba(255,255,255,0.86);
        }

        .planet-feed-copy h3 {
          margin: 8px 0 0;
          font-size: 28px;
          line-height: 1.15;
          font-weight: 900;
        }

        .planet-feed-copy p {
          margin: 10px 0 0;
          color: rgba(255,255,255,0.62);
          line-height: 1.7;
          font-size: 15px;
        }

        .planet-feed-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .planet-feed-stats {
          display: flex;
          gap: 18px;
          color: rgba(255,255,255,0.62);
          font-size: 14px;
          font-weight: 700;
        }

        .planet-news-row {
          display: grid;
          grid-template-columns: 84px minmax(0, 1fr);
          gap: 14px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .planet-news-row:last-child {
          padding-bottom: 0;
          border-bottom: 0;
        }

        .planet-trend-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .planet-trend-row:last-child {
          padding-bottom: 0;
          border-bottom: 0;
        }

        .planet-trend-row span {
          color: #fff;
        }

        .planet-trend-row strong {
          color: rgba(255,255,255,0.48);
          font-size: 13px;
        }

        .planet-bottom-cta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 28px;
          border-radius: 22px;
          border: 1px solid rgba(241,199,105,0.2);
          background: linear-gradient(to right, rgba(241,199,105,0.1), rgba(255,255,255,0.03));
        }

        .planet-bottom-cta h2 {
          margin: 0;
          font-size: 34px;
          font-weight: 900;
        }

        .planet-bottom-cta p {
          margin: 10px 0 0;
          color: rgba(255,255,255,0.62);
          line-height: 1.75;
        }

        .planet-footer {
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 44px;
          padding-bottom: 44px;
        }

        .planet-footer-grid {
          display: grid;
          gap: 28px;
          grid-template-columns: 1.2fr 0.8fr 0.8fr 1fr;
        }

        .planet-footer-logo {
          font-size: 34px;
          font-weight: 900;
          margin-bottom: 14px;
        }

        .planet-footer h4 {
          margin: 0 0 14px;
          font-size: 18px;
          font-weight: 800;
        }

        .planet-footer p {
          margin: 0;
          color: rgba(255,255,255,0.5);
          line-height: 2;
          font-size: 14px;
        }

        .planet-newsletter {
          display: flex;
          align-items: center;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.1);
          padding: 8px;
          margin-top: 16px;
        }

        .planet-newsletter input {
          min-width: 0;
          flex: 1;
          border: 0;
          outline: none;
          background: transparent;
          color: #fff;
          padding: 0 12px;
        }

        .planet-newsletter button {
          width: 44px;
          height: 44px;
          border: 0;
          border-radius: 12px;
          background: #f1c769;
          color: #111;
          font-weight: 900;
        }

        @media (min-width: 1100px) {
          .planet-nav,
          .planet-search {
            display: flex;
          }
        }

        @media (max-width: 1180px) {
          .planet-hero,
          .planet-grid-top,
          .planet-grid-bottom,
          .planet-featured {
            grid-template-columns: 1fr;
          }

          .planet-category-strip {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .planet-shell {
            padding-left: 18px;
            padding-right: 18px;
          }

          .planet-hero {
            padding: 30px 22px;
          }

          .planet-hero h1 {
            font-size: 54px;
          }

          .planet-category-strip,
          .planet-footer-grid,
          .planet-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .planet-bottom-cta {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 640px) {
          .planet-header-inner {
            flex-wrap: wrap;
          }

          .planet-header-actions {
            width: 100%;
            justify-content: flex-end;
          }

          .planet-hero h1 {
            font-size: 42px;
          }

          .planet-hero-copy > p:last-of-type {
            font-size: 17px;
          }

          .planet-category-strip,
          .planet-footer-grid,
          .planet-summary-grid {
            grid-template-columns: 1fr;
          }

          .planet-section-head {
            flex-direction: column;
            align-items: flex-start;
          }

          .planet-news-row {
            grid-template-columns: 1fr;
          }

          .planet-feed-header {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}
