'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const FILTRELER = ['Tümü', 'Marvel', 'DC', 'Bağımsız', 'Manga', 'Webtoon']
const DURUMLAR = ['Tümü', 'Devam Eden', 'Tamamlandı', 'Tek Sayılık']

function temizFiltre(deger) {
  if (!deger) return 'Tümü'
  return FILTRELER.find(item => item.toLocaleLowerCase('tr-TR') === String(deger).toLocaleLowerCase('tr-TR')) || 'Tümü'
}

export default function SerilerSayfasi() {
  const searchParams = useSearchParams()
  const [seriler, setSeriler] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('Tümü')
  const [durum, setDurum] = useState('Tümü')
  const [siralama, setSiralama] = useState('yeni')

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from('seriler').select('*, kategoriler(isim)').order('created_at', { ascending: false })
      setSeriler(data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  useEffect(() => {
    setFiltre(temizFiltre(searchParams.get('filtre')))
  }, [searchParams])

  let filtered = seriler
  if (filtre !== 'Tümü') filtered = filtered.filter(s => s.kategoriler?.isim === filtre || s.kategori?.toLowerCase() === filtre.toLowerCase())
  if (durum !== 'Tümü') filtered = filtered.filter(s => s.durum === durum)
  if (siralama === 'az') filtered = [...filtered].sort((a, b) => a.baslik.localeCompare(b.baslik, 'tr'))
  else if (siralama === 'za') filtered = [...filtered].sort((a, b) => b.baslik.localeCompare(a.baslik, 'tr'))

  return (
    <>
      <Navbar />
      <div style={{ margin: '32px 24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '40px' }}>TÜM SERİLER</div>
          {!loading && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{filtered.length} seri</div>}
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {FILTRELER.map(f => (
              <button key={f} onClick={() => setFiltre(f)} style={{ padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', background: filtre === f ? 'var(--text)' : 'var(--surface)', color: filtre === f ? '#fff' : 'var(--text-muted)', border: `1px solid ${filtre === f ? 'var(--text)' : 'var(--border)'}` }}>{f}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {DURUMLAR.map(d => (
              <button key={d} onClick={() => setDurum(d)} style={{ padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', background: durum === d ? '#111' : 'var(--surface)', color: durum === d ? '#fff' : 'var(--text-muted)', border: `1px solid ${durum === d ? '#111' : 'var(--border)'}` }}>{d}</button>
            ))}
          </div>
          <select value={siralama} onChange={e => setSiralama(e.target.value)} style={{ marginLeft: 'auto', padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer' }}>
            <option value="yeni">En Yeni</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>
        </div>
        {loading ? (
          <div style={{ color: 'var(--text-muted)' }}>Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <div>Bu filtreye uygun seri bulunamadı.</div>
            <button onClick={() => { setFiltre('Tümü'); setDurum('Tümü') }} style={{ marginTop: '12px', padding: '8px 16px', background: 'var(--text)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Filtreleri Temizle</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
            {filtered.map(seri => (
              <Link key={seri.id} href={`/seri/${seri.slug}`} style={{ textDecoration: 'none' }}>
                <div onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'} style={{ transition: 'transform 0.2s', cursor: 'pointer' }}>
                  <div style={{ aspectRatio: '2/3', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', color: '#fff' }}>
                    {seri.kapak_url ? <img src={seri.kapak_url} alt={seri.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" /> : <span style={{ padding: '8px', textAlign: 'center' }}>{seri.baslik}</span>}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>{seri.baslik}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{seri.kategoriler?.isim || seri.kategori}</div>
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
