'use client'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import SeriPuan from '../../components/SeriPuan'
import YorumSistemi from '../../components/YorumSistemi'
import Link from 'next/link'
import { trackSeriesFavoriteAndUnlock } from '../../lib/unvanClient'

function tarih(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCount(value) {
  const count = Number(value || 0)
  if (count >= 1000000) return `${(count / 1000000).toFixed(1).replace('.0', '')}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace('.0', '')}B`
  return `${count}`
}

export default function SeriDetay() {
  const { slug } = useParams()
  const [seri, setSeri] = useState(null)
  const [bolumler, setBolumler] = useState([])
  const [yazarlar, setYazarlar] = useState([])
  const [cizerler, setCizerler] = useState([])
  const [turler, setTurler] = useState([])
  const [loading, setLoading] = useState(true)
  const [listeDurumu, setListeDurumu] = useState(null)
  const [kullanici, setKullanici] = useState(null)
  const [listeYukleniyor, setListeYukleniyor] = useState(false)
  const [sonOkunan, setSonOkunan] = useState(null)
  const [detayAyar, setDetayAyar] = useState({})
  const [onerilenSeri, setOnerilenSeri] = useState(null)
  const [acilanUnvanlar, setAcilanUnvanlar] = useState([])
  const [seriUnvanlari, setSeriUnvanlari] = useState([])
  const [acikUnvanIdleri, setAcikUnvanIdleri] = useState(new Set())

  useEffect(() => {
    async function fetchData() {
      const { data: seriData } = await supabase
        .from('seriler')
        .select('*, kategoriler(isim)')
        .eq('slug', slug)
        .single()

      if (seriData) {
        setSeri(seriData)
        fetch('/api/series-views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seriId: seriData.id }),
        }).catch(() => {})

        const [b, y, c, t, detay, onerilen, unvanlar] = await Promise.all([
          supabase.from('bolumler')
            .select('*, cevirmen:ekip!cevirmen_id(isim), balonlama:ekip!balonlama_id(isim), grafik:ekip!grafik_id(isim)')
            .eq('seri_id', seriData.id)
            .order('sayi'),
          supabase.from('seri_yazarlar').select('yazarlar(isim)').eq('seri_id', seriData.id),
          supabase.from('seri_cizerler').select('cizerler(isim)').eq('seri_id', seriData.id),
          seriData.turler?.length > 0
            ? supabase.from('turler').select('isim').in('id', seriData.turler)
            : Promise.resolve({ data: [] }),
          supabase.from('site_ayarlari').select('deger').eq('anahtar', 'seri_detay_vitrin').maybeSingle(),
          supabase.from('seriler')
            .select('id, slug, baslik, kapak_url, ortalama_puan, kategoriler(isim)')
            .eq('kategori_id', seriData.kategori_id)
            .neq('id', seriData.id)
            .limit(1)
            .maybeSingle(),
          supabase.from('unvan_tanimlari')
            .select('*')
            .or(`seri_id.eq.${seriData.id}${seriData.character_group ? `,character_group.eq.${seriData.character_group}` : ''}`)
            .eq('aktif', true)
            .order('siralama'),
        ])

        setBolumler(b.data || [])
        setYazarlar(y.data?.map(item => item.yazarlar?.isim).filter(Boolean) || [])
        setCizerler(c.data?.map(item => item.cizerler?.isim).filter(Boolean) || [])
        setTurler(t.data?.map(item => item.isim) || [])
        setDetayAyar(detay.data?.deger?.[String(seriData.id)] || {})
        setOnerilenSeri(onerilen.data || null)
        setSeriUnvanlari(unvanlar.data || [])

        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setKullanici(session.user)

          const { data: liste } = await supabase.from('okuma_listesi')
            .select('durum')
            .eq('kullanici_id', session.user.id)
            .eq('seri_id', seriData.id)
            .single()
          if (liste) setListeDurumu(liste.durum)

          const { data: gecmis } = await supabase.from('okuma_gecmisi')
            .select('bolum_id, bolumler(sayi, baslik)')
            .eq('kullanici_id', session.user.id)
            .eq('seri_id', seriData.id)
            .order('okundu_at', { ascending: false })
            .limit(1)
            .single()
          if (gecmis) setSonOkunan(gecmis.bolumler)

          const unvanIds = (unvanlar.data || []).map(item => item.id).filter(Boolean)
          if (unvanIds.length > 0) {
            const { data: unlockedTitles } = await supabase
              .from('kullanici_unvanlari')
              .select('unvan_id')
              .eq('kullanici_id', session.user.id)
              .in('unvan_id', unvanIds)

            setAcikUnvanIdleri(new Set((unlockedTitles || []).map(item => item.unvan_id)))
          }
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [slug])

  async function listeGuncelle(durum) {
    if (!kullanici || !seri) return
    setListeYukleniyor(true)

    if (listeDurumu === durum) {
      await supabase.from('okuma_listesi').delete().eq('kullanici_id', kullanici.id).eq('seri_id', seri.id)
      setListeDurumu(null)
    } else {
      await supabase.from('okuma_listesi').upsert(
        [{ kullanici_id: kullanici.id, seri_id: seri.id, durum, updated_at: new Date().toISOString() }],
        { onConflict: 'kullanici_id,seri_id' }
      )
      setListeDurumu(durum)

      if (durum === 'okumak_istiyorum') {
        const unlocked = await trackSeriesFavoriteAndUnlock({ userId: kullanici.id, seriId: seri.id })
        if (unlocked.length > 0) {
          setAcilanUnvanlar(unlocked)
          window.setTimeout(() => setAcilanUnvanlar([]), 4200)
        }
      }
    }

    setListeYukleniyor(false)
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="site-shell" style={{ paddingTop: '80px', paddingBottom: '80px', color: 'var(--text-muted)', fontSize: '14px' }}>
          Yükleniyor...
        </div>
      </>
    )
  }

  if (!seri) {
    return (
      <>
        <Navbar />
        <div className="site-shell" style={{ paddingTop: '80px', paddingBottom: '80px', color: 'var(--text-muted)', fontSize: '14px' }}>
          Seri bulunamadı.
        </div>
      </>
    )
  }

  const heroBackground = detayAyar.arka_plan_url || seri.hero_gorsel_url || seri.arkaplan_url || seri.kapak_url || '/demo/hero.jpg'
  const heroBackgroundFit = detayAyar.arka_plan_fit || 'cover'
  const heroBackgroundPosition = `${detayAyar.arka_plan_x ?? 50}% ${detayAyar.arka_plan_y ?? 50}%`
  const ilkBolum = bolumler[0]
  const sonBolum = bolumler[bolumler.length - 1]
  const gosterilenTurler = turler.length > 0 ? turler.slice(0, 4) : (seri.kategoriler?.isim ? [seri.kategoriler.isim] : [])

  const listeDurumlari = [
    { durum: 'okunuyor', label: 'Okunuyor', aciklama: 'Takipte', aktifRenk: '#2563eb' },
    { durum: 'okumak_istiyorum', label: 'Okuyacaklar', aciklama: 'Listeye ekle', aktifRenk: '#7c3aed' },
    { durum: 'okundu', label: 'Okundu', aciklama: 'Tamamlandi', aktifRenk: '#10b981' },
  ]

  const metaSatirlari = [
    ['Yayıncı', seri.kategoriler?.isim || 'Belirtilmemiş'],
    ['Kategori', seri.kategoriler?.isim || 'Belirtilmemiş'],
    ['Yıl', seri.yil || 'Belirtilmemiş'],
    ['Durum', seri.durum || 'Belirtilmemiş'],
    ['Yazar', yazarlar.join(', ') || 'Belirtilmemiş'],
    ['Çizer', cizerler.join(', ') || 'Belirtilmemiş'],
  ]

  return (
    <>
      <Navbar />

      <main style={{ background: '#060606', minHeight: '100vh' }}>
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
                  {unvan.aciklama || 'Bu etkileşim yeni bir unvanin kilidini acti.'}
                </div>
              </div>
            ))}
          </div>
        )}
        <style>{`
          .seri-hero {
            position: relative;
            overflow: hidden;
            border-bottom: 1px solid rgba(255,255,255,0.06);
            background: #060606;
          }
          .seri-hero-shell {
            position: relative;
            z-index: 1;
            padding-top: 36px;
            padding-bottom: 56px;
          }
          .seri-hero-grid {
            display: grid;
            grid-template-columns: 210px minmax(0, 1fr);
            gap: 42px;
            align-items: start;
          }
          .seri-stat-row {
            display: flex;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
            margin-bottom: 18px;
          }
          .seri-stat-item {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: #d4d4cf;
            font-size: 14px;
            letter-spacing: 0.2px;
          }
          .seri-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }
          .seri-bottom-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.65fr) minmax(290px, 0.85fr);
            gap: 28px;
            align-items: start;
          }
          .seri-side-card {
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.03);
            border-radius: 18px;
            padding: 22px;
          }
          .seri-meta-list {
            display: grid;
            gap: 14px;
          }
          .seri-meta-item {
            display: grid;
            grid-template-columns: 96px minmax(0, 1fr);
            gap: 12px;
            padding-bottom: 14px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
          }
          .seri-meta-item:last-child {
            padding-bottom: 0;
            border-bottom: 0;
          }
          .seri-reco {
            display: grid;
            grid-template-columns: 76px minmax(0, 1fr);
            gap: 14px;
            align-items: center;
            text-decoration: none;
          }
          .seri-archive-head {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 16px;
            align-items: end;
            margin-bottom: 16px;
          }
          .seri-row {
            display: grid;
            grid-template-columns: 42px 52px minmax(0, 1fr) auto;
            gap: 14px;
            align-items: center;
            padding: 12px 6px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
          }
          @media (max-width: 960px) {
            .seri-bottom-grid {
              grid-template-columns: 1fr !important;
            }
          }
          @media (max-width: 860px) {
            .seri-hero-grid {
              grid-template-columns: 1fr !important;
            }
            .seri-cover {
              max-width: 210px;
            }
          }
          @media (max-width: 640px) {
            .seri-hero-shell {
              padding-top: 22px;
              padding-bottom: 36px;
            }
            .seri-title {
              font-size: clamp(44px, 14vw, 74px) !important;
            }
            .seri-actions {
              flex-direction: column;
              align-items: stretch;
            }
            .seri-stat-row {
              gap: 12px;
            }
            .seri-meta-item {
              grid-template-columns: 1fr !important;
              gap: 6px !important;
            }
            .seri-row {
              grid-template-columns: 42px 44px minmax(0, 1fr) !important;
            }
            .seri-row-date {
              display: none !important;
            }
          }
        `}</style>

        <section className="seri-hero">
          <img
            src={heroBackground}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: heroBackgroundFit,
              objectPosition: heroBackgroundPosition,
              opacity: detayAyar.arka_plan_url ? 1 : 0.24,
              transform: 'scale(1.02)',
            }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(6,6,6,0.98) 0%, rgba(6,6,6,0.92) 22%, rgba(6,6,6,0.7) 44%, rgba(6,6,6,0.34) 100%), linear-gradient(180deg, rgba(6,6,6,0.22) 0%, rgba(6,6,6,0.78) 100%)' }} />

          <div className="site-shell seri-hero-shell">
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '26px' }}>
              ← Kütüphaneye Dön
            </Link>

            <div className="seri-hero-grid">
              <div className="seri-cover" style={{ width: '100%' }}>
                <div style={{ borderRadius: '18px', overflow: 'hidden', background: '#111', boxShadow: '0 18px 42px rgba(0,0,0,0.28)', aspectRatio: '2 / 3' }}>
                  {seri.kapak_url ? (
                    <img src={seri.kapak_url} alt={seri.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#fff', fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', padding: '16px', textAlign: 'center' }}>
                      {seri.baslik}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ minWidth: 0, maxWidth: '920px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {gosterilenTurler.map(tur => (
                    <span
                      key={tur}
                      style={{
                        padding: '6px 12px',
                        background: tur === seri.kategoriler?.isim ? '#17c964' : 'rgba(255,255,255,0.1)',
                        borderRadius: '999px',
                        fontSize: '10px',
                        color: '#fff',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        fontWeight: 800,
                      }}
                    >
                      {tur}
                    </span>
                  ))}
                </div>

                <h1 className="seri-title" style={{ margin: '0 0 14px', fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(56px, 5vw, 86px)', lineHeight: 0.92, letterSpacing: '0.4px', color: '#fff', textTransform: 'uppercase' }}>
                  {seri.baslik}
                </h1>

                <div className="seri-stat-row">
                  <div className="seri-stat-item" style={{ color: '#fff', fontWeight: 700 }}>
                    <span style={{ color: '#22c55e', fontSize: '18px' }}>★</span>
                    <span>{Number(seri.ortalama_puan || 0).toFixed(1)}</span>
                  </div>
                  <div className="seri-stat-item">
                    <span style={{ opacity: 0.8 }}>◉</span>
                    <span>{formatCount(seri.goruntuleme_sayisi || 0)} görüntülenme</span>
                  </div>
                  <div className="seri-stat-item">
                    <span style={{ opacity: 0.8 }}>↻</span>
                    <span>Güncellendi {tarih(sonBolum?.created_at)}</span>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <SeriPuan seriId={seri.id} ortalama={seri.ortalama_puan} puanSayisi={seri.puan_sayisi} />
                </div>

                {seri.ozet && (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ maxWidth: '88ch', fontSize: '16px', color: 'var(--text-muted)', lineHeight: 1.75 }}>
                      {seri.ozet}
                    </div>
                  </div>
                )}

                <div className="seri-actions">
                  {bolumler.length > 0 && (
                    sonOkunan ? (
                      <Link href={`/oku/${slug}/${sonOkunan.sayi}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '250px', padding: '16px 24px', background: '#fff', color: '#111', fontSize: '13px', fontWeight: 800, borderRadius: '14px', textDecoration: 'none', letterSpacing: '0.8px', textTransform: 'uppercase', boxShadow: '0 12px 30px rgba(255,255,255,0.08)' }}>
                        Kaldığın Yerden Devam Et
                      </Link>
                    ) : (
                      <Link href={`/oku/${slug}/${ilkBolum?.sayi}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '250px', padding: '16px 24px', background: '#fff', color: '#111', fontSize: '13px', fontWeight: 800, borderRadius: '14px', textDecoration: 'none', letterSpacing: '0.8px', textTransform: 'uppercase', boxShadow: '0 12px 30px rgba(255,255,255,0.08)' }}>
                        Okumaya Başla
                      </Link>
                    )
                  )}

                  {kullanici && listeDurumlari.map(item => (
                    <button
                      key={item.durum}
                      onClick={() => listeGuncelle(item.durum)}
                      disabled={listeYukleniyor}
                      style={{
                        minWidth: '148px',
                        padding: '14px 18px',
                        background: listeDurumu === item.durum ? item.aktifRenk : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${listeDurumu === item.durum ? item.aktifRenk : 'rgba(255,255,255,0.12)'}`,
                        borderRadius: '14px',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'grid',
                        gap: '4px',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: '13px', lineHeight: 1.1 }}>{item.label}</span>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.78 }}>{item.aciklama}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="site-shell" style={{ paddingTop: '22px', paddingBottom: '72px' }}>
          <div className="seri-bottom-grid">
            <div style={{ minWidth: 0 }}>
              <div className="seri-archive-head">
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(42px, 4vw, 58px)', color: '#fff', lineHeight: 0.92, textTransform: 'uppercase' }}>
                  Bölümler
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                  {bolumler.length} bölüm
                </div>
              </div>

              {bolumler.length === 0 ? (
                <div style={{ padding: '20px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
                  Henüz bölüm eklenmemiş.
                </div>
              ) : bolumler.map(ch => (
                <Link key={ch.id} href={`/oku/${slug}/${ch.sayi}`} style={{ textDecoration: 'none' }}>
                  <div className="seri-row">
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '34px', color: '#6a6a64', lineHeight: 1, textAlign: 'right' }}>
                      {ch.sayi}
                    </div>
                    <div style={{ width: '44px', height: '56px', borderRadius: '6px', overflow: 'hidden', background: '#111' }}>
                      {ch.kapak_url ? (
                        <img src={ch.kapak_url} alt={ch.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#888', fontSize: '11px' }}>#{ch.sayi}</div>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontSize: '16px', color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ch.baslik}
                        </span>
                        {sonOkunan?.sayi === ch.sayi && (
                          <span style={{ padding: '3px 8px', background: '#dbeafe', color: '#1e40af', borderRadius: '999px', fontSize: '10px', fontWeight: 700 }}>
                            KALDIĞIN YER
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        Yüklendi {tarih(ch.created_at)}
                      </div>
                    </div>
                    <div className="seri-row-date" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-light)', fontSize: '13px', flexShrink: 0 }}>
                      <span>{tarih(ch.created_at)}</span>
                      <span>→</span>
                    </div>
                  </div>
                </Link>
              ))}

              <YorumSistemi seriId={seri.id} />
            </div>

            <aside style={{ display: 'grid', gap: '18px' }}>
              <div className="seri-side-card">
                <div style={{ fontSize: '12px', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '18px' }}>
                  Seri Detayları
                </div>
                <div className="seri-meta-list">
                  {metaSatirlari.map(([label, value]) => (
                    <div key={label} className="seri-meta-item">
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
                      <div style={{ fontSize: '15px', color: '#fff', fontWeight: 500 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {seriUnvanlari.length > 0 && (
                <div className="seri-side-card">
                  <div style={{ fontSize: '12px', color: '#facc15', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '18px', fontWeight: 800 }}>
                    Açılabilir Unvanlar
                  </div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {seriUnvanlari.slice(0, 6).map((unvan) => {
                      const unlocked = acikUnvanIdleri.has(unvan.id)
                      return (
                        <div
                          key={unvan.id}
                          style={{
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '16px',
                            padding: '14px',
                            background: unlocked ? 'rgba(250,204,21,0.08)' : 'rgba(255,255,255,0.03)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', lineHeight: 0.95, color: '#fff' }}>
                              {unvan.isim}
                            </div>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                minHeight: '24px',
                                padding: '0 10px',
                                borderRadius: '999px',
                                background: unlocked ? 'rgba(250,204,21,0.16)' : 'rgba(255,255,255,0.08)',
                                color: unlocked ? '#fde68a' : 'rgba(255,255,255,0.56)',
                                fontSize: '10px',
                                fontWeight: 800,
                                letterSpacing: '0.8px',
                                textTransform: 'uppercase',
                              }}
                            >
                              {unlocked ? 'Açıldı' : 'Kilitli'}
                            </span>
                          </div>
                          <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: '13px', lineHeight: 1.65 }}>
                            {unvan.aciklama || 'Bu seriyle veya ayni karakter evreniyle ilgili bir kilometre tasi.'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="seri-side-card">
                <div style={{ fontSize: '12px', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '18px', fontWeight: 800 }}>
                  Bunları da Beğenebilirsiniz
                </div>
                {onerilenSeri ? (
                  <Link href={`/seri/${onerilenSeri.slug}`} className="seri-reco">
                    <div style={{ width: '76px', aspectRatio: '2 / 3', borderRadius: '10px', overflow: 'hidden', background: '#111' }}>
                      {onerilenSeri.kapak_url ? (
                        <img src={onerilenSeri.kapak_url} alt={onerilenSeri.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#888', fontSize: '11px' }}>Seri</div>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '18px', color: '#fff', fontWeight: 700, lineHeight: 1.25, marginBottom: '8px' }}>
                        {onerilenSeri.baslik}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d4d4cf', fontSize: '13px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#22c55e' }}>★</span>
                        <span>{Number(onerilenSeri.ortalama_puan || 0).toFixed(1)}</span>
                        {onerilenSeri.kategoriler?.isim && <span style={{ color: 'var(--text-light)' }}>{onerilenSeri.kategoriler.isim}</span>}
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6 }}>
                    Yakında bu seri için önerilen başka içerikler de burada görünecek.
                  </div>
                )}
              </div>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
