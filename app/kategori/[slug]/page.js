'use client'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import Link from 'next/link'

const ADLAR = { 'cizgi-roman': 'Çizgi Roman', 'manga': 'Manga', 'webtoon': 'Webtoon' }

export default function KategoriSayfasi() {
  const { slug } = useParams()
  const [seriler, setSeriler] = useState([])
  const [loading, setLoading] = useState(true)
  const kategoriAdi = ADLAR[slug] || slug

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from('seriler')
        .select('*, kategoriler(isim)')
        .eq('kategori', kategoriAdi.toLowerCase())
        .order('created_at', { ascending: false })
      setSeriler(data || [])
      setLoading(false)
    }
    fetchData()
  }, [slug, kategoriAdi])

  return (
    <>
      <Navbar />
      <div style={{ margin: '32px 24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href="/" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>← Ana Sayfa</Link>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '40px', marginTop: '8px' }}>{kategoriAdi.toUpperCase()}</div>
          {!loading && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{seriler.length} seri</div>}
        </div>
        {loading ? (
          <div style={{ color: 'var(--text-muted)' }}>Yükleniyor...</div>
        ) : seriler.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
            <div>Bu kategoride henüz seri yok.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
            {seriler.map(seri => (
              <Link key={seri.id} href={`/seri/${seri.slug}`} style={{ textDecoration: 'none' }}>
                <div onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'} style={{ transition: 'transform 0.2s', cursor: 'pointer' }}>
                  <div style={{ aspectRatio: '2/3', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', color: '#fff' }}>
                    {seri.kapak_url ? <img src={seri.kapak_url} alt={seri.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" /> : <span style={{ padding: '8px', textAlign: 'center' }}>{seri.baslik}</span>}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seri.baslik}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>{seri.durum}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}