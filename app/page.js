'use client'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Footer from './components/Footer'
import Link from 'next/link'

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

function SectionHeader({ title, subtitle, link, linkText }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px' }}>
      <div>
        {subtitle && (
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
            {subtitle}
          </div>
        )}
        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>
          {title}
        </div>
      </div>
      {link && (
        <Link href={link} style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap', marginLeft: '16px' }}>
          {linkText || 'Tümünü Gör'} →
        </Link>
      )}
    </div>
  )
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
            ? <img src={seri.kapak_url} alt={seri.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', transform: hover ? 'scale(1.04)' : 'scale(1)' }} loading="lazy" />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', color: '#fff', padding: '12px', textAlign: 'center', lineHeight: 1.2 }}>{seri.baslik}</div>
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

function BolumKart({ bolum }) {
  const [hover, setHover] = useState(false)
  const seri = bolum.seriler
  if (!seri) return null
  const cover = bolum.kapak_url || seri.kapak_url
  return (
    <Link href={`/oku/${seri.slug}/${bolum.sayi}`} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ cursor: 'pointer' }}
      >
        <div style={{
          position: 'relative', aspectRatio: '2/3', borderRadius: '10px',
          overflow: 'hidden', marginBottom: '8px', background: '#111'
        }}>
          {cover
            ? <img src={cover} alt={seri.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', transform: hover ? 'scale(1.05)' : 'scale(1)' }} loading="lazy" />
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

function LoadingGrid({ count = 8 }) {
  return (
    <div className="grid-4">
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

export default function Home() {
  const [seriler, setSeriler] = useState([])
  const [bolumler, setBolumler] = useState([])
  const [kategoriler, setKategoriler] = useState([])
  const [activeFilter, setActiveFilter] = useState('Tümü')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      const [{ data: sData }, { data: bData }, { data: kData }] = await Promise.all([
        supabase.from('seriler').select('*, kategoriler(isim)').order('created_at', { ascending: false }),
        supabase.from('bolumler').select('id, baslik, sayi, kapak_url, created_at, seri_id, seriler(baslik, slug, kapak_url)').order('created_at', { ascending: false }).limit(4),
        supabase.from('kategoriler').select('isim').order('isim')
      ])
      setSeriler(sData || [])
      setBolumler(bData || [])
      setKategoriler(kData || [])
      setLoading(false)
    }
    fetchAll()
  }, [])

  const oneCikanlar = seriler.filter(s => s.one_cikan)
  const heroSeriler = oneCikanlar.length > 0 ? oneCikanlar : seriler
  const filtered = activeFilter === 'Tümü' ? seriler : seriler.filter(s => s.kategoriler?.isim === activeFilter)

  return (
    <main>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .grid-bolumler { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        @media (max-width: 960px) {
          .grid-4 { grid-template-columns: repeat(3, 1fr) !important; }
          .grid-bolumler { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
          .grid-bolumler { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <Navbar />
      <Hero seriler={heroSeriler} />

      {/* Son Eklenen Bölümler */}
      {(bolumler.length > 0 || loading) && (
        <section style={{ margin: '40px 28px 0' }}>
          <SectionHeader title="Son Eklenen Bölümler" subtitle="Güncel" link="/seriler" linkText="Tümünü Gör" />
          {loading
            ? <div className="grid-bolumler"><LoadingGrid count={4} /></div>
            : <div className="grid-bolumler">{bolumler.map(b => <BolumKart key={b.id} bolum={b} />)}</div>
          }
        </section>
      )}

      {/* Öne Çıkan Seriler */}
      {!loading && oneCikanlar.length > 0 && (
        <section style={{ margin: '44px 28px 0' }}>
          <SectionHeader title="Öne Çıkan Seriler" subtitle="Küratör Seçimi" />
          <div className="grid-4">{oneCikanlar.map(s => <SeriKart key={s.id} seri={s} />)}</div>
        </section>
      )}

      {/* Tüm Seriler */}
      <section style={{ margin: '44px 28px 64px' }}>
        <SectionHeader title="Tüm Seriler" subtitle="Küratör Seçimi" />
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '22px' }}>
          {['Tümü', ...kategoriler.map(k => k.isim)].map(f => (
            <button key={f} onClick={() => setActiveFilter(f)} style={{
              padding: '7px 18px', borderRadius: '100px', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              background: activeFilter === f ? 'var(--text)' : 'var(--surface)',
              border: `1px solid ${activeFilter === f ? 'var(--text)' : 'var(--border)'}`,
              color: activeFilter === f ? '#fff' : 'var(--text-muted)',
            }}>{f}</button>
          ))}
        </div>
        {loading
          ? <LoadingGrid />
          : filtered.length === 0
            ? <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>📭</div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>
                  {activeFilter === 'Tümü' ? 'Henüz seri eklenmemiş' : `${activeFilter} kategorisinde seri yok`}
                </div>
                {activeFilter !== 'Tümü' && (
                  <button onClick={() => setActiveFilter('Tümü')} style={{ marginTop: '12px', padding: '8px 18px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: '100px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Tümünü Gör
                  </button>
                )}
              </div>
            : <div className="grid-4">{filtered.map(s => <SeriKart key={s.id} seri={s} />)}</div>
        }
      </section>

      <Footer />
    </main>
  )
}
