'use client'
import { useDeferredValue, useEffect, useState, startTransition } from 'react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

const KATEGORI_AYARLARI = {
  'cizgi-roman': {
    title: 'Çizgi Romanlar',
    kicker: 'Konsey Arşivi',
    matchers: ['Marvel', 'DC', 'Bağımsız'],
  },
  manga: {
    title: 'Mangalar',
    kicker: 'Konsey Arşivi',
    matchers: ['Manga'],
  },
  webtoon: {
    title: 'Webtoonlar',
    kicker: 'Konsey Arşivi',
    matchers: ['Webtoon'],
  },
}

const SIRALAMALAR = [
  { key: 'yeni', label: 'En Yeni' },
  { key: 'populer', label: 'Popüler' },
  { key: 'okunan', label: 'En Çok Okunan' },
  { key: 'az', label: 'A-Z' },
]

const ILK_GORUNEN_KART = 24

function normalizeText(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function formatCount(value) {
  const count = Number(value || 0)
  if (count >= 1000000) return `${(count / 1000000).toFixed(1).replace('.0', '')}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace('.0', '')}B`
  return `${count}`
}

function temizSiralama(value) {
  if (!value) return 'yeni'
  return SIRALAMALAR.find(item => item.key === value)?.key || 'yeni'
}

function seriEvreni(seri) {
  const kategoriIsmi = seri.kategoriler?.isim
  const kategoriAlani = seri.kategori
  return kategoriIsmi || kategoriAlani || 'Arşiv'
}

function SeriKarti({ seri }) {
  const rating = Number(seri.ortalama_puan || 0)
  const fullStars = Math.round(rating / 2)

  return (
    <Link href={`/seri/${seri.slug}`} style={{ textDecoration: 'none' }}>
      <article className="series-card">
        <div className="series-card-cover">
          {seri.kapak_url ? (
            <img src={seri.kapak_url} alt={seri.baslik} loading="lazy" />
          ) : (
            <div className="series-card-fallback">{seri.baslik}</div>
          )}

          <div className="series-card-overlay" />

          <div className="series-card-topline">
            <span className="series-chip">{seriEvreni(seri)}</span>
          </div>

          <div className="series-card-bottomline">
            <span className="series-pill">{Number(seri.goruntuleme_sayisi || 0) > 0 ? `${formatCount(seri.goruntuleme_sayisi)} görüntülenme` : 'Yeni seri'}</span>
            <span className="series-pill">{rating > 0 ? `${rating.toFixed(1)}/10` : 'Puansız'}</span>
          </div>
        </div>

        <div className="series-card-body">
          <h3>{seri.baslik}</h3>
          <div className="series-card-category">{seriEvreni(seri)}</div>
          <div className="series-card-rating">
            <div className="series-stars" aria-hidden="true">
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} className={star <= fullStars ? 'active' : ''}>★</span>
              ))}
            </div>
            <span>{seri.puan_sayisi || 0} oy</span>
          </div>
          <div className="series-card-meta">
            <span>{seri.yil || 'Yıl yok'}</span>
            <span>{seri.durum || 'Durum yok'}</span>
          </div>
        </div>
      </article>
    </Link>
  )
}

export default function KategoriSayfasi() {
  const { slug } = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [seriler, setSeriler] = useState([])
  const [turler, setTurler] = useState([])
  const [loading, setLoading] = useState(true)
  const [gorunenAdet, setGorunenAdet] = useState(ILK_GORUNEN_KART)

  const kategoriAyar = KATEGORI_AYARLARI[slug] || {
    title: String(slug || '').toUpperCase(),
    kicker: 'Konsey Arşivi',
    matchers: [String(slug || '')],
  }

  const siralama = temizSiralama(searchParams.get('sirala'))
  const arama = searchParams.get('q') || ''
  const tur = searchParams.get('tur') || 'Tümü'
  const deferredArama = useDeferredValue(arama)

  useEffect(() => {
    async function fetchData() {
      const [seriRes, turRes] = await Promise.all([
        supabase.from('seriler').select('*, kategoriler(isim)').order('created_at', { ascending: false }),
        supabase.from('turler').select('id, isim').order('isim')
      ])

      setSeriler(seriRes.data || [])
      setTurler(turRes.data || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  function replaceParams(nextValues) {
    const params = new URLSearchParams(searchParams.toString())

    if (nextValues.sirala !== undefined) {
      if (nextValues.sirala && nextValues.sirala !== 'yeni') params.set('sirala', nextValues.sirala)
      else params.delete('sirala')
    }

    if (nextValues.q !== undefined) {
      if (String(nextValues.q).trim()) params.set('q', String(nextValues.q).trim())
      else params.delete('q')
    }

    if (nextValues.tur !== undefined) {
      if (nextValues.tur && nextValues.tur !== 'Tümü') params.set('tur', nextValues.tur)
      else params.delete('tur')
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    startTransition(() => {
      router.replace(nextUrl, { scroll: false })
    })
  }

  const kategoriSerileri = seriler.filter(seri => {
    const kategoriIsmi = normalizeText(seri.kategoriler?.isim)
    return kategoriAyar.matchers.some(match => {
      const hedef = normalizeText(match)
      return kategoriIsmi === hedef
    })
  })

  const turMap = new Map(turler.map(item => [String(item.id), item.isim]))
  const mevcutTurler = turler.map(item => item.isim)

  const aramaMetni = normalizeText(deferredArama.trim())
  let filtrelenmis = kategoriSerileri

  if (tur !== 'Tümü') {
    filtrelenmis = filtrelenmis.filter(seri =>
      Array.isArray(seri.turler) && seri.turler.some(id => turMap.get(String(id)) === tur)
    )
  }

  if (aramaMetni) {
    filtrelenmis = filtrelenmis.filter(seri => {
      const seriTurleri = Array.isArray(seri.turler) ? seri.turler.map(id => turMap.get(String(id))).filter(Boolean).join(' ') : ''
      const havuz = [
        seri.baslik,
        seri.aciklama,
        seri.kategoriler?.isim,
        seri.kategori,
        seri.yazar,
        seri.cizer,
        seri.yayinci,
        seriTurleri,
      ].map(normalizeText).join(' ')

      return havuz.includes(aramaMetni)
    })
  }

  if (siralama === 'az') {
    filtrelenmis = [...filtrelenmis].sort((a, b) => a.baslik.localeCompare(b.baslik, 'tr'))
  } else if (siralama === 'okunan') {
    filtrelenmis = [...filtrelenmis].sort((a, b) => Number(b.goruntuleme_sayisi || 0) - Number(a.goruntuleme_sayisi || 0))
  } else if (siralama === 'populer') {
    filtrelenmis = [...filtrelenmis].sort((a, b) => {
      const puanFarki = Number(b.ortalama_puan || 0) - Number(a.ortalama_puan || 0)
      if (puanFarki !== 0) return puanFarki
      return Number(b.goruntuleme_sayisi || 0) - Number(a.goruntuleme_sayisi || 0)
    })
  }

  const gosterilenSeriler = filtrelenmis.slice(0, gorunenAdet)

  return (
    <>
      <Navbar />
      <main style={{ background: '#000', minHeight: '100vh' }}>
        <style>{`
          .series-page {
            position: relative;
            overflow: hidden;
          }
          .series-page::before {
            content: '';
            position: absolute;
            inset: 0;
            background:
              radial-gradient(circle at top left, rgba(255,255,255,0.06), transparent 24%),
              radial-gradient(circle at top right, rgba(255,255,255,0.04), transparent 20%),
              linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0) 24%);
            pointer-events: none;
          }
          .series-hero {
            position: relative;
            padding-top: 34px;
            padding-bottom: 22px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
          }
          .series-hero-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 18px;
            justify-items: center;
            text-align: center;
          }
          .series-kicker {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.04);
            color: rgba(255,255,255,0.72);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1.2px;
            text-transform: uppercase;
            margin-bottom: 16px;
          }
          .series-hero h1 {
            font-family: 'Bebas Neue', sans-serif;
            font-size: clamp(56px, 10vw, 104px);
            line-height: 0.92;
            color: #fff;
            margin-bottom: 14px;
          }
          .series-filters {
            position: sticky;
            top: 88px;
            z-index: 18;
            padding-top: 14px;
            padding-bottom: 16px;
            backdrop-filter: blur(16px);
            background: linear-gradient(180deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.82) 100%);
            border-bottom: 1px solid rgba(255,255,255,0.08);
          }
          .series-filter-shell {
            display: grid;
            gap: 14px;
          }
          .series-search-row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 220px;
            gap: 14px;
            align-items: center;
          }
          .series-search {
            width: 100%;
            height: 52px;
            border-radius: 16px;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.05);
            color: #fff;
            padding: 0 18px;
            font-size: 14px;
            font-family: inherit;
            outline: none;
          }
          .series-search::placeholder {
            color: rgba(255,255,255,0.36);
          }
          .series-select {
            min-width: 180px;
            height: 52px;
            border-radius: 16px;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.05);
            color: #fff;
            padding: 0 16px;
            font-size: 14px;
            font-family: inherit;
          }
          .series-chip-row {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: center;
          }
          .series-filter-chip {
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.05);
            color: rgba(255,255,255,0.72);
            border-radius: 999px;
            padding: 11px 14px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
            font-family: inherit;
          }
          .series-filter-chip.active {
            background: #fff;
            color: #111;
            border-color: #fff;
          }
          .series-filter-chip:hover {
            transform: translateY(-1px);
          }
          .series-section {
            padding-top: 28px;
            padding-bottom: 80px;
          }
          .series-section-top {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 18px;
          }
          .series-results-count {
            color: rgba(255,255,255,0.48);
            font-size: 13px;
            white-space: nowrap;
          }
          .series-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
            gap: 26px 18px;
          }
          .series-card {
            display: grid;
            gap: 14px;
          }
          .series-card-cover {
            position: relative;
            overflow: hidden;
            border-radius: 22px;
            aspect-ratio: 2 / 3;
            background: #101010;
            border: 1px solid rgba(255,255,255,0.07);
            box-shadow: 0 20px 40px rgba(0,0,0,0.26);
          }
          .series-card-cover img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            transition: transform 0.3s ease;
          }
          .series-card:hover .series-card-cover img {
            transform: scale(1.04);
          }
          .series-card-fallback {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            text-align: center;
            color: #fff;
            font-family: 'Bebas Neue', sans-serif;
            font-size: 28px;
            line-height: 0.95;
          }
          .series-card-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.78) 100%);
          }
          .series-card-topline,
          .series-card-bottomline {
            position: absolute;
            left: 14px;
            right: 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            z-index: 2;
          }
          .series-card-topline {
            top: 12px;
          }
          .series-card-bottomline {
            bottom: 12px;
          }
          .series-chip {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 26px;
            padding: 6px 9px;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(10,10,10,0.68);
            backdrop-filter: blur(8px);
            color: #fff;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.7px;
          }
          .series-pill {
            display: inline-flex;
            align-items: center;
            min-height: 36px;
            padding: 0 14px;
            border-radius: 999px;
            background: rgba(8,8,8,0.84);
            border: 1px solid rgba(255,255,255,0.12);
            color: #fff;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.3px;
            backdrop-filter: blur(10px);
          }
          .series-card-body h3 {
            color: #fff;
            font-size: 18px;
            line-height: 1.3;
            font-weight: 700;
            min-height: 46px;
          }
          .series-card-category {
            color: rgba(255,255,255,0.7);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 800;
          }
          .series-card-rating {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            color: rgba(255,255,255,0.48);
            font-size: 12px;
          }
          .series-stars {
            display: flex;
            align-items: center;
            gap: 1px;
            font-size: 15px;
            line-height: 1;
          }
          .series-stars span {
            color: rgba(255,255,255,0.18);
          }
          .series-stars span.active {
            color: #f5b321;
          }
          .series-card-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            color: rgba(255,255,255,0.46);
            font-size: 12px;
          }
          .series-empty {
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 24px;
            background: rgba(255,255,255,0.03);
            padding: 48px 24px;
            text-align: center;
          }
          .series-empty h3 {
            font-family: 'Bebas Neue', sans-serif;
            font-size: 48px;
            color: #fff;
            margin-bottom: 10px;
          }
          .series-empty p {
            color: rgba(255,255,255,0.58);
            font-size: 14px;
            line-height: 1.8;
            max-width: 52ch;
            margin: 0 auto 18px;
          }
          .series-load-more {
            margin-top: 28px;
            display: flex;
            justify-content: center;
          }
          .series-load-more button,
          .series-empty button {
            height: 50px;
            padding: 0 22px;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.06);
            color: #fff;
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 0.7px;
            text-transform: uppercase;
            cursor: pointer;
            font-family: inherit;
          }
          @media (max-width: 1100px) {
            .series-search-row {
              grid-template-columns: 1fr;
            }
          }
          @media (max-width: 720px) {
            .series-hero {
              padding-top: 28px;
            }
            .series-hero h1 {
              font-size: clamp(44px, 16vw, 72px);
            }
            .series-filters {
              top: 74px;
            }
            .series-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 18px 14px;
            }
            .series-pill {
              min-height: 30px;
              padding: 0 10px;
              font-size: 11px;
            }
            .series-card-body h3 {
              font-size: 15px;
              min-height: 38px;
            }
            .series-chip-row {
              flex-wrap: nowrap;
              overflow-x: auto;
              padding-bottom: 2px;
              scrollbar-width: none;
            }
            .series-chip-row::-webkit-scrollbar {
              display: none;
            }
          }
        `}</style>

        <section className="series-page">
          <header className="series-hero">
            <div className="site-shell series-hero-grid">
              <div>
                <div className="series-kicker">{kategoriAyar.kicker}</div>
                <h1>{kategoriAyar.title}</h1>
              </div>
            </div>
          </header>

          <section className="series-filters">
            <div className="site-shell series-filter-shell">
              <div className="series-search-row">
                <input
                  className="series-search"
                  value={arama}
                  onChange={e => {
                    setGorunenAdet(ILK_GORUNEN_KART)
                    replaceParams({ q: e.target.value })
                  }}
                  placeholder="Seri, yazar, çizer veya tür ara..."
                />

                <select className="series-select" value={siralama} onChange={e => {
                  setGorunenAdet(ILK_GORUNEN_KART)
                  replaceParams({ sirala: e.target.value })
                }}>
                  {SIRALAMALAR.map(secenek => (
                    <option key={secenek.key} value={secenek.key} style={{ background: '#111' }}>
                      {secenek.label}
                    </option>
                  ))}
                </select>
              </div>

              {mevcutTurler.length > 0 && (
                <div className="series-chip-row">
                  <button
                    className={`series-filter-chip ${tur === 'Tümü' ? 'active' : ''}`}
                    onClick={() => {
                      setGorunenAdet(ILK_GORUNEN_KART)
                      replaceParams({ tur: 'Tümü' })
                    }}
                  >
                    Tümü
                  </button>
                  {mevcutTurler.map(item => (
                    <button
                      key={item}
                      className={`series-filter-chip ${tur === item ? 'active' : ''}`}
                      onClick={() => {
                        setGorunenAdet(ILK_GORUNEN_KART)
                        replaceParams({ tur: item })
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="site-shell series-section">
            <div className="series-section-top">
              <div className="series-results-count">
                {loading ? 'Yükleniyor...' : `${filtrelenmis.length} seri gösteriliyor`}
              </div>
            </div>

            {loading ? (
              <div className="series-empty">
                <h3>Arşiv Yükleniyor</h3>
                <p>Bu kategori için kapaklar ve filtreler hazırlanıyor.</p>
              </div>
            ) : filtrelenmis.length === 0 ? (
              <div className="series-empty">
                <h3>Sonuç Bulunamadı</h3>
                <p>Bu seçimle uyuşan bir seri bulamadık. Aramayı ya da tür filtresini temizleyebilirsin.</p>
                <button onClick={() => {
                  setGorunenAdet(ILK_GORUNEN_KART)
                  replaceParams({ sirala: 'yeni', q: '', tur: 'Tümü' })
                }}>
                  Filtreleri Temizle
                </button>
              </div>
            ) : (
              <>
                <div className="series-grid">
                  {gosterilenSeriler.map(seri => <SeriKarti key={seri.id} seri={seri} />)}
                </div>

                {gosterilenSeriler.length < filtrelenmis.length && (
                  <div className="series-load-more">
                    <button onClick={() => setGorunenAdet(count => count + ILK_GORUNEN_KART)}>
                      Daha Fazla Goster
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </section>
      </main>
      <Footer />
    </>
  )
}
