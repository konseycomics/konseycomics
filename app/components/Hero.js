'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export default function Hero({ seriler = [], slides = [] }) {
  const fallbackSeri = seriler.find(s => s.one_cikan) || seriler[0]
  const slideList = slides.length > 0
    ? slides
    : fallbackSeri
      ? [fallbackSeri]
      : []

  const [aktifIndex, setAktifIndex] = useState(0)
  const dragStartX = useRef(null)
  const dragDistance = useRef(0)

  useEffect(() => {
    if (slideList.length < 2) return
    const timer = setInterval(() => {
      setAktifIndex(prev => (prev + 1) % slideList.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [slideList.length])

  const seri = slideList.length > 0 ? slideList[aktifIndex % slideList.length] : null

  if (!seri) return (
    <section style={{
      position: 'relative',
      width: '100%',
      minHeight: 'clamp(360px, 62vh, 560px)',
      overflow: 'hidden',
      background: 'radial-gradient(circle at top center, rgba(120,119,198,0.18), transparent 38%), linear-gradient(180deg, #090909 0%, #050505 100%)',
      borderBottom: '1px solid rgba(255,255,255,0.06)'
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.02), transparent 24%, rgba(0,0,0,0.46) 100%)' }} />
      <div style={{ position: 'relative', zIndex: 1, minHeight: 'inherit', display: 'flex', alignItems: 'center' }}>
        <div className="site-shell">
          <div style={{ maxWidth: '720px', padding: '48px 0' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(245,158,11,0.14)',
              border: '1px solid rgba(245,158,11,0.25)',
              color: '#f5f5f3',
              fontSize: '10px',
              fontWeight: 700,
              padding: '5px 12px',
              borderRadius: '999px',
              marginBottom: '18px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Konsey Arşivi
            </div>
            <h1 style={{
              margin: '0 0 14px',
              color: '#fff',
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(48px, 7vw, 82px)',
              lineHeight: 0.92,
              letterSpacing: '0.8px'
            }}>
              Yeni içerikler yayına hazırlanıyor
            </h1>
            <p style={{
              margin: '0 0 24px',
              color: 'rgba(255,255,255,0.72)',
              fontSize: 'clamp(15px, 1.3vw, 18px)',
              lineHeight: 1.7,
              maxWidth: '58ch'
            }}>
              Arşiv, vitrin ve son eklenen bölümler otomatik olarak burada görünecek. İçerik eklendikçe ana sayfa kendini doldurur.
            </p>
            <Link href="/seriler" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#fff',
              color: '#111',
              fontSize: '13px',
              fontWeight: 700,
              padding: '12px 24px',
              borderRadius: '999px',
              textDecoration: 'none'
            }}>
              Arşivi Keşfet
            </Link>
          </div>
        </div>
      </div>
    </section>
  )

  const heroBackground = seri.hero_gorsel_url || seri.arkaplan_url || '/demo/hero.jpg'
  const heroBackgroundFit = seri.arka_plan_fit || 'cover'
  const heroBackgroundPosition = seri.arka_plan_pozisyon || 'center center'
  const detayHref = seri.href || (seri.slug ? `/seri/${seri.slug}` : '/seriler')
  const ikincilHref = seri.secondary_href || '/seriler'
  const birincilMetin = seri.primary_label || (seri.slug ? 'İncele →' : 'Keşfet →')
  const ikincilMetin = seri.secondary_label || 'Tüm Seriler'
  const badge = seri.badge || (seri.one_cikan ? 'Öne Çıkan' : 'Konsey Seçkisi')
  const kategoriEtiket = seri.kategori_etiket || seri.kategoriler?.isim
  const baslik = seri.baslik || seri.title || ''
  const ozet = seri.ozet || seri.aciklama || ''

  function oncekiSlide() {
    setAktifIndex(prev => (prev - 1 + slideList.length) % slideList.length)
  }

  function sonrakiSlide() {
    setAktifIndex(prev => (prev + 1) % slideList.length)
  }

  function handlePointerDown(event) {
    if (slideList.length < 2) return
    dragStartX.current = event.clientX
    dragDistance.current = 0
  }

  function handlePointerMove(event) {
    if (dragStartX.current === null) return
    dragDistance.current = event.clientX - dragStartX.current
  }

  function handlePointerUp() {
    if (dragStartX.current === null) return
    if (Math.abs(dragDistance.current) > 50) {
      if (dragDistance.current < 0) sonrakiSlide()
      else oncekiSlide()
    }
    dragStartX.current = null
    dragDistance.current = 0
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ position: 'relative', width: '100%', height: 'clamp(380px, 68vh, 700px)', overflow: 'hidden', background: '#0a0a0a', touchAction: 'pan-y' }}
    >
      <style>{`
        @media (max-width: 900px) {
          .hero-layout {
            grid-template-columns: 132px minmax(0, 1fr) !important;
            align-items: center !important;
            gap: 20px !important;
          }
          .hero-cover-card {
            width: 132px !important;
          }
          .hero-main-bg {
            object-position: center center !important;
            opacity: 0.4 !important;
          }
        }
        @media (max-width: 640px) {
          .hero-layout {
            grid-template-columns: 1fr !important;
          }
          .hero-cover-card {
            display: none !important;
          }
          .hero-main-bg {
            object-position: center center !important;
          }
        }
      `}</style>

      {heroBackground && (
        <img
          src={heroBackground}
          alt=""
          fetchPriority="high"
          draggable={false}
          className="hero-main-bg"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: heroBackgroundFit,
            objectPosition: heroBackgroundPosition,
            opacity: 0.85,
            transform: 'scale(1)',
          }}
        />
      )}

      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.76) 24%, rgba(0,0,0,0.44) 56%, rgba(0,0,0,0.18) 100%), linear-gradient(180deg, rgba(0,0,0,0.16) 12%, rgba(0,0,0,0.03) 42%, rgba(0,0,0,0.84) 100%)'
      }} />

      <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', alignItems: 'center' }}>
        <div className="site-shell">
          <div className="hero-layout" style={{
            display: 'grid',
            gridTemplateColumns: 'clamp(170px, 18vw, 300px) minmax(0, 1fr)',
            alignItems: 'center',
            gap: 'clamp(24px, 3.6vw, 48px)',
            width: '100%'
          }}>
            {seri.kapak_url && (
              <Link href={detayHref} className="hero-cover-card" style={{ display: 'block', textDecoration: 'none', width: '100%' }}>
                <div style={{
                  position: 'relative',
                  aspectRatio: '2 / 3',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.14)',
                  boxShadow: '0 18px 45px rgba(0,0,0,0.34)',
                  background: 'rgba(255,255,255,0.06)'
                }}>
                  <img src={seri.kapak_url} alt={`${baslik} kapak`} fetchPriority="high" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.22), transparent 36%)' }} />
                </div>
              </Link>
            )}

            <div style={{ maxWidth: '1120px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(245,158,11,0.95)', color: '#fff',
                fontSize: '10px', fontWeight: 700, padding: '4px 12px',
                borderRadius: '100px', marginBottom: '16px',
                textTransform: 'uppercase', letterSpacing: '1px', width: 'fit-content'
              }}>
                {badge}
              </div>

              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(48px, 6.6vw, 86px)',
                color: '#fff', margin: '0 0 16px 0',
                lineHeight: 0.9, letterSpacing: '0.7px',
                textShadow: '0 2px 20px rgba(0,0,0,0.5)'
              }}>
                {baslik}
              </h1>

              {ozet && (
                <p style={{
                  fontSize: 'clamp(15px, 1.25vw, 20px)', color: 'rgba(255,255,255,0.84)',
                  margin: '0 0 26px 0', lineHeight: 1.74,
                  display: '-webkit-box', WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  maxWidth: '1080px'
                }}>
                  {ozet}
                </p>
              )}

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link href={detayHref} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: '#fff', color: '#111',
                  fontSize: '13px', fontWeight: 600,
                  padding: '11px 24px', borderRadius: '100px',
                  textDecoration: 'none', letterSpacing: '0.2px'
                }}>
                  {birincilMetin}
                </Link>
                <Link href={ikincilHref} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(255,255,255,0.15)', color: '#fff',
                  fontSize: '13px', fontWeight: 500,
                  padding: '11px 24px', borderRadius: '100px',
                  textDecoration: 'none', border: '1px solid rgba(255,255,255,0.3)',
                  backdropFilter: 'blur(4px)'
                }}>
                  {ikincilMetin}
                </Link>
              </div>

              {(kategoriEtiket || seri.durum) && (
                <div style={{ marginTop: '16px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {kategoriEtiket && (
                    <span style={{
                      fontSize: '11px', color: 'rgba(255,255,255,0.86)',
                      background: 'rgba(255,255,255,0.1)', padding: '3px 10px',
                      borderRadius: '100px', letterSpacing: '0.5px', textTransform: 'uppercase'
                    }}>
                      {kategoriEtiket}
                    </span>
                  )}
                  {seri.durum && (
                    <span style={{
                      fontSize: '11px', color: 'rgba(255,255,255,0.86)',
                      background: 'rgba(255,255,255,0.1)', padding: '3px 10px',
                      borderRadius: '100px'
                    }}>
                      {seri.durum}
                    </span>
                  )}
                </div>
              )}

              {slideList.length > 1 && (
                <div style={{ marginTop: '22px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {slideList.map((slide, index) => (
                    <button
                      key={slide.id || index}
                      type="button"
                      onClick={() => setAktifIndex(index)}
                      aria-label={`${index + 1}. slayta git: ${slide.baslik || slide.title || 'Hero slaytı'}`}
                      aria-pressed={index === aktifIndex}
                      style={{
                        width: index === aktifIndex ? '30px' : '10px',
                        height: '10px',
                        borderRadius: '999px',
                        border: 'none',
                        cursor: 'pointer',
                        background: index === aktifIndex ? '#fff' : 'rgba(255,255,255,0.28)',
                        transition: 'all 0.2s ease'
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
