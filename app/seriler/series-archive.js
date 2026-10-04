'use client'

import { useEffect, useRef, useState, startTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Search, X, ArrowDown, RotateCcw, BookOpen, Star, Clock3, TrendingUp, MessageSquare, Eye } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { supabase } from '../lib/supabase'
import { ARCHIVE_FORMATS, archiveCategory, archiveFormat, archiveFilters, filterArchive, isArchiveSeries } from '../lib/seriesArchive'
import { isRecentlyAddedSeries } from '../lib/seriesBadges'
import './series-archive.css'

const PAGE_SIZE = 24
const CATEGORY_CHOICES = [
  { name: 'Marvel', logo: '/brands/marvel.png' },
  { name: 'DC', logo: '/brands/dc.png' },
  { name: 'Bağımsız', logo: '/brands/independent.png' },
  { name: 'Yerli Eserler', logo: '/brands/local.png' },
]
const SORT_ICONS = { yeni: Clock3, okunan: TrendingUp, populer: Star, degerlendirilen: MessageSquare }
const countFormatter = new Intl.NumberFormat('tr-TR')

function SeriesCard({ series }) {
  const count = series.bolumler?.[0]?.count || 0
  const rating = Number(series.ortalama_puan || 0)
  return <Link className="archive-card" href={`/seri/${series.slug}`}>
    <div className="archive-cover">
      {series.kapak_url ? <Image src={series.kapak_url} alt={series.baslik} fill sizes="(max-width: 600px) 45vw, (max-width: 1000px) 30vw, (max-width: 1400px) 23vw, 270px" /> : <span className="archive-cover-fallback"><BookOpen size={32} />{series.baslik}</span>}
      <span className="archive-cover-category">{archiveCategory(series)}</span>
      {isRecentlyAddedSeries(series.created_at) && <span className="archive-new">Yeni</span>}
    </div>
    <h2>{series.baslik}</h2>
    <div className="archive-card-rating"><Star size={15} fill="currentColor" /><strong>{rating > 0 ? `${rating.toFixed(1).replace('.', ',')} / 10` : 'Henüz puan yok'}</strong></div>
    <div className="archive-card-reviews">{countFormatter.format(Number(series.puan_sayisi || 0))} değerlendirme</div>
    <div className="archive-card-info"><span>{count} sayı</span><span title="Görüntülenme" aria-label={`${countFormatter.format(Number(series.goruntuleme_sayisi || 0))} görüntülenme`}><Eye size={14} />{countFormatter.format(Number(series.goruntuleme_sayisi || 0))}</span></div>
    <div className="archive-card-status"><span>{archiveFormat(series) === 'tek' ? 'Tek Sayılık' : series.durum || 'Seri'}</span>{series.yil && <span>{series.yil}</span>}</div>
  </Link>
}

export default function SeriesArchive() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filters = archiveFilters(searchParams)
  const [data, setData] = useState({ series: [], genres: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [search, setSearch] = useState(filters.query)
  const searchParamsRef = useRef(searchParams)

  useEffect(() => { searchParamsRef.current = searchParams }, [searchParams])

  useEffect(() => {
    let active = true
    async function load() {
      const [series, genres] = await Promise.all([
        supabase.from('seriler').select('id, baslik, slug, ozet, kapak_url, tur, turler, kategori, durum, yil, created_at, ortalama_puan, puan_sayisi, goruntuleme_sayisi, kategoriler(isim), bolumler(count)').order('created_at', { ascending: false }),
        supabase.from('turler').select('id, isim').order('isim'),
      ])
      if (!active) return
      setError(!!(series.error || genres.error))
      setData({ series: (series.data || []).filter(isArchiveSeries), genres: genres.data || [] })
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [retry])

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSearch(filters.query))
    return () => cancelAnimationFrame(frame)
  }, [filters.query])

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(PAGE_SIZE))
    return () => cancelAnimationFrame(frame)
  }, [searchParams])

  function update(values, push = true) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(values)) {
      if (key === 'kategori') { params.delete('evren'); params.delete('filtre') }
      if (!value || (key === 'sirala' && value === 'yeni')) params.delete(key)
      else params.set(key, value)
    }
    startTransition(() => { router[push ? 'push' : 'replace'](`/seriler${params.size ? `?${params}` : ''}`, { scroll: false }) })
    setVisible(PAGE_SIZE)
  }

  useEffect(() => {
    if (search === filters.query) return
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current.toString())
      if (search.trim()) params.set('q', search.trim())
      else params.delete('q')
      startTransition(() => router.replace(`/seriler${params.size ? `?${params}` : ''}`, { scroll: false }))
    }, 300)
    return () => clearTimeout(timer)
  }, [search, filters.query, router])

  const statuses = [...new Set(data.series.map(item => item.durum).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'))
  const results = filterArchive(data.series, filters)
  const activeFilters = [
    filters.format && { key: 'format', label: filters.format === 'tek' ? 'Tek Sayılıklar' : 'Seriler' },
    filters.category && { key: 'kategori', label: filters.category },
    filters.genre && { key: 'tur', label: data.genres.find(item => item.id === filters.genre)?.isim || 'Tür' },
    filters.status && { key: 'durum', label: filters.status },
    filters.local && { key: 'yerli', label: 'Yerli Eserler' },
  ].filter(Boolean)

  function reset() { setSearch(''); router.push('/seriler', { scroll: false }); setVisible(PAGE_SIZE) }

  return <><Navbar /><main className="archive-page site-shell">
    <header className="archive-heading"><h1>Seriler</h1></header>
    <div className="archive-tabs" aria-label="Eser biçimi">{ARCHIVE_FORMATS.map(item => <button key={item.value} aria-pressed={filters.format === item.value} onClick={() => update({ format: item.value })}>{item.label}<span>{loading ? '–' : data.series.filter(series => !item.value || archiveFormat(series) === item.value).length}</span></button>)}</div>
    <div className="archive-categories" aria-label="Evren ve kategori">{CATEGORY_CHOICES.map(item => {
      const selected = filters.category === item.name
      return <button key={item.name} className="archive-category-choice" aria-pressed={selected} aria-label={item.name} onClick={() => update({ kategori: selected ? '' : item.name })}>
        <span className="archive-category-symbol"><Image src={item.logo} alt="" width={160} height={90} /></span>
        <span>{item.name}</span>
      </button>
    })}</div>
    <div className="archive-sort-buttons" aria-label="Sıralama">{['yeni', 'okunan', 'populer', 'degerlendirilen'].map(value => {
      const Icon = SORT_ICONS[value]
      const label = value === 'yeni' ? 'Son Eklenenler' : value === 'okunan' ? 'En Çok Okunanlar' : value === 'populer' ? 'En Yüksek Puanlılar' : 'En Çok Değerlendirilenler'
      return <button key={value} aria-pressed={filters.sort === value} onClick={() => update({ sirala: value })}><Icon size={21} /><span>{label}</span></button>
    })}</div>
    <div className="archive-layout">
      <section className="archive-results" aria-label="Arşiv sonuçları">
        <div className="archive-search"><Search size={21} /><input aria-label="Arşivde ara" placeholder="Seri adı ara…" value={search} onChange={event => setSearch(event.target.value)} />{search && <button title="Aramayı temizle" aria-label="Aramayı temizle" onClick={() => { setSearch(''); update({ q: '' }, false) }}><X size={18} /></button>}</div>
        <div className="archive-inline-filters" aria-label="Arşiv filtreleri">
          <div className="archive-filter-group" role="group" aria-labelledby="archive-genre-title"><h2 id="archive-genre-title">Türler</h2><div className="archive-filter-options"><button aria-pressed={!filters.genre} onClick={() => update({ tur: '' })}>Tüm Türler</button>{data.genres.map(item => <button key={item.id} aria-pressed={filters.genre === item.id} onClick={() => update({ tur: filters.genre === item.id ? '' : item.id })}>{item.isim}</button>)}</div></div>
          <div className="archive-filter-group" role="group" aria-labelledby="archive-status-title"><h2 id="archive-status-title">Yayın Durumu</h2><div className="archive-filter-options"><button aria-pressed={!filters.status} onClick={() => update({ durum: '' })}>Tüm Durumlar</button>{statuses.map(item => <button key={item} aria-pressed={filters.status === item} onClick={() => update({ durum: filters.status === item ? '' : item })}>{item}</button>)}</div></div>
        </div>
        <div className="archive-result-toolbar"><span aria-live="polite">{loading ? 'Yükleniyor…' : error ? '' : `${results.length} eser`}</span><button onClick={() => update({ sirala: filters.sort === 'az' ? 'yeni' : 'az' })} aria-pressed={filters.sort === 'az'} aria-label="Alfabetik sırala">A–Z</button></div>
        {activeFilters.length > 0 && <div className="archive-active-filters">{activeFilters.map(item => <button key={item.key} onClick={() => update({ [item.key]: '' })} aria-label={`${item.label} filtresini kaldır`}>{item.label}<X size={13} /></button>)}<button className="archive-clear-all" onClick={reset}><RotateCcw size={13} />Temizle</button></div>}
        {loading ? <div className="archive-grid" aria-busy="true">{Array.from({ length: 8 }, (_, index) => <div key={index} className="archive-skeleton" />)}</div>
          : error ? <div className="archive-empty" role="alert"><h2>Arşiv yüklenemedi</h2><button onClick={() => { setLoading(true); setError(false); setRetry(count => count + 1) }}>Tekrar Dene</button></div>
          : results.length === 0 ? <div className="archive-empty"><BookOpen size={30} /><h2>Sonuç bulunamadı</h2><button onClick={reset}>Seçimleri Temizle</button></div>
          : <><div className="archive-grid">{results.slice(0, visible).map(series => <SeriesCard key={series.id} series={series} />)}</div>{visible < results.length && <button className="archive-load" onClick={() => setVisible(count => count + PAGE_SIZE)}><ArrowDown size={17} />Daha Fazla Göster</button>}</>}
      </section>
    </div>
  </main><Footer /></>
}
