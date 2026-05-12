import Link from 'next/link'
import { buildMetadata, createSeoDescription } from '../lib/seo'
import { getCommunityTopics } from '../lib/communityData'
import { buildPlanetView, getPlanetPosts } from '../lib/planetData'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

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
  const latestNews = planetView.all.slice(0, 3)
  const pollTopic = topics.find((topic) => topic.anket_aktif && (topic.anket_sonuclari || []).length > 0) || null
  const feedCards = [...topics]
    .sort((a, b) => ((b.begeni_sayisi || 0) + (b.yanit_sayisi || 0)) - ((a.begeni_sayisi || 0) + (a.yanit_sayisi || 0)))
    .slice(0, 3)
  const trendTopics = [...topics].sort((a, b) => (b.yanit_sayisi || 0) - (a.yanit_sayisi || 0)).slice(0, 4)

  const categories = [
    ['📖', 'Çizgi Roman', 'Binlerce seri', '/kategori/cizgi-roman'],
    ['⚔️', 'Manga', 'En popüler seriler', '/kategori/manga'],
    ['💬', 'Webtoon', 'Dijital maceralar', '/kategori/webtoon'],
    ['👥', 'Topluluk', 'Tartış, paylaş, oy ver', '#community-feed'],
    ['📰', 'Haberler', 'En yeni gelişmeler', '#latest-news'],
  ]

  const summaryCards = [
    `${topics.length || 0} Aktif Konu`,
    `${topics.reduce((sum, topic) => sum + (topic.yanit_sayisi || 0), 0)} Yeni Yorum`,
    `${planetView.all.length || 0} Planet Yazısı`,
    `${pollTopic?.anket_toplam_oy || 0} Bugünkü Oy`,
  ]

  return (
    <>
      <Navbar />
      <div className="planet-page">
        <main className="site-section planet-main">
          <section className="planet-hero">
            <div className="planet-hero-copy">
              <p className="planet-kicker">Konsey Planet</p>
              <h1>Evrenin en iyi hikayeleri burada.</h1>
              <p className="planet-hero-text">
                Konsey Planet; Konsey evrenindeki manşetleri, topluluk nabzını ve okurların en sıcak
                tartışmalarını aynı yerde toplar.
              </p>
              <div className="planet-hero-actions">
                <Link href="#featured" className="planet-primary-btn">Keşfet →</Link>
                <Link href="#community-feed" className="planet-secondary-btn">Topluluğa Katıl</Link>
              </div>
            </div>

            <div
              className="planet-hero-art"
              style={{
                background: featured?.kapak_url
                  ? `linear-gradient(135deg, rgba(0,0,0,0.18), rgba(0,0,0,0.66)), url(${featured.kapak_url}) center/cover no-repeat`
                  : undefined,
              }}
            />
          </section>

          <section className="planet-category-strip">
            {categories.map(([icon, title, text, href]) => (
              <Link key={title} href={href} className="planet-category-card">
                <div className="planet-category-icon">{icon}</div>
                <div>
                  <div className="planet-category-title">{title}</div>
                  <div className="planet-category-text">{text}</div>
                </div>
              </Link>
            ))}
          </section>

          <section className="planet-grid-top">
            <section id="featured" className="planet-card">
              <div className="planet-section-head">
                <h2>Öne Çıkanlar</h2>
                <Link href={featured?.href || '/topluluk'}>Tümünü Gör →</Link>
              </div>

              <div className="planet-feature-layout">
                <article
                  className="planet-feature-main"
                  style={{
                    background: featured?.kapak_url
                      ? `linear-gradient(180deg, rgba(6,8,16,0.2), rgba(6,8,16,0.9)), url(${featured.kapak_url}) center/cover no-repeat`
                      : undefined,
                  }}
                >
                  <span className="planet-tag">YENİ BÖLÜM</span>
                  <h3>{featured?.baslik || 'Konsey Planet'}</h3>
                  <p className="planet-feature-meta">{tipEtiketi(featured?.tip)} · {formatDate(featured?.created_at)}</p>
                  <p className="planet-feature-desc">
                    {trimText(featured?.fullPreview || 'Konsey Planet için ilk manşet burada yer alacak.', 150)}
                  </p>
                  <Link href={featured?.href || '/topluluk'} className="planet-outline-btn">Oku</Link>
                </article>

                <div className="planet-feature-list">
                  {spotlight.map((item, index) => (
                    <Link key={item.id} href={item.href} className="planet-feature-row">
                      <div className="planet-feature-thumb">
                        {item.kapak_url ? <img src={item.kapak_url} alt={item.baslik} /> : null}
                      </div>
                      <div className="planet-feature-row-copy">
                        <div className="planet-feature-row-title">{item.baslik}</div>
                        <div className="planet-feature-row-meta">
                          <span>{tipEtiketi(item.tip)}</span>
                          <strong>{index < 3 ? 'YENİ' : 'KLASİK'}</strong>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            <aside className="planet-side-stack">
              <section className="planet-card">
                <div className="planet-section-head compact">
                  <h2>Topluluk Özeti</h2>
                </div>
                <div className="planet-summary-grid">
                  {summaryCards.map((item) => (
                    <div key={item} className="planet-summary-card">{item}</div>
                  ))}
                </div>
                <Link href="#community-feed" className="planet-panel-btn">Topluluğa Git →</Link>
              </section>

              <section className="planet-card">
                <div className="planet-section-head compact">
                  <h2>Günün Anketi</h2>
                </div>
                {pollTopic ? (
                  <>
                    <p className="planet-poll-question">{pollTopic.baslik}</p>
                    <div className="planet-poll-list">
                      {(pollTopic.anket_sonuclari || []).map((option) => (
                        <div key={`${pollTopic.id}-${option.index}`} className="planet-poll-item">
                          <div className="planet-poll-label">
                            <span>{option.label}</span>
                            <strong>{option.yuzde}%</strong>
                          </div>
                          <div className="planet-poll-track">
                            <div style={{ width: `${option.yuzde}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <Link href={pollTopic.href} className="planet-primary-btn wide">Oy Ver</Link>
                  </>
                ) : (
                  <p className="planet-empty-copy">Henüz topluluk anketi yok.</p>
                )}
              </section>
            </aside>
          </section>

          <section className="planet-grid-bottom">
            <section id="community-feed" className="planet-card">
              <div className="planet-section-head">
                <h2>Topluluk Akışı</h2>
                <div className="planet-tabs">
                  <button type="button" className="active">Popüler</button>
                  <button type="button">En Yeni</button>
                  <button type="button">Takip Edilen</button>
                </div>
              </div>

              <div className="planet-feed-list">
                {feedCards.map((post) => (
                  <article key={post.id} className="planet-feed-card">
                    <Link href={post.href} className="planet-feed-head">
                      <div className="planet-feed-avatar">
                        {post.profil?.avatar_url ? (
                          <img src={post.profil.avatar_url} alt={post.profil?.kullanici_adi || post.baslik} />
                        ) : (
                          <span>{avatarInitial(post)}</span>
                        )}
                      </div>
                      <div className="planet-feed-meta">
                        <div className="planet-feed-user">
                          <strong>{post.profil?.kullanici_adi || 'okur'}</strong>
                          <span>{formatDate(post.created_at)}</span>
                        </div>
                        <h3>{post.baslik}</h3>
                        <p>{trimText(post.icerik, 170)}</p>
                      </div>
                    </Link>

                    {post.anket_aktif && Array.isArray(post.anket_sonuclari) && post.anket_sonuclari.length > 0 ? (
                      <div className="planet-feed-poll">
                        {post.anket_sonuclari.slice(0, 4).map((option) => (
                          <div key={`${post.id}-${option.index}`} className="planet-feed-poll-row">
                            <div className="planet-poll-label">
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

                    <div className="planet-feed-actions">
                      <span className="planet-type-pill">{post.anket_aktif ? 'Anket Konusu' : 'Tartışma'}</span>
                      <div className="planet-feed-stats">
                        <span>♡ {post.begeni_sayisi || 0}</span>
                        <span>💬 {post.yanit_sayisi || 0}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <Link href="/topluluk" className="planet-wide-button">Daha Fazlasını Yükle</Link>
            </section>

            <aside className="planet-side-stack">
              <section id="latest-news" className="planet-card">
                <div className="planet-section-head compact">
                  <h2>Son Haberler</h2>
                  <Link href={latestNews[0]?.href || '/topluluk'}>Tümünü Gör →</Link>
                </div>
                <div className="planet-news-stack">
                  {latestNews.map((item) => (
                    <Link key={item.id} href={item.href} className="planet-news-row">
                      <div className="planet-news-thumb">
                        {item.kapak_url ? <img src={item.kapak_url} alt={item.baslik} /> : null}
                      </div>
                      <div>
                        <div className="planet-news-row-title">{item.baslik}</div>
                        <div className="planet-news-row-meta">{tipEtiketi(item.tip)} · {formatDate(item.created_at)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="planet-card">
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
            </aside>
          </section>

          <section className="planet-cta-banner">
            <div>
              <h2>Topluluğun bir parçası ol!</h2>
              <p>
                Binlerce okurla tanış, tartışmalara katıl, favori serilerin hakkında konuş ve
                gelişmelerden ilk sen haberdar ol.
              </p>
            </div>
            <Link href="#community-feed" className="planet-primary-btn">Topluluğa Katıl</Link>
          </section>
        </main>
      </div>
      <Footer />

      <style>{`
        .planet-page {
          min-height: calc(100vh - 90px);
          background:
            radial-gradient(circle at top right, rgba(245,185,66,0.06), transparent 28%),
            radial-gradient(circle at top left, rgba(255,255,255,0.03), transparent 24%),
            #000;
        }

        .planet-main {
          padding-top: 28px;
          padding-bottom: 10px;
        }

        .planet-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(360px, 0.9fr);
          gap: 24px;
          padding: 40px;
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,0.08);
          background:
            radial-gradient(circle at top right, rgba(245,185,66,0.08), transparent 24%),
            linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
        }

        .planet-kicker {
          margin: 0 0 16px;
          color: #f5b942;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.8px;
          text-transform: uppercase;
        }

        .planet-hero h1 {
          margin: 0;
          color: #fff;
          fontFamily: 'var(--font-display)';
          font-size: clamp(46px, 6vw, 82px);
          line-height: 0.92;
          text-transform: uppercase;
        }

        .planet-hero-text {
          max-width: 54ch;
          margin: 22px 0 0;
          color: var(--text-muted);
          font-size: 18px;
          line-height: 1.75;
        }

        .planet-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 28px;
        }

        .planet-primary-btn,
        .planet-secondary-btn,
        .planet-outline-btn,
        .planet-panel-btn,
        .planet-wide-button {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          border-radius: 12px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
        }

        .planet-primary-btn {
          color: #111;
          background: #f5c657;
          box-shadow: 0 12px 24px rgba(245,198,87,0.14);
        }

        .planet-primary-btn.wide,
        .planet-panel-btn,
        .planet-wide-button {
          width: 100%;
        }

        .planet-secondary-btn,
        .planet-panel-btn,
        .planet-wide-button {
          color: #f5f5f3;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.02);
        }

        .planet-outline-btn {
          width: fit-content;
          margin-top: 24px;
          border: 1px solid rgba(245,198,87,0.45);
          color: #f5c657;
          background: transparent;
        }

        .planet-hero-art {
          min-height: 360px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.08);
          background:
            radial-gradient(circle at 68% 28%, rgba(255,255,255,0.26), rgba(255,255,255,0.03) 30%, transparent 35%),
            radial-gradient(circle at 48% 40%, rgba(255,255,255,0.06), transparent 5%),
            linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0));
          overflow: hidden;
        }

        .planet-category-strip,
        .planet-grid-top,
        .planet-grid-bottom,
        .planet-cta-banner {
          margin-top: 24px;
        }

        .planet-category-strip {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 16px;
        }

        .planet-category-card,
        .planet-card,
        .planet-cta-banner {
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
        }

        .planet-category-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px;
          text-decoration: none;
        }

        .planet-category-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          border: 1px solid rgba(245,198,87,0.24);
          color: #f5c657;
          font-size: 20px;
        }

        .planet-category-title {
          margin-bottom: 4px;
          color: #fff;
          font-size: 17px;
          font-weight: 700;
        }

        .planet-category-text {
          color: var(--text-light);
          font-size: 13px;
        }

        .planet-grid-top,
        .planet-grid-bottom {
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.9fr);
          gap: 24px;
        }

        .planet-side-stack {
          display: grid;
          gap: 24px;
          align-content: start;
        }

        .planet-card {
          padding: 20px;
        }

        .planet-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .planet-section-head.compact {
          margin-bottom: 14px;
        }

        .planet-section-head h2 {
          margin: 0;
          color: #fff;
          font-family: var(--font-display);
          font-size: clamp(30px, 4vw, 44px);
          line-height: 0.94;
          text-transform: uppercase;
        }

        .planet-section-head a {
          color: var(--text-muted);
          font-size: 13px;
          text-decoration: none;
        }

        .planet-feature-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
          gap: 18px;
        }

        .planet-feature-main {
          min-height: 410px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 24px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          background:
            radial-gradient(circle at 72% 80%, rgba(245,190,90,0.16), transparent 30%),
            linear-gradient(135deg, #101314, #050505);
        }

        .planet-tag,
        .planet-type-pill {
          width: fit-content;
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          padding: 0 10px;
          border-radius: 999px;
          background: rgba(245,198,87,0.12);
          color: #f5c657;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.03em;
        }

        .planet-feature-main h3 {
          margin: 18px 0 0;
          color: #fff;
          font-family: var(--font-display);
          font-size: clamp(40px, 5vw, 58px);
          line-height: 0.95;
          text-transform: uppercase;
        }

        .planet-feature-meta {
          margin: 10px 0 0;
          color: var(--text-light);
          font-size: 13px;
        }

        .planet-feature-desc {
          margin: 16px 0 0;
          max-width: 460px;
          color: var(--text-muted);
          line-height: 1.72;
          font-size: 15px;
        }

        .planet-feature-list,
        .planet-news-stack,
        .planet-trend-list,
        .planet-feed-list {
          display: grid;
          gap: 14px;
        }

        .planet-feature-row,
        .planet-news-row,
        .planet-trend-row {
          color: inherit;
          text-decoration: none;
        }

        .planet-feature-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px;
          border-radius: 16px;
        }

        .planet-feature-thumb,
        .planet-news-thumb {
          flex-shrink: 0;
          overflow: hidden;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04));
        }

        .planet-feature-thumb {
          width: 70px;
          height: 70px;
        }

        .planet-news-thumb {
          width: 84px;
          height: 84px;
        }

        .planet-feature-thumb img,
        .planet-news-thumb img,
        .planet-feed-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .planet-feature-row-copy {
          flex: 1;
        }

        .planet-feature-row-title,
        .planet-news-row-title {
          color: #fff;
          font-size: 18px;
          font-weight: 700;
          line-height: 1.3;
        }

        .planet-feature-row-meta,
        .planet-news-row-meta {
          margin-top: 6px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          color: var(--text-light);
          font-size: 12px;
        }

        .planet-feature-row-meta strong {
          color: #f5c657;
        }

        .planet-summary-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .planet-summary-card {
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.2);
          padding: 16px;
          color: #fff;
          text-align: center;
          font-weight: 700;
        }

        .planet-poll-question {
          margin: 0 0 18px;
          color: #fff;
          font-size: 20px;
          font-weight: 700;
          line-height: 1.5;
        }

        .planet-poll-list {
          display: grid;
          gap: 14px;
        }

        .planet-poll-item,
        .planet-feed-poll-row {
          display: grid;
          gap: 8px;
        }

        .planet-poll-label {
          display: flex;
          justify-content: space-between;
          gap: 12px;
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
          border-radius: inherit;
          background: linear-gradient(90deg, #f5c657, rgba(255,255,255,0.45));
        }

        .planet-empty-copy {
          color: var(--text-muted);
          line-height: 1.7;
        }

        .planet-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .planet-tabs button {
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: var(--text-light);
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 700;
        }

        .planet-tabs button.active {
          color: #111;
          background: #f5c657;
        }

        .planet-feed-card {
          padding: 22px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.025);
        }

        .planet-feed-head {
          display: flex;
          gap: 16px;
          color: inherit;
          text-decoration: none;
        }

        .planet-feed-avatar {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          overflow: hidden;
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(245,190,90,0.3), rgba(255,255,255,0.08));
          display: grid;
          place-items: center;
        }

        .planet-feed-avatar span {
          font-size: 15px;
          font-weight: 900;
        }

        .planet-feed-user {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          color: var(--text-light);
          font-size: 12px;
        }

        .planet-feed-user strong {
          color: #fff;
        }

        .planet-feed-meta h3 {
          margin: 8px 0 0;
          color: #fff;
          font-size: 18px;
          font-weight: 800;
          line-height: 1.3;
        }

        .planet-feed-meta p {
          margin: 10px 0 0;
          color: var(--text-muted);
          line-height: 1.7;
          font-size: 14px;
        }

        .planet-feed-poll {
          display: grid;
          gap: 12px;
          margin-top: 18px;
        }

        .planet-feed-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .planet-feed-stats {
          display: flex;
          gap: 18px;
          color: var(--text-light);
          font-size: 13px;
          font-weight: 700;
        }

        .planet-wide-button {
          width: 100%;
          margin-top: 18px;
        }

        .planet-news-row {
          display: grid;
          grid-template-columns: 84px minmax(0, 1fr);
          gap: 14px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .planet-news-row:last-child,
        .planet-trend-row:last-child {
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

        .planet-trend-row span {
          color: #fff;
        }

        .planet-trend-row strong {
          color: var(--text-light);
          font-size: 12px;
        }

        .planet-cta-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 30px;
          border-radius: 24px;
          border: 1px solid rgba(245,198,87,0.2);
          background: linear-gradient(to right, rgba(245,198,87,0.1), rgba(255,255,255,0.02));
        }

        .planet-cta-banner h2 {
          margin: 0;
          color: #fff;
          font-family: var(--font-display);
          font-size: clamp(34px, 4vw, 52px);
          line-height: 0.94;
          text-transform: uppercase;
        }

        .planet-cta-banner p {
          margin: 10px 0 0;
          max-width: 720px;
          color: var(--text-muted);
          line-height: 1.8;
          font-size: 15px;
        }

        @media (max-width: 1180px) {
          .planet-hero,
          .planet-grid-top,
          .planet-grid-bottom,
          .planet-feature-layout {
            grid-template-columns: 1fr;
          }

          .planet-category-strip {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .planet-hero {
            padding: 32px 24px;
          }

          .planet-hero h1 {
            font-size: 52px;
          }

          .planet-category-strip,
          .planet-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .planet-cta-banner {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 640px) {
          .planet-hero h1 {
            font-size: 40px;
          }

          .planet-hero-text {
            font-size: 16px;
          }

          .planet-category-strip,
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

          .planet-feed-head {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  )
}
