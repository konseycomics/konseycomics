'use client'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { getPublicProfileByUsername } from '../../lib/publicProfiles'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import TakipButonu from '../../components/TakipButonu'
import Link from 'next/link'

const ROL_RENK = {
  okuyucu: { bg: '#f0f0f0', text: '#555' },
  cevirmeni: { bg: '#dbeafe', text: '#1e40af' },
  grafik: { bg: '#fce7f3', text: '#9d174d' },
  editor: { bg: '#d1fae5', text: '#065f46' },
  moderator: { bg: '#fef3c7', text: '#92400e' },
  admin: { bg: '#fee2e2', text: '#991b1b' },
  yonetici: { bg: '#ede9fe', text: '#5b21b6' },
}

const LISTE_ETIKET = {
  okunuyor: '📖 Okunuyor',
  okundu: '✅ Okundu',
  okumak_istiyorum: '🔖 Okuyacaklar',
  birakildí: '⏸ Bırakıldı',
}

export default function ProfilSayfasi() {
  const { kullaniciAdi } = useParams()
  const [profil, setProfil] = useState(null)
  const [rozetler, setRozetler] = useState([])
  const [okumalistesi, setOkumaListesi] = useState([])
  const [benimProfil, setBenimProfil] = useState(false)
  const [loading, setLoading] = useState(true)
  const [aktifSekme, setAktifSekme] = useState('liste')

  useEffect(() => {
    async function fetchData() {
      const [profilRes, sessionRes] = await Promise.all([
        getPublicProfileByUsername(kullaniciAdi),
        supabase.auth.getSession()
      ])

      if (!profilRes.data) { setLoading(false); return }
      setProfil(profilRes.data)

      const benimId = sessionRes.data.session?.user?.id
      setBenimProfil(benimId === profilRes.data.id)

      const [rozetRes, listeRes] = await Promise.all([
        supabase.from('kullanici_rozetleri').select('*, rozet_tanimlari(*)').eq('kullanici_id', profilRes.data.id).order('kazanildi_at'),
        benimId === profilRes.data.id
          ? supabase.from('okuma_listesi').select('*, seriler(id, baslik, slug, kapak_url, kategori)').eq('kullanici_id', profilRes.data.id).order('updated_at', { ascending: false })
          : Promise.resolve({ data: [] })
      ])

      setRozetler(rozetRes.data || [])
      setOkumaListesi(listeRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [kullaniciAdi])

  if (loading) return <><Navbar /><div style={{ padding: '80px 24px', color: 'var(--text-muted)' }}>Yükleniyor...</div></>

  if (!profil) return (
    <>
      <Navbar />
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
        <div style={{ fontSize: '16px', color: 'var(--text-muted)' }}>Kullanıcı bulunamadı.</div>
        <Link href="/" style={{ display: 'inline-block', marginTop: '16px', color: 'var(--text)', fontWeight: 500, textDecoration: 'none' }}>← Ana Sayfaya Dön</Link>
      </div>
    </>
  )

  const rolBilgi = ROL_RENK[profil.rol] || ROL_RENK.okuyucu
  const okundu = okumalistesi.filter(o => o.durum === 'okundu')
  const okunuyor = okumalistesi.filter(o => o.durum === 'okunuyor')
  const okuyacaklar = okumalistesi.filter(o => o.durum === 'okumak_istiyorum')

  // XP progress hesapla
  const xp = profil.xp || 0
  const seviye = profil.seviye || 1
  const seviyeBasiXP = (seviye - 1) * 100
  const seviyeBitiXP = seviye * 100
  const progress = ((xp - seviyeBasiXP) / 100) * 100

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: '800px', margin: '32px auto', padding: '0 24px 60px' }}>

        {/* Profil kartı */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#111', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bebas Neue', sans-serif", fontSize: '32px', color: '#fff', border: '3px solid var(--border)' }}>
                {profil.avatar_url
                  ? <img src={profil.avatar_url} alt={profil.kullanici_adi || 'Profil avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : profil.kullanici_adi[0].toUpperCase()
                }
              </div>
              {/* Seviye rozeti */}
              <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#111', color: '#fff', borderRadius: '100px', fontSize: '10px', fontWeight: 700, padding: '2px 6px', border: '2px solid var(--surface)' }}>
                Sv.{seviye}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px' }}>{profil.kullanici_adi}</div>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '100px', background: rolBilgi.bg, color: rolBilgi.text, textTransform: 'capitalize' }}>
                  {profil.rol}
                </span>
              </div>

              {profil.bio && <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '12px' }}>{profil.bio}</div>}

              {/* XP progress bar */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>{xp} XP</span>
                  <span>Sonraki seviye: {seviyeBitiXP} XP</span>
                </div>
                <div style={{ height: '6px', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, progress)}%`, background: '#111', borderRadius: '100px', transition: 'width 0.3s' }} />
                </div>
              </div>

              {/* İstatistikler */}
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {[
                  { label: 'Okundu', deger: okundu.length },
                  { label: 'Okunuyor', deger: okunuyor.length },
                  { label: 'Okuyacak', deger: okuyacaklar.length },
                  { label: 'Takipçi', deger: profil.takipci_sayisi || 0 },
                  { label: 'Takip', deger: profil.takip_sayisi || 0 },
                  { label: 'Rozet', deger: rozetler.length },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>{s.deger}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Aksiyonlar */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {benimProfil ? (
                  <Link href="/profil/duzenle" style={{ padding: '8px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', fontWeight: 500, color: 'var(--text)', textDecoration: 'none' }}>
                    Profili Düzenle
                  </Link>
                ) : (
                  <TakipButonu hedefId={profil.id} hedefKullaniciAdi={profil.kullanici_adi} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rozetler */}
        {rozetler.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '16px' }}>Rozetler</div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {rozetler.map(r => (
                <div key={r.id} title={r.rozet_tanimlari?.aciklama} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--bg)', borderRadius: '100px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '16px' }}>{r.rozet_tanimlari?.ikon}</span>
                  <span style={{ fontSize: '12px', fontWeight: 500 }}>{r.rozet_tanimlari?.isim}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Okuma listesi */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 16px 0', fontSize: '13px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-light)' }}>
            Okuma Listesi
          </div>
          {benimProfil ? (
            <>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto', marginTop: '16px' }}>
                {[
                  { key: 'liste', label: `Tümü (${okumalistesi.length})` },
                  { key: 'okunuyor', label: `Okunuyor (${okunuyor.length})` },
                  { key: 'okundu', label: `Okundu (${okundu.length})` },
                  { key: 'okuyacak', label: `Okuyacak (${okuyacaklar.length})` },
                ].map(s => (
                  <button key={s.key} onClick={() => setAktifSekme(s.key)} style={{ padding: '14px 20px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', color: aktifSekme === s.key ? 'var(--text)' : 'var(--text-muted)', borderBottom: aktifSekme === s.key ? '2px solid var(--text)' : '2px solid transparent' }}>
                    {s.label}
                  </button>
                ))}
              </div>
              <div style={{ padding: '16px' }}>
                {(() => {
                  const liste = aktifSekme === 'okunuyor' ? okunuyor : aktifSekme === 'okundu' ? okundu : aktifSekme === 'okuyacak' ? okuyacaklar : okumalistesi
                  if (liste.length === 0) return (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>Liste boş.</div>
                  )
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                      {liste.map(item => (
                        <Link key={item.id} href={`/seri/${item.seriler?.slug}`} style={{ textDecoration: 'none' }}>
                          <div onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'} style={{ transition: 'transform 0.15s' }}>
                            <div style={{ aspectRatio: '2/3', borderRadius: '8px', overflow: 'hidden', background: '#111', marginBottom: '6px', position: 'relative' }}>
                              {item.seriler?.kapak_url
                                ? <img src={item.seriler.kapak_url} alt={item.seriler.baslik} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#fff', fontFamily: "'Bebas Neue', sans-serif", padding: '4px', textAlign: 'center' }}>{item.seriler?.baslik}</div>
                              }
                              {aktifSekme === 'liste' && (
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', padding: '4px 6px' }}>
                                  <div style={{ fontSize: '9px', color: '#fff', fontWeight: 500 }}>{LISTE_ETIKET[item.durum]}</div>
                                </div>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.seriler?.baslik}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </>
          ) : (
            <div style={{ padding: '20px 16px 24px', color: 'var(--text-muted)', fontSize: '14px' }}>
              Bu kullanicinin okuma listesi gizli tutuluyor.
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
