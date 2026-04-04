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

function getYayilimSayfalari(pageNumber, spreadMode, sayfalar, toplamSayfa) {
  if (!sayfalar.length || !toplamSayfa) return []

  const guvenliSayfa = Math.max(1, Math.min(toplamSayfa, pageNumber))

  if (!spreadMode) {
    const url = sayfalar[guvenliSayfa - 1]
    return url ? [{ number: guvenliSayfa, url }] : []
  }

  const baslangic = guvenliSayfa <= 1 ? 1 : (guvenliSayfa % 2 === 0 ? guvenliSayfa : guvenliSayfa - 1)

  if (baslangic === 1) {
    return sayfalar[0] ? [{ number: 1, url: sayfalar[0] }] : []
  }

  return [baslangic, baslangic + 1]
    .filter((number) => number <= toplamSayfa)
    .map((number) => ({ number, url: sayfalar[number - 1] }))
}

function preloadReaderImages(urls) {
  return Promise.all(
    urls
      .filter(Boolean)
      .map((src) => new Promise((resolve) => {
        const img = new window.Image()
        img.decoding = 'async'
        img.onload = () => resolve(src)
        img.onerror = () => resolve(src)
        img.src = src
        if (img.complete) resolve(src)
      }))
  )
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
  const [okumaModu, setOkumaModu] = useState('scroll')
  const [ciftSayfaAktif, setCiftSayfaAktif] = useState(false)
  const [tamEkranAktif, setTamEkranAktif] = useState(false)
  const [flipGecisi, setFlipGecisi] = useState(null)
  const [gorunenSayfaSayisi, setGorunenSayfaSayisi] = useState(INITIAL_VISIBLE_PAGE_COUNT)
  const sayfaRefleri = useRef([])
  const stageRef = useRef(null)
  const readerFrameRef = useRef(null)
  const okumaTakipRef = useRef(null)
  const dokunusBaslangicXRef = useRef(null)
  const dokunusBaslangicYRef = useRef(null)
  const flipGecisZamanlayiciRef = useRef(null)
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
    setOkumaModu('scroll')
    setFlipGecisi(null)
    setGorunenSayfaSayisi(INITIAL_VISIBLE_PAGE_COUNT)
    sayfaRefleri.current = []
  }, [bolumData?.id])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setTamEkranAktif(Boolean(document.fullscreenElement))
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    handleFullscreenChange()

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      if (flipGecisZamanlayiciRef.current) {
        window.clearTimeout(flipGecisZamanlayiciRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const medya = window.matchMedia('(min-width: 980px)')
    const guncelle = () => setCiftSayfaAktif(medya.matches)

    guncelle()
    medya.addEventListener('change', guncelle)

    return () => {
      medya.removeEventListener('change', guncelle)
    }
  }, [])

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
  const aktifSayfaIndex = Math.max(0, Math.min(Math.max(toplamSayfa, 1) - 1, aktifSayfa - 1))
  const aktifSayfaUrl = ozelOkuyucuVar ? okumaSayfalari[aktifSayfaIndex] : null
  const masaustuCizgiRomanModu = okumaModu === 'flip' && ciftSayfaAktif
  const aktifYayilimSayfalari = getYayilimSayfalari(aktifSayfa, masaustuCizgiRomanModu, okumaSayfalari, toplamSayfa)
  const aktifYayilimBaslangici = aktifYayilimSayfalari[0]?.number || 1
  const gosterilenFlipSayfalari = flipGecisi?.hedefSayfalar || aktifYayilimSayfalari
  const aktifYayilimEtiketi = masaustuCizgiRomanModu
    ? (gosterilenFlipSayfalari.length > 1
      ? `${gosterilenFlipSayfalari[0].number}-${gosterilenFlipSayfalari[gosterilenFlipSayfalari.length - 1].number}`
      : `${gosterilenFlipSayfalari[0]?.number || 1}`)
    : `${aktifSayfa}`
  const gosterilenAktifSayfa = ozelOkuyucuVar ? aktifSayfa : 1
  const sayfaYuzdesi = toplamSayfa > 0 ? Math.round((gosterilenAktifSayfa / toplamSayfa) * 100) : 0

  function flipSayfaGuncelle(yeniSayfa) {
    if (!toplamSayfa) return
    setAktifSayfa(Math.max(1, Math.min(toplamSayfa, yeniSayfa)))
  }

  async function flipGecisiBaslat(direction, hedefSayfa) {
    if (!ozelOkuyucuVar) return

    if (flipGecisZamanlayiciRef.current) {
      window.clearTimeout(flipGecisZamanlayiciRef.current)
    }

    const hedefSayfalar = getYayilimSayfalari(hedefSayfa, masaustuCizgiRomanModu, okumaSayfalari, toplamSayfa)
    const cevrilenSayfa = direction === 'next'
      ? aktifYayilimSayfalari[aktifYayilimSayfalari.length - 1]
      : aktifYayilimSayfalari[0]

    if (!cevrilenSayfa) {
      flipSayfaGuncelle(hedefSayfa)
      return
    }

    await preloadReaderImages(hedefSayfalar.map((item) => item.url))

    setFlipGecisi({
      direction,
      cevrilenSayfa,
      hedefSayfalar,
      ciftSayfa: masaustuCizgiRomanModu && aktifYayilimSayfalari.length > 1,
    })

    flipGecisZamanlayiciRef.current = window.setTimeout(() => {
      setFlipGecisi(null)
      flipSayfaGuncelle(hedefSayfa)
    }, 420)
  }

  function sonrakiSayfayaGit() {
    if (!ozelOkuyucuVar || flipGecisi) return
    if (masaustuCizgiRomanModu) {
      const sonrakiYayilim = aktifYayilimBaslangici === 1 ? 2 : aktifYayilimBaslangici + 2
      if (sonrakiYayilim <= toplamSayfa) {
        flipGecisiBaslat('next', sonrakiYayilim)
        return
      }
    } else if (aktifSayfa < toplamSayfa) {
      flipGecisiBaslat('next', aktifSayfa + 1)
      return
    }
    if (siradakiBolum?.sayi) router.push(`/oku/${slug}/${siradakiBolum.sayi}`)
  }

  function oncekiSayfayaGit() {
    if (!ozelOkuyucuVar || flipGecisi) return
    if (masaustuCizgiRomanModu) {
      if (aktifYayilimBaslangici > 1) {
        flipGecisiBaslat('prev', aktifYayilimBaslangici <= 2 ? 1 : aktifYayilimBaslangici - 2)
        return
      }
    } else if (aktifSayfa > 1) {
      flipGecisiBaslat('prev', aktifSayfa - 1)
      return
    }
    if (oncekiBolum?.sayi) router.push(`/oku/${slug}/${oncekiBolum.sayi}`)
  }

  async function toggleTamEkran() {
    const hedef = readerFrameRef.current
    if (!hedef) return

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await hedef.requestFullscreen()
      }
    } catch (error) {
      console.warn('Tam ekran modu acilamadi:', error?.message || error)
    }
  }

  function handleFlipTouchStart(e) {
    const touch = e.touches?.[0]
    if (!touch) return
    dokunusBaslangicXRef.current = touch.clientX
    dokunusBaslangicYRef.current = touch.clientY
  }

  function handleFlipTouchEnd(e) {
    const startX = dokunusBaslangicXRef.current
    const startY = dokunusBaslangicYRef.current
    const touch = e.changedTouches?.[0]

    dokunusBaslangicXRef.current = null
    dokunusBaslangicYRef.current = null

    if (startX == null || startY == null || !touch) return

    const deltaX = touch.clientX - startX
    const deltaY = touch.clientY - startY

    if (Math.abs(deltaX) < 36 || Math.abs(deltaX) <= Math.abs(deltaY)) return

    if (deltaX < 0) sonrakiSayfayaGit()
    else oncekiSayfayaGit()
  }

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowRight') {
      if (okumaModu === 'flip' && ozelOkuyucuVar) sonrakiSayfayaGit()
      else if (siradakiBolum?.sayi) router.push(`/oku/${slug}/${siradakiBolum.sayi}`)
    }
    if (e.key === 'ArrowLeft') {
      if (okumaModu === 'flip' && ozelOkuyucuVar) oncekiSayfayaGit()
      else if (oncekiBolum?.sayi) router.push(`/oku/${slug}/${oncekiBolum.sayi}`)
    }
  }, [okumaModu, ozelOkuyucuVar, masaustuCizgiRomanModu, flipGecisi, aktifSayfa, aktifYayilimBaslangici, toplamSayfa, siradakiBolum, oncekiBolum, slug, router])

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

  useEffect(() => {
    if (!ozelOkuyucuVar || okumaModu !== 'flip') return

    const preloadKaynaklari = masaustuCizgiRomanModu
      ? [
          ...aktifYayilimSayfalari.map(item => item.url),
          ...getYayilimSayfalari(aktifYayilimBaslangici === 1 ? 2 : aktifYayilimBaslangici + 2, true, okumaSayfalari, toplamSayfa).map(item => item.url),
          ...getYayilimSayfalari(aktifYayilimBaslangici <= 2 ? 1 : aktifYayilimBaslangici - 2, true, okumaSayfalari, toplamSayfa).map(item => item.url),
        ]
      : [aktifSayfaUrl, okumaSayfalari[aktifSayfaIndex + 1], okumaSayfalari[aktifSayfaIndex - 1]]

    ;preloadKaynaklari
      .filter(Boolean)
      .forEach((src) => {
        const img = new window.Image()
        img.decoding = 'async'
        img.src = src
      })
  }, [okumaModu, ozelOkuyucuVar, masaustuCizgiRomanModu, aktifSayfaIndex, aktifSayfaUrl, aktifYayilimBaslangici, aktifYayilimSayfalari, okumaSayfalari, toplamSayfa])

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
          .reader-mode-toggle {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px;
            border-radius: 14px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
          }
          .reader-mode-toggle button {
            min-height: 36px;
            padding: 0 14px;
            border-radius: 10px;
            border: none;
            background: transparent;
            color: rgba(255,255,255,0.58);
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            cursor: pointer;
            font-family: inherit;
            transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
          }
          .reader-mode-toggle button.is-active {
            background: #fff;
            color: #111;
          }
          .reader-flip-shell {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            gap: 14px;
            align-items: center;
            padding: 12px 0 6px;
          }
          .reader-flip-nav {
            width: 54px;
            height: 54px;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.06);
            color: #fff;
            font-size: 22px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.18s ease, background 0.18s ease, opacity 0.18s ease;
          }
          .reader-flip-nav:hover:not(:disabled) {
            transform: translateY(-1px);
            background: rgba(255,255,255,0.1);
          }
          .reader-flip-nav:disabled {
            opacity: 0.35;
            cursor: not-allowed;
          }
          .reader-flip-stage {
            width: min(100%, 1180px);
            margin: 0 auto;
            padding: 22px;
            border-radius: 28px;
            perspective: 2200px;
            background:
              linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)),
              radial-gradient(circle at top, rgba(255,255,255,0.04), transparent 42%);
            border: 1px solid rgba(255,255,255,0.08);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
          }
          .reader-flip-book {
            position: relative;
            padding: 18px;
            border-radius: 22px;
            background:
              linear-gradient(180deg, rgba(18,18,18,0.96), rgba(8,8,8,0.98)),
              radial-gradient(circle at top, rgba(255,255,255,0.05), transparent 48%);
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.04),
              0 28px 60px rgba(0,0,0,0.32);
          }
          .reader-flip-book.is-spread::before {
            content: '';
            position: absolute;
            top: 20px;
            bottom: 20px;
            left: 50%;
            width: 22px;
            transform: translateX(-50%);
            border-radius: 999px;
            background:
              linear-gradient(90deg, rgba(0,0,0,0.65), rgba(255,255,255,0.08), rgba(0,0,0,0.65));
            opacity: 0.65;
            pointer-events: none;
            z-index: 2;
          }
          .reader-flip-spread {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
            align-items: stretch;
          }
          .reader-flip-spread.is-single {
            grid-template-columns: minmax(0, 1fr);
            justify-items: center;
          }
          .reader-flip-turn-layer {
            position: absolute;
            inset: 18px;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
            pointer-events: none;
            z-index: 4;
          }
          .reader-flip-turn-layer.is-single {
            grid-template-columns: minmax(0, 1fr);
          }
          .reader-flip-turn-layer.is-next .reader-flip-turn-sheet {
            grid-column: 2 / 3;
            transform-origin: left center;
            animation: readerPaperTurnNext 420ms cubic-bezier(0.22, 0.8, 0.24, 1) forwards;
          }
          .reader-flip-turn-layer.is-prev .reader-flip-turn-sheet {
            grid-column: 1 / 2;
            transform-origin: right center;
            animation: readerPaperTurnPrev 420ms cubic-bezier(0.22, 0.8, 0.24, 1) forwards;
          }
          .reader-flip-turn-layer.is-single .reader-flip-turn-sheet {
            grid-column: 1 / -1;
          }
          .reader-flip-turn-layer.is-single.is-next .reader-flip-turn-sheet {
            transform-origin: right center;
          }
          .reader-flip-turn-layer.is-single.is-prev .reader-flip-turn-sheet {
            transform-origin: left center;
          }
          .reader-flip-page {
            position: relative;
            overflow: hidden;
            border-radius: 18px;
            transform-style: preserve-3d;
            backface-visibility: hidden;
            background:
              linear-gradient(180deg, rgba(246,241,232,0.98), rgba(223,216,204,0.98)),
              linear-gradient(180deg, rgba(14,14,14,0.9), rgba(6,6,6,0.98));
            box-shadow:
              0 28px 54px rgba(0,0,0,0.34),
              inset 0 0 0 1px rgba(255,255,255,0.04);
          }
          .reader-flip-page.is-left {
            transform-origin: right center;
          }
          .reader-flip-page.is-right {
            transform-origin: left center;
          }
          .reader-flip-page.is-cover {
            width: min(100%, 560px);
          }
          .reader-flip-page::after {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            right: 0;
            width: 18px;
            background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.1));
            opacity: 0.42;
            pointer-events: none;
          }
          .reader-flip-page::after,
          .reader-flip-page::before {
            transition: opacity 220ms ease;
          }
          .reader-flip-page.is-left::before,
          .reader-flip-page.is-right::before {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            width: 28px;
            pointer-events: none;
            z-index: 1;
          }
          .reader-flip-page.is-left::before {
            right: 0;
            background: linear-gradient(90deg, transparent, rgba(0,0,0,0.18));
          }
          .reader-flip-page.is-right::before {
            left: 0;
            background: linear-gradient(90deg, rgba(0,0,0,0.18), transparent);
          }
          .reader-flip-page img {
            display: block;
            width: 100%;
            height: auto;
          }
          .reader-flip-turn-sheet {
            position: relative;
            overflow: hidden;
            border-radius: 18px;
            background: transparent;
            box-shadow:
              0 34px 64px rgba(0,0,0,0.4),
              inset 0 0 0 1px rgba(255,255,255,0.05);
            transform-style: preserve-3d;
            backface-visibility: hidden;
          }
          .reader-flip-turn-sheet::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(90deg, rgba(0,0,0,0.18), transparent 28%, transparent 72%, rgba(0,0,0,0.16));
            opacity: 0.7;
            z-index: 2;
            pointer-events: none;
          }
          .reader-flip-turn-sheet img {
            display: block;
            width: 100%;
            height: auto;
          }
          .reader-flip-turn-back {
            position: absolute;
            inset: 0;
            transform: rotateY(180deg);
            backface-visibility: hidden;
            overflow: hidden;
            background:
              linear-gradient(180deg, rgba(245,239,228,0.72), rgba(225,216,200,0.66)),
              radial-gradient(circle at top, rgba(255,255,255,0.26), transparent 58%);
            opacity: 0.82;
          }
          .reader-flip-turn-back::after {
            content: '';
            position: absolute;
            inset: 0;
            background:
              linear-gradient(90deg, rgba(0,0,0,0.22), transparent 20%, transparent 80%, rgba(0,0,0,0.16)),
              linear-gradient(180deg, rgba(255,255,255,0.18), transparent 28%, transparent 72%, rgba(0,0,0,0.08));
            pointer-events: none;
          }
          .reader-flip-turn-back img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0.08;
            filter: grayscale(1) sepia(0.25) brightness(1.08);
            transform: scaleX(-1);
          }
          .reader-flip-page-number {
            position: absolute;
            bottom: 12px;
            right: 14px;
            z-index: 2;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 38px;
            height: 26px;
            padding: 0 10px;
            border-radius: 999px;
            background: rgba(8,8,8,0.66);
            color: rgba(255,255,255,0.88);
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.8px;
          }
          .reader-flip-caption {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-top: 14px;
            color: rgba(255,255,255,0.62);
            font-size: 12px;
          }
          .reader-flip-fullscreen {
            min-height: 36px;
            padding: 0 14px;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.06);
            color: #fff;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            cursor: pointer;
            font-family: inherit;
          }
          .reader-flip-mobile-controls {
            display: none;
            gap: 10px;
            margin-top: 14px;
          }
          .reader-flip-mobile-controls button {
            flex: 1;
            min-height: 44px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.06);
            color: #fff;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            font-family: inherit;
            cursor: pointer;
          }
          .reader-flip-mobile-controls button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
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
          @keyframes readerPaperTurnNext {
            0% {
              transform: rotateY(0deg);
              box-shadow:
                0 36px 64px rgba(0,0,0,0.4),
                inset 0 0 0 1px rgba(255,255,255,0.05);
            }
            55% {
              transform: rotateY(-92deg);
            }
            100% {
              transform: rotateY(-176deg);
              box-shadow:
                0 14px 26px rgba(0,0,0,0.16),
                inset 0 0 0 1px rgba(255,255,255,0.04);
            }
          }
          @keyframes readerPaperTurnPrev {
            0% {
              transform: rotateY(0deg);
              box-shadow:
                0 36px 64px rgba(0,0,0,0.4),
                inset 0 0 0 1px rgba(255,255,255,0.05);
            }
            55% {
              transform: rotateY(92deg);
            }
            100% {
              transform: rotateY(176deg);
              box-shadow:
                0 14px 26px rgba(0,0,0,0.16),
                inset 0 0 0 1px rgba(255,255,255,0.04);
            }
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
            .reader-mode-toggle {
              width: 100%;
              justify-content: space-between;
            }
            .reader-mode-toggle button {
              flex: 1;
            }
            .reader-stage {
              padding: 10px 8px 18px;
            }
            .reader-flip-shell {
              grid-template-columns: 1fr;
            }
            .reader-flip-nav {
              display: none;
            }
            .reader-flip-stage {
              padding: 10px;
              border-radius: 16px;
            }
            .reader-flip-book {
              padding: 10px;
            }
            .reader-flip-book.is-spread::before {
              display: none;
            }
            .reader-flip-spread {
              grid-template-columns: 1fr;
              gap: 10px;
            }
            .reader-flip-turn-layer {
              display: none;
            }
            .reader-flip-page.is-cover {
              width: 100%;
            }
            .reader-flip-caption {
              flex-direction: column;
              align-items: flex-start;
            }
            .reader-flip-mobile-controls {
              display: flex;
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
                {ozelOkuyucuVar && (
                  <div className="reader-mode-toggle">
                    <button type="button" className={okumaModu === 'scroll' ? 'is-active' : ''} onClick={() => setOkumaModu('scroll')}>
                      Dikey Oku
                    </button>
                    <button type="button" className={okumaModu === 'flip' ? 'is-active' : ''} onClick={() => setOkumaModu('flip')}>
                      Sayfa Çevir
                    </button>
                  </div>
                )}
                {ozelOkuyucuVar && okumaModu === 'flip' && (
                  <button type="button" className="reader-flip-fullscreen" onClick={toggleTamEkran}>
                    {tamEkranAktif ? 'Tam Ekrandan Çık' : 'Tam Ekran'}
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <div style={{ width: '100%', height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ width: `${okumaYuzdesi}%`, height: '100%', background: 'linear-gradient(90deg, #ffffff 0%, #8dd6ff 100%)' }} />
              </div>
            </div>

            <div className="reader-frame" ref={readerFrameRef}>
              {ozelOkuyucuVar ? (
                okumaModu === 'flip' ? (
                  <div className="reader-stage">
                    <div className="reader-flip-shell">
                      <button
                        type="button"
                        className="reader-flip-nav"
                        onClick={oncekiSayfayaGit}
                        disabled={aktifSayfa === 1 && !oncekiBolum}
                        aria-label="Önceki sayfa"
                      >
                        ←
                      </button>
                      <div className="reader-flip-stage">
                        <div
                          className={`reader-flip-book ${masaustuCizgiRomanModu && gosterilenFlipSayfalari.length > 1 ? 'is-spread' : ''}`}
                          onTouchStart={handleFlipTouchStart}
                          onTouchEnd={handleFlipTouchEnd}
                        >
                          <div className={`reader-flip-spread ${gosterilenFlipSayfalari.length === 1 ? 'is-single' : ''}`}>
                            {gosterilenFlipSayfalari.map((sayfa, index) => (
                              <div
                                key={`${sayfa.url}-${sayfa.number}`}
                                className={`reader-flip-page ${gosterilenFlipSayfalari.length === 1 ? 'is-cover' : index === 0 ? 'is-left' : 'is-right'}`}
                              >
                                <img
                                  src={sayfa.url}
                                  alt={`${bolumData.baslik} sayfa ${sayfa.number}`}
                                  loading="eager"
                                  decoding="async"
                                  fetchPriority={index === 0 ? 'high' : 'auto'}
                                />
                                <span className="reader-flip-page-number">{sayfa.number}</span>
                              </div>
                            ))}
                          </div>
                          {flipGecisi && (
                            <div
                              className={`reader-flip-turn-layer is-${flipGecisi.direction} ${flipGecisi.cevrilenSayfa && flipGecisi.ciftSayfa ? '' : 'is-single'}`}
                            >
                              <div className="reader-flip-turn-sheet">
                                <img
                                  src={flipGecisi.cevrilenSayfa.url}
                                  alt={`${bolumData.baslik} sayfa ${flipGecisi.cevrilenSayfa.number}`}
                                  loading="eager"
                                  decoding="async"
                                  fetchPriority="high"
                                />
                                <div className="reader-flip-turn-back">
                                  <img
                                    src={flipGecisi.cevrilenSayfa.url}
                                    alt=""
                                    aria-hidden="true"
                                  />
                                </div>
                                <span className="reader-flip-page-number">{flipGecisi.cevrilenSayfa.number}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="reader-flip-caption">
                          <span>Sayfa {aktifYayilimEtiketi} / {toplamSayfa}</span>
                          <span>{masaustuCizgiRomanModu ? 'Çift sayfa spread görünümü aktif.' : 'Oklarla, kaydırarak veya butonlarla gezebilirsin.'}</span>
                        </div>
                        <div className="reader-flip-mobile-controls">
                          <button
                            type="button"
                            onClick={oncekiSayfayaGit}
                            disabled={aktifSayfa === 1 && !oncekiBolum}
                          >
                            Önceki
                          </button>
                          <button
                            type="button"
                            onClick={sonrakiSayfayaGit}
                            disabled={aktifSayfa === toplamSayfa && !siradakiBolum}
                          >
                            Sonraki
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="reader-flip-nav"
                        onClick={sonrakiSayfayaGit}
                        disabled={aktifSayfa === toplamSayfa && !siradakiBolum}
                        aria-label="Sonraki sayfa"
                      >
                        →
                      </button>
                    </div>
                  </div>
                ) : (
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
                )
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

            {ozelOkuyucuVar && okumaModu === 'scroll' && (
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
