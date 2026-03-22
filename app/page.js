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

function SectionHeader({ title, badge, link, linkText }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text)' }}>
          {title}
        </span>
        {badge !== undefined && (
          <span style={{ fontSize: '11px', color: 'var(--text-light)', background: 'var(--border)', borderRadius: '100px', padding: '2px 8px' }}>
            {badge}
          </span>
        )}
      </div>
      {link && (
        <Link href={link} style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {linkText || 'Tümünü Gör'} →
        </Link>
      )}
    </div>
  )
}

function SeriKart({ seri, buyuk }) {
  const [hover, setHover] = useState(false)
  return (
    <Link href={`/seri/${seri.slug}`} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ transition: 'transform 0.2s', transform: hover ? 'translateY(-4px)' : 'translateY(0)', cursor: 'pointer' }}
      >
        <div style={{
          aspectRatio: '2/3', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px',
          background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', color: '#fff', position: 'relative'
        }}>
          {seri.kapak_url
            ? <img src={seri.kapak_url} alt={seri.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
            : <span style={{ padding: '8px', textAlign: 'center', lineHeight: 1.2 }}>{seri.baslik}</span>
          }
          {seri.one_cikan && (
            <div style={{
              position: 'absolute', top: '8px', left: '8px',
              background: '#f59e0b', color: '#fff', fontSize: '9px', fontWeight: 700,
              padding: '2px 7px', borderRadius: '100px', letterSpacing: '0.5px', textTransform: 'uppercase'
            }}>Öne Çıkan</div>
          )}
          {seri.durum === 'Devam Eden' && (
            <div style={{
              position: 'absolute', bottom: '8px', right: '8px',
              background: 'rgba(22, 163, 74, 0.9)', color: '#fff', fontSize: '9px', fontWeight: 600,
              padding: '2px 7px', borderRadius: '100px'
            }}>Devam</div>
          )}
        </div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {seri.baslik}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.3px', textTransform: 'uppercase', fontWeight: 500 }}>
          {seri.kategoriler?.isim || seri.kategori || '—'}
        </div>
      </div>
    </Link>
  )
}

function BolumKart({ bolum }) {
  const [hover, setHover] = useState(false)
  const seri = bolum.seriler
  if (!seri) return null
  return (
    <Link href={`/oku/${bolum.id}`} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex', gap: '10px', padding: '10px', borderRadius: '12px',
          background: hover ? 'var(--surface)' : 'transparent', border: '1px solid',
          borderColor: hover ? 'var(--border)' : 'transparent', transition: 'all 0.15s', cursor: 'pointer'
        }}
      >
        <div style={{
          width: '48px', height: '68px', borderRadius: '8px', overflow: 'hidden',
          background: '#111', flexShrink: 0
        }}>
          {seri.kapak_url
            ? <img src={seri.kapak_url} alt={seri.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '8px', color: '#666', textAlign: 'center', padding: '2px' }}>{seri.baslik}</span>
              </div>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {seri.baslik}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bolum.sayi ? `Bölüm ${bolum.sayi}` : bolum.baslik}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-light)' }}>
            {zaman(bolum.created_at)}
          </div>
        </div>
      </div>
    </Link>
  )
}

function LoadingGrid() {
  return (
    <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
      {[...Array(8)].map((_, i) => (
        <div key={i}>
          <div style={{ aspectRatio: '2/3', borderRadius: '12px', background: 'var(--border)', marginBottom: '10px' }} />
          <div style={{ height: '14px', background: 'var(--border)', borderRadius: '4px', marginBottom: '6px' }} />
          <div style={{ height: '11px', background: 'var(--border)', borderRadius: '4px', width: '60%' }} />
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
        supabase
          .from('seriler')
          .select('*, kategoriler(isim)')
          .order('created_at', { ascending: false }),
        supabase
          .from('bolumler')
          .select('id, baslik, sayi, created_at, seri_id, seriler(baslik, slug, kapak_url)')
          .order('created_at', { ascending: false })
          .limit(12),
        supabase
          .from('kategoriler')
          .select('isim')
          .order('isim')
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
  const filtered = activeFilter === 'Tümü'
    ? seriler
    : seriler.filter(s => s.kategoriler?.isim === activeFilter)

  return (
    <main>
      <style>{`
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .grid-bolumler { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        @media (max-width: 900px) {
          .grid-4 { grid-template-columns: repeat(3, 1fr) !important; }
          .grid-bolumler { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
          .grid-bolumler { grid-template-columns: repeat(1, 1fr) !important; }
        }
      `}</style>

      <Navbar />
      <Hero seriler={heroSeriler} />

      {/* Öne Çıkan Section */}
      {!loading && oneCikanlar.length > 0 && (
        <section style={{ margin: '36px 24px 0' }}>
          <SectionHeader title="Öne Çıkan Seriler" badge={oneCikanlar.length} />
          <div className="grid-4">
            {oneCikanlar.map(seri => <SeriKart key={seri.id} seri={seri} />)}
          </div>
        </section>
      )}

      {/* Son Eklenen Bölümler */}
      {bolumler.length > 0 && (
        <section style={{ margin: '36px 24px 0' }}>
          <SectionHeader title="Son Eklenen Bölümler" link="/seriler" linkText="Tüm Seriler" />
          <div className="grid-bolumler">
            {bolumler.map(b => <BolumKart key={b.id} bolum={b} />)}
          </div>
        </section>
      )}

      {/* Tüm Seriler */}
      <section style={{ margin: '36px 24px 60px' }}>
        <SectionHeader title="Tüm Seriler" badge={filtered.length} />

        {/* Kategori Filtreleri */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {['Tümü', ...kategoriler.map(k => k.isim)].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '7px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                background: activeFilter === f ? 'var(--text)' : 'var(--surface)',
                border: `1px solid ${activeFilter === f ? 'var(--text)' : 'var(--border)'}`,
                color: activeFilter === f ? '#fff' : 'var(--text-muted)',
              }}
            >{f}</button>
          ))}
        </div>

        {loading ? (
          <LoadingGrid />
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
            <div style={{ fontSize: '15px', fontWeight: 500 }}>
              {activeFilter === 'Tümü' ? 'Henüz seri eklenmemiş' : `${activeFilter} kategorisinde seri yok`}
            </div>
            {activeFilter !== 'Tümü' && (
              <button
                onClick={() => setActiveFilter('Tümü')}
                style={{ marginTop: '12px', padding: '8px 18px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: '100px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
              >Tümünü Gör</button>
            )}
          </div>
        ) : (
          <div className="grid-4">
            {filtered.map(seri => <SeriKart key={seri.id} seri={seri} />)}
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}
