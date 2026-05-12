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

function trimText(value, max = 120) {
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
    getCommunityTopics({ limit: 12 }),
    getPlanetPosts({ limit: 10 }),
  ])

  const feedTopics = rawTopics || []
  const planetView = buildPlanetView(planetPosts)
  const featured = planetView.featured || null
  const latestNews = planetView.all.slice(0, 3)
  const pollTopic = feedTopics.find((topic) => topic.anket_aktif) || null
  const feedCards = feedTopics.slice(0, 3)
  const trendTopics = [...feedTopics]
    .sort((a, b) => (b.yanit_sayisi || 0) - (a.yanit_sayisi || 0))
    .slice(0, 4)

  const featuredItems = (planetView.spotlight.length > 0 ? planetView.spotlight : latestNews).slice(0, 4)

  const categoryCards = [
    ['📖', 'Çizgi Roman', 'Binlerce seri', '/cizgi-roman'],
    ['✦', 'Manga', 'En popüler seriler', '/manga'],
    ['◎', 'Webtoon', 'Dijital maceralar', '/webtoon'],
    ['👥', 'Topluluk', 'Tartış, paylaş, oy ver', '#community-feed'],
    ['📰', 'Haberler', 'En yeni gelişmeler', '#latest-news'],
  ]

  return (
    <div className="planet-page-root">
      <header className="planet-header">
        <div className="planet-shell planet-header-inner">
          <Link href="/" className="planet-logo">
            <div className="planet-logo-mark" />
            <div className="planet-logo-copy">
              <div className="planet-logo-word">KONSEY</div>
              <div className="planet-logo-sub">PLANET</div>
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
            <button className="planet-search-pill" type="button">Ara...</button>
            <Link href="/giris" className="planet-ghost-btn">Giriş Yap</Link>
            <Link href="/giris" className="planet-gold-btn">Üye Ol</Link>
          </div>
        </div>
      </header>

      <main className="planet-shell planet-main">
        <section className="planet-hero">
          <div className="planet-hero-copy">
            <p className="planet-kicker">KONSEY PLANET</p>
            <h1>Evrenin en iyi hikayeleri burada.</h1>
            <p className="planet-hero-text">
              Konsey Planet; çizgi roman, manga, webtoon ve daha fazlasını sevenlerin
              buluştuğu bir topluluktur.
            </p>
            <div className="planet-hero-actions">
              <Link href="#featured" className="planet-gold-btn">Keşfet →</Link>
              <Link href="#community-feed" className="planet-ghost-btn">Topluluğa Katıl</Link>
            </div>
          </div>
          <div className="planet-hero-art" />
        </section>

        <section className="planet-category-strip">
          {categoryCards.map(([icon, title, text, href]) => (
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
                  {trimText(
                    featured?.fullPreview ||
                      'Beklenen yeni bölüm yayında. Evrenin dengesi yeniden değişiyor.',
                    150
                  )}
                </p>
                <Link href={featured?.href || '/topluluk'} className="planet-outline-btn">
                  Oku
                </Link>
              </article>

              <div className="planet-feature-list">
                {featuredItems.map((item) => (
                  <Link key={item.id} href={item.href} className="planet-feature-row">
                    <div className="planet-feature-thumb">
                      {item.kapak_url ? <img src={item.kapak_url} alt={item.baslik} /> : null}
                    </div>
                    <div className="planet-feature-row-copy">
                      <div className="planet-feature-row-title">{item.baslik}</div>
                      <div className="planet-feature-row-meta">{tipEtiketi(item.tip)}</div>
                    </div>
                    <span className="planet-row-badge">YENİ</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <aside className="planet-side-stack">
            <section className="planet-card">
              <div className="planet-section-head">
                <h2>Topluluk Anketi</h2>
                <Link href={pollTopic?.href || '#community-feed'}>Tümünü Gör →</Link>
              </div>
              {pollTopic ? (
                <>
                  <p className="planet-poll-question">{pollTopic.baslik}</p>
                  <div className="planet-poll-list">
                    {(pollTopic.anket_sonuclari || []).map((option) => (
                      <div key={`${pollTopic.id}-${option.index}`} className="planet-poll-item">
                        <div className="planet-poll-label">
                          <span>{option.label}</span>
                          <span>{option.yuzde}%</span>
                        </div>
                        <div className="planet-poll-track">
                          <div style={{ width: `${option.yuzde}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="planet-poll-footer">
                    <span>Toplam {pollTopic.anket_toplam_oy || 0} oy</span>
                    <Link href={pollTopic.href} className="planet-gold-btn small">Oy Ver</Link>
                  </div>
                </>
              ) : (
                <p className="planet-empty-copy">Henüz topluluk anketi yok. İlk anket burada öne çıkacak.</p>
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
                      <p>{post.icerik}</p>
                    </div>
                  </Link>

                  {post.anket_aktif && Array.isArray(post.anket_sonuclari) && post.anket_sonuclari.length > 0 ? (
                    <div className="planet-feed-poll">
                      {post.anket_sonuclari.slice(0, 4).map((option) => (
                        <div key={`${post.id}-${option.index}`} className="planet-feed-poll-row">
                          <div className="planet-poll-label">
                            <span>{option.label}</span>
                            <span>{option.yuzde}%</span>
                          </div>
                          <div className="planet-poll-track">
                            <div style={{ width: `${option.yuzde}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="planet-feed-actions">
                    <span className="planet-type-pill">
                      {post.anket_aktif ? 'Anket Konusu' : 'Tartışma'}
                    </span>
                    <div className="planet-feed-stats">
                      <span>♡ {post.begeni_sayisi || 0}</span>
                      <span>💬 {post.yanit_sayisi || 0}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <Link href="/topluluk" className="planet-wide-button">
              Daha Fazlasını Yükle
            </Link>
          </section>

          <aside className="planet-side-stack">
            <section id="latest-news" className="planet-card">
              <div className="planet-section-head">
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
              <div className="planet-section-head">
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
          <Link href="#community-feed" className="planet-gold-btn">Topluluğa Katıl</Link>
        </section>
      </main>

      <footer className="planet-footer">
        <div className="planet-shell planet-footer-grid">
          <div>
            <div className="planet-footer-logo">KONSEY PLANET</div>
            <p>
              Çizgi roman, manga, webtoon ve daha fazlası için en büyük Türkçe topluluk
              platformu.
            </p>
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
        .planet-page-root {
          min-height: 100vh;
          background: #070808;
          color: #fff;
          selection-background-color: #f1c769;
        }

        .planet-shell {
          width: min(100%, 1400px);
          margin: 0 auto;
          padding-left: 24px;
          padding-right: 24px;
        }

        .planet-header {
          position: sticky;
          top: 0;
          z-index: 50;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background: rgba(7,8,8,0.86);
          backdrop-filter: blur(18px);
        }

        .planet-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding-top: 18px;
          padding-bottom: 18px;
        }

        .planet-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: #fff;
        }

        .planet-logo-mark {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          border: 4px solid rgba(241,199,105,0.9);
          border-left-color: transparent;
        }

        .planet-logo-word {
          font-size: 28px;
          font-weight: 900;
          line-height: 0.95;
          letter-spacing: -0.04em;
        }

        .planet-logo-sub {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.45em;
          color: rgba(255,255,255,0.72);
        }

        .planet-nav {
          display: none;
          align-items: center;
          gap: 34px;
        }

        .planet-nav a {
          color: rgba(255,255,255,0.8);
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
        }

        .planet-nav a:hover {
          color: #f1c769;
        }

        .planet-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .planet-search-pill,
        .planet-ghost-btn,
        .planet-gold-btn,
        .planet-outline-btn,
        .planet-wide-button {
          border-radius: 14px;
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          text-decoration: none;
          font-weight: 800;
        }

        .planet-search-pill {
          display: none;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.55);
        }

        .planet-ghost-btn {
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          background: transparent;
        }

        .planet-gold-btn {
          background: #f1c769;
          color: #111;
          box-shadow: 0 12px 30px rgba(241,199,105,0.12);
        }

        .planet-gold-btn.small {
          min-height: 42px;
          padding: 0 16px;
          border-radius: 12px;
        }

        .planet-main {
          padding-top: 36px;
          padding-bottom: 42px;
        }

        .planet-hero {
          position: relative;
          overflow: hidden;
          display: grid;
          gap: 24px;
          grid-template-columns: minmax(0, 1.05fr) minmax(380px, 0.95fr);
          padding: 48px;
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,0.08);
          background:
            radial-gradient(circle at 70% 35%, rgba(245,190,90,0.22), transparent 25%),
            linear-gradient(135deg, #111718, #070808);
        }

        .planet-kicker {
          margin: 0 0 16px;
          color: #f1c769;
          font-size: 14px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .planet-hero h1 {
          margin: 0;
          font-size: clamp(52px, 7vw, 88px);
          line-height: 0.96;
          font-weight: 900;
          letter-spacing: -0.05em;
        }

        .planet-hero-text {
          max-width: 560px;
          margin: 22px 0 0;
          color: rgba(255,255,255,0.72);
          font-size: 20px;
          line-height: 1.7;
        }

        .planet-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 30px;
        }

        .planet-hero-art {
          min-height: 420px;
          border-radius: 24px;
          background:
            radial-gradient(circle at 65% 28%, rgba(255,255,255,0.3), rgba(255,255,255,0.05) 28%, transparent 34%),
            radial-gradient(circle at 74% 40%, rgba(255,235,180,0.14), transparent 12%),
            radial-gradient(circle at 52% 46%, rgba(255,255,255,0.1), transparent 4%),
            linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0));
          position: relative;
          overflow: hidden;
        }

        .planet-hero-art::before {
          content: '';
          position: absolute;
          right: -6%;
          top: 4%;
          width: 78%;
          aspect-ratio: 1 / 1;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), rgba(245,190,90,0.12) 34%, rgba(255,255,255,0.03) 58%, transparent 63%);
          box-shadow: 0 0 120px rgba(245,190,90,0.2);
        }

        .planet-hero-art::after {
          content: '';
          position: absolute;
          right: 4%;
          bottom: 16%;
          width: 92%;
          height: 36%;
          border-radius: 50%;
          border: 1px solid rgba(241,199,105,0.12);
          transform: rotate(-10deg);
        }

        .planet-category-strip,
        .planet-grid-top,
        .planet-grid-bottom {
          margin-top: 24px;
        }

        .planet-category-strip {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }

        .planet-card {
          border-radius: 22px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          padding: 24px;
        }

        .planet-category-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          text-decoration: none;
        }

        .planet-category-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          border: 1px solid rgba(241,199,105,0.25);
          color: #f1c769;
          font-size: 22px;
        }

        .planet-category-title {
          font-size: 18px;
          font-weight: 800;
          color: #fff;
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

        .planet-side-stack {
          display: grid;
          gap: 24px;
        }

        .planet-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .planet-section-head h2 {
          margin: 0;
          font-size: 32px;
          font-weight: 900;
        }

        .planet-section-head a {
          color: rgba(255,255,255,0.58);
          font-size: 14px;
          text-decoration: none;
          font-weight: 700;
        }

        .planet-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .planet-tabs button {
          border: 0;
          background: transparent;
          color: rgba(255,255,255,0.5);
          padding: 10px 14px;
          border-radius: 10px;
          font-weight: 700;
        }

        .planet-tabs button.active {
          background: #f1c769;
          color: #111;
        }

        .planet-feature-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
          gap: 18px;
        }

        .planet-feature-main {
          min-height: 420px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 24px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          background:
            radial-gradient(circle at 72% 80%, rgba(245,190,90,0.18), transparent 30%),
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
          background: rgba(241,199,105,0.12);
          color: #f1c769;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.03em;
        }

        .planet-feature-main h3 {
          margin: 18px 0 0;
          font-size: 46px;
          line-height: 1;
          font-weight: 900;
        }

        .planet-feature-meta {
          margin: 8px 0 0;
          color: rgba(255,255,255,0.54);
        }

        .planet-feature-desc {
          max-width: 460px;
          margin: 16px 0 0;
          color: rgba(255,255,255,0.74);
          line-height: 1.75;
          font-size: 16px;
        }

        .planet-outline-btn {
          margin-top: 24px;
          width: fit-content;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          border-radius: 12px;
          border: 1px solid rgba(241,199,105,0.45);
          color: #f1c769;
          text-decoration: none;
          font-weight: 800;
        }

        .planet-feature-list,
        .planet-news-stack,
        .planet-trend-list {
          display: grid;
          gap: 14px;
        }

        .planet-feature-row,
        .planet-news-row,
        .planet-trend-row {
          text-decoration: none;
          color: inherit;
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
          overflow: hidden;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04));
          flex-shrink: 0;
        }

        .planet-feature-thumb {
          width: 72px;
          height: 72px;
        }

        .planet-news-thumb {
          width: 84px;
          height: 84px;
        }

        .planet-feature-thumb img,
        .planet-news-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .planet-feature-row-copy {
          flex: 1;
        }

        .planet-feature-row-title,
        .planet-news-row-title {
          font-size: 21px;
          font-weight: 800;
          line-height: 1.25;
          color: #fff;
        }

        .planet-feature-row-meta,
        .planet-news-row-meta {
          margin-top: 6px;
          color: rgba(255,255,255,0.52);
          font-size: 13px;
        }

        .planet-row-badge {
          padding: 6px 8px;
          border-radius: 8px;
          background: rgba(241,199,105,0.12);
          color: #f1c769;
          font-size: 11px;
          font-weight: 800;
        }

        .planet-poll-question {
          margin: 0 0 18px;
          font-size: 20px;
          font-weight: 700;
          line-height: 1.5;
        }

        .planet-poll-list {
          display: grid;
          gap: 14px;
        }

        .planet-poll-item {
          display: grid;
          gap: 8px;
        }

        .planet-poll-label {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 14px;
        }

        .planet-poll-label strong {
          font-weight: 800;
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
          background: linear-gradient(90deg, #f1c769, rgba(255,255,255,0.5));
        }

        .planet-poll-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 22px;
          color: rgba(255,255,255,0.62);
        }

        .planet-feed-list {
          display: grid;
          gap: 18px;
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
          text-decoration: none;
          color: inherit;
        }

        .planet-feed-avatar {
          width: 42px;
          height: 42px;
          overflow: hidden;
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(245,190,90,0.3), rgba(255,255,255,0.08));
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .planet-feed-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .planet-feed-avatar span {
          font-size: 15px;
          font-weight: 900;
        }

        .planet-feed-user {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          color: rgba(255,255,255,0.48);
          font-size: 13px;
        }

        .planet-feed-user strong {
          color: rgba(255,255,255,0.86);
        }

        .planet-feed-meta h3 {
          margin: 8px 0 0;
          font-size: 28px;
          line-height: 1.15;
          font-weight: 900;
        }

        .planet-feed-meta p {
          margin: 10px 0 0;
          color: rgba(255,255,255,0.62);
          font-size: 15px;
          line-height: 1.75;
        }

        .planet-feed-poll {
          display: grid;
          gap: 12px;
          margin-top: 18px;
        }

        .planet-feed-poll-row {
          display: grid;
          gap: 8px;
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
          color: rgba(255,255,255,0.62);
          font-size: 14px;
          font-weight: 700;
        }

        .planet-wide-button {
          width: 100%;
          margin-top: 18px;
          border: 1px solid rgba(255,255,255,0.1);
          color: #f1c769;
          background: transparent;
        }

        .planet-news-row {
          display: grid;
          grid-template-columns: 84px minmax(0, 1fr);
          gap: 14px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .planet-trend-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          color: #fff;
        }

        .planet-trend-row strong {
          color: rgba(255,255,255,0.48);
          font-size: 13px;
        }

        .planet-cta-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          margin-top: 28px;
          padding: 32px;
          border-radius: 22px;
          border: 1px solid rgba(241,199,105,0.2);
          background: linear-gradient(to right, rgba(241,199,105,0.1), rgba(255,255,255,0.03));
        }

        .planet-cta-banner h2 {
          margin: 0;
          font-size: 36px;
          line-height: 1.05;
          font-weight: 900;
        }

        .planet-cta-banner p {
          margin: 10px 0 0;
          max-width: 720px;
          color: rgba(255,255,255,0.62);
          line-height: 1.8;
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
          .planet-search-pill {
            display: flex;
          }
        }

        @media (max-width: 1180px) {
          .planet-grid-top,
          .planet-grid-bottom,
          .planet-hero {
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
          .planet-footer-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .planet-feature-layout {
            grid-template-columns: 1fr;
          }

          .planet-cta-banner {
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

          .planet-hero-text {
            font-size: 17px;
          }

          .planet-category-strip,
          .planet-footer-grid {
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
    </div>
  )
}
