'use client'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

function driveEmbedUrl(link) {
  if (!link) return null
  const match = link.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (match) return `https://drive.google.com/file/d/${match[1]}/preview`
  return link
}

export default function Okuyucu() {
  const { slug, bolum } = useParams()
  const router = useRouter()
  const [bolumData, setBolumData] = useState(null)
  const [tumBolumler, setTumBolumler] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data: seriData } = await supabase
        .from('seriler')
        .select('id, baslik')
        .eq('slug', slug)
        .single()

      if (!seriData) { setLoading(false); return }

      const [b, tb] = await Promise.all([
        supabase.from('bolumler').select('*').eq('seri_id', seriData.id).eq('sayi', parseInt(bolum)).single(),
        supabase.from('bolumler').select('sayi, baslik').eq('seri_id', seriData.id).order('sayi'),
      ])

      setBolumData({ ...b.data, seriBaslik: seriData.baslik })
      setTumBolumler(tb.data || [])
      setLoading(false)
    }
    fetchData()
  }, [slug, bolum])

  const siradakiSayi = tumBolumler.find(b => b.sayi > parseInt(bolum))?.sayi
  const oncekiSayi = [...tumBolumler].reverse().find(b => b.sayi < parseInt(bolum))?.sayi
  const embedUrl = driveEmbedUrl(bolumData?.drive_link)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontFamily: "'DM Sans', sans-serif" }}>Yükleniyor...</div>
    </div>
  )

  if (!bolumData) return (
    <div style={{ minHeight: '100vh', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontFamily: "'DM Sans', sans-serif" }}>Bölüm bulunamadı.</div>
    </div>
  )

  return (
    <div style={{ background: '#1a1a1a', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>

      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(20,20,20,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 24px', display: 'flex', alignItems: 'center', height: '52px', gap: '16px' }}>
        <button onClick={() => router.push(`/seri/${slug}`)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          ← Geri
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{bolumData.seriBaslik}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>#{bolum} — {bolumData.baslik}</div>
        </div>
        <select value={bolum} onChange={e => router.push(`/oku/${slug}/${e.target.value}`)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer' }}>
          {tumBolumler.map(b => (
            <option key={b.sayi} value={b.sayi} style={{ background: '#1a1a1a' }}>Bölüm #{b.sayi} — {b.baslik}</option>
          ))}
        </select>
      </nav>

      {embedUrl ? (
        <div style={{ width: '100%', height: 'calc(100vh - 52px - 60px)' }}>
          <iframe src={embedUrl} style={{ width: '100%', height: '100%', border: 'none' }} allow="autoplay" title={bolumData.baslik} />
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 52px - 60px)', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '32px' }}>📭</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Bu bölüm için henüz içerik eklenmemiş.</div>
        </div>
      )}

      <div style={{ position: 'sticky', bottom: 0, background: 'rgba(20,20,20,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => oncekiSayi && router.push(`/oku/${slug}/${oncekiSayi}`)} disabled={!oncekiSayi}
          style={{ padding: '8px 16px', background: oncekiSayi ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: oncekiSayi ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: '13px', cursor: oncekiSayi ? 'pointer' : 'default', fontFamily: 'inherit' }}>
          ← Önceki
        </button>

        {bolumData.indirme_link && (
          <a href={bolumData.indirme_link} target="_blank" rel="noreferrer" style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', textDecoration: 'none', fontFamily: 'inherit' }}>
            ⬇ İndir
          </a>
        )}

        <button onClick={() => siradakiSayi && router.push(`/oku/${slug}/${siradakiSayi}`)} disabled={!siradakiSayi}
          style={{ padding: '8px 16px', background: siradakiSayi ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: siradakiSayi ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: '13px', cursor: siradakiSayi ? 'pointer' : 'default', fontFamily: 'inherit' }}>
          Sonraki →
        </button>
      </div>
    </div>
  )
}