'use client'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../../components/Navbar'
import Footer from '../../../components/Footer'
import YorumSistemi from '../../../components/YorumSistemi'
import { trackIssueReadAndUnlock } from '../../../lib/unvanClient'

const INITIAL_VISIBLE_PAGE_COUNT = 6
const PAGE_BATCH_SIZE = 4

function driveEmbedUrl(link) {
  if (!link) return null
  const match = link.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (match) return `https://drive.google.com/file/d/${match[1]}/preview`
  return link
}

function tarih(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Okuyucu() {
  const { slug, bolum } = useParams()
  const router = useRouter()
  const [bolumData, setBolumData] = useState(null)
  const [seriData, setSeriData] = useState(null)
  const [detayAyar, setDetayAyar] = useState({})
  const [okumaSayfalari, setOkumaSayfalari] = useState([])
  const [tumBolumler, setTumBolumler] = useState([])
  const [loading, setLoading] = useState(true)
  const [iframeHata, setIframeHata] = useState(false)
  const [aktifSayfa, setAktifSayfa] = useState(1)
  const [gorunenSayfaSayisi, setGorunenSayfaSayisi] = useState(INITIAL_VISIBLE_PAGE_COUNT)
  const sayfaRefleri = useRef([])
  const stageRef = useRef(null)
  const okumaTakipRef = useRef(null)
  const [progressGorunsun, setProgressGorunsun] = useState(false)
  const [acilanUnvanlar, setAcilanUnvanlar] = useState([])

  useEffect(() => {
    async function fetchData() {
      setOkumaSayfalari([])
      setBolumData(null)
      setLoading(true)
      const { data: seri } = await supabase
        .from('seriler')
        .select('*, kategoriler(isim)')
        .eq('slug', slug)
        .single()

      if (!seri) {
        setLoading(false)
        return
      }

      setSeriData(seri)

      const { data: detay } = await supabase
        .from('site_ayarlari')
        .select('deger')
        .eq('anahtar', 'seri_detay_vitrin')
        .maybeSingle()

      setDetayAyar(detay.data?.deger?.[String(seri.id)] || {})

      const { data: tumBolumlerData } = await supabase
        .from('bolumler')
        .select('*')
        .eq('seri_id', seri.id)
        .order('sayi')

      const bolumKaydi = (tumBolumlerData || []).find(item => String(item.sayi) === String(bolum))

      if (bolumKaydi) {
        setBolumData({ ...bolumKaydi, seriBaslik: seri.baslik })

        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          await supabase.from('okuma_gecmisi').upsert([{
            kullanici_id: session.user.id,
            bolum_id: bolumKaydi.id,
            seri_id: seri.id,
          }], { onConflict: 'kullanici_id,bolum_id' })
        }

        await supabase.rpc('increment_bolum_goruntuleme', { bolum_id: bolumKaydi.id })
      }

      setTumBolumler(tumBolumlerData || [])
      setLoading(false)
    }

    fetchData()
  }, [slug, bolum])

  useEffect(() => {
    if (!bolumData?.id || !seriData?.id) return
    if (okumaTakipRef.current === `${seriData.id}:${bolumData.id}`) return

    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user || cancelled) return

        const unlocked = await trackIssueReadAndUnlock({
          userId: session.user.id,
          seriId: seriData.id,
          bolumId: bolumData.id,
          completionRatio: 1,
          readingTimeSec: 20,
        })

        if (!cancelled && unlocked.length > 0) {
          setAcilanUnvanlar(unlocked)
          window.setTimeout(() => {
            setAcilanUnvanlar(current => (current === unlocked ? [] : current))
          }, 5200)
        }

        okumaTakipRef.current = `${seriData.id}:${bolumData.id}`
      } catch (error) {
        console.warn('Okuma unvan takibi atlandi:', error?.message || error)
      }
    }, 18000)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [bolumData?.id, seriData?.id])

  useEffect(() => {
    async function fetchOkumaSayfalari() {
      if (!bolumData?.id) return
      const { data } = await supabase
        .from('site_ayarlari')
        .select('deger')
        .eq('anahtar', 'bolum_okuma_sayfalari')
        .maybeSingle()

      const sayfalar = data?.deger?.[String(bolumData.id)]
      setOkumaSayfalari(Array.isArray(sayfalar) ? sayfalar.filter(Boolean) : [])
    }

    fetchOkumaSayfalari()
  }, [bolumData?.id])

  useEffect(() => {
    setAktifSayfa(1)
    setGorunenSayfaSayisi(INITIAL_VISIBLE_PAGE_COUNT)
    sayfaRefleri.current = []
  }, [bolumData?.id])

  const mevcutSayi = parseInt(bolum)
  const embedUrl = driveEmbedUrl(bolumData?.drive_link)
  const siradakiBolum = tumBolumler.find(item => item.sayi > mevcutSayi)
  const oncekiBolum = [...tumBolumler].reverse().find(item => item.sayi < mevcutSayi)
  const mevcutIndex = tumBolumler.findIndex(item => item.sayi === mevcutSayi)
  const toplamBolum = tumBolumler.length
  const okumaYuzdesi = toplamBolum > 0 && mevcutIndex >= 0 ? ((mevcutIndex + 1) / toplamBolum) * 100 : 0
  const heroBackground = detayAyar?.arka_plan_url || seriData?.hero_gorsel_url || seriData?.arkaplan_url || seriData?.kapak_url || bolumData?.kapak_url || ''
  const heroBackgroundPosition = `${detayAyar?.arka_plan_x ?? 50}% ${detayAyar?.arka_plan_y ?? 50}%`
  const ozelOkuyucuVar = okumaSayfalari.length > 0
  const toplamSayfa = ozelOkuyucuVar ? okumaSayfalari.length : 0
  const gorunenSayfalar = ozelOkuyucuVar ? okumaSayfalari.slice(0, gorunenSayfaSayisi) : []
  const gosterilenAktifSayfa = ozelOkuyucuVar ? aktifSayfa : 1
  const sayfaYuzdesi = toplamSayfa > 0 ? Math.round((gosterilenAktifSayfa / toplamSayfa) * 100) : 0

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowRight' && siradakiBolum?.sayi) router.push(`/oku/${slug}/${siradakiBolum.sayi}`)
    if (e.key === 'ArrowLeft' && oncekiBolum?.sayi) router.push(`/oku/${slug}/${oncekiBolum.sayi}`)
  }, [siradakiBolum, oncekiBolum, slug, router])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (!ozelOkuyucuVar) return

    const hesaplaAktifSayfa = () => {
      const stageNode = stageRef.current
      if (!stageNode) return

      const stageRect = stageNode.getBoundingClientRect()
      const viewportH = window.innerHeight
      const hudAktif = stageRect.top < viewportH - 120 && stageRect.bottom > 140
      setProgressGorunsun(hudAktif)

      const hedefY = viewportH * 0.48
      let enIyiIndex = 0
      let enIyiUzaklik = Number.POSITIVE_INFINITY

      sayfaRefleri.current.forEach((node, index) => {
        if (!node) return
        const rect = node.getBoundingClientRect()
        const merkez = rect.top + rect.height / 2
        const uzaklik = Math.abs(merkez - hedefY)
        if (uzaklik < enIyiUzaklik) {
          enIyiUzaklik = uzaklik
          enIyiIndex = index
        }
      })

      setAktifSayfa(enIyiIndex + 1)
    }

    hesaplaAktifSayfa()
    window.addEventListener('scroll', hesaplaAktifSayfa, { passive: true })
    window.addEventListener('resize', hesaplaAktifSayfa)

    return () => {
      window.removeEventListener('scroll', hesaplaAktifSayfa)
      window.removeEventListener('resize', hesaplaAktifSayfa)
    }
  }, [ozelOkuyucuVar, okumaSayfalari])

  useEffect(() => {
    if (!ozelOkuyucuVar) return
    if (gorunenSayfaSayisi >= okumaSayfalari.length) return
    if (aktifSayfa < Math.max(1, gorunenSayfaSayisi - 2)) return

    setGorunenSayfaSayisi(prev => Math.min(prev + PAGE_BATCH_SIZE, okumaSayfalari.length))
  }, [aktifSayfa, gorunenSayfaSayisi, okumaSayfalari.length, ozelOkuyucuVar])

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', fontFamily: "'DM Sans', sans-serif" }}>Bölüm hazırlanıyor...</div>
        </div>
      </>
    )
  }

  if (!bolumData || !seriData) {
    return (
      <>
        <Navbar />
        <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
          <div style={{ maxWidth: '460px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '48px', color: '#fff', marginBottom: '10px' }}>Bölüm Bulunamadı</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', lineHeight: 1.7, marginBottom: '20px' }}>
              Bu bolum su anda ulasilabilir durumda degil. Seri sayfasina donup diger bolumleri kontrol edebiliriz.
            </div>
            <Link href={`/seri/${slug}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '12px 18px', background: '#fff', color: '#111', borderRadius: '12px', textDecoration: 'none', fontSize: '13px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Seri Sayfasina Don
            </Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />

      <main style={{ background: '#050505', minHeight: '100vh' }}>
        {acilanUnvanlar.length > 0 && (
          <div style={{ position: 'fixed', top: '92px', right: '20px', zIndex: 80, display: 'grid', gap: '10px', maxWidth: 'min(92vw, 360px)' }}>
            {acilanUnvanlar.map((unvan) => (
              <div
                key={`${unvan.unvanId}-${unvan.kod}`}
                style={{
                  borderRadius: '18px',
                  padding: '16px 18px',
                  background: 'rgba(12,12,12,0.92)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 18px 38px rgba(0,0,0,0.28)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Yeni Unvan Acildi
                </div>
                <div style={{ color: '#fff', fontFamily: "'Bebas Neue', sans-serif", fontSize: '34px', lineHeight: 0.95, marginBottom: '8px' }}>
                  {unvan.isim}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.64)', fontSize: '13px', lineHeight: 1.6 }}>
                  {unvan.aciklama || 'Okuma ilerlemen bu unvanin kilidini acti.'}
                </div>
              </div>
            ))}
          </div>
        )}
        <style>{`
          .reader-shell {
            position: relative;
            overflow: hidden;
          }
          .reader-shell::before {
            content: '';
            position: absolute;
            inset: 0;
            background:
              linear-gradient(180deg, rgba(5,5,5,0.22) 0%, rgba(5,5,5,0.9) 100%),
              linear-gradient(90deg, rgba(5,5,5,0.95) 0%, rgba(5,5,5,0.82) 26%, rgba(5,5,5,0.48) 56%, rgba(5,5,5,0.86) 100%);
            z-index: 0;
          }
          .reader-topbar {
            position: sticky;
            top: 72px;
            z-index: 20;
            backdrop-filter: blur(18px);
            background: rgba(10,10,10,0.82);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 18px;
            padding: 14px 16px;
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 14px;
            align-items: center;
            margin-bottom: 22px;
          }
          .reader-title {
            font-family: 'Bebas Neue', sans-serif;
            font-size: clamp(34px, 4vw, 52px);
            line-height: 0.95;
            color: #fff;
            margin-bottom: 6px;
            text-transform: uppercase;
          }
          .reader-topbar-actions {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }
          .reader-mini-stat {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            border-radius: 12px;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.1);
            color: rgba(255,255,255,0.88);
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.4px;
          }
          .reader-frame {
            position: relative;
            z-index: 1;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 28px;
            overflow: hidden;
            background: rgba(18,18,18,0.92);
            box-shadow: 0 28px 80px rgba(0,0,0,0.42);
          }
          .reader-stage {
            padding: 22px;
            background:
              radial-gradient(circle at top, rgba(255,255,255,0.04), transparent 38%),
              linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0));
            position: relative;
          }
          .reader-stage iframe {
            width: 100%;
            height: min(165vh, 2200px);
            border: none;
            border-radius: 18px;
            background: #2c2c2c;
          }
          .reader-pages {
            display: grid;
            gap: 24px;
            padding: 22px 0 10px;
          }
          .reader-load-note {
            width: min(100%, 980px);
            margin: 0 auto;
            padding: 12px 16px;
            border-radius: 16px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            color: rgba(255,255,255,0.62);
            font-size: 12px;
            text-align: center;
          }
          .reader-page {
            width: min(100%, 980px);
            margin: 0 auto;
            padding: 0;
            border-radius: 22px;
            background: transparent;
            border: none;
            box-shadow: none;
            position: relative;
          }
          .reader-page-inner {
            overflow: hidden;
            border-radius: 18px;
            background: transparent;
          }
          .reader-floating-progress {
            position: fixed;
            left: 50%;
            bottom: 20px;
            transform: translateX(-50%);
            z-index: 40;
            pointer-events: none;
            opacity: 0;
            transition: opacity 180ms ease, transform 180ms ease;
          }
          .reader-floating-progress.is-visible {
            opacity: 1;
          }
          .reader-floating-progress-pill {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            min-width: min(92vw, 280px);
            justify-content: center;
            padding: 10px 16px;
            border-radius: 999px;
            background: rgba(10,10,10,0.82);
            border: 1px solid rgba(255,255,255,0.1);
            color: #fff;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.5px;
            backdrop-filter: blur(12px);
            box-shadow: 0 14px 30px rgba(0,0,0,0.24);
          }
          .reader-floating-progress-bar {
            width: clamp(72px, 16vw, 120px);
            height: 4px;
            border-radius: 999px;
            background: rgba(255,255,255,0.14);
            overflow: hidden;
          }
          .reader-floating-progress-bar span {
            display: block;
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(90deg, #ffffff 0%, #8dd6ff 100%);
          }
          .reader-page img {
            display: block;
            width: 100%;
            height: auto;
            border-radius: 18px;
            box-shadow:
              0 24px 48px rgba(0,0,0,0.36),
              0 0 0 1px rgba(255,255,255,0.06);
          }
          .reader-bottom {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            padding: 18px 22px 22px;
            border-top: 1px solid rgba(255,255,255,0.08);
          }
          .reader-nav-card {
            min-height: 88px;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 18px;
            background: rgba(255,255,255,0.03);
            padding: 16px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            text-decoration: none;
          }
          .reader-after {
            display: grid;
            grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
            gap: 24px;
            margin-top: 28px;
          }
          .reader-panel {
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 24px;
            background: rgba(255,255,255,0.03);
            padding: 24px;
          }
          @media (max-width: 920px) {
            .reader-after {
              grid-template-columns: 1fr !important;
            }
            .reader-bottom {
              grid-template-columns: 1fr !important;
            }
          }
          @media (max-width: 700px) {
            .reader-topbar {
              grid-template-columns: 1fr !important;
              top: 66px;
              padding: 12px;
              margin-bottom: 14px;
            }
            .reader-topbar-actions {
              justify-content: flex-start;
            }
            .reader-title {
              font-size: clamp(26px, 10vw, 38px);
              line-height: 0.96;
              margin-bottom: 8px;
            }
            .reader-mini-stat {
              width: 100%;
              justify-content: center;
            }
            .reader-stage {
              padding: 10px 8px 18px;
            }
            .reader-floating-progress {
              left: 12px;
              right: 12px;
              bottom: 12px;
              transform: none;
            }
            .reader-floating-progress-pill {
              width: 100%;
              min-width: 0;
              font-size: 11px;
              padding: 8px 12px;
            }
            .reader-floating-progress-bar {
              width: 74px;
            }
            .reader-stage iframe {
              height: 125vh;
              border-radius: 12px;
            }
            .reader-page {
              width: 100%;
              border-radius: 12px;
            }
            .reader-page-inner {
              border-radius: 12px;
            }
            .reader-page img {
              border-radius: 12px;
            }
          }
        `}</style>

        <section className="reader-shell">
          {heroBackground && (
            <img
              src={heroBackground}
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: heroBackgroundPosition,
                opacity: 0.1,
              }}
            />
          )}

          <div className="site-shell" style={{ position: 'relative', zIndex: 1, paddingTop: '28px', paddingBottom: '56px' }}>
            <div className="reader-topbar">
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <Link href={`/seri/${slug}`} style={{ color: 'rgba(255,255,255,0.58)', textDecoration: 'none', fontSize: '13px' }}>
                    ← Seri Detayina Don
                  </Link>
                  {seriData.kategoriler?.isim && (
                    <span style={{ padding: '5px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {seriData.kategoriler.isim}
                    </span>
                  )}
                </div>
                <div className="reader-title">
                  {seriData.baslik}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '14px', lineHeight: 1.6 }}>
                  #{bolumData.sayi} {bolumData.baslik}
                  {bolumData.created_at && ` • ${tarih(bolumData.created_at)}`}
                </div>
              </div>

              <div className="reader-topbar-actions">
                <div style={{ minWidth: '180px' }}>
                  <select value={bolum} onChange={e => router.push(`/oku/${slug}/${e.target.value}`)} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: '12px', padding: '11px 14px', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer' }}>
                    {tumBolumler.map(item => (
                      <option key={item.sayi} value={item.sayi} style={{ background: '#111' }}>
                        #{item.sayi} - {item.baslik}
                      </option>
                    ))}
                  </select>
                </div>
                {bolumData.indirme_link && (
                  <a href={bolumData.indirme_link} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '11px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}>
                    Indir
                  </a>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <div style={{ width: '100%', height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ width: `${okumaYuzdesi}%`, height: '100%', background: 'linear-gradient(90deg, #ffffff 0%, #8dd6ff 100%)' }} />
              </div>
            </div>

            <div className="reader-frame">
              {ozelOkuyucuVar ? (
                <div className="reader-stage" ref={stageRef}>
                  <div className="reader-pages">
                    {gorunenSayfalar.map((sayfaUrl, index) => (
                      <div
                        key={`${sayfaUrl}-${index}`}
                        className="reader-page"
                        ref={(node) => { sayfaRefleri.current[index] = node }}
                        data-page-index={index}
                      >
                        <div className="reader-page-inner">
                          <img
                            src={sayfaUrl}
                            alt={`${bolumData.baslik} sayfa ${index + 1}`}
                            loading={index < 2 ? 'eager' : 'lazy'}
                            decoding="async"
                            fetchPriority={index === 0 ? 'high' : 'auto'}
                          />
                        </div>
                      </div>
                    ))}
                    {gorunenSayfaSayisi < okumaSayfalari.length && (
                      <div className="reader-load-note">
                        Sonraki sayfalar ilerledikçe otomatik yüklenir. Şu an {gorunenSayfaSayisi} / {okumaSayfalari.length} sayfa hazır.
                      </div>
                    )}
                  </div>
                </div>
              ) : embedUrl && !iframeHata ? (
                <div className="reader-stage">
                  <iframe
                    src={embedUrl}
                    allow="autoplay"
                    title={bolumData.baslik}
                    onError={() => setIframeHata(true)}
                  />
                </div>
              ) : (
                <div style={{ padding: '70px 24px', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '52px', color: '#fff', marginBottom: '10px' }}>
                    Icerik Hazir Degil
                  </div>
                  <div style={{ maxWidth: '540px', margin: '0 auto 20px', color: 'rgba(255,255,255,0.6)', fontSize: '15px', lineHeight: 1.7 }}>
                    {bolumData.drive_link
                      ? 'Bu bolumun goruntuleyicisi simdilik acilamadi. Istersen indirme baglantisiyla veya Drive uzerinden devam edebiliriz.'
                      : 'Bu bolum icin henuz sayfa gorselleri ya da okuyucu icerigi eklenmemis.'}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {bolumData.indirme_link && (
                      <a href={bolumData.indirme_link} target="_blank" rel="noreferrer" style={{ padding: '12px 18px', background: '#fff', color: '#111', borderRadius: '12px', textDecoration: 'none', fontSize: '13px', fontWeight: 800 }}>
                        Indir
                      </a>
                    )}
                    {bolumData.drive_link && (
                      <a href={bolumData.drive_link} target="_blank" rel="noreferrer" style={{ padding: '12px 18px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: '12px', textDecoration: 'none', fontSize: '13px', fontWeight: 800 }}>
                        Drive&apos;da Ac
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="reader-bottom">
                {oncekiBolum ? (
                  <Link href={`/oku/${slug}/${oncekiBolum.sayi}`} className="reader-nav-card">
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.44)', textTransform: 'uppercase', letterSpacing: '1px' }}>Onceki Bolum</div>
                    <div>
                      <div style={{ fontSize: '17px', color: '#fff', fontWeight: 700, marginBottom: '4px' }}>#{oncekiBolum.sayi}</div>
                      <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.74)' }}>{oncekiBolum.baslik}</div>
                    </div>
                  </Link>
                ) : (
                  <div className="reader-nav-card" style={{ opacity: 0.45 }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.44)', textTransform: 'uppercase', letterSpacing: '1px' }}>Onceki Bolum</div>
                    <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.52)' }}>Bu serinin ilk bolumundesin.</div>
                  </div>
                )}

                <div className="reader-nav-card" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '36px', color: '#fff', marginBottom: '8px' }}>
                    Bolum Sonu
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: 1.6, maxWidth: '28ch' }}>
                    Okumaya seri detayindan veya bir sonraki bolumden devam edebilirsin.
                  </div>
                </div>

                {siradakiBolum ? (
                  <Link href={`/oku/${slug}/${siradakiBolum.sayi}`} className="reader-nav-card">
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.44)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Sonraki Bolum</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '17px', color: '#fff', fontWeight: 700, marginBottom: '4px' }}>#{siradakiBolum.sayi}</div>
                      <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.74)' }}>{siradakiBolum.baslik}</div>
                    </div>
                  </Link>
                ) : (
                  <div className="reader-nav-card" style={{ opacity: 0.45 }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.44)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Sonraki Bolum</div>
                    <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.52)', textAlign: 'right' }}>Su an son bolumdesin.</div>
                  </div>
                )}
              </div>
            </div>

            {ozelOkuyucuVar && (
              <div className={`reader-floating-progress ${progressGorunsun ? 'is-visible' : ''}`} aria-hidden="true">
                <div className="reader-floating-progress-pill">
                  <span>Sayfa {gosterilenAktifSayfa} / {toplamSayfa}</span>
                  <div className="reader-floating-progress-bar">
                    <span style={{ width: `${sayfaYuzdesi}%` }} />
                  </div>
                  <span>%{sayfaYuzdesi}</span>
                </div>
              </div>
            )}

            <section className="reader-after">
              <div className="reader-panel">
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '44px', color: '#fff', marginBottom: '12px', lineHeight: 0.95 }}>
                  Yorumlar
                </div>
                <div style={{ color: 'rgba(255,255,255,0.58)', fontSize: '14px', lineHeight: 1.7, marginBottom: '20px' }}>
                  Bolumu bitirdikten sonra yorumlari burada okumak daha dogal hissettiriyor. Okurlar bu alanda bolumu tartisabilir.
                </div>
                <YorumSistemi bolumId={bolumData.id} seriId={bolumData.seri_id} />
              </div>

              <aside style={{ display: 'grid', gap: '18px' }}>
                <div className="reader-panel">
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.42)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>
                    Seri
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '82px minmax(0, 1fr)', gap: '14px', alignItems: 'center' }}>
                    <div style={{ width: '82px', aspectRatio: '2 / 3', borderRadius: '12px', overflow: 'hidden', background: '#111' }}>
                      {seriData.kapak_url && <img src={seriData.kapak_url} alt={seriData.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '20px', color: '#fff', fontWeight: 700, lineHeight: 1.2, marginBottom: '6px' }}>{seriData.baslik}</div>
                      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', marginBottom: '12px' }}>{toplamBolum} bolum</div>
                      <Link href={`/seri/${slug}`} style={{ color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}>
                        Seri detayina git →
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="reader-panel">
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.42)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>
                    Bolum Bilgisi
                  </div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Baslik</div>
                      <div style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>#{bolumData.sayi} {bolumData.baslik}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Tarih</div>
                      <div style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>{tarih(bolumData.created_at) || 'Belirtilmemis'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Okuma Konumu</div>
                      <div style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>{mevcutIndex >= 0 ? mevcutIndex + 1 : 1} / {toplamBolum || 1}</div>
                    </div>
                  </div>
                </div>
              </aside>
            </section>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
