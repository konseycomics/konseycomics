'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Footer from './components/Footer'
import Link from 'next/link'
import { isRecentlyAddedSeries } from './lib/seriesBadges'

const SERI_TURLERI = [
  {
    key: 'Marvel',
    title: 'Marvel',
    subtitle: 'Sokak seviyesinden kozmik savaşlara uzanan dev evren',
    accent: '#d62828',
    glow: 'radial-gradient(circle at top left, rgba(214,40,40,0.52), transparent 58%)',
    image: '/demo/marvel.jpg',
    href: '/seriler?filtre=Marvel',
    large: true,
  },
  {
    key: 'DC',
    title: 'DC',
    subtitle: 'Gotik şehirlerden tanrılar savaşına uzanan efsaneler',
    accent: '#2563eb',
    glow: 'radial-gradient(circle at top right, rgba(37,99,235,0.5), transparent 60%)',
    image: '/demo/dc.jpg',
    href: '/seriler?filtre=DC',
    large: true,
  },
  {
    key: 'Bağımsız',
    title: 'Bağımsız',
    subtitle: 'Cesur anlatılar ve farklı sesler',
    accent: '#f97316',
    glow: 'radial-gradient(circle at top left, rgba(249,115,22,0.42), transparent 60%)',
    image: '/demo/indie.jpg',
    href: '/seriler?filtre=Bağımsız',
    large: false,
  },
  {
    key: 'Manga',
    title: 'Manga',
    subtitle: 'Yüksek tempo, ikonik karakterler ve ustalıklı paneller',
    accent: '#22c55e',
    glow: 'radial-gradient(circle at top center, rgba(34,197,94,0.42), transparent 60%)',
    image: '/demo/manga2.jpg',
    href: '/seriler?filtre=Manga',
    large: false,
  },
  {
    key: 'Webtoon',
    title: 'Webtoon',
    subtitle: 'Mobil odaklı dikey akışta yeni nesil seriler',
    accent: '#a855f7',
    glow: 'radial-gradient(circle at top right, rgba(168,85,247,0.42), transparent 62%)',
    image: '/demo/webtoon2.jpg',
    href: '/seriler?filtre=Webtoon',
    large: false,
  },
]

const KATEGORI_KARTLARI = [
  {
    key: 'cizgi-roman',
    title: 'Çizgi Roman',
    subtitle: 'Klasikler, süper kahramanlar ve modern evrenler',
    accent: '#f59e0b',
    glow: 'radial-gradient(circle at top left, rgba(245,158,11,0.4), transparent 62%)',
    image: '/demo/cizgi-roman.jpg',
    href: '/kategori/cizgi-roman',
    large: true,
    matchers: ['Marvel', 'DC', 'Bağımsız', 'Çizgi Roman', 'Cizgi Roman'],
  },
  {
    key: 'manga',
    title: 'Manga',
    subtitle: 'Japon hikaye anlatımının yüksek tempolu dünyası',
    accent: '#22c55e',
    glow: 'radial-gradient(circle at top center, rgba(34,197,94,0.38), transparent 60%)',
    image: '/demo/manga.jpg',
    href: '/kategori/manga',
    large: false,
    matchers: ['Manga'],
  },
  {
    key: 'webtoon',
    title: 'Webtoon',
    subtitle: 'Dikey akışta yeni nesil dijital okuma deneyimi',
    accent: '#a855f7',
    glow: 'radial-gradient(circle at top right, rgba(168,85,247,0.42), transparent 62%)',
    image: '/demo/webtoon.jpg',
    href: '/kategori/webtoon',
    large: false,
    matchers: ['Webtoon'],
  },
]

function zaman(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'Az önce'
  if (diff < 3600) return `${Math.floor(diff/60)}dk önce`
  if (diff < 86400) return `${Math.floor(diff/3600)}s önce`
  if (diff < 604800) return `${Math.floor(diff/86400)}g önce`
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

function formatCount(value) {
  const count = Number(value || 0)
  if (count >= 1000000) return `${(count / 1000000).toFixed(1).replace('.0', '')}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace('.0', '')}B`
  return `${count}`
}

function normalizeCategory(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function hasCategoryMatch(seri, matchers = []) {
  const kategoriIsmi = normalizeCategory(seri.kategoriler?.isim)
  return matchers.some(match => kategoriIsmi === normalizeCategory(match))
}

function SeriKart({ seri }) {
  const [hover, setHover] = useState(false)
  return (
    <Link href={`/seri/${seri.slug}`} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ transition: 'transform 0.2s', transform: hover ? 'translateY(-5px)' : 'none', cursor: 'pointer' }}
      >
        <div style={{
          position: 'relative', aspectRatio: '2/3', borderRadius: '10px',
          overflow: 'hidden', marginBottom: '10px', background: '#111',
        }}>
          {seri.kapak_url
            ? <img src={seri.kapak_url} alt={seri.baslik} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', transform: hover ? 'scale(1.04)' : 'scale(1)' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '16px', color: '#fff', padding: '12px', textAlign: 'center', lineHeight: 1.2 }}>{seri.baslik}</div>
          }
          {seri.one_cikan && (
            <div style={{ position: 'absolute', top: '8px', left: '8px', background: '#f59e0b', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              ⭐
            </div>
          )}
          {seri.durum === 'Devam Eden' && (
            <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(22,163,74,0.9)', color: '#fff', fontSize: '9px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>
              Devam
            </div>
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.4) 100%)', opacity: hover ? 1 : 0, transition: 'opacity 0.2s' }} />
        </div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {seri.baslik}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 500 }}>
          {seri.kategoriler?.isim || '—'}
        </div>
      </div>
    </Link>
  )
}

function PopulerSeriKart({ seri, sira }) {
  const [hover, setHover] = useState(false)
  const rating = Number(seri.ortalama_puan || 0)
  const yeniSeri = isRecentlyAddedSeries(seri.created_at)
  const statusColor = seri.durum === 'Devam Eden'
    ? '#16a34a'
    : seri.durum === 'Tamamlandı'
      ? '#2563eb'
      : '#f59e0b'

  return (
    <Link href={`/seri/${seri.slug}`} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'relative',
          transition: 'transform 0.22s ease, box-shadow 0.22s ease',
          transform: hover ? 'translateY(-5px)' : 'none',
          cursor: 'pointer'
        }}
      >
        <div style={{
          position: 'relative', aspectRatio: '2/3', borderRadius: '14px',
          overflow: 'hidden', marginBottom: '12px', background: '#111',
          boxShadow: hover ? '0 18px 34px rgba(0,0,0,0.14)' : '0 10px 24px rgba(0,0,0,0.08)'
        }}>
          {seri.kapak_url
            ? <img src={seri.kapak_url} alt={seri.baslik} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: hover ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.3s ease' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '22px', color: '#fff', textAlign: 'center', padding: '16px' }}>{seri.baslik}</div>
          }

          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 52%)' }} />

          <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ background: 'rgba(17,17,16,0.86)', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '5px 8px', borderRadius: '999px', backdropFilter: 'blur(6px)' }}>
              #{sira}
            </span>
          </div>

          <div style={{ position: 'absolute', right: '10px', bottom: '10px', left: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {yeniSeri && (
              <span style={{ background: 'rgba(255,92,32,0.92)', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '5px 8px', borderRadius: '999px', backdropFilter: 'blur(6px)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                Yeni Seri
              </span>
            )}
            <span style={{ background: 'rgba(17,17,16,0.86)', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '5px 8px', borderRadius: '999px', backdropFilter: 'blur(6px)' }}>
              {rating > 0 ? `${rating.toFixed(1)}/10` : 'Puansız'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '5px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.25 }}>
            {seri.baslik}
          </div>
          <span style={{
            flexShrink: 0,
            background: `${statusColor}15`,
            color: statusColor,
            border: `1px solid ${statusColor}30`,
            fontSize: '10px',
            fontWeight: 700,
            padding: '4px 8px',
            borderRadius: '999px'
          }}>
            {seri.durum || 'Bilinmiyor'}
          </span>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600, marginBottom: '8px' }}>
          {seri.kategoriler?.isim || 'Arşiv'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map(star => (
              <span key={star} style={{ fontSize: '13px', color: rating >= star * 2 ? '#f59e0b' : '#ddd7cc' }}>
                ★
              </span>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 500 }}>
            {seri.puan_sayisi || 0} oy
          </div>
        </div>
      </div>
    </Link>
  )
}

function BolumKart({ bolum }) {
  const [hover, setHover] = useState(false)
  const seri = bolum.seriler
  if (!seri) return null
  const cover = bolum.kapak_url || seri.kapak_url
  return (
    <Link href={`/oku/${seri.slug}/${bolum.sayi}`} style={{ display: 'block', width: '100%', minWidth: 0, textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ width: '100%', minWidth: 0, cursor: 'pointer' }}
      >
        <div style={{
          position: 'relative', aspectRatio: '2/3', borderRadius: '10px',
          overflow: 'hidden', marginBottom: '8px', background: '#111'
        }}>
          {cover
            ? <img src={cover} alt={seri.baslik} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', transform: hover ? 'scale(1.05)' : 'scale(1)' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', color: '#666', textAlign: 'center', padding: '8px' }}>{seri.baslik}</span>
              </div>
          }
          <div style={{
            position: 'absolute', top: '8px', left: '8px',
            background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)',
            color: '#fff', fontSize: '9px', fontWeight: 700,
            padding: '3px 8px', borderRadius: '4px',
            textTransform: 'uppercase', letterSpacing: '0.6px'
          }}>
            BÖLÜM {bolum.sayi}
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(transparent, rgba(0,0,0,0.65))' }} />
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {seri.baslik}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 500 }}>
          {zaman(bolum.created_at)}
        </div>
      </div>
    </Link>
  )
}

function LoadingGrid({ count = 8, className = 'grid-4' }) {
  return (
    <div className={className}>
      {[...Array(count)].map((_, i) => (
        <div key={i}>
          <div style={{ aspectRatio: '2/3', borderRadius: '10px', background: 'var(--border)', marginBottom: '10px', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: '13px', background: 'var(--border)', borderRadius: '4px', marginBottom: '5px' }} />
          <div style={{ height: '11px', background: 'var(--border)', borderRadius: '4px', width: '55%' }} />
        </div>
      ))}
    </div>
  )
}

function ShowcaseCard({ title, subtitle, image, large = false, accent = '#f5f5f3', glow, count = 0, minHeight }) {
  const [hover, setHover] = useState(false)

  return (
    <article
      className={`showcase-card${large ? ' is-large' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        minHeight: minHeight || (large ? '320px' : '240px'),
        padding: 0,
        borderRadius: '24px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
        background: `linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02)), ${glow || 'transparent'}, #090909`,
        boxShadow: hover ? `0 26px 60px ${accent}26` : '0 18px 40px rgba(0,0,0,0.18)',
        textAlign: 'left',
        transform: hover ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
      }}
    >
      {image && (
        <Image
          src={image}
          alt={title}
          fill
          sizes={large ? '(max-width: 640px) 100vw, (max-width: 960px) 100vw, 50vw' : '(max-width: 640px) 100vw, (max-width: 960px) 33vw, 34vw'}
          style={{
            objectFit: 'cover',
            opacity: 0.4,
            transform: hover ? 'scale(1.03)' : 'scale(1)',
            transition: 'transform 0.3s ease'
          }}
        />
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.82) 100%)' }} />
      <div style={{ position: 'absolute', inset: 'auto auto 0 0', width: '100%', height: '65%', background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.88) 100%)' }} />

      <div style={{ position: 'relative', zIndex: 1, height: '100%', padding: large ? '24px' : '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: '8px',
            padding: large ? '10px 14px' : '8px 12px',
            borderRadius: '999px',
            border: `1px solid ${accent}55`,
            background: 'rgba(6,6,6,0.6)',
            backdropFilter: 'blur(10px)',
            color: '#fff'
          }}>
            <span style={{ fontSize: large ? '24px' : '20px', fontWeight: 800, lineHeight: 1 }}>
              {count}
            </span>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#d0d0cb' }}>
              Seri
            </span>
          </span>
        </div>

        <div>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: accent, boxShadow: `0 0 20px ${accent}`, marginBottom: '14px' }} />
          <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: large ? 'clamp(48px, 5vw, 72px)' : 'clamp(34px, 4vw, 48px)', lineHeight: 0.92, textTransform: 'uppercase', marginBottom: '10px' }}>
            {title}
          </div>
          <div style={{ maxWidth: '34ch', color: '#c8c8c3', fontSize: large ? '14px' : '13px', lineHeight: 1.55 }}>
            {subtitle}
          </div>
        </div>
      </div>
    </article>
  )
}

function CategoryBlock({ title, subtitle, image, href, large = false, accent = '#f5f5f3', glow, count = 0 }) {
  const [hover, setHover] = useState(false)

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <article
        className={`category-block${large ? ' is-large' : ''}`}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'relative',
          minHeight: large ? '420px' : '200px',
          overflow: 'hidden',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
          background: `linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02)), ${glow || 'transparent'}, #090909`,
          boxShadow: hover ? `0 26px 60px ${accent}26` : '0 18px 40px rgba(0,0,0,0.18)',
          transform: hover ? 'translateY(-4px)' : 'translateY(0)',
          transition: 'transform 0.22s ease, box-shadow 0.22s ease'
        }}
      >
        {image && (
          <Image
            src={image}
            alt={title}
            fill
            sizes={large ? '(max-width: 960px) 100vw, 60vw' : '(max-width: 640px) 100vw, (max-width: 960px) 50vw, 40vw'}
            style={{
              objectFit: 'cover',
              opacity: large ? 0.42 : 0.36,
              transform: hover ? 'scale(1.03)' : 'scale(1)',
              transition: 'transform 0.3s ease'
            }}
          />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.74) 58%, rgba(0,0,0,0.92) 100%)' }} />

        <div style={{ position: 'absolute', top: large ? '22px' : '18px', right: large ? '22px' : '18px', zIndex: 1 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: '8px',
            padding: large ? '10px 14px' : '8px 12px',
            borderRadius: '999px',
            border: `1px solid ${accent}55`,
            background: 'rgba(20,20,18,0.9)',
            backdropFilter: 'blur(10px)',
            color: '#fff'
          }}>
            <span style={{ fontSize: large ? '24px' : '20px', fontWeight: 800, lineHeight: 1 }}>
              {count}
            </span>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#d0d0cb' }}>
              Seri
            </span>
          </span>
        </div>

        <div style={{ position: 'absolute', left: large ? '22px' : '20px', right: large ? '22px' : '20px', bottom: large ? '24px' : '20px', zIndex: 1 }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: accent, boxShadow: `0 0 20px ${accent}`, marginBottom: '14px' }} />
          <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: large ? 'clamp(48px, 5vw, 72px)' : 'clamp(32px, 4vw, 44px)', lineHeight: 0.92, textTransform: 'uppercase', marginBottom: '10px' }}>
            {title}
          </div>
          <div style={{ maxWidth: large ? '34ch' : '28ch', color: '#c8c8c3', fontSize: large ? '14px' : '12px', lineHeight: 1.55 }}>
            {subtitle}
          </div>
        </div>
      </article>
    </Link>
  )
}

function TurKart({ tur, count }) {
  return (
    <Link href={tur.href || '/seriler'} style={{ display: 'block', textDecoration: 'none' }}>
      <ShowcaseCard
        title={tur.title}
        subtitle={tur.subtitle}
        image={tur.image}
        large={tur.large}
        accent={tur.accent}
        glow={tur.glow}
        count={count}
      />
    </Link>
  )
}

function LiderlikTablosu({ liderlik = {} }) {
  const kartlar = [
    { key: 'gunluk', baslik: 'Günlük En İyi Okuyucu' },
    { key: 'haftalik', baslik: 'Haftalık En İyi Okuyucu' },
    { key: 'aylik', baslik: 'Aylık En İyi Okuyucu' },
  ]
  const cerceveMap = {
    0: 'linear-gradient(135deg, #f7d774, #d4a72c)',
    1: 'linear-gradient(135deg, #d9dee6, #8e97a5)',
    2: 'linear-gradient(135deg, #d8a57a, #8c5a35)',
  }

  return (
    <section className="site-section" style={{ marginTop: 'var(--section-gap)' }}>
      <div style={{
        padding: '26px',
        borderRadius: '30px',
        border: '1px solid rgba(255,255,255,0.09)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
        boxShadow: '0 20px 48px rgba(0,0,0,0.2)',
      }}>
        <div className="home-section-heading" style={{ textAlign: 'center', marginBottom: '22px' }}>
          <h2 style={{ margin: 0, color: '#fff', fontFamily: 'var(--font-display)', fontSize: 'clamp(38px, 5vw, 60px)', lineHeight: 0.95, textTransform: 'uppercase' }}>
            En İyi Okuyucular
          </h2>
          <p className="home-section-kicker" style={{ margin: '10px 0 0', color: '#b8b8b2', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.4px' }}>
            Günlük, haftalık ve aylık en iyi okuyucular
          </p>
        </div>

        <div style={{
          marginBottom: '18px',
          padding: '14px 16px',
          borderRadius: '18px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#d4d4cf',
          fontSize: '13px',
          lineHeight: 1.7,
          textAlign: 'center',
        }}>
          Günlük en iyi okuyucu, haftalık en iyi okuyucu ve aylık en iyi okuyucu rozetleri ve süpriz ödüller verilecek.
        </div>

        <div className="leaderboard-period-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
          {kartlar.map((kart) => {
            const liste = liderlik?.[kart.key] || []
            const tamamlanmisListe = Array.from({ length: 5 }, (_, index) => liste[index] || null)

            return (
              <article key={kart.key} style={{
                padding: '18px',
                borderRadius: '24px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ color: '#fff', fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>
                    {kart.baslik}
                  </div>
                  <div style={{ color: '#9c9c96', fontSize: '11px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                    İlk 5 okuyucu
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  {tamamlanmisListe.map((uye, index) => {
                    const cerceve = cerceveMap[index]
                    const profilHref = uye?.kullanici_adi ? `/profil/${uye.kullanici_adi}` : '#'
                    const satir = (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '28px 48px minmax(0, 1fr) auto',
                        gap: '12px',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: '18px',
                        background: uye ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        minHeight: '76px',
                      }}>
                        <div style={{ color: '#8f8f8a', fontSize: '12px', fontWeight: 900 }}>#{index + 1}</div>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          padding: cerceve ? '2px' : '0',
                          background: cerceve || 'transparent',
                          boxShadow: cerceve ? '0 0 18px rgba(255,255,255,0.08)' : 'none',
                        }}>
                          <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#111', border: '2px solid rgba(255,255,255,0.1)' }}>
                            {uye?.avatar_url
                              ? <img src={uye.avatar_url} alt={uye.kullanici_adi} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#fff', fontSize: '18px', fontWeight: 800 }}>{uye?.kullanici_adi?.[0]?.toUpperCase() || '•'}</div>}
                          </div>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#fff', fontSize: '14px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {uye?.kullanici_adi || 'Yer Açık'}
                          </div>
                          <div style={{ color: '#9f9f99', fontSize: '11px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {uye?.unvan || 'Henüz okuyucu gelmedi'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: '32px', lineHeight: 0.9 }}>
                            {uye?.okumaSayisi || 0}
                          </div>
                          <div style={{ color: '#bcbcb6', fontSize: '10px', letterSpacing: '0.7px', textTransform: 'uppercase', marginTop: '4px' }}>
                            Okuma
                          </div>
                        </div>
                      </div>
                    )

                    return uye ? (
                      <Link key={`${kart.key}-${uye.id}-${index}`} href={profilHref} style={{ textDecoration: 'none' }}>
                        {satir}
                      </Link>
                    ) : (
                      <div key={`${kart.key}-placeholder-${index}`}>{satir}</div>
                    )
                  })}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default function Home({ seriler = [], bolumler = [], siteAyarlari = {}, liderlik = {} }) {
  const router = useRouter()
  const loading = false
  const [arama, setArama] = useState('')
  const [aramaAcik, setAramaAcik] = useState(false)
  const [oneriIndex, setOneriIndex] = useState(0)
  const [authBildirimKapali, setAuthBildirimKapali] = useState(false)
  const [authDurumu, setAuthDurumu] = useState('')
  const aramaRef = useRef(null)

  function findSeriById(id) {
    return seriler.find(item => String(item.id) === String(id))
  }

  const oneCikanlar = seriler.filter(s => s.one_cikan)
  const heroSeriler = oneCikanlar.length > 0 ? oneCikanlar : seriler
  const heroSlides = Array.isArray(siteAyarlari.anasayfa_hero_slider)
    ? siteAyarlari.anasayfa_hero_slider
        .filter(slide => slide?.aktif !== false)
        .map((slide, index) => {
          const seri = findSeriById(slide.seri_id)
          if (slide?.seri_id && !seri) return null
          return {
            id: slide.id || `hero-slide-${index}`,
            baslik: slide.baslik || seri?.baslik || '',
            ozet: slide.aciklama || seri?.ozet || '',
            kapak_url: slide.kapak_url || seri?.kapak_url || '',
            hero_gorsel_url: slide.arka_plan_url || seri?.hero_gorsel_url || seri?.arkaplan_url || '',
            arka_plan_fit: slide.arka_plan_fit || 'cover',
            arka_plan_pozisyon: typeof slide.arka_plan_x === 'number' && typeof slide.arka_plan_y === 'number'
              ? `${slide.arka_plan_x}% ${slide.arka_plan_y}%`
              : slide.arka_plan_pozisyon || 'center center',
            arka_plan_x: slide.arka_plan_x ?? 50,
            arka_plan_y: slide.arka_plan_y ?? 50,
            slug: seri?.slug || '',
            href: slide.buton1_link || (seri?.slug ? `/seri/${seri.slug}` : '/seriler'),
            secondary_href: slide.buton2_link || '/seriler',
            primary_label: slide.buton1_metin || (seri?.slug ? 'İncele →' : 'Keşfet →'),
            secondary_label: slide.buton2_metin || 'Tüm Seriler',
            badge: slide.badge || (seri?.one_cikan ? 'Öne Çıkan' : 'Konsey Seçkisi'),
            kategori_etiket: slide.kategori_etiket || seri?.kategoriler?.isim || '',
            durum: slide.durum || seri?.durum || '',
            one_cikan: seri?.one_cikan || false,
          }
        })
        .filter(slide => slide?.baslik)
    : []
  const populerSeriler = [...seriler]
    .sort((a, b) => {
      const readDiff = Number(b.goruntuleme_sayisi || 0) - Number(a.goruntuleme_sayisi || 0)
      if (readDiff !== 0) return readDiff
      return Number(b.ortalama_puan || 0) - Number(a.ortalama_puan || 0)
    })
    .slice(0, 5)
  const sonBolumlerTop = bolumler.slice(0, 5)
  const sonBolumlerAlt = bolumler.slice(5, 10)
  const turKartlari = SERI_TURLERI.map(tur => ({
    ...tur,
    count: seriler.filter(seri => hasCategoryMatch(seri, [tur.key])).length,
  }))
  const kategoriKartlari = KATEGORI_KARTLARI.map(kategori => ({
    ...kategori,
    count: seriler.filter(seri => hasCategoryMatch(seri, kategori.matchers)).length,
  }))
  const onerilenSeriHavuzu = [...oneCikanlar, ...populerSeriler, ...seriler]
    .filter((seri, index, arr) => arr.findIndex(item => String(item.id) === String(seri.id)) === index)
    .slice(0, 8)
  const bugunOnerisi = onerilenSeriHavuzu[oneriIndex % Math.max(onerilenSeriHavuzu.length, 1)] || null
  const hizliAramaChipleri = onerilenSeriHavuzu.slice(0, 4)
  const temizArama = normalizeCategory(arama.trim())
  const hizliAramaSonuclari = temizArama
    ? seriler.filter(seri => {
        const havuz = [
          seri.baslik,
          seri.aciklama,
          seri.kategoriler?.isim,
          seri.kategori,
          seri.yazar,
          seri.cizer,
          seri.yayinci,
        ].map(normalizeCategory).join(' ')

        return havuz.includes(temizArama)
      }).slice(0, 6)
    : []

  useEffect(() => {
    function handleDisTiklama(e) {
      if (aramaRef.current && !aramaRef.current.contains(e.target)) {
        setAramaAcik(false)
      }
    }

    document.addEventListener('mousedown', handleDisTiklama)
    return () => document.removeEventListener('mousedown', handleDisTiklama)
  }, [])

  useEffect(() => {
    setAuthBildirimKapali(false)
  }, [authDurumu])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    setAuthDurumu(url.searchParams.get('auth') || '')
  }, [])

  function aramayaGit() {
    const deger = arama.trim()
    setAramaAcik(false)
    router.push(deger ? `/seriler?q=${encodeURIComponent(deger)}` : '/seriler')
  }

  function handleHizliArama(e) {
    e.preventDefault()
    aramayaGit()
  }

  function siradakiOneri() {
    if (onerilenSeriHavuzu.length <= 1) return
    setOneriIndex(prev => (prev + 1) % onerilenSeriHavuzu.length)
  }

  return (
    <main style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 18px; }
        .grid-bolumler-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
        .grid-bolumler { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .home-categories { display: grid; grid-template-columns: 1.5fr 1fr; gap: 18px; }
        .home-categories-right { display: grid; grid-template-rows: 1fr 1fr; gap: 18px; }
        .home-search-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.65fr); gap: 18px; align-items: stretch; }
        .series-showcase-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 18px; }
        .series-showcase-grid > *:nth-child(1),
        .series-showcase-grid > *:nth-child(2) { grid-column: span 6; }
        .series-showcase-grid > *:nth-child(n+3) { grid-column: span 4; }
        @media (max-width: 960px) {
          .grid-4 { grid-template-columns: repeat(3, 1fr) !important; }
          .grid-5 { grid-template-columns: repeat(3, 1fr) !important; }
          .grid-bolumler-5 { grid-template-columns: repeat(3, 1fr) !important; }
          .grid-bolumler { grid-template-columns: repeat(3, 1fr) !important; }
          .home-categories { grid-template-columns: 1fr !important; }
          .home-categories-right { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: none !important; }
          .home-search-grid { grid-template-columns: 1fr !important; }
          .series-showcase-grid > *:nth-child(1),
          .series-showcase-grid > *:nth-child(2) { grid-column: span 12; }
          .series-showcase-grid > *:nth-child(n+3) { grid-column: span 4; }
          .leaderboard-period-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .home-section-heading { margin-bottom: 22px !important; }
          .home-section-kicker { font-size: 10px !important; letter-spacing: 1.1px !important; }
          .grid-4,
          .grid-5,
          .grid-bolumler-5,
          .grid-bolumler,
          .home-categories,
          .home-categories-right,
          .home-search-grid,
          .series-showcase-grid { gap: 12px !important; }
          .grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
          .grid-5 { grid-template-columns: repeat(2, 1fr) !important; }
          .grid-bolumler-5 { grid-template-columns: repeat(2, 1fr) !important; }
          .grid-bolumler { grid-template-columns: repeat(2, 1fr) !important; }
          .home-categories-right { grid-template-columns: 1fr !important; }
          .home-categories-right { grid-template-rows: auto auto !important; }
          .showcase-card { min-height: 216px !important; border-radius: 20px !important; }
          .showcase-card.is-large { min-height: 240px !important; }
          .category-block { min-height: 180px !important; border-radius: 20px !important; }
          .category-block.is-large { min-height: 300px !important; }
          .series-showcase-grid > * { grid-column: span 12 !important; }
          .leaderboard-period-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Navbar />
      {authDurumu === 'email-changed' && !authBildirimKapali && (
        <section className="site-section" style={{ marginTop: '20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '14px',
            padding: '16px 18px',
            borderRadius: '22px',
            border: '1px solid rgba(74,222,128,0.2)',
            background: 'linear-gradient(180deg, rgba(20,83,45,0.36), rgba(20,83,45,0.18))',
            boxShadow: '0 18px 40px rgba(0,0,0,0.12)',
          }}>
            <div>
              <div style={{ color: '#bbf7d0', fontSize: '11px', fontWeight: 800, letterSpacing: '1.1px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Hesap Güncellendi
              </div>
              <div style={{ color: '#fff', fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
                E-posta değişimi onaylandı.
              </div>
              <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '13px', lineHeight: 1.7 }}>
                Hesabın artık yeni e-posta adresinle güncel. Sonraki girişlerinde bu adresi kullanabilirsin.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setAuthBildirimKapali(true)
                router.replace('/')
              }}
              style={{
                flexShrink: 0,
                minHeight: '40px',
                padding: '0 14px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Kapat
            </button>
          </div>
        </section>
      )}
      <Hero seriler={heroSeriler} slides={heroSlides} />

      <section className="site-section" style={{ marginTop: '28px' }}>
        <div className="home-search-grid">
          <div style={{
            padding: '22px',
            borderRadius: '28px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
            boxShadow: '0 18px 40px rgba(0,0,0,0.18)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: '11px', fontWeight: 800, letterSpacing: '1.4px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Hızlı Arama
              </div>
              <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 48px)', lineHeight: 0.92, marginBottom: '8px' }}>
                Aradığın Seriyi Direkt Bul
              </div>
              <p style={{ margin: 0, color: '#9c9c96', fontSize: '14px', lineHeight: 1.7 }}>
                Seri, yazar, çizer veya evren ara. Sonuçları tam arşiv sayfasında açalım.
              </p>
            </div>

            <div ref={aramaRef} style={{ position: 'relative' }}>
              <form onSubmit={handleHizliArama} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '12px' }}>
                <input
                  value={arama}
                  onChange={e => {
                    setArama(e.target.value)
                    setAramaAcik(true)
                  }}
                  onFocus={() => {
                    if (arama.trim()) setAramaAcik(true)
                  }}
                  placeholder="Örnek: Daredevil, Spider-Man, Punisher..."
                  aria-label="Ana sayfa hızlı arama"
                  style={{
                    width: '100%',
                    minHeight: '54px',
                    padding: '0 18px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(0,0,0,0.32)',
                    color: '#fff',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    minHeight: '54px',
                    padding: '0 20px',
                    borderRadius: '16px',
                    border: 'none',
                    background: '#fff',
                    color: '#111',
                    fontSize: '13px',
                    fontWeight: 800,
                    fontFamily: 'inherit',
                    letterSpacing: '0.7px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Ara
                </button>
              </form>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px' }}>
                {hizliAramaChipleri.map(chip => (
                  <Link
                    key={chip.id}
                    href={`/seri/${chip.slug}`}
                    style={{
                      minHeight: '34px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0 12px',
                      borderRadius: '999px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.04)',
                      color: '#d8d8d2',
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '0.7px',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      textDecoration: 'none',
                    }}
                  >
                    {chip.baslik}
                  </Link>
                ))}
              </div>

              {aramaAcik && temizArama && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  left: 0,
                  right: 0,
                  padding: '10px',
                  borderRadius: '20px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(10,10,10,0.96)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.32)',
                  backdropFilter: 'blur(16px)',
                  zIndex: 20,
                }}>
                  {hizliAramaSonuclari.length > 0 ? (
                    <>
                      <div style={{ padding: '6px 8px 10px', color: 'rgba(255,255,255,0.44)', fontSize: '11px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>
                        Eşleşen Seriler
                      </div>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        {hizliAramaSonuclari.map(seri => (
                          <Link
                            key={seri.id}
                            href={`/seri/${seri.slug}`}
                            onClick={() => setAramaAcik(false)}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '56px minmax(0, 1fr)',
                              gap: '12px',
                              alignItems: 'center',
                              padding: '10px',
                              borderRadius: '16px',
                              textDecoration: 'none',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.04)',
                            }}
                          >
                            <div style={{
                              position: 'relative',
                              width: '56px',
                              aspectRatio: '0.72',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              background: '#161616',
                            }}>
                              {seri.kapak_url ? (
                                <img src={seri.kapak_url} alt={seri.baslik} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '10px', textAlign: 'center', padding: '6px' }}>
                                  {seri.baslik}
                                </div>
                              )}
                            </div>
                            <div style={{ minWidth: 0, textAlign: 'left' }}>
                              <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700, lineHeight: 1.3, marginBottom: '4px' }}>
                                {seri.baslik}
                              </div>
                              <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '11px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                                {seri.kategoriler?.isim || 'Arşiv'}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={aramayaGit}
                        style={{
                          width: '100%',
                          marginTop: '10px',
                          minHeight: '44px',
                          borderRadius: '14px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: 'rgba(255,255,255,0.04)',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 800,
                          fontFamily: 'inherit',
                          letterSpacing: '0.8px',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                        }}
                      >
                        Tüm Sonuçları Gör
                      </button>
                    </>
                  ) : (
                    <div style={{ padding: '14px 10px', color: 'rgba(255,255,255,0.52)', fontSize: '13px' }}>
                      Bu arama için hızlı sonuç bulamadık. Yine de tüm arşivde arayabilirsin.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '28px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
            boxShadow: '0 18px 40px rgba(0,0,0,0.18)',
            minHeight: '100%',
          }}>
            {bugunOnerisi?.kapak_url && (
              <img
                src={bugunOnerisi.kapak_url}
                alt={bugunOnerisi.baslik}
                loading="lazy"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.24 }}
              />
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.88) 100%)' }} />
            <div style={{ position: 'relative', zIndex: 1, height: '100%', padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '18px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                  <div style={{ color: '#f5b942', fontSize: '11px', fontWeight: 800, letterSpacing: '1.3px', textTransform: 'uppercase' }}>
                    Bugün Ne Okusak?
                  </div>
                  {onerilenSeriHavuzu.length > 1 && (
                    <button
                      type="button"
                      onClick={siradakiOneri}
                      style={{
                        minHeight: '28px',
                        padding: '0 10px',
                        borderRadius: '999px',
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 800,
                        fontFamily: 'inherit',
                        letterSpacing: '0.8px',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                      }}
                    >
                      Değiştir
                    </button>
                  )}
                </div>
                <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 4vw, 42px)', lineHeight: 0.92, marginBottom: '10px' }}>
                  {bugunOnerisi?.baslik || 'Konsey Önerisi'}
                </div>
                <p style={{ margin: 0, color: '#c2c2bd', fontSize: '14px', lineHeight: 1.7 }}>
                  {bugunOnerisi?.ozet
                    ? `${String(bugunOnerisi.ozet).slice(0, 120)}${String(bugunOnerisi.ozet).length > 120 ? '...' : ''}`
                    : 'Aramak istemiyorsan, bugünün öne çıkan serisini tek dokunuşla aç.'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ minHeight: '28px', display: 'inline-flex', alignItems: 'center', padding: '0 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '10px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  {bugunOnerisi?.kategoriler?.isim || 'Arşiv'}
                </span>
                {isRecentlyAddedSeries(bugunOnerisi?.created_at) && (
                  <span style={{ minHeight: '28px', display: 'inline-flex', alignItems: 'center', padding: '0 10px', borderRadius: '999px', background: 'rgba(255,92,32,0.92)', color: '#fff', fontSize: '10px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                    Yeni Seri
                  </span>
                )}
                {bugunOnerisi?.durum && (
                  <span style={{ minHeight: '28px', display: 'inline-flex', alignItems: 'center', padding: '0 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '10px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                    {bugunOnerisi.durum}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                <Link
                  href={bugunOnerisi?.slug ? `/seri/${bugunOnerisi.slug}` : '/seriler'}
                  style={{
                    minHeight: '48px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '16px',
                    background: '#fff',
                    color: '#111',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 800,
                    letterSpacing: '0.7px',
                    textTransform: 'uppercase',
                  }}
                >
                  Hemen Oku
                </Link>
                <button
                  type="button"
                  onClick={() => router.push('/seriler?sirala=okunan')}
                  style={{
                    minHeight: '42px',
                    borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 800,
                    fontFamily: 'inherit',
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Konsey Önerileri
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!loading && populerSeriler.length > 0 && (
        <section className="site-section" style={{ marginTop: 'var(--section-gap)' }}>
          <div className="home-section-heading" style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'clamp(38px, 5vw, 62px)', lineHeight: 0.95, letterSpacing: '0.8px', color: 'var(--text)' }}>
              En Çok Okunan Seriler
            </h2>
          </div>
          <div className="grid-5">
            {populerSeriler.map((seri, index) => (
              <PopulerSeriKart key={seri.id} seri={seri} sira={index + 1} />
            ))}
          </div>
        </section>
      )}

      {!loading && (
        <LiderlikTablosu liderlik={liderlik} />
      )}

      <section style={{ background: '#111', marginTop: 'var(--section-gap)' }}>
        <div className="site-section home-section-heading" style={{ paddingTop: '40px', textAlign: 'center' }}>
          <h2 style={{ margin: 0, color: '#fff', fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 5vw, 64px)', lineHeight: 0.95, textTransform: 'uppercase' }}>
            Kategoriler
          </h2>
        </div>

        <div className="site-section home-categories" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
          <CategoryBlock
            title={kategoriKartlari[0].title}
            subtitle={kategoriKartlari[0].subtitle}
            image={kategoriKartlari[0].image}
            href={kategoriKartlari[0].href}
            large={kategoriKartlari[0].large}
            accent={kategoriKartlari[0].accent}
            glow={kategoriKartlari[0].glow}
            count={kategoriKartlari[0].count}
          />
          <div className="home-categories-right">
            {kategoriKartlari.slice(1).map(kategori => (
              <CategoryBlock
                key={kategori.key}
                title={kategori.title}
                subtitle={kategori.subtitle}
                image={kategori.image}
                href={kategori.href}
                large={kategori.large}
                accent={kategori.accent}
                glow={kategori.glow}
                count={kategori.count}
              />
            ))}
          </div>
        </div>
      </section>

      {(bolumler.length > 0 || loading) && (
        <section className="site-section" style={{ marginTop: 'var(--section-gap)' }}>
          <div className="home-section-heading" style={{ marginBottom: '30px', textAlign: 'center' }}>
            <h2 style={{ margin: 0, color: '#fff', fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 5vw, 64px)', lineHeight: 0.95, textTransform: 'uppercase' }}>
              Son Eklenen Bölümler
            </h2>
            <p className="home-section-kicker" style={{ margin: '8px 0 0', color: '#b8b8b2', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              Yeni eklenen bölümler
            </p>
          </div>
          {loading
            ? <LoadingGrid count={10} className="grid-bolumler-5" />
            : <>
              <div className="grid-bolumler-5" style={{ marginBottom: '14px' }}>{sonBolumlerTop.map(b => <BolumKart key={b.id} bolum={b} />)}</div>
              <div className="grid-bolumler-5">{sonBolumlerAlt.map(b => <BolumKart key={b.id} bolum={b} />)}</div>
            </>
          }
        </section>
      )}

      {/* Tüm Seriler */}
      <section className="site-section" style={{ marginTop: 'var(--section-gap)' }}>
        <div className="home-section-heading" style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ margin: 0, color: '#fff', fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 5vw, 64px)', lineHeight: 0.95, textTransform: 'uppercase' }}>
            Tüm Seriler
          </h2>
          <p className="home-section-kicker" style={{ margin: '8px 0 0', color: '#b8b8b2', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            Evrenlere göre keşfet
          </p>
        </div>
        <div className="series-showcase-grid" style={{ marginBottom: '28px' }}>
          {turKartlari.map(tur => (
            <TurKart key={tur.key} tur={tur} count={tur.count} />
          ))}
        </div>
      </section>

      <Footer />
    </main>
  )
}
