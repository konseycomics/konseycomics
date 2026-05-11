'use client'

import Link from 'next/link'
import ToplulukFeedClient from './ToplulukFeedClient'

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function tipEtiketi(tip) {
  switch (tip) {
    case 'manset':
      return 'Manşet'
    case 'duyuru':
      return 'Duyuru'
    case 'editor':
      return 'Editör Yazısı'
    case 'secki':
      return 'Seçki'
    default:
      return 'Planet'
  }
}

export default function ToplulukHubClient({ planetView, feedTopics = [] }) {
  const featured = planetView?.featured || null
  const spotlight = planetView?.spotlight || []
  const bulletins = planetView?.bulletins || []
  const editorials = planetView?.editorials || []

  return (
    <>
      <div className="planet-shell" style={{ display: 'grid', gap: '18px', marginBottom: '28px' }}>
        <div className="planet-hero" style={{ textAlign: 'center', marginBottom: '6px' }}>
          <div style={{ color: '#9f9f98', fontSize: '11px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
            Konsey Planet
          </div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: 'clamp(36px, 5vw, 68px)', lineHeight: 0.92, fontFamily: 'var(--font-display)' }}>
            Günün Manşetleri
          </h2>
          <p style={{ margin: '12px auto 0', color: '#b8b8b2', fontSize: '15px', lineHeight: 1.75, maxWidth: '720px' }}>
            Konsey’in resmi duyuruları, editör notları ve topluluktan seçilen başlıklar burada akıyor.
          </p>
        </div>

        {featured ? (
          <Link href={featured.href} style={{ textDecoration: 'none' }}>
            <article className="planet-featured" style={{ display: 'grid', gridTemplateColumns: featured.kapak_url ? '260px minmax(0, 1fr)' : '1fr', gap: '18px', padding: '22px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(135deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02))', boxShadow: '0 20px 60px rgba(0,0,0,0.24)' }}>
              {featured.kapak_url ? (
                <div style={{ borderRadius: '18px', overflow: 'hidden', minHeight: '220px', background: 'rgba(255,255,255,0.04)' }}>
                  <img src={featured.kapak_url} alt={featured.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : null}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <span style={{ minHeight: '30px', display: 'inline-flex', alignItems: 'center', padding: '0 12px', borderRadius: '999px', background: 'rgba(243,210,135,0.12)', border: '1px solid rgba(243,210,135,0.24)', color: '#f3d287', fontSize: '11px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                    {tipEtiketi(featured.tip)}
                  </span>
                  <span style={{ minHeight: '30px', display: 'inline-flex', alignItems: 'center', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#bcbcb5', fontSize: '11px', fontWeight: 700 }}>
                    {formatDate(featured.created_at)}
                  </span>
                </div>
                <div style={{ color: '#fff', fontSize: '34px', lineHeight: 1.04, fontWeight: 900, marginBottom: '12px' }}>{featured.baslik}</div>
                <div style={{ color: '#d0d0ca', fontSize: '15px', lineHeight: 1.85, marginBottom: '18px' }}>{featured.fullPreview}</div>
                <div style={{ display: 'inline-flex', minHeight: '46px', alignItems: 'center', padding: '0 18px', borderRadius: '14px', background: '#fff', color: '#111', fontSize: '14px', fontWeight: 900 }}>
                  Yazıyı Aç
                </div>
              </div>
            </article>
          </Link>
        ) : (
          <div style={{ padding: '22px', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#b8b8b2', fontSize: '14px' }}>
            Konsey Planet için henüz yayın girilmedi. İlk manşeti yönetici panelinden ekleyebiliriz.
          </div>
        )}

        <div className="planet-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.9fr)', gap: '18px' }}>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ color: '#fff', fontSize: '18px', fontWeight: 800 }}>Öne Çıkanlar</div>
            <div style={{ display: 'grid', gap: '14px' }}>
              {spotlight.length > 0 ? spotlight.map((item) => (
                <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
                  <article style={{ padding: '18px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span style={{ color: '#f3d287', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{tipEtiketi(item.tip)}</span>
                      <span style={{ color: '#8f8f89', fontSize: '12px' }}>{formatDate(item.created_at)}</span>
                    </div>
                    <div style={{ color: '#fff', fontSize: '22px', lineHeight: 1.15, fontWeight: 800, marginBottom: '8px' }}>{item.baslik}</div>
                    <div style={{ color: '#bdbdb7', fontSize: '14px', lineHeight: 1.7 }}>{item.preview}</div>
                  </article>
                </Link>
              )) : (
                <div style={{ padding: '18px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)', color: '#b8b8b2', fontSize: '14px' }}>
                  Henüz öne çıkan ikincil yazı yok.
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '14px' }}>
            <section style={{ padding: '18px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' }}>
              <div style={{ color: '#fff', fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>Kısa Duyurular</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {(bulletins.length > 0 ? bulletins : spotlight.slice(0, 3)).map((item) => (
                  <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
                    <div style={{ padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700, lineHeight: 1.45, marginBottom: '4px' }}>{item.baslik}</div>
                      <div style={{ color: '#9f9f98', fontSize: '12px' }}>{formatDate(item.created_at)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section style={{ padding: '18px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' }}>
              <div style={{ color: '#fff', fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>Editör Masası</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {(editorials.length > 0 ? editorials : (featured ? [featured] : [])).map((item) => (
                  <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
                    <div style={{ padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ color: '#fff', fontSize: '15px', fontWeight: 700, lineHeight: 1.45, marginBottom: '6px' }}>{item.baslik}</div>
                      <div style={{ color: '#bdbdb7', fontSize: '13px', lineHeight: 1.65 }}>{item.preview}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>

        <style>{`
          @media (max-width: 980px) {
            .planet-grid {
              grid-template-columns: 1fr !important;
            }

            .planet-featured {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>

      <div style={{ marginTop: '26px', marginBottom: '14px' }}>
        <div style={{ color: '#9f9f98', fontSize: '11px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
          Topluluk Akışı
        </div>
        <div style={{ color: '#fff', fontSize: '24px', fontWeight: 900, lineHeight: 1.1, marginBottom: '8px' }}>
          Okurlar Ne Konuşuyor?
        </div>
        <div style={{ color: '#b8b8b2', fontSize: '14px', lineHeight: 1.7 }}>
          Resmi Planet akışının hemen altında kullanıcı konularını, anketleri ve tartışmaları bulabilirsin.
        </div>
      </div>

      <ToplulukFeedClient initialTopics={feedTopics} />
    </>
  )
}
