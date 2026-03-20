'use client'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Footer from './components/Footer'
import Link from 'next/link'

const FILTRELER = ['Tümü', 'Marvel', 'DC', 'Bağımsız', 'Manga', 'Webtoon']

export default function Home() {
  const [activeFilter, setActiveFilter] = useState('Tümü')
  const [seriler, setSeriler] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from('seriler')
        .select('*, kategoriler(isim)')
        .order('created_at', { ascending: false })
      setSeriler(data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const filtered = activeFilter === 'Tümü'
    ? seriler
    : seriler.filter(s =>
        s.kategoriler?.isim === activeFilter ||
        s.kategori?.toLowerCase() === activeFilter.toLowerCase()
      )

  return (
    <main>
      <Navbar />
      <Hero seriler={seriler} />

      <div style={{ margin: '28px 24px 0', display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {FILTRELER.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)} style={{
            padding: '7px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            background: activeFilter === f ? 'var(--text)' : 'var(--surface)',
            border: `1px solid ${activeFilter === f ? 'var(--text)' : 'var(--border)'}`,
            color: activeFilter === f ? '#fff' : 'var(--text-muted)',
          }}>{f}</button>
        ))}
      </div>

      <div style={{ margin: '28px 24px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            En Son Eklenenler
          </span>
          {!loading && (
            <span style={{ fontSize: '12px', color: 'var(--text-light)', background: 'var(--border)', borderRadius: '100px', padding: '2px 8px' }}>
              {filtered.length}
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
            {[...Array(10)].map((_, i) => (
              <div key={i}>
                <div style={{ aspectRatio: '2/3', borderRadius: '10px', background: 'var(--border)', marginBottom: '10px' }} />
                <div style={{ height: '14px', background: 'var(--border)', borderRadius: '4px', marginBottom: '6px' }} />
                <div style={{ height: '11px', background: 'var(--border)', borderRadius: '4px', width: '60%' }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
            <div style={{ fontSize: '16px', fontWeight: 500 }}>
              {activeFilter === 'Tümü' ? 'Henüz seri eklenmemiş' : `${activeFilter} kategorisinde seri yok`}
            </div>
            {activeFilter !== 'Tümü' && (
              <button onClick={() => setActiveFilter('Tümü')} style={{ marginTop: '12px', padding: '8px 16px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Tümünü Gör
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
            {filtered.map(seri => (
              <Link key={seri.id} href={`/seri/${seri.slug}`} style={{ textDecoration: 'none' }}>
                <div
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  style={{ transition: 'transform 0.2s', cursor: 'pointer' }}
                >
                  <div style={{ aspectRatio: '2/3', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', color: '#fff' }}>
                    {seri.kapak_url
                      ? <img src={seri.kapak_url} alt={seri.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      : <span style={{ padding: '8px', textAlign: 'center', lineHeight: 1.2 }}>{seri.baslik}</span>
                    }
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {seri.baslik}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-light)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                      {seri.kategoriler?.isim || seri.kategori}
                    </span>
                    {seri.durum && seri.durum !== 'Tek Sayılık' && (
                      <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '100px', fontWeight: 500, background: seri.durum === 'Devam Eden' ? '#dcfce7' : '#f0f0f0', color: seri.durum === 'Devam Eden' ? '#166534' : '#666' }}>
                        {seri.durum === 'Devam Eden' ? 'Devam' : 'Bitti'}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </main>
  )
}