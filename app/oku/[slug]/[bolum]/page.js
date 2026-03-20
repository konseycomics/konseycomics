'use client'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import YorumSistemi from '../../../components/YorumSistemi'

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
  const [iframeHata, setIframeHata] = useState(false)
  const [yorumAcik, setYorumAcik] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const { data: seriData } = await supabase
        .from('seriler').select('id, baslik').eq('slug', slug).single()
      if (!seriData) { setLoading(false); return }

      const [b, tb] = await Promise.all([
        supabase.from('bolumler').select('*').eq('seri_id', seriData.id).eq('sayi', parseInt(bolum)).single(),
        supabase.from('bolumler').select('sayi, baslik').eq('seri_id', seriData.id).order('sayi'),
      ])

      if (b.data) {
        setBolumData({ ...b.data, seriBaslik: seriData.baslik })
        // Okuma geçmişine ekle
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          await supabase.from('okuma_gecmisi').upsert([{
            kullanici_id: session.user.id,
            bolum_id: b.data.id,
            seri_id: seriData.id,
          }], { onConflict: 'kullanici_id,bolum_id' })
        }
        // Görüntülenme artır
        await supabase.rpc('increment_bolum_goruntuleme', { bolum_id: b.data.id })
      }
      setTumBolumler(tb.data || [])
      setLoading(false)
    }
    fetchData()
  }, [slug, bolum])

  const siradakiSayi = tumBolumler.find(b => b.sayi > parseInt(bolum))?.sayi
  const oncekiSayi = [...tumBolumler].reverse().find(b => b.sayi < parseInt(bolum))?.sayi

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowRight' && siradakiSayi) router.push(`/oku/${slug}/${siradakiSayi}`)
    if (e.key === 'ArrowLeft' && oncekiSayi) router.push(`/oku/${slug}/${oncekiSayi}`)
  }, [siradakiSayi, oncekiSayi, slug, router])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const embedUrl = driveEmbedUrl(bolumData?.drive_link)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontFamily: "'DM Sans', sans-serif" }}>Yükleniyor...</div>
    </div>
  )

  if (!bolumData) return (
    <div style={{ minHeight: '100vh', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '48px' }}>📭</div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontFamily: "'DM Sans', sans-serif" }}>Bölüm bulunamadı.</div>
      <button onClick={() => router.push(`/seri/${slug}`)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>
        Seri Sayfasına Dön
      </button>
    </div>
  )

  return (
    <div style={{ background: '#1a1a1a', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Üst bar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(20,20,20,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 20px', display: 'flex', alignItems: 'center', height: '52px', gap: '12px' }}>
        <button onClick={() => router.push(`/seri/${slug}`)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
          ← Geri
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bolumData.seriBaslik}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>#{bolum} — {bolumData.baslik}</div>
        </div>
        <button onClick={() => setYorumAcik(!yorumAcik)} style={{ padding: '6px 12px', background: yorumAcik ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
          💬 Yorumlar
        </button>
        <select value={bolum} onChange={e => router.push(`/oku/${slug}/${e.target.value}`)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer', maxWidth: '160px' }}>
          {tumBolumler.map(b => (
            <option key={b.sayi} value={b.sayi} style={{ background: '#1a1a1a' }}>#{b.sayi} — {b.baslik}</option>
          ))}
        </select>
      </nav>

      {/* İçerik */}
      {embedUrl && !iframeHata ? (
        <div style={{ width: '100%', height: yorumAcik ? 'calc(50vh)' : 'calc(100vh - 52px - 60px)' }}>
          <iframe src={embedUrl} style={{ width: '100%', height: '100%', border: 'none' }} allow="autoplay" title={bolumData.baslik} onError={() => setIframeHata(true)} />
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 52px - 60px)', flexDirection: 'column', gap: '16px', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px' }}>{bolumData.drive_link ? '⚠️' : '📭'}</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', fontWeight: 500 }}>
            {bolumData.drive_link ? 'İçerik yüklenemedi' : 'Bu bölüm için henüz içerik eklenmemiş'}
          </div>
          {bolumData.drive_link && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {bolumData.indirme_link && (
                <a href={bolumData.indirme_link} target="_blank" rel="noreferrer" style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '13px' }}>⬇ İndir</a>
              )}
              <a href={bolumData.drive_link} target="_blank" rel="noreferrer" style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '13px' }}>Drive'da Aç</a>
            </div>
          )}
        </div>
      )}

      {/* Yorum paneli */}
      {yorumAcik && (
        <div style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)', padding: '0 20px 40px', minHeight: '40vh' }}>
          <YorumSistemi bolumId={bolumData.id} seriId={bolumData.seri_id} />
        </div>
      )}

      {/* Alt bar */}
      <div style={{ position: 'sticky', bottom: 0, background: 'rgba(20,20,20,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '0 20px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <button onClick={() => oncekiSayi && router.push(`/oku/${slug}/${oncekiSayi}`)} disabled={!oncekiSayi}
          style={{ padding: '8px 14px', background: oncekiSayi ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: oncekiSayi ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: '13px', cursor: oncekiSayi ? 'pointer' : 'default', fontFamily: 'inherit' }}>
          ← Önceki
        </button>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
          {tumBolumler.findIndex(b => b.sayi === parseInt(bolum)) + 1} / {tumBolumler.length}
        </span>
        {bolumData.indirme_link && (
          <a href={bolumData.indirme_link} target="_blank" rel="noreferrer" style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', textDecoration: 'none', fontFamily: 'inherit' }}>
            ⬇ İndir
          </a>
        )}
        <button onClick={() => siradakiSayi && router.push(`/oku/${slug}/${siradakiSayi}`)} disabled={!siradakiSayi}
          style={{ padding: '8px 14px', background: siradakiSayi ? 'rgba(255,255,255,0.08)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: siradakiSayi ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: '13px', cursor: siradakiSayi ? 'pointer' : 'default', fontFamily: 'inherit' }}>
          Sonraki →
        </button>
      </div>
    </div>
  )
}