'use client'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import Link from 'next/link'

export default function SeriDetay() {
  const { slug } = useParams()
  const [seri, setSeri] = useState(null)
  const [bolumler, setBolumler] = useState([])
  const [yazarlar, setYazarlar] = useState([])
  const [cizerler, setCizerler] = useState([])
  const [turler, setTurler] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data: seriData } = await supabase
        .from('seriler')
        .select('*, kategoriler(isim)')
        .eq('slug', slug)
        .single()

      if (seriData) {
        setSeri(seriData)
        const [b, y, c, t] = await Promise.all([
          supabase.from('bolumler')
            .select('*, cevirmen:ekip!cevirmen_id(isim), balonlama:ekip!balonlama_id(isim), grafik:ekip!grafik_id(isim)')
            .eq('seri_id', seriData.id)
            .order('sayi'),
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
      }
      setLoading(false)
    }
    fetchData()
  }, [slug])

  if (loading) return (<><Navbar /><div style={{ padding: '80px 40px', color: 'var(--text-muted)', fontSize: '14px' }}>Yükleniyor...</div></>)
  if (!seri) return (<><Navbar /><div style={{ padding: '80px 40px', color: 'var(--text-muted)', fontSize: '14px' }}>Seri bulunamadı.</div></>)

  return (
    <>
      <Navbar />
      <div style={{ margin: '24px 40px 0' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← Kütüphaneye Dön
        </Link>
      </div>

      <div style={{ margin: '32px 40px', display: 'grid', gridTemplateColumns: '280px 1fr', gap: '48px', alignItems: 'start' }}>

        <div style={{ aspectRatio: '2/3', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {seri.kapak_url
            ? <img src={seri.kapak_url} alt={seri.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '40px', color: '#fff', letterSpacing: '2px' }}>{seri.baslik}</div>
          }
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {seri.kategoriler?.isim && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block' }}></span>
                {seri.kategoriler.isim}
              </span>
            )}
            {seri.kategori && <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>· {seri.kategori}</span>}
            {turler.map(t => (
              <span key={t} style={{ padding: '3px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '100px', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>{t}</span>
            ))}
          </div>

          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '44px', lineHeight: 1, letterSpacing: '0.5px', marginBottom: '10px' }}>
            {seri.baslik}
          </div>

          <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {yazarlar.length > 0 && <span style={{ color: 'var(--text)', fontWeight: 500 }}>{yazarlar.join(', ')}</span>}
            {yazarlar.length > 0 && cizerler.length > 0 && <span>·</span>}
            {cizerler.length > 0 && <span>{cizerler.join(', ')}</span>}
            {seri.yil && <><span>·</span><span>{seri.yil}</span></>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
            {[['Yayıncı', seri.kategoriler?.isim], ['Yıl', seri.yil], ['Durum', seri.durum]].filter(([, v]) => v).map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>

          {seri.ozet && (
            <>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '8px' }}>Özet</div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '28px' }}>{seri.ozet}</div>
            </>
          )}

          {bolumler.length > 0 && (
            <Link href={`/oku/${slug}/${bolumler[0].sayi}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--text)', color: '#fff', fontSize: '14px', fontWeight: 500, padding: '13px 24px', borderRadius: '12px', textDecoration: 'none', marginBottom: '32px' }}>
              📖 Okumaya Başla
            </Link>
          )}

          <div style={{ borderTop: '1px solid var(--border)' }}>
            {bolumler.map((ch) => (
              <Link key={ch.id} href={`/oku/${slug}/${ch.sayi}`} style={{ textDecoration: 'none' }}>
                <div
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 10px', borderBottom: '1px solid var(--border)', borderRadius: '6px', transition: 'background 0.1s' }}
                >
                  <div style={{ width: '54px', height: '72px', borderRadius: '6px', overflow: 'hidden', background: 'var(--border)', flexShrink: 0 }}>
                    {ch.kapak_url
                      ? <img src={ch.kapak_url} alt={ch.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--text-light)', fontWeight: 600 }}>#{ch.sayi}</div>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-light)' }}>#{ch.sayi}</span>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>{ch.baslik}</span>
                    </div>
                    {(ch.cevirmen?.isim || ch.balonlama?.isim || ch.grafik?.isim) && (
                      <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                        {[ch.cevirmen?.isim, ch.balonlama?.isim, ch.grafik?.isim].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>{new Date(ch.created_at).toLocaleDateString('tr-TR')}</span>
                    <span style={{ color: 'var(--text-light)' }}>→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}