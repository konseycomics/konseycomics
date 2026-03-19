'use client'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import FilterBar from './components/FilterBar'
import Footer from './components/Footer'
import Link from 'next/link'

export default function Home() {
  const [activeFilter, setActiveFilter] = useState('Tümü')
  const [seriler, setSeriler] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSeriler() {
      const { data, error } = await supabase
        .from('seriler')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('data:', data, 'error:', error)
console.log('data:', data, 'error:', error)
setSeriler(data || [])
setLoading(false)
console.log('loading false yapıldı')
    }
    fetchSeriler()
  }, [])

  const filtered = activeFilter === 'Tümü'
    ? seriler
    : seriler.filter(s => s.yayinci === activeFilter || s.turler?.includes(activeFilter))

  return (
    <main>
      <Navbar />
      <Hero />
      <FilterBar active={activeFilter} setActive={setActiveFilter} />

      <div style={{ margin: '36px 40px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            En Son Eklenenler
          </span>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Henüz seri eklenmemiş.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
            {filtered.map(seri => (
              <Link key={seri.id} href={`/seri/${seri.slug}`} style={{ textDecoration: 'none' }}>
                <div
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  style={{ transition: 'transform 0.2s', cursor: 'pointer' }}
                >
                  <div style={{
                    aspectRatio: '2/3', borderRadius: '10px', overflow: 'hidden',
                    marginBottom: '10px', background: seri.renk || '#111',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px',
                    color: '#fff', letterSpacing: '1px',
                  }}>
                    {seri.kapak_url ? (
                      <img src={seri.kapak_url} alt={seri.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      seri.label || seri.baslik
                    )}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {seri.baslik}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-light)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    {seri.yayinci}
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