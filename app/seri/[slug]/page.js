'use client'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import SeriPuan from '../../components/SeriPuan'
import Link from 'next/link'

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

  useEffect(() => {
    async function fetchData() {
      const { data: seriData } = await supabase
        .from('seriler').select('*, kategoriler(isim)').eq('slug', slug).single()

      if (seriData) {
        setSeri(seriData)
        await supabase.rpc('increment_seri_goruntuleme', { seri_id: seriData.id })

        const [b, y, c, t] = await Promise.all([
          supabase.from('bolumler')
            .select('*, cevirmen:ekip!cevirmen_id(isim), balonlama:ekip!balonlama_id(isim), grafik:ekip!grafik_id(isim)')
            .eq('seri_id', seriData.id).order('sayi'),
          supabase.from('seri_yazarlar').select('yazarlar(isim)').eq('seri_id', seriData.id),
          supabase.from('seri_cizerler').select('cizerler(isim)').eq('seri_id', seriData.id),
          seriData.turler?.length > 0
            ? supabase.from('turler').select('isim').in('id', seriData.turler)
            : Promise.resolve({ data: [] }),
        ])
        setBolumler(b.data || [])
        setYazarlar(y.data?.map(x => x.yazarlar?.isim).filter(Boolean) || [])
        setCizerler(c.data?.map(x => x.cizerler?.isim).filter(Boolean) || [])
        setTurler(t.data?.map(x => x.isim) || [])

        // Kullanıcı bilgileri
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setKullanici(session.user)
          // Liste durumu
          const { data: liste } = await supabase.from('okuma_listesi')
            .select('durum').eq('kullanici_id', session.user.id).eq('seri_id', seriData.id).single()
          if (liste) setListeDurumu(liste.durum)
          // Son okunan bölüm
          const { data: gecmis } = await supabase.from('okuma_gecmisi')
            .select('bolum_id, bolumler(sayi, baslik)').eq('kullanici_id', session.user.id).eq('seri_id', seriData.id)
            .order('okundu_at', { ascending: false }).limit(1).single()
          if (gecmis) setSonOkunan(gecmis.bolumler)
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
      await supabase.from('okuma_listesi').upsert([{ kullanici_id: kullanici.id, seri_id: seri.id, durum, updated_at: new Date().toISOString() }], { onConflict: 'kullanici_id,seri_id' })
      setListeDurumu(durum)
    }
    setListeYukleniyor(false)
  }

  if (loading) return (<><Navbar /><div style={{ padding: '80px 24px', color: 'var(--text-muted)', fontSize: '14px' }}>Yükleniyor...</div></>)
  if (!seri) return (<><Navbar /><div style={{ padding: '80px 24px', color: 'var(--text-muted)', fontSize: '14px' }}>Seri bulunamadı.</div></>)

  const listeDurumlari = [
    { durum: 'okunuyor', label: '📖 Okunuyor', aktifRenk: '#3b82f6' },
    { durum: 'okumak_istiyorum', label: '🔖 Okuyacaklar', aktifRenk: '#8b5cf6' },
    { durum: 'okundu', label: '✅ Okundu', aktifRenk: '#10b981' },
  ]

  return (
    <>
      <Navbar />
      <div style={{ margin: '24px 24px 0' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← Kütüphaneye Dön
        </Link>
      </div>

      <div style={{ margin: '24px 24px', display: 'grid', gridTemplateColumns: 'minmax(0, 220px) 1fr', gap: '40px', alignItems: 'start' }} className="seri-grid">
        {/* Kapak */}
        <div style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '2/3' }}>
          {seri.kapak_url
            ? <img src={seri.kapak_url} alt={seri.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '32px', color: '#fff', letterSpacing: '2px', padding: '16px', textAlign: 'center' }}>{seri.baslik}</div>
          }
        </div>

        {/* Bilgiler */}
        <div style={{ minWidth: 0 }}>
          {/* Kategori + türler */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {seri.kategoriler?.isim && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block' }} />
                {seri.kategoriler.isim}
              </span>
            )}
            {turler.map(t => (
              <span key={t} style={{ padding: '3px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '100px', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>{t}</span>
            ))}
          </div>

          {/* Başlık */}
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1, letterSpacing: '0.5px', marginBottom: '10px' }}>
            {seri.baslik}
          </div>

          {/* Yazar · çizer · yıl */}
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {yazarlar.length > 0 && <span style={{ color: 'var(--text)', fontWeight: 500 }}>{yazarlar.join(', ')}</span>}
            {yazarlar.length > 0 && cizerler.length > 0 && <span>·</span>}
            {cizerler.length > 0 && <span>{cizerler.join(', ')}</span>}
            {seri.yil && <><span>·</span><span>{seri.yil}</span></>}
          </div>

          {/* Meta + Puan */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {[['Yayıncı', seri.kategoriler?.isim], ['Yıl', seri.yil], ['Durum', seri.durum]].filter(([, v]) => v).map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Puan sistemi */}
          <div style={{ marginBottom: '24px' }}>
            <SeriPuan seriId={seri.id} ortalama={seri.ortalama_puan} puanSayisi={seri.puan_sayisi} />
          </div>

          {/* Özet */}
          {seri.ozet && (
            <>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '8px' }}>Özet</div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '24px' }}>{seri.ozet}</div>
            </>
          )}

          {/* Okuma aksiyonları */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
            {bolumler.length > 0 && (
              sonOkunan ? (
                <Link href={`/oku/${slug}/${sonOkunan.sayi}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--text)', color: '#fff', fontSize: '14px', fontWeight: 500, padding: '12px 20px', borderRadius: '10px', textDecoration: 'none' }}>
                  ▶ Kaldığın Yerden Devam Et
                </Link>
              ) : (
                <Link href={`/oku/${slug}/${bolumler[0].sayi}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--text)', color: '#fff', fontSize: '14px', fontWeight: 500, padding: '12px 20px', borderRadius: '10px', textDecoration: 'none' }}>
                  📖 Okumaya Başla
                </Link>
              )
            )}

            {kullanici && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {listeDurumlari.map(ld => (
                  <button key={ld.durum} onClick={() => listeGuncelle(ld.durum)} disabled={listeYukleniyor}
                    style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', border: `1px solid ${listeDurumu === ld.durum ? ld.aktifRenk : 'var(--border)'}`, background: listeDurumu === ld.durum ? ld.aktifRenk + '15' : 'var(--surface)', color: listeDurumu === ld.durum ? ld.aktifRenk : 'var(--text-muted)' }}>
                    {ld.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bölüm listesi */}
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-light)', padding: '12px 0 8px', marginBottom: '4px' }}>
              {bolumler.length} Bölüm
            </div>
            {bolumler.length === 0 ? (
              <div style={{ padding: '20px 0', color: 'var(--text-muted)', fontSize: '14px' }}>Henüz bölüm eklenmemiş.</div>
            ) : bolumler.map((ch) => (
              <Link key={ch.id} href={`/oku/${slug}/${ch.sayi}`} style={{ textDecoration: 'none' }}>
                <div onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 8px', borderBottom: '1px solid var(--border)', borderRadius: '6px', transition: 'background 0.1s', background: sonOkunan?.sayi === ch.sayi ? 'var(--bg)' : 'transparent' }}>
                  <div style={{ width: '48px', height: '64px', borderRadius: '6px', overflow: 'hidden', background: 'var(--border)', flexShrink: 0 }}>
                    {ch.kapak_url
                      ? <img src={ch.kapak_url} alt={ch.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--text-light)', fontWeight: 600 }}>#{ch.sayi}</div>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-light)' }}>#{ch.sayi}</span>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.baslik}</span>
                      {sonOkunan?.sayi === ch.sayi && <span style={{ fontSize: '10px', padding: '2px 6px', background: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontWeight: 600 }}>Kaldın</span>}
                    </div>
                    {(ch.cevirmen?.isim || ch.balonlama?.isim || ch.grafik?.isim) && (
                      <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                        {[ch.cevirmen?.isim && `Çev: ${ch.cevirmen.isim}`, ch.balonlama?.isim && `Bal: ${ch.balonlama.isim}`, ch.grafik?.isim && `Grfk: ${ch.grafik.isim}`].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>{new Date(ch.created_at).toLocaleDateString('tr-TR')}</span>
                    <span style={{ color: 'var(--text-light)' }}>→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .seri-grid { grid-template-columns: 1fr !important; }
          .seri-grid > div:first-child { max-width: 180px; margin: 0 auto; }
        }
      `}</style>

      <Footer />
    </>
  )
}