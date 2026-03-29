'use client'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { getPublicProfileByUsername } from '../../lib/publicProfiles'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import TakipButonu from '../../components/TakipButonu'
import Link from 'next/link'

const ROL_RENK = {
  okuyucu: { bg: '#f0f0f0', text: '#555' },
  cevirmeni: { bg: '#dbeafe', text: '#1e40af' },
  grafik: { bg: '#fce7f3', text: '#9d174d' },
  editor: { bg: '#d1fae5', text: '#065f46' },
  moderator: { bg: '#fef3c7', text: '#92400e' },
  admin: { bg: '#fee2e2', text: '#991b1b' },
  yonetici: { bg: '#ede9fe', text: '#5b21b6' },
}

const LISTE_ETIKET = {
  okunuyor: '📖 Okunuyor',
  okundu: '✅ Okundu',
  okumak_istiyorum: '🔖 Okuyacaklar',
  birakildí: '⏸ Bırakıldı',
}

const DEFAULT_VITRIN_AYARLARI = {
  show_featured_series: true,
  show_reading_shelf: true,
  show_reading_okunuyor: true,
  show_reading_okundu: true,
  show_reading_okuyacak: true,
  show_comments: true,
  show_stats: true,
  show_stats_okundu: true,
  show_stats_takip: true,
  show_stats_takipci: true,
}

function formatRol(rol) {
  if (!rol) return 'Okuyucu'
  return String(rol)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function parseBannerMeta(url) {
  if (!url) return { src: '', x: 50, y: 50, z: 1.12 }
  const [src, hash = ''] = String(url).split('#')
  const params = new URLSearchParams(hash)
  const x = Number(params.get('x'))
  const y = Number(params.get('y'))
  const z = Number(params.get('z'))
  return {
    src,
    x: Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : 50,
    y: Number.isFinite(y) ? Math.max(0, Math.min(100, y)) : 50,
    z: Number.isFinite(z) ? Math.max(1, Math.min(2.5, z)) : 1.12,
  }
}

function normalizeVitrinAyarlari(value) {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return Object.fromEntries(
    Object.entries(DEFAULT_VITRIN_AYARLARI).map(([key, fallback]) => [key, typeof raw[key] === 'boolean' ? raw[key] : fallback])
  )
}

export default function ProfilSayfasi() {
  const { kullaniciAdi } = useParams()
  const [profil, setProfil] = useState(null)
  const [rozetler, setRozetler] = useState([])
  const [unvanlar, setUnvanlar] = useState([])
  const [okumalistesi, setOkumaListesi] = useState([])
  const [oneCikanSeriler, setOneCikanSeriler] = useState([])
  const [yorumlar, setYorumlar] = useState([])
  const [benimProfil, setBenimProfil] = useState(false)
  const [loading, setLoading] = useState(true)
  const [aktifSekme, setAktifSekme] = useState('liste')

  useEffect(() => {
    async function fetchData() {
      const [profilRes, sessionRes] = await Promise.all([
        getPublicProfileByUsername(kullaniciAdi),
        supabase.auth.getSession()
      ])

      if (!profilRes.data) { setLoading(false); return }
      setProfil(profilRes.data)

      const benimId = sessionRes.data.session?.user?.id
      setBenimProfil(benimId === profilRes.data.id)

      const oneCikanSeriIds = Array.isArray(profilRes.data.one_cikan_seri_ids) ? profilRes.data.one_cikan_seri_ids.filter(Boolean) : []
      const [rozetRes, unvanRes, listeRes, yorumRes, oneCikanRes] = await Promise.all([
        supabase.from('kullanici_rozetleri').select('*, rozet_tanimlari(*)').eq('kullanici_id', profilRes.data.id).order('kazanildi_at'),
        supabase.from('kullanici_unvanlari').select('*, unvan_tanimlari(*)').eq('kullanici_id', profilRes.data.id).order('acildi_at', { ascending: false }),
        benimId === profilRes.data.id
          ? supabase.from('okuma_listesi').select('*, seriler(id, baslik, slug, kapak_url, kategori)').eq('kullanici_id', profilRes.data.id).order('updated_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        supabase
          .from('yorumlar')
          .select('id, icerik, spoiler, created_at, seri_id, seriler(id, baslik, slug, kapak_url)')
          .eq('kullanici_id', profilRes.data.id)
          .eq('silindi', false)
          .order('created_at', { ascending: false })
          .limit(6),
        oneCikanSeriIds.length > 0
          ? supabase.from('seriler').select('id, baslik, slug, kapak_url, kategori').in('id', oneCikanSeriIds)
          : Promise.resolve({ data: [] }),
      ])

      setRozetler(rozetRes.data || [])
      setUnvanlar(unvanRes.data || [])
      setOkumaListesi(listeRes.data || [])
      setYorumlar(yorumRes.data || [])
      setOneCikanSeriler(
        oneCikanSeriIds
          .map(id => (oneCikanRes.data || []).find(seri => String(seri.id) === String(id)))
          .filter(Boolean)
      )
      setLoading(false)
    }
    fetchData()
  }, [kullaniciAdi])

  if (loading) return <><Navbar /><div style={{ padding: '80px 24px', color: 'var(--text-muted)' }}>Yükleniyor...</div></>

  if (!profil) return (
    <>
      <Navbar />
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
        <div style={{ fontSize: '16px', color: 'var(--text-muted)' }}>Kullanıcı bulunamadı.</div>
        <Link href="/" style={{ display: 'inline-block', marginTop: '16px', color: 'var(--text)', fontWeight: 500, textDecoration: 'none' }}>← Ana Sayfaya Dön</Link>
      </div>
    </>
  )

  const rolBilgi = ROL_RENK[profil.rol] || ROL_RENK.okuyucu
  const okundu = okumalistesi.filter(o => o.durum === 'okundu')
  const okunuyor = okumalistesi.filter(o => o.durum === 'okunuyor')
  const okuyacaklar = okumalistesi.filter(o => o.durum === 'okumak_istiyorum')
  const vitrinAyarlari = normalizeVitrinAyarlari(profil.profil_vitrin_ayarlari)

  const seviye = profil.seviye || 1
  const parsedBanner = parseBannerMeta(profil.banner_url)
  const heroBackground = parsedBanner.src || profil.avatar_url || okumalistesi[0]?.seriler?.kapak_url || ''
  const toplamListe = okumalistesi.length
  const seciliUnvan = profil.secili_unvan || unvanlar.find(item => item.one_cikarildi)?.unvan_tanimlari || null
  const seciliRozetIdleri = Array.isArray(profil.favori_turler) ? profil.favori_turler.map(String) : []
  const vitrinRozetleri = (seciliRozetIdleri.length > 0
    ? rozetler.filter(item => seciliRozetIdleri.includes(String(item.rozet_id)))
    : rozetler
  ).slice(0, 3)
  const gosterilecekIstatistikler = [
    vitrinAyarlari.show_stats_okundu ? { label: 'Okundu', deger: okundu.length } : null,
    vitrinAyarlari.show_stats_takip ? { label: 'Takip', deger: profil.takip_sayisi || 0 } : null,
    vitrinAyarlari.show_stats_takipci ? { label: 'Takipci', deger: profil.takipci_sayisi || 0 } : null,
  ].filter(Boolean)
  const rafSekmeleri = [
    { key: 'liste', label: `Tumu (${toplamListe})`, aktif: true },
    vitrinAyarlari.show_reading_okunuyor ? { key: 'okunuyor', label: `Okunuyor (${okunuyor.length})` } : null,
    vitrinAyarlari.show_reading_okundu ? { key: 'okundu', label: `Okundu (${okundu.length})` } : null,
    vitrinAyarlari.show_reading_okuyacak ? { key: 'okuyacak', label: `Okuyacak (${okuyacaklar.length})` } : null,
  ].filter(Boolean)
  const gecerliSekme = rafSekmeleri.some(item => item.key === aktifSekme) ? aktifSekme : 'liste'

  return (
    <>
      <Navbar />
      <main style={{ background: '#050505', minHeight: '100vh' }}>
        <section
          style={{
            position: 'relative',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            background: 'linear-gradient(180deg, rgba(6,6,6,0.92) 0%, rgba(6,6,6,1) 100%)',
          }}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '1480px',
              margin: '0 auto',
              padding: '28px 24px 46px',
            }}
          >
            <div
              style={{
                position: 'relative',
                height: '240px',
                overflow: 'hidden',
                borderRadius: '28px 28px 0 0',
                border: '1px solid rgba(255,255,255,0.08)',
                borderBottom: 'none',
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              {heroBackground && (
                <img
                  src={heroBackground}
                  alt={profil.kullanici_adi}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: `${parsedBanner.x}% ${parsedBanner.y}%`,
                    opacity: parsedBanner.src ? 0.78 : 0.28,
                    filter: parsedBanner.src ? 'blur(0px)' : 'blur(3px)',
                    transform: `scale(${parsedBanner.z + 0.05})`,
                  }}
                />
              )}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(4,4,4,0.08) 0%, rgba(4,4,4,0.34) 54%, rgba(4,4,4,0.84) 100%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(90deg, rgba(5,5,5,0.48) 0%, rgba(5,5,5,0.12) 38%, rgba(5,5,5,0.48) 100%)',
                }}
              />
            </div>

            <div
              className="profile-main"
              style={{
                maxWidth: '760px',
                margin: '-74px auto 0',
                display: 'grid',
                justifyItems: 'center',
                textAlign: 'center',
                gap: '14px',
                padding: '0 24px',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '148px',
                  height: '148px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '5px solid rgba(255,255,255,0.16)',
                  background: 'rgba(255,255,255,0.05)',
                  boxShadow: '0 24px 44px rgba(0,0,0,0.42)',
                }}
              >
                {profil.avatar_url ? (
                  <img
                    src={profil.avatar_url}
                    alt={profil.kullanici_adi || 'Profil avatar'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff',
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '48px',
                    }}
                  >
                    {profil.kullanici_adi[0].toUpperCase()}
                  </div>
                )}
              </div>

              <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: '11px', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase' }}>
                Seviye {seviye} • Mart 2026 tarihinden beri aramizda
              </div>

              <div style={{ display: 'grid', gap: '10px', justifyItems: 'center', minWidth: 0 }}>
                <div
                  className="profile-name-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <h1
                    style={{
                      margin: 0,
                      color: '#fff',
                      fontFamily: 'inherit',
                      fontSize: 'clamp(52px, 7vw, 88px)',
                      fontWeight: 900,
                      lineHeight: 0.95,
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {profil.kullanici_adi}
                  </h1>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      minHeight: '32px',
                      padding: '0 12px',
                      borderRadius: '999px',
                      background: rolBilgi.bg,
                      color: rolBilgi.text,
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '0.8px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {formatRol(profil.rol)}
                  </span>
                </div>

                {seciliUnvan?.isim && (
                  <div
                    style={{
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '18px',
                      fontWeight: 500,
                      letterSpacing: '0.1px',
                    }}
                  >
                    {seciliUnvan.isim}
                  </div>
                )}

                <div
                  style={{
                    width: '96px',
                    height: '1px',
                    background: 'rgba(255,255,255,0.16)',
                  }}
                />

                <p
                  style={{
                    margin: 0,
                    maxWidth: '38ch',
                    color: 'rgba(255,255,255,0.68)',
                    fontSize: '15px',
                    lineHeight: 1.7,
                  }}
                >
                  {profil.bio || `${profil.kullanici_adi}, Konsey evreninde kendi arsivini kuran ve topluluga iz birakan bir uye.`}
                </p>
              </div>

              {vitrinRozetleri.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  {vitrinRozetleri.map((r) => (
                    <div
                      key={r.id}
                      title={r.rozet_tanimlari?.aciklama}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        minHeight: '32px',
                        padding: '0 14px',
                        borderRadius: '999px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(9,9,9,0.86)',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>{r.rozet_tanimlari?.ikon}</span>
                      <span>{r.rozet_tanimlari?.isim}</span>
                    </div>
                  ))}
                </div>
              )}

              {vitrinAyarlari.show_stats && gosterilecekIstatistikler.length > 0 && (
                <div
                  className="profile-stat-strip"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '56px',
                    paddingTop: '6px',
                  }}
                >
                  {gosterilecekIstatistikler.map((s) => (
                    <div
                      key={s.label}
                      style={{
                        display: 'grid',
                        gap: '4px',
                        justifyItems: 'center',
                        minWidth: '70px',
                      }}
                    >
                      <div
                        style={{
                          color: '#fff',
                          fontSize: '36px',
                          lineHeight: 1,
                          fontWeight: 700,
                        }}
                      >
                        {s.deger}
                      </div>
                      <div
                        style={{
                          color: 'rgba(255,255,255,0.82)',
                          fontSize: '15px',
                          fontWeight: 700,
                        }}
                      >
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <aside
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: '2px',
                }}
              >
                {benimProfil ? (
                  <Link
                    href="/profil/duzenle"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '52px',
                      minWidth: '180px',
                      padding: '0 24px',
                      borderRadius: '999px',
                      background: '#fff',
                      color: '#111',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: 800,
                      letterSpacing: '0.7px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Profili Duzenle
                  </Link>
                ) : (
                  <TakipButonu hedefId={profil.id} hedefKullaniciAdi={profil.kullanici_adi} />
                )}
              </aside>
            </div>
          </div>
        </section>

        <section
          style={{
            maxWidth: '1360px',
            margin: '0 auto',
            padding: '28px 24px 110px',
            display: 'grid',
            gap: '24px',
          }}
        >
          {vitrinAyarlari.show_featured_series && oneCikanSeriler.length > 0 && (
            <section
              style={{
                display: 'grid',
                gap: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div
                    style={{
                      color: '#fff',
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: '46px',
                      lineHeight: 0.95,
                      marginBottom: '8px',
                    }}
                  >
                    One Cikan Seriler
                  </div>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.56)', fontSize: '14px', lineHeight: 1.75 }}>
                    {benimProfil
                      ? 'Kisisel vitrinin on siraya aldigin seriler burada yer alir.'
                      : `${profil.kullanici_adi} profilinde on plana cikan seri secimlerini burada sergiliyor.`}
                  </p>
                </div>
              </div>

              <div
                className="profile-featured-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '18px',
                  marginTop: '20px',
                }}
              >
                {oneCikanSeriler.map((seri) => (
                  <Link
                    key={seri.id}
                    href={`/seri/${seri.slug}`}
                    style={{
                      textDecoration: 'none',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '24px',
                      overflow: 'hidden',
                      background: 'rgba(255,255,255,0.03)',
                      boxShadow: '0 22px 44px rgba(0,0,0,0.22)',
                    }}
                  >
                    <article>
                      <div
                        style={{
                          position: 'relative',
                          aspectRatio: '0.78',
                          background: '#111',
                          overflow: 'hidden',
                        }}
                      >
                        {seri.kapak_url ? (
                          <img
                            src={seri.kapak_url}
                            alt={seri.baslik}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            loading="lazy"
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'grid',
                              placeItems: 'center',
                              color: '#fff',
                              fontFamily: "'Bebas Neue', sans-serif",
                              fontSize: '28px',
                              textAlign: 'center',
                              padding: '18px',
                            }}
                          >
                            {seri.baslik}
                          </div>
                        )}
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.82) 100%)',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            left: '16px',
                            bottom: '14px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            minHeight: '30px',
                            padding: '0 12px',
                            borderRadius: '999px',
                            background: 'rgba(10,10,10,0.78)',
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: 800,
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                          }}
                        >
                          One Cikan Seri
                        </div>
                      </div>
                      <div style={{ padding: '16px 18px 18px' }}>
                        <div style={{ color: '#fff', fontSize: '22px', lineHeight: 1.15, fontWeight: 700 }}>
                          {seri.baslik}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '8px', letterSpacing: '0.7px', textTransform: 'uppercase' }}>
                          Arsiv vitrini
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {vitrinAyarlari.show_reading_shelf && (
          <section
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '28px',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.02) 100%)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '24px 24px 0' }}>
              <div
                style={{
                  color: '#fff',
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '46px',
                  lineHeight: 0.95,
                  marginBottom: '8px',
                }}
              >
                Okuma Raflari
              </div>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.56)', fontSize: '14px', lineHeight: 1.75 }}>
                {benimProfil
                  ? 'Okuma listesi, kullanicinin serilerle kurdugu iliskiyi tek ekranda gosteren kisisel bir arsiv alani.'
                  : 'Bu kullanicinin kamusal profil vitrini acik, ancak okuma listesi gizli tutuluyor.'}
              </p>
            </div>

            {benimProfil ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    overflowX: 'auto',
                    padding: '18px 24px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {rafSekmeleri.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setAktifSekme(s.key)}
                      style={{
                        padding: '14px 18px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: '13px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        color: gecerliSekme === s.key ? '#fff' : 'rgba(255,255,255,0.5)',
                        borderBottom: gecerliSekme === s.key ? '2px solid #fff' : '2px solid transparent',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div style={{ padding: '24px' }}>
                  {(() => {
                    const liste = gecerliSekme === 'okunuyor'
                      ? (vitrinAyarlari.show_reading_okunuyor ? okunuyor : okumalistesi)
                      : gecerliSekme === 'okundu'
                        ? (vitrinAyarlari.show_reading_okundu ? okundu : okumalistesi)
                        : gecerliSekme === 'okuyacak'
                          ? (vitrinAyarlari.show_reading_okuyacak ? okuyacaklar : okumalistesi)
                          : okumalistesi
                    if (liste.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '56px 24px', color: 'rgba(255,255,255,0.52)', fontSize: '14px' }}>
                          Bu raf su an bos gorunuyor.
                        </div>
                      )
                    }

                    return (
                      <div
                        className="profile-reading-grid"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                          gap: '18px',
                        }}
                      >
                        {liste.map((item) => (
                          <Link key={item.id} href={`/seri/${item.seriler?.slug}`} style={{ textDecoration: 'none' }}>
                            <article
                              style={{
                                display: 'grid',
                                gap: '10px',
                              }}
                            >
                              <div
                                style={{
                                  position: 'relative',
                                  aspectRatio: '0.72',
                                  borderRadius: '18px',
                                  overflow: 'hidden',
                                  background: '#111',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                }}
                              >
                                {item.seriler?.kapak_url ? (
                                  <img
                                    src={item.seriler.kapak_url}
                                    alt={item.seriler.baslik}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    loading="lazy"
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      display: 'grid',
                                      placeItems: 'center',
                                      color: '#fff',
                                      fontFamily: "'Bebas Neue', sans-serif",
                                      fontSize: '28px',
                                      textAlign: 'center',
                                      padding: '16px',
                                    }}
                                  >
                                    {item.seriler?.baslik}
                                  </div>
                                )}
                                <div
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.72) 100%)',
                                  }}
                                />
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: '10px',
                                    right: '10px',
                                    bottom: '10px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '8px',
                                  }}
                                >
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      minHeight: '28px',
                                      padding: '0 10px',
                                      borderRadius: '999px',
                                      background: 'rgba(12,12,12,0.82)',
                                      color: '#fff',
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      letterSpacing: '0.8px',
                                      textTransform: 'uppercase',
                                    }}
                                  >
                                    {LISTE_ETIKET[item.durum] || item.durum}
                                  </span>
                                </div>
                              </div>
                              <div style={{ color: '#fff', fontSize: '18px', lineHeight: 1.25, fontWeight: 700 }}>
                                {item.seriler?.baslik}
                              </div>
                            </article>
                          </Link>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </>
            ) : (
              <div style={{ padding: '28px 24px 32px', color: 'rgba(255,255,255,0.56)', fontSize: '14px' }}>
                Bu kullanicinin okuma listesi gizli tutuluyor.
              </div>
            )}
          </section>
          )}

          {vitrinAyarlari.show_comments && (
          <section
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '28px',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.02) 100%)',
              overflow: 'hidden',
              padding: '24px',
            }}
          >
            <div
              style={{
                color: '#fff',
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '46px',
                lineHeight: 0.95,
                marginBottom: '8px',
              }}
            >
              Yorumlar
            </div>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.56)', fontSize: '14px', lineHeight: 1.75 }}>
              {profil.kullanici_adi} tarafindan birakilan son yorumlar burada listelenir.
            </p>

            {yorumlar.length === 0 ? (
              <div style={{ padding: '26px 0 6px', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                Bu kullanicinin henuz gorunen bir yorumu yok.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '14px', marginTop: '20px' }}>
                {yorumlar.map((yorum) => (
                  <article
                    key={yorum.id}
                    style={{
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '20px',
                      background: 'rgba(255,255,255,0.02)',
                      padding: '18px 18px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'grid', gap: '6px' }}>
                        <div style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>
                          {yorum.seriler?.baslik || 'Seri yorumu'}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.9px', textTransform: 'uppercase' }}>
                          {new Date(yorum.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          {yorum.spoiler ? ' • Spoilerli' : ''}
                        </div>
                      </div>
                      {yorum.seriler?.slug && (
                        <Link
                          href={`/seri/${yorum.seriler.slug}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            minHeight: '34px',
                            padding: '0 12px',
                            borderRadius: '999px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.04)',
                            color: '#fff',
                            textDecoration: 'none',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          Seriye Git
                        </Link>
                      )}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.76)', fontSize: '14px', lineHeight: 1.8 }}>
                      {yorum.icerik}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          )}
        </section>
      </main>
      <style jsx>{`
        @media (max-width: 1100px) {
          .profile-stat-strip {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 18px !important;
          }

          .profile-featured-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 760px) {
          .profile-main {
            padding: 0 18px !important;
          }

          .profile-name-row {
            gap: 8px !important;
          }

          .profile-stat-strip {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 16px !important;
          }

          .profile-reading-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .profile-featured-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 520px) {
          .profile-stat-strip {
            grid-template-columns: 1fr !important;
          }

          .profile-reading-grid {
            grid-template-columns: 1fr !important;
          }

          .profile-main {
            padding: 0 12px !important;
          }

          .profile-name-row {
            flex-direction: column !important;
          }
        }
      `}</style>
      <Footer />
    </>
  )
}
