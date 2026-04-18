'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { ACCENT, ADMIN_BG, BD, BP, BS, CARD, CARD_INNER, CokluResimYukle, I, LB, Msg, PANEL_BG, PANEL_BORDER, PURPLE, ResimYukle, S, SectionTitle, Surface, TABLE_ROW, TABLE_WRAP, TEXT_SOFT, TEXT_SUBTLE, AramaSecim, AramaSecimTek, PANEL_BG_STRONG } from './ui'
import { KonseySayfasi, KullanicilarSayfasi, YorumlarSayfasi } from './sections/community'
import { SayfalarSayfasi, SosyalMedyaSayfasi } from './sections/vitrin'

function BarChart({ data, renk = '#111', yukseklik = 160 }) {
  if (!data || data.length === 0) return <div style={{ color: '#aaa', fontSize: '13px', padding: '20px 0' }}>Veri yok</div>
  const max = Math.max(...data.map(d => d.deger), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: (yukseklik + 30) + 'px', paddingBottom: '24px', position: 'relative' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '4px', position: 'relative' }}>
          <span style={{ fontSize: '10px', color: '#888' }}>{d.deger}</span>
          <div style={{ width: '100%', background: renk, borderRadius: '4px 4px 0 0', height: `${(d.deger / max) * yukseklik}px`, minHeight: d.deger > 0 ? '4px' : '2px', transition: 'height 0.3s', opacity: d.deger === 0 ? 0.2 : 1 }} />
          <span style={{ fontSize: '9px', color: '#aaa', position: 'absolute', bottom: 0, whiteSpace: 'nowrap' }}>{d.etiket}</span>
        </div>
      ))}
    </div>
  )
}

function GlobalArama({ seriler, bolumler, kullanicilar, onSec }) {
  const [ara, setAra] = useState('')
  const [acik, setAcik] = useState(false)
  const ref = useRef()
  useEffect(() => {
    function kapat(e) { if (ref.current && !ref.current.contains(e.target)) setAcik(false) }
    document.addEventListener('mousedown', kapat)
    return () => document.removeEventListener('mousedown', kapat)
  }, [])
  const q = ara.toLowerCase()
  const sonuclar = ara.length < 2 ? [] : [
    ...seriler.filter(x => x.baslik.toLowerCase().includes(q)).slice(0, 3).map(x => ({ tip: 'Seri', isim: x.baslik, key: 'seriler' })),
    ...bolumler.filter(x => x.baslik.toLowerCase().includes(q)).slice(0, 3).map(x => ({ tip: 'Bölüm', isim: x.baslik, key: 'bolumler' })),
    ...kullanicilar.filter(x => x.kullanici_adi?.toLowerCase().includes(q)).slice(0, 3).map(x => ({ tip: 'Kullanıcı', isim: x.kullanici_adi, key: 'kullanicilar' })),
  ]
  return (
    <div ref={ref} style={{ position: 'relative', width: '260px' }}>
      <input value={ara} onChange={e => { setAra(e.target.value); setAcik(true) }} onFocus={() => setAcik(true)} placeholder="Seri, bölüm, kullanıcı ara..." style={{ width: '100%', padding: '10px 14px', background: PANEL_BG, border: PANEL_BORDER, color: '#fff', borderRadius: '999px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
      {acik && sonuclar.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#121212', border: PANEL_BORDER, borderRadius: '18px', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', zIndex: 200, marginTop: '8px', overflow: 'hidden' }}>
          {sonuclar.map((s, i) => (
            <div key={i} onClick={() => { onSec(s.key); setAra(''); setAcik(false) }} style={{ padding: '12px 14px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: '10px', background: 'rgba(139,92,246,0.18)', padding: '3px 7px', borderRadius: '999px', color: '#d8b4fe', border: '1px solid rgba(139,92,246,0.3)' }}>{s.tip}</span>{s.isim}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Admin() {
  const [giris, setGiris] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [aktif, setAktif] = useState('istatistik')
  const [bildirimSayisi, setBildirimSayisi] = useState(0)
  const [bildirimAcik, setBildirimAcik] = useState(false)
  const [bildirimler, setBildirimler] = useState([])
  const [globalSeriler, setGlobalSeriler] = useState([])
  const [globalBolumler, setGlobalBolumler] = useState([])
  const [globalKullanicilar, setGlobalKullanicilar] = useState([])
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/')
        setYukleniyor(false)
        return
      }
      const { data: profil } = await supabase.from('profiller').select('rol').eq('id', session.user.id).single()
      if (profil?.rol === 'admin' || profil?.rol === 'yonetici') {
        setGiris(true)
        yukleGlobal()
      } else {
        router.replace('/')
      }
      setYukleniyor(false)
    })
  }, [router])

  async function yukleGlobal() {
    const [s, b, k, bil] = await Promise.all([
      supabase.from('seriler').select('id, baslik'),
      supabase.from('bolumler').select('id, baslik'),
      supabase.from('profiller').select('id, kullanici_adi'),
      supabase.from('bildirimler').select('*').eq('okundu', false).order('created_at', { ascending: false }).limit(10),
    ])
    setGlobalSeriler(s.data || [])
    setGlobalBolumler(b.data || [])
    setGlobalKullanicilar(k.data || [])
    setBildirimler(bil.data || [])
    setBildirimSayisi(bil.data?.length || 0)
  }

  if (yukleniyor) return <div style={{ minHeight: '100vh', background: ADMIN_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}><div style={{ color: TEXT_SOFT }}>Yükleniyor...</div></div>

  if (!giris) return null

  const menu = [
    { title: 'Genel Bakis', items: [{ key: 'istatistik', label: 'Istatistikler', icon: '◢' }, { key: 'okuma', label: 'Okuma Sayilari', icon: '▤' }] },
    { title: 'Icerik', items: [
      { key: 'seriler', label: 'Seriler', icon: '◫' },
      { key: 'bolumler', label: 'Bolumler', icon: '≡' },
      { key: 'kategoriler', label: 'Kategoriler', icon: '▣' },
      { key: 'turler', label: 'Turler', icon: '◌' },
      { key: 'yazarcizerler', label: 'Yazarlar & Cizerler', icon: '✦' },
    ] },
    { title: 'Topluluk', items: [
      { key: 'kullanicilar', label: 'Kullanicilar', icon: '◎' },
      { key: 'yorumlar', label: 'Yorumlar', icon: '◍' },
      { key: 'konsey', label: 'Konsey Ekibi', icon: '◆' },
      { key: 'unvanlar', label: 'Unvanlar', icon: '✪' },
    ] },
    { title: 'Vitrin', items: [
      { key: 'anasayfa', label: 'Ana Sayfa & SEO', icon: '▤' },
      { key: 'sayfalar', label: 'Sayfalar', icon: '▥' },
      { key: 'sosyalmedya', label: 'Sosyal Medya', icon: '◐' },
    ] },
  ]

  const aktifMeta = menu.flatMap(group => group.items).find(item => item.key === aktif)

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, rgba(139,92,246,0.12), transparent 24%), radial-gradient(circle at 20% 20%, rgba(255,255,255,0.04), transparent 18%), #050505', fontFamily: "'DM Sans', sans-serif", color: '#fff' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(16px)', background: 'rgba(5,5,5,0.78)', borderBottom: PANEL_BORDER }}>
        <div style={{ padding: '18px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ ...LB, marginBottom: '8px' }}>Konsey Comics</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '36px', lineHeight: 0.9, color: '#fff' }}>Admin Paneli</div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <GlobalArama seriler={globalSeriler} bolumler={globalBolumler} kullanicilar={globalKullanicilar} onSec={setAktif} />
          <div style={{ position: 'relative' }}>
            <button onClick={() => setBildirimAcik(!bildirimAcik)} style={{ background: PANEL_BG, border: PANEL_BORDER, color: '#fff', padding: '10px 14px', borderRadius: '999px', fontSize: '16px', cursor: 'pointer', position: 'relative' }}>
              🔔{bildirimSayisi > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#dc2626', color: '#fff', borderRadius: '100px', fontSize: '10px', padding: '1px 5px', fontWeight: 700 }}>{bildirimSayisi}</span>}
            </button>
            {bildirimAcik && (
              <div style={{ position: 'absolute', top: '100%', right: 0, width: '320px', background: '#101010', border: PANEL_BORDER, borderRadius: '18px', boxShadow: '0 24px 60px rgba(0,0,0,0.45)', zIndex: 200, marginTop: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: PANEL_BORDER, fontWeight: 600, fontSize: '13px' }}>Bildirimler</div>
                {bildirimler.length === 0 ? <div style={{ padding: '20px', color: TEXT_SUBTLE, fontSize: '13px', textAlign: 'center' }}>Yeni bildirim yok</div> : bildirimler.map(b => (
                  <div key={b.id} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '13px' }}>
                    <div style={{ fontWeight: 500 }}>{b.baslik}</div>
                    <div style={{ color: TEXT_SUBTLE, fontSize: '12px' }}>{b.mesaj}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Link href="/" style={{ color: TEXT_SOFT, fontSize: '13px', textDecoration: 'none' }}>Siteye Don</Link>
          <button onClick={async () => { await supabase.auth.signOut(); setGiris(false) }} style={BS}>Cikis</button>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', minHeight: 'calc(100vh - 92px)' }}>
        <div style={{ padding: '24px 18px 32px 24px', borderRight: PANEL_BORDER }}>
          <div style={{ ...CARD, padding: '16px' }}>
            <div style={{ ...LB, marginBottom: '14px' }}>Navigasyon</div>
            {menu.map(group => (
              <div key={group.title} style={{ marginBottom: '18px' }}>
                <div style={{ ...LB, marginBottom: '8px' }}>{group.title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {group.items.map(item => (
                    <button key={item.key} onClick={() => setAktif(item.key)} style={{ width: '100%', padding: '12px 14px', textAlign: 'left', border: 'none', borderRadius: '14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, background: aktif === item.key ? 'linear-gradient(135deg, rgba(139,92,246,0.28), rgba(255,255,255,0.08))' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px', borderColor: 'transparent' }}>
                      <span style={{ width: '26px', height: '26px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: aktif === item.key ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)', color: aktif === item.key ? '#fff' : TEXT_SUBTLE, fontSize: '12px', flexShrink: 0 }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ ...CARD_INNER, padding: '16px', marginTop: '8px' }}>
              <div style={{ ...LB, marginBottom: '8px' }}>Aktif Alan</div>
              <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>{aktifMeta?.label}</div>
              <div style={{ fontSize: '12px', color: TEXT_SOFT, lineHeight: 1.6 }}>Bu alanin yonetim akisini sag tarafa tasidik. Icerik mantigi korunuyor, deneyim yenileniyor.</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '28px 28px 48px', overflow: 'auto' }}>
          {aktif === 'istatistik' && <IstatistikSayfasi />}
          {aktif === 'okuma' && <OkumaSayilariSayfasi />}
          {aktif === 'seriler' && <SerilerSayfasi />}
          {aktif === 'bolumler' && <BolumlerSayfasi />}
          {aktif === 'konsey' && <KonseySayfasi />}
          {aktif === 'yazarcizerler' && <YazarCizerSayfasi />}
          {aktif === 'kategoriler' && <KategoriSayfasi />}
          {aktif === 'turler' && <TurlerSayfasi />}
          {aktif === 'kullanicilar' && <KullanicilarSayfasi />}
          {aktif === 'yorumlar' && <YorumlarSayfasi />}
          {aktif === 'unvanlar' && <UnvanlarSayfasi />}
          {aktif === 'anasayfa' && <AnaSayfaSayfasi />}
          {aktif === 'sayfalar' && <SayfalarSayfasi />}
          {aktif === 'sosyalmedya' && <SosyalMedyaSayfasi />}
        </div>
      </div>
    </div>
  )
}

function UnvanlarSayfasi() {
  const kategoriEtiketleri = {
    progress: 'İlerleme',
    mastery: 'Ustalık',
    engagement: 'Etkileşim',
  }
  const nadirlikEtiketleri = {
    common: 'Yaygın',
    rare: 'Nadir',
    epic: 'Epik',
    legendary: 'Efsanevi',
  }
  const eventTipiEtiketleri = {
    ISSUE_READ_COMPLETED: 'Bölüm bitirilince',
    SERIES_PROGRESS_UPDATED: 'Seri ilerleyince',
    SERIES_COMPLETED: 'Seri bitince',
    SERIES_RATED: 'Puan verilince',
    SERIES_FAVORITED: 'Takibe eklenince',
    SERIES_COMMENT_POSTED: 'Seriye yorum atılınca',
    ISSUE_COMMENT_POSTED: 'Bölüme yorum atılınca',
    ISSUE_DOWNLOADED: 'Bölüm indirilince',
  }
  const kuralTipiEtiketleri = {
    series_progress: 'Seride yüzde ilerleme',
    series_completed: 'Seriyi tamamen bitirme',
    issue_read_count_in_series: 'Seride okunan bölüm sayısı',
    series_rated: 'Seriye puan verilmesi',
    character_series_completed_count: 'Aynı evrende seri bitirme sayısı',
    rate_count_in_group: 'Aynı evrende puan verme sayısı',
    favorite_count_in_group: 'Aynı evrende takibe alma sayısı',
    series_comment_posted: 'Seriye yorum atılması',
    issue_comment_posted: 'Bölüme yorum atılması',
    issue_downloaded: 'Bölüm indirilmesi',
  }
  const titleBos = {
    isim: '',
    kod: '',
    aciklama: '',
    seri_id: '',
    character_group: '',
    kategori: 'progress',
    nadirlik: 'common',
    ikon_url: '',
    aktif: true,
    siralama: 0,
    event_tipi: 'SERIES_PROGRESS_UPDATED',
    kural_tipi: 'series_progress',
    min_progress_percent: 100,
    min_issue_count: 1,
    min_completed_series: 1,
    min_ratings_count: 1,
    min_favorites_count: 1,
    oncelik: 100,
    rule_aktif: true,
  }
  const [mod, setMod] = useState('liste')
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [duzenleId, setDuzenleId] = useState(null)
  const [kurallarMap, setKurallarMap] = useState({})
  const [unvanlar, setUnvanlar] = useState([])
  const [seriler, setSeriler] = useState([])
  const [aramaMetni, setAramaMetni] = useState('')
  const [seriFiltre, setSeriFiltre] = useState('tumu')
  const [form, setForm] = useState(titleBos)

  useEffect(() => { fetchHepsi() }, [])

  function kodOlustur(v) {
    return String(v || '')
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
  }

  function titleKuralConfigOlustur(payload) {
    switch (payload.kural_tipi) {
      case 'series_progress':
        return {
          series_id: payload.seri_id || null,
          min_progress_percent: Number(payload.min_progress_percent || 100),
        }
      case 'series_completed':
        return {
          series_id: payload.seri_id || null,
        }
      case 'issue_read_count_in_series':
        return {
          series_id: payload.seri_id || null,
          min_issue_count: Number(payload.min_issue_count || 1),
        }
      case 'series_rated':
        return {
          series_id: payload.seri_id || null,
        }
      case 'character_series_completed_count':
        return {
          character_group: payload.character_group || '',
          min_completed_series: Number(payload.min_completed_series || 1),
        }
      case 'rate_count_in_group':
        return {
          character_group: payload.character_group || '',
          min_ratings_count: Number(payload.min_ratings_count || 1),
        }
      case 'favorite_count_in_group':
        return {
          character_group: payload.character_group || '',
          min_favorites_count: Number(payload.min_favorites_count || 1),
        }
      case 'series_comment_posted':
        return {
          series_id: payload.seri_id || null,
        }
      case 'issue_comment_posted':
        return {
          series_id: payload.seri_id || null,
        }
      case 'issue_downloaded':
        return {
          series_id: payload.seri_id || null,
        }
      default:
        return {}
    }
  }

  function titleKuralOzeti(unvan) {
    const rule = kurallarMap[unvan.id]
    if (!rule) return 'Kural baglanmadi'
    const config = rule.kural_config || {}
    switch (rule.kural_tipi) {
      case 'series_progress':
        return `Seride %${config.min_progress_percent || 100} ilerleme`
      case 'series_completed':
        return 'Seriyi tamamen bitir'
      case 'issue_read_count_in_series':
        return `${config.min_issue_count || 1} bölüm bitir`
      case 'series_rated':
        return 'Seriye puan ver'
      case 'character_series_completed_count':
        return `${config.character_group || 'Grup'} evreninde ${config.min_completed_series || 1} seri bitir`
      case 'rate_count_in_group':
        return `${config.character_group || 'Grup'} evreninde ${config.min_ratings_count || 1} puan ver`
      case 'favorite_count_in_group':
        return `${config.character_group || 'Grup'} evreninde ${config.min_favorites_count || 1} takip ekle`
      case 'series_comment_posted':
        return 'Seriye yorum at'
      case 'issue_comment_posted':
        return 'Bölüme yorum at'
      case 'issue_downloaded':
        return 'Bölümü indir'
      default:
        return rule.kural_tipi || 'Bilinmeyen kural'
    }
  }

  function sablonUygula(tip) {
    if (tip === 'seri_tamamlama') {
      setForm(f => ({
        ...f,
        kategori: 'mastery',
        event_tipi: 'SERIES_COMPLETED',
        kural_tipi: 'series_completed',
      }))
      return
    }
    if (tip === 'ilk_bolum') {
      setForm(f => ({
        ...f,
        kategori: 'progress',
        event_tipi: 'ISSUE_READ_COMPLETED',
        kural_tipi: 'issue_read_count_in_series',
        min_issue_count: 1,
      }))
      return
    }
    if (tip === 'coklu_bolum') {
      setForm(f => ({
        ...f,
        kategori: 'progress',
        event_tipi: 'ISSUE_READ_COMPLETED',
        kural_tipi: 'issue_read_count_in_series',
        min_issue_count: 3,
      }))
      return
    }
    if (tip === 'seri_puan') {
      setForm(f => ({
        ...f,
        kategori: 'engagement',
        event_tipi: 'SERIES_RATED',
        kural_tipi: 'series_rated',
      }))
      return
    }
    if (tip === 'seri_yorum') {
      setForm(f => ({
        ...f,
        kategori: 'engagement',
        event_tipi: 'SERIES_COMMENT_POSTED',
        kural_tipi: 'series_comment_posted',
      }))
      return
    }
    if (tip === 'bolum_yorum') {
      setForm(f => ({
        ...f,
        kategori: 'engagement',
        event_tipi: 'ISSUE_COMMENT_POSTED',
        kural_tipi: 'issue_comment_posted',
      }))
      return
    }
    if (tip === 'bolum_indir') {
      setForm(f => ({
        ...f,
        kategori: 'engagement',
        event_tipi: 'ISSUE_DOWNLOADED',
        kural_tipi: 'issue_downloaded',
      }))
    }
  }

  async function fetchHepsi() {
    const [unvanRes, ruleRes, seriRes] = await Promise.all([
      supabase.from('unvan_tanimlari').select('*, seriler(id, baslik, character_group)').order('siralama').order('created_at', { ascending: false }),
      supabase.from('unvan_kurallari').select('*').order('oncelik'),
      supabase.from('seriler').select('id, baslik, character_group').order('baslik'),
    ])

    const map = {}
    for (const rule of ruleRes.data || []) {
      if (!map[rule.unvan_id]) map[rule.unvan_id] = rule
    }

    setKurallarMap(map)
    setUnvanlar(unvanRes.data || [])
    setSeriler(seriRes.data || [])
  }

  function yeniUnvan() {
    setForm(titleBos)
    setDuzenleId(null)
    setMsg('')
    setMod('form')
  }

  function duzenle(unvan) {
    const rule = kurallarMap[unvan.id]
    const config = rule?.kural_config || {}
    setDuzenleId(unvan.id)
    setForm({
      isim: unvan.isim || '',
      kod: unvan.kod || '',
      aciklama: unvan.aciklama || '',
      seri_id: unvan.seri_id || '',
      character_group: unvan.character_group || unvan.seriler?.character_group || '',
      kategori: unvan.kategori || 'progress',
      nadirlik: unvan.nadirlik || 'common',
      ikon_url: unvan.ikon_url || '',
      aktif: unvan.aktif !== false,
      siralama: unvan.siralama ?? 0,
      event_tipi: rule?.event_tipi || 'SERIES_PROGRESS_UPDATED',
      kural_tipi: rule?.kural_tipi || 'series_progress',
      min_progress_percent: config.min_progress_percent ?? 100,
      min_issue_count: config.min_issue_count ?? 1,
      min_completed_series: config.min_completed_series ?? 1,
      min_ratings_count: config.min_ratings_count ?? 1,
      min_favorites_count: config.min_favorites_count ?? 1,
      oncelik: rule?.oncelik ?? 100,
      rule_aktif: rule?.aktif !== false,
    })
    setMsg('')
    setMod('form')
  }

  async function sil(unvan) {
    if (!confirm(`"${unvan.isim}" unvanini silmek istedigine emin misin?`)) return
    await supabase.from('unvan_tanimlari').delete().eq('id', unvan.id)
    setMsg('✅ Unvan silindi!')
    fetchHepsi()
  }

  async function kaydet() {
    if (!form.isim || !form.kod) {
      setMsg('❌ Unvan ismi ve kodu zorunlu.')
      return
    }
    if (['series_progress', 'series_completed', 'issue_read_count_in_series', 'series_rated', 'series_comment_posted', 'issue_comment_posted', 'issue_downloaded'].includes(form.kural_tipi) && !form.seri_id) {
      setMsg('❌ Seri bazli kurallarda seri secmelisin.')
      return
    }
    if (['character_series_completed_count', 'rate_count_in_group', 'favorite_count_in_group'].includes(form.kural_tipi) && !form.character_group) {
      setMsg('❌ Grup bazli kurallarda character group zorunlu.')
      return
    }

    setYukleniyor(true)

    const titlePayload = {
      kod: kodOlustur(form.kod),
      isim: form.isim,
      aciklama: form.aciklama || null,
      seri_id: form.seri_id || null,
      character_group: form.character_group || null,
      kategori: form.kategori,
      nadirlik: form.nadirlik,
      ikon_url: form.ikon_url || null,
      aktif: form.aktif,
      siralama: Number(form.siralama || 0),
    }

    let unvanId = duzenleId
    if (duzenleId) {
      const { error } = await supabase.from('unvan_tanimlari').update(titlePayload).eq('id', duzenleId)
      if (error) {
        setMsg(`❌ ${error.message}`)
        setYukleniyor(false)
        return
      }
    } else {
      const { data, error } = await supabase.from('unvan_tanimlari').insert([titlePayload]).select().single()
      if (error) {
        setMsg(`❌ ${error.message}`)
        setYukleniyor(false)
        return
      }
      unvanId = data?.id
    }

    const mevcutRule = duzenleId ? kurallarMap[duzenleId] : null
    const rulePayload = {
      unvan_id: unvanId,
      event_tipi: form.event_tipi,
      kural_tipi: form.kural_tipi,
      kural_config: titleKuralConfigOlustur(form),
      oncelik: Number(form.oncelik || 100),
      aktif: form.rule_aktif,
    }

    if (mevcutRule?.id) {
      const { error } = await supabase.from('unvan_kurallari').update(rulePayload).eq('id', mevcutRule.id)
      if (error) {
        setMsg(`❌ ${error.message}`)
        setYukleniyor(false)
        return
      }
    } else {
      const { error } = await supabase.from('unvan_kurallari').insert([rulePayload])
      if (error) {
        setMsg(`❌ ${error.message}`)
        setYukleniyor(false)
        return
      }
    }

    setMsg(duzenleId ? '✅ Unvan guncellendi!' : '✅ Unvan eklendi!')
    setForm(titleBos)
    setDuzenleId(null)
    setMod('liste')
    setYukleniyor(false)
    fetchHepsi()
  }

  const filtreli = unvanlar
    .filter(item => seriFiltre === 'tumu' || item.seri_id === seriFiltre)
    .filter(item => !aramaMetni || item.isim.toLowerCase().includes(aramaMetni.toLowerCase()) || item.kod.toLowerCase().includes(aramaMetni.toLowerCase()))

  if (mod === 'form') {
    const seciliSeri = seriler.find(item => item.id === form.seri_id)
    const grupPlaceholder = seciliSeri?.character_group || 'spider-man'
    return (
      <div style={{ maxWidth: '860px' }}>
        <SectionTitle
          eyebrow="Topluluk"
          title={duzenleId ? 'Unvan Duzenle' : 'Yeni Unvan'}
          description="Yeni seriler icin acilabilir unvan tanimini ve ilk kuralini tek ekrandan gir."
          action={<button onClick={() => { setMod('liste'); setForm(titleBos); setDuzenleId(null); setMsg('') }} style={BS}>Listeye Don</button>}
        />
        <Msg text={msg} />
        <Surface style={{ padding: '18px', marginBottom: '14px', background: 'linear-gradient(135deg, rgba(139,92,246,0.14), rgba(255,255,255,0.04))' }}>
          <div style={{ ...LB, marginBottom: '10px' }}>Hızlı Şablonlar</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <button onClick={() => sablonUygula('seri_tamamlama')} style={BS}>Seriyi Bitirince</button>
            <button onClick={() => sablonUygula('ilk_bolum')} style={BS}>İlk Bölüm Bitirince</button>
            <button onClick={() => sablonUygula('coklu_bolum')} style={BS}>Birden Fazla Bölüm</button>
            <button onClick={() => sablonUygula('seri_puan')} style={BS}>Seriye Puan Verince</button>
            <button onClick={() => sablonUygula('seri_yorum')} style={BS}>Seriye Yorum Atınca</button>
            <button onClick={() => sablonUygula('bolum_yorum')} style={BS}>Bölüme Yorum Atınca</button>
            <button onClick={() => sablonUygula('bolum_indir')} style={BS}>Bölümü İndirince</button>
          </div>
          <div style={{ fontSize: '12px', color: TEXT_SOFT, lineHeight: 1.7 }}>
            Hızlı başlamak için bir şablona bas. Sonra sadece seri, isim ve açıklamayı düzenlemen yeter.
          </div>
        </Surface>
        <Surface style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <div style={LB}>Unvan Ismi</div>
              <input value={form.isim} onChange={e => setForm(f => ({ ...f, isim: e.target.value, kod: f.kod || kodOlustur(e.target.value) }))} style={I} placeholder="Mahallenin Karanlik Koruyucusu" />
            </div>
            <div>
              <div style={LB}>Kod</div>
              <input value={form.kod} onChange={e => setForm(f => ({ ...f, kod: kodOlustur(e.target.value) }))} style={I} placeholder="mahallenin_karanlik_koruyucusu" />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={LB}>Aciklama</div>
            <textarea value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))} style={{ ...I, minHeight: '82px', resize: 'vertical' }} placeholder="Bu unvan ne zaman acilir, oyuncuya ne hissettirir?" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <div style={LB}>Seri</div>
              <AramaSecimTek liste={seriler.map(s => ({ id: s.id, isim: s.baslik }))} secili={form.seri_id} onChange={value => {
                const seri = seriler.find(item => item.id === value)
                setForm(f => ({ ...f, seri_id: value, character_group: f.character_group || seri?.character_group || '' }))
              }} placeholder="Seri sec" />
            </div>
            <div>
              <div style={LB}>Character Group</div>
              <input value={form.character_group} onChange={e => setForm(f => ({ ...f, character_group: e.target.value }))} style={I} placeholder={grupPlaceholder} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', marginBottom: '12px' }}>
            <div>
              <div style={LB}>Kategori</div>
              <select value={form.kategori} onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))} style={S}>
                <option value="progress">İlerleme</option>
                <option value="mastery">Ustalık</option>
                <option value="engagement">Etkileşim</option>
              </select>
            </div>
            <div>
              <div style={LB}>Nadirlik</div>
              <select value={form.nadirlik} onChange={e => setForm(f => ({ ...f, nadirlik: e.target.value }))} style={S}>
                <option value="common">Yaygın</option>
                <option value="rare">Nadir</option>
                <option value="epic">Epik</option>
                <option value="legendary">Efsanevi</option>
              </select>
            </div>
            <div>
              <div style={LB}>Siralama</div>
              <input type="number" value={form.siralama} onChange={e => setForm(f => ({ ...f, siralama: e.target.value }))} style={I} />
            </div>
            <div>
              <div style={LB}>Kural Onceligi</div>
              <input type="number" value={form.oncelik} onChange={e => setForm(f => ({ ...f, oncelik: e.target.value }))} style={I} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <div style={LB}>Event Tipi</div>
              <select value={form.event_tipi} onChange={e => setForm(f => ({ ...f, event_tipi: e.target.value }))} style={S}>
                <option value="ISSUE_READ_COMPLETED">Bölüm bitirilince</option>
                <option value="SERIES_PROGRESS_UPDATED">Seri ilerleyince</option>
                <option value="SERIES_COMPLETED">Seri bitince</option>
                <option value="SERIES_RATED">Puan verilince</option>
                <option value="SERIES_FAVORITED">Takibe eklenince</option>
                <option value="SERIES_COMMENT_POSTED">Seriye yorum atılınca</option>
                <option value="ISSUE_COMMENT_POSTED">Bölüme yorum atılınca</option>
                <option value="ISSUE_DOWNLOADED">Bölüm indirilince</option>
              </select>
            </div>
            <div>
              <div style={LB}>Kural Tipi</div>
              <select value={form.kural_tipi} onChange={e => setForm(f => ({ ...f, kural_tipi: e.target.value }))} style={S}>
                <option value="series_progress">Seride yüzde ilerleme</option>
                <option value="series_completed">Seriyi tamamen bitirme</option>
                <option value="issue_read_count_in_series">Seride okunan bölüm sayısı</option>
                <option value="series_rated">Seriye puan verilmesi</option>
                <option value="character_series_completed_count">Aynı evrende seri bitirme sayısı</option>
                <option value="rate_count_in_group">Aynı evrende puan verme sayısı</option>
                <option value="favorite_count_in_group">Aynı evrende takibe alma sayısı</option>
                <option value="series_comment_posted">Seriye yorum atılması</option>
                <option value="issue_comment_posted">Bölüme yorum atılması</option>
                <option value="issue_downloaded">Bölüm indirilmesi</option>
              </select>
            </div>
          </div>

          <div style={{ ...CARD_INNER, padding: '14px', marginBottom: '14px' }}>
            <div style={{ ...LB, marginBottom: '8px' }}>Mini Rehber</div>
            <div style={{ fontSize: '12px', color: TEXT_SOFT, lineHeight: 1.7 }}>
              Seri bazlı ünvan istiyorsan seri seç. Bölüm bitirme, yorum, puan ve indirme şablonları artık doğrudan çalışır. Aynı evren için çalışan ünvanlarda ise <b>Character Group</b> alanını doldur.
            </div>
          </div>

          {form.kural_tipi === 'series_progress' && (
            <div style={{ marginBottom: '12px' }}>
              <div style={LB}>Min. Ilerleme Yuzdesi</div>
              <input type="number" value={form.min_progress_percent} onChange={e => setForm(f => ({ ...f, min_progress_percent: e.target.value }))} style={I} />
            </div>
          )}
          {form.kural_tipi === 'issue_read_count_in_series' && (
            <div style={{ marginBottom: '12px' }}>
              <div style={LB}>Min. Bitirilen Bölüm Sayısı</div>
              <input type="number" value={form.min_issue_count} onChange={e => setForm(f => ({ ...f, min_issue_count: e.target.value }))} style={I} />
            </div>
          )}
          {form.kural_tipi === 'character_series_completed_count' && (
            <div style={{ marginBottom: '12px' }}>
              <div style={LB}>Min. Tamamlanan Seri</div>
              <input type="number" value={form.min_completed_series} onChange={e => setForm(f => ({ ...f, min_completed_series: e.target.value }))} style={I} />
            </div>
          )}
          {form.kural_tipi === 'rate_count_in_group' && (
            <div style={{ marginBottom: '12px' }}>
              <div style={LB}>Min. Puanlama Sayisi</div>
              <input type="number" value={form.min_ratings_count} onChange={e => setForm(f => ({ ...f, min_ratings_count: e.target.value }))} style={I} />
            </div>
          )}
          {form.kural_tipi === 'favorite_count_in_group' && (
            <div style={{ marginBottom: '12px' }}>
              <div style={LB}>Min. Takip Sayisi</div>
              <input type="number" value={form.min_favorites_count} onChange={e => setForm(f => ({ ...f, min_favorites_count: e.target.value }))} style={I} />
            </div>
          )}

          <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginBottom: '18px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#fff' }}>
              <input type="checkbox" checked={form.aktif} onChange={e => setForm(f => ({ ...f, aktif: e.target.checked }))} />
              Unvan aktif
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#fff' }}>
              <input type="checkbox" checked={form.rule_aktif} onChange={e => setForm(f => ({ ...f, rule_aktif: e.target.checked }))} />
              Kural aktif
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={kaydet} disabled={yukleniyor} style={BP}>{yukleniyor ? 'Kaydediliyor...' : 'Kaydet'}</button>
            <button onClick={() => { setMod('liste'); setForm(titleBos); setDuzenleId(null); setMsg('') }} style={BS}>Iptal</button>
          </div>
        </Surface>
      </div>
    )
  }

  return (
    <div>
      <SectionTitle
        eyebrow="Topluluk"
        title="Unvanlar"
        description="Yeni seri icin acilabilir unvanlari ve kilit acma kurallarini panelden yonet."
        action={<button onClick={yeniUnvan} style={BP}>Yeni Unvan</button>}
      />
      <Msg text={msg} />
      <Surface style={{ marginBottom: '18px', background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(255,255,255,0.04))' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div>
            <div style={LB}>En Kolay Yol</div>
            <div style={{ fontSize: '13px', color: TEXT_SOFT, lineHeight: 1.7 }}>Yeni seri için önce <b>Yeni Unvan</b> de, sonra seri seçip hazır şablonlardan birini kullan.</div>
          </div>
          <div>
            <div style={LB}>Seri Bazlı</div>
            <div style={{ fontSize: '13px', color: TEXT_SOFT, lineHeight: 1.7 }}>Tek bir seri için açılacak ünvanlarda <b>Seri</b> alanını doldur.</div>
          </div>
          <div>
            <div style={LB}>Evren Bazlı</div>
            <div style={{ fontSize: '13px', color: TEXT_SOFT, lineHeight: 1.7 }}>Bir karakter evreni için çalışacaksa <b>Character Group</b> kullan. Örnek: <b>spider-man</b>.</div>
          </div>
        </div>
      </Surface>
      <Surface style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={aramaMetni} onChange={e => setAramaMetni(e.target.value)} placeholder="Unvan ara..." style={{ ...I, maxWidth: '280px' }} />
          <div style={{ minWidth: '240px' }}>
            <AramaSecimTek liste={[{ id: 'tumu', isim: 'Tum Seriler' }, ...seriler.map(s => ({ id: s.id, isim: s.baslik }))]} secili={seriFiltre} onChange={setSeriFiltre} placeholder="Seri filtrele" />
          </div>
        </div>
      </Surface>
      <div style={{ display: 'grid', gap: '12px' }}>
        {filtreli.map((unvan) => (
          <Surface key={unvan.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: '1 1 420px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>{nadirlikEtiketleri[unvan.nadirlik] || unvan.nadirlik}</span>
                  <span style={{ padding: '4px 10px', borderRadius: '999px', background: 'rgba(139,92,246,0.16)', color: '#e9d5ff', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>{kategoriEtiketleri[unvan.kategori] || unvan.kategori}</span>
                  <span style={{ padding: '4px 10px', borderRadius: '999px', background: unvan.aktif ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.08)', color: unvan.aktif ? '#a7f3d0' : TEXT_SUBTLE, fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>{unvan.aktif ? 'aktif' : 'pasif'}</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{unvan.isim}</div>
                <div style={{ fontSize: '12px', color: TEXT_SUBTLE, marginBottom: '10px' }}>{unvan.kod}</div>
                <div style={{ fontSize: '13px', color: TEXT_SOFT, lineHeight: 1.7, marginBottom: '12px' }}>{unvan.aciklama || 'Aciklama girilmedi.'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div style={{ ...CARD_INNER, padding: '12px' }}>
                    <div style={LB}>Seri</div>
                    <div style={{ fontSize: '13px' }}>{unvan.seriler?.baslik || 'Bagimsiz / grup bazli'}</div>
                  </div>
                  <div style={{ ...CARD_INNER, padding: '12px' }}>
                    <div style={LB}>Character Group</div>
                    <div style={{ fontSize: '13px' }}>{unvan.character_group || '—'}</div>
                  </div>
                  <div style={{ ...CARD_INNER, padding: '12px' }}>
                    <div style={LB}>Kural</div>
                    <div style={{ fontSize: '13px' }}>{titleKuralOzeti(unvan)}</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <button onClick={() => duzenle(unvan)} style={BS}>Duzenle</button>
                <button onClick={() => sil(unvan)} style={BD}>Sil</button>
              </div>
            </div>
          </Surface>
        ))}
        {filtreli.length === 0 && (
          <Surface><div style={{ color: TEXT_SUBTLE, fontSize: '13px' }}>Henuz unvan yok.</div></Surface>
        )}
      </div>
    </div>
  )
}

// ---- İSTATİSTİK ----
function IstatistikSayfasi() {
  const [istat, setIstat] = useState(null)
  const [ziyaretOzet, setZiyaretOzet] = useState({ bugun: 0, dun: 0, hafta: 0, ay: 0 })
  const [zamanFiltre, setZamanFiltre] = useState('hafta')
  const [topSeriler, setTopSeriler] = useState([])
  const [topBolumler, setTopBolumler] = useState([])
  const [katDagilim, setKatDagilim] = useState([])
  const [kayitGrafik, setKayitGrafik] = useState([])
  const [ziyaretGrafik, setZiyaretGrafik] = useState([])

  useEffect(() => { fetchData() }, [zamanFiltre])

  function ziyaretciAnahtari(kayit) {
    return kayit?.kullanici_id || kayit?.ziyaretci_id || kayit?.oturum_id || null
  }

  async function fetchTumZiyaretler(sinceIso) {
    const hepsi = []
    const sayfaBoyutu = 1000
    let offset = 0

    while (true) {
      const { data, error } = await supabase
        .from('ziyaretler')
        .select('created_at, oturum_id, ziyaretci_id, kullanici_id')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .range(offset, offset + sayfaBoyutu - 1)

      if (error) break
      if (!data?.length) break

      hepsi.push(...data)
      if (data.length < sayfaBoyutu) break
      offset += sayfaBoyutu
    }

    return hepsi
  }

  function ayniGunMu(tarihA, tarihB) {
    return tarihA.getDate() === tarihB.getDate() && tarihA.getMonth() === tarihB.getMonth() && tarihA.getFullYear() === tarihB.getFullYear()
  }

  function uniqueVisitorCount(kayitlar) {
    return new Set((kayitlar || []).map(ziyaretciAnahtari).filter(Boolean)).size
  }

  function buildKayitGrafik(kayitlar, mod) {
    if (mod === 'bugun') {
      const saatlik = []
      for (let i = 0; i < 24; i++) {
        const sayi = (kayitlar || []).filter(k => new Date(k.created_at).getHours() === i).length
        saatlik.push({ etiket: `${String(i).padStart(2, '0')}:00`, deger: sayi })
      }
      return saatlik
    }

    const gunSayisi = mod === 'ay' ? 30 : 7
    const veri = []
    for (let i = gunSayisi - 1; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const label = `${d.getDate()}/${d.getMonth() + 1}`
      const sayi = (kayitlar || []).filter(k => ayniGunMu(new Date(k.created_at), d)).length
      veri.push({ etiket: label, deger: sayi })
    }
    return veri
  }

  function buildZiyaretGrafik(ziyaretler, mod) {
    if (mod === 'bugun') {
      const saatlik = []
      for (let i = 0; i < 24; i++) {
        const benzersiz = new Set(
          (ziyaretler || [])
            .filter(z => new Date(z.created_at).getHours() === i)
            .map(ziyaretciAnahtari)
            .filter(Boolean)
        )
        saatlik.push({ etiket: `${String(i).padStart(2, '0')}:00`, deger: benzersiz.size })
      }
      return saatlik
    }

    const gunSayisi = mod === 'ay' ? 30 : 7
    const veri = []
    for (let i = gunSayisi - 1; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const label = `${d.getDate()}/${d.getMonth() + 1}`
      const benzersiz = new Set(
        (ziyaretler || [])
          .filter(z => ayniGunMu(new Date(z.created_at), d))
          .map(ziyaretciAnahtari)
          .filter(Boolean)
      )
      veri.push({ etiket: label, deger: benzersiz.size })
    }
    return veri
  }

  async function fetchData() {
    const simdi = new Date()
    const bugunBaslangic = new Date(simdi); bugunBaslangic.setHours(0,0,0,0)
    const yarinBaslangic = new Date(bugunBaslangic); yarinBaslangic.setDate(yarinBaslangic.getDate() + 1)
    const dunBaslangic = new Date(bugunBaslangic); dunBaslangic.setDate(dunBaslangic.getDate() - 1)
    const haftaBaslangic = new Date(bugunBaslangic); haftaBaslangic.setDate(haftaBaslangic.getDate() - 6)
    const ayBaslangic = new Date(bugunBaslangic); ayBaslangic.setDate(ayBaslangic.getDate() - 29)
    const grafikBaslangic = zamanFiltre === 'bugun' ? bugunBaslangic : zamanFiltre === 'hafta' ? haftaBaslangic : ayBaslangic

    const [s, u, y, kat, topS, topB, kayitlarAy, tumZiyaretler] = await Promise.all([
      supabase.from('seriler').select('id', { count: 'exact', head: true }),
      supabase.from('profiller').select('id', { count: 'exact', head: true }),
      supabase.from('yorumlar').select('id', { count: 'exact', head: true }).eq('silindi', false),
      supabase.from('seriler').select('kategori_id, kategoriler(isim)'),
      supabase.from('seriler').select('baslik, goruntuleme_sayisi').order('goruntuleme_sayisi', { ascending: false }).limit(5),
      supabase.from('bolumler').select('baslik, sayi, goruntuleme_sayisi, seriler(baslik)').order('goruntuleme_sayisi', { ascending: false }).limit(5),
      supabase.from('profiller').select('created_at').gte('created_at', ayBaslangic.toISOString()),
      fetchTumZiyaretler(ayBaslangic.toISOString()),
    ])

    setIstat({ seri: s.count||0, kullanici: u.count||0, yorum: y.count||0 })
    setTopSeriler(topS.data||[])
    setTopBolumler(topB.data||[])

    const katMap = {}
    kat.data?.forEach(s => { const isim = s.kategoriler?.isim||'Diğer'; katMap[isim] = (katMap[isim]||0)+1 })
    setKatDagilim(Object.entries(katMap).map(([isim,sayi]) => ({isim,sayi})).sort((a,b)=>b.sayi-a.sayi))

    const grafikKayitlari = (kayitlarAy.data || []).filter(k => new Date(k.created_at) >= grafikBaslangic)
    const grafikZiyaretleri = (tumZiyaretler || []).filter(z => new Date(z.created_at) >= grafikBaslangic)

    setKayitGrafik(buildKayitGrafik(grafikKayitlari, zamanFiltre))
    setZiyaretGrafik(buildZiyaretGrafik(grafikZiyaretleri, zamanFiltre))

    const bugunZiyaretleri = (tumZiyaretler || []).filter(z => {
      const tarih = new Date(z.created_at)
      return tarih >= bugunBaslangic && tarih < yarinBaslangic
    })

    const dunZiyaretleri = (tumZiyaretler || []).filter(z => {
      const tarih = new Date(z.created_at)
      return tarih >= dunBaslangic && tarih < bugunBaslangic
    })

    setZiyaretOzet({
      bugun: uniqueVisitorCount(bugunZiyaretleri),
      dun: uniqueVisitorCount(dunZiyaretleri),
      hafta: uniqueVisitorCount((tumZiyaretler || []).filter(z => new Date(z.created_at) >= haftaBaslangic)),
      ay: uniqueVisitorCount(tumZiyaretler || []),
    })
  }

  return (
    <div>
      <SectionTitle eyebrow="Genel Bakis" title="Istatistikler" description="Paneli sadece rakam gosteren bir dashboard gibi degil, bugun neler oldugunu hizli anlatan bir komuta merkezi gibi yeniden kuruyoruz." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[{label:'Toplam Seri',deger:istat?.seri,emoji:'📚'},{label:'Toplam Kullanici',deger:istat?.kullanici,emoji:'👥'},{label:'Toplam Yorum',deger:istat?.yorum,emoji:'💬'}].map(k => (
          <Surface key={k.label} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ ...LB, marginBottom: 0 }}>{k.label}</div>
              <div style={{ width: '42px', height: '42px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,92,246,0.16)', border: '1px solid rgba(139,92,246,0.3)' }}>{k.emoji}</div>
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '54px', lineHeight: 0.9 }}>{istat ? k.deger : '–'}</div>
            <div style={{ fontSize: '13px', color: TEXT_SOFT, marginTop: '6px' }}>Genel panel ozeti</div>
          </Surface>
        ))}
        <Surface style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(139,92,246,0.22), rgba(255,255,255,0.04))' }}>
          <div style={{ ...LB, marginBottom: '12px' }}>Bugun Oncelik</div>
          <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Icerik akisina odaklan</div>
          <div style={{ fontSize: '13px', color: TEXT_SOFT, lineHeight: 1.7 }}>Tekil ziyaretci trendlerini ve iceriklerin ham acilis/goruntulenme akisini tek bakista gorebilirsin.</div>
        </Surface>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Bugün Tekil Ziyaretçi', deger: ziyaretOzet.bugun, alt: 'Bugün siteye giren tekil kişi' },
          { label: 'Dün Tekil Ziyaretçi', deger: ziyaretOzet.dun, alt: 'Dün siteye giren tekil kişi' },
          { label: 'Haftalık Tekil', deger: ziyaretOzet.hafta, alt: 'Son 7 gündeki tekil kişi' },
          { label: 'Aylık Tekil', deger: ziyaretOzet.ay, alt: 'Son 30 gündeki tekil kişi' },
        ].map((kart) => (
          <Surface key={kart.label} style={{ padding: '22px' }}>
            <div style={{ ...LB, marginBottom: '12px' }}>{kart.label}</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '46px', lineHeight: 0.9 }}>{kart.deger}</div>
            <div style={{ fontSize: '12px', color: TEXT_SOFT, marginTop: '8px', lineHeight: 1.6 }}>{kart.alt}</div>
          </Surface>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[['bugun','Bugun'],['hafta','Bu Hafta'],['ay','Bu Ay']].map(([val,label]) => (
          <button key={val} onClick={() => setZamanFiltre(val)} style={{ ...BS, background: zamanFiltre===val ? ACCENT : PANEL_BG, color: zamanFiltre===val ? '#111' : '#fff', border: zamanFiltre===val ? 'none' : PANEL_BORDER }}>{label}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <Surface>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>Yeni Kayitlar</div>
          <BarChart data={kayitGrafik} renk={ACCENT} />
        </Surface>
        <Surface>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>Gunluk Tekil Ziyaretci</div>
          <BarChart data={ziyaretGrafik} renk={PURPLE} />
        </Surface>
      </div>
      <Surface style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>Kategoriye Gore Seri Dagilimi</div>
        {katDagilim.map((k,i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', width: '120px', flexShrink: 0, color: '#fff' }}>{k.isim}</span>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${(k.sayi/(katDagilim[0]?.sayi||1))*100}%`, background: 'linear-gradient(90deg, #8b5cf6, #d8b4fe)', height: '100%', borderRadius: '999px', transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: '13px', color: TEXT_SOFT, width: '30px', textAlign: 'right' }}>{k.sayi}</span>
          </div>
        ))}
        {katDagilim.length === 0 && <div style={{ color: TEXT_SUBTLE, fontSize: '13px' }}>Veri yok</div>}
      </Surface>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Surface>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>En Cok Acilan Seriler</div>
          <div style={{ fontSize: '11px', color: TEXT_SUBTLE, marginBottom: '14px' }}>Ayni ziyaretcinin tekrar girisleri filtrelenmis ham seri acilis sayisi.</div>
          {topSeriler.map((s,i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: i<topSeriler.length-1?'1px solid rgba(255,255,255,0.06)':'none' }}>
              <span style={{ color: TEXT_SUBTLE, fontSize: '12px', width: '16px' }}>{i+1}</span>
              <span style={{ flex: 1, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.baslik}</span>
              <span style={{ fontSize: '12px', color: TEXT_SOFT }}>{s.goruntuleme_sayisi||0} acilis</span>
            </div>
          ))}
          {topSeriler.length===0 && <div style={{ color: TEXT_SUBTLE, fontSize: '13px' }}>Veri yok</div>}
        </Surface>
        <Surface>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>En Cok Acilan Bolumler</div>
          <div style={{ fontSize: '11px', color: TEXT_SUBTLE, marginBottom: '14px' }}>Bolum sayfasi yeterli sure goruldugunde artan ham bolum acilis sayisi.</div>
          {topBolumler.map((b,i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: i<topBolumler.length-1?'1px solid rgba(255,255,255,0.06)':'none' }}>
              <span style={{ color: TEXT_SUBTLE, fontSize: '12px', width: '16px' }}>{i+1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: TEXT_SUBTLE }}>{b.seriler?.baslik}</div>
                <div style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>#{b.sayi} {b.baslik}</div>
              </div>
              <span style={{ fontSize: '12px', color: TEXT_SOFT }}>{b.goruntuleme_sayisi||0} acilis</span>
            </div>
          ))}
          {topBolumler.length===0 && <div style={{ color: TEXT_SUBTLE, fontSize: '13px' }}>Veri yok</div>}
        </Surface>
      </div>
    </div>
  )
}

function OkumaSayilariSayfasi() {
  const [donemFiltre, setDonemFiltre] = useState('tum')
  const [yukleniyor, setYukleniyor] = useState(true)
  const [donemOzet, setDonemOzet] = useState({
    tum: { seri: 0, bolum: 0 },
    bugun: { seri: 0, bolum: 0 },
    hafta: { seri: 0, bolum: 0 },
    ay: { seri: 0, bolum: 0 },
  })
  const [topSeriler, setTopSeriler] = useState([])
  const [topBolumler, setTopBolumler] = useState([])
  const [tumSeriSatirlari, setTumSeriSatirlari] = useState([])
  const [tumBolumSatirlari, setTumBolumSatirlari] = useState([])

  useEffect(() => {
    fetchData()
  }, [donemFiltre])

  function tarihAnahtari(date) {
    const yil = date.getFullYear()
    const ay = String(date.getMonth() + 1).padStart(2, '0')
    const gun = String(date.getDate()).padStart(2, '0')
    return `${yil}-${ay}-${gun}`
  }

  async function fetchTumKayitlar(tablo, alanlar) {
    const hepsi = []
    const sayfaBoyutu = 1000
    let offset = 0

    while (true) {
      const { data, error } = await supabase
        .from(tablo)
        .select(alanlar)
        .range(offset, offset + sayfaBoyutu - 1)

      if (error) break
      if (!data?.length) break

      hepsi.push(...data)
      if (data.length < sayfaBoyutu) break
      offset += sayfaBoyutu
    }

    return hepsi
  }

  async function fetchTrackingKayitlari(tablo, alan, sinceDateKey) {
    const hepsi = []
    const sayfaBoyutu = 1000
    let offset = 0

    while (true) {
      const { data, error } = await supabase
        .from(tablo)
        .select(alan)
        .gte('goruntulenme_gunu', sinceDateKey)
        .range(offset, offset + sayfaBoyutu - 1)

      if (error) break
      if (!data?.length) break

      hepsi.push(...data)
      if (data.length < sayfaBoyutu) break
      offset += sayfaBoyutu
    }

    return hepsi
  }

  function sayimMapOlustur(kayitlar, anahtar) {
    const map = new Map()
    ;(kayitlar || []).forEach((kayit) => {
      const id = kayit?.[anahtar]
      if (!id) return
      map.set(id, (map.get(id) || 0) + 1)
    })
    return map
  }

  function buildSeriRows(seriler, sayimMap, tumZaman = false) {
    return (seriler || [])
      .map((seri) => ({
        id: seri.id,
        baslik: seri.baslik,
        sayi: tumZaman ? Number(seri.goruntuleme_sayisi || 0) : Number(sayimMap.get(seri.id) || 0),
      }))
      .sort((a, b) => b.sayi - a.sayi || a.baslik.localeCompare(b.baslik, 'tr'))
  }

  function buildBolumRows(bolumler, sayimMap, tumZaman = false) {
    return (bolumler || [])
      .map((bolum) => ({
        id: bolum.id,
        baslik: bolum.baslik,
        seriBaslik: bolum.seriler?.baslik || 'Seri yok',
        sayiNo: bolum.sayi,
        sayi: tumZaman ? Number(bolum.goruntuleme_sayisi || 0) : Number(sayimMap.get(bolum.id) || 0),
      }))
      .sort((a, b) => b.sayi - a.sayi || a.seriBaslik.localeCompare(b.seriBaslik, 'tr'))
  }

  async function fetchData() {
    setYukleniyor(true)

    const bugunBaslangic = new Date()
    bugunBaslangic.setHours(0, 0, 0, 0)
    const haftaBaslangic = new Date(bugunBaslangic)
    haftaBaslangic.setDate(haftaBaslangic.getDate() - 6)
    const ayBaslangic = new Date(bugunBaslangic)
    ayBaslangic.setDate(ayBaslangic.getDate() - 29)

    const [tumSeriler, tumBolumler, seriAyKayitlari, bolumAyKayitlari] = await Promise.all([
      fetchTumKayitlar('seriler', 'id, baslik, goruntuleme_sayisi'),
      fetchTumKayitlar('bolumler', 'id, baslik, sayi, goruntuleme_sayisi, seriler(baslik)'),
      fetchTrackingKayitlari('seri_goruntuleme_kayitlari', 'seri_id, goruntulenme_gunu', tarihAnahtari(ayBaslangic)),
      fetchTrackingKayitlari('bolum_goruntuleme_kayitlari', 'bolum_id, goruntulenme_gunu', tarihAnahtari(ayBaslangic)),
    ])

    const bugunKey = tarihAnahtari(bugunBaslangic)
    const haftaKey = tarihAnahtari(haftaBaslangic)
    const seriBugunKayitlari = (seriAyKayitlari || []).filter((kayit) => kayit.goruntulenme_gunu === bugunKey)
    const bolumBugunKayitlari = (bolumAyKayitlari || []).filter((kayit) => kayit.goruntulenme_gunu === bugunKey)
    const seriHaftaKayitlari = (seriAyKayitlari || []).filter((kayit) => kayit.goruntulenme_gunu >= haftaKey)
    const bolumHaftaKayitlari = (bolumAyKayitlari || []).filter((kayit) => kayit.goruntulenme_gunu >= haftaKey)

    const ozet = {
      tum: {
        seri: (tumSeriler || []).reduce((toplam, seri) => toplam + Number(seri?.goruntuleme_sayisi || 0), 0),
        bolum: (tumBolumler || []).reduce((toplam, bolum) => toplam + Number(bolum?.goruntuleme_sayisi || 0), 0),
      },
      bugun: { seri: seriBugunKayitlari.length, bolum: bolumBugunKayitlari.length },
      hafta: { seri: seriHaftaKayitlari.length, bolum: bolumHaftaKayitlari.length },
      ay: { seri: (seriAyKayitlari || []).length, bolum: (bolumAyKayitlari || []).length },
    }
    setDonemOzet(ozet)

    const seriSayimMap =
      donemFiltre === 'tum'
        ? null
        : sayimMapOlustur(
            donemFiltre === 'bugun' ? seriBugunKayitlari : donemFiltre === 'hafta' ? seriHaftaKayitlari : seriAyKayitlari,
            'seri_id'
          )
    const bolumSayimMap =
      donemFiltre === 'tum'
        ? null
        : sayimMapOlustur(
            donemFiltre === 'bugun' ? bolumBugunKayitlari : donemFiltre === 'hafta' ? bolumHaftaKayitlari : bolumAyKayitlari,
            'bolum_id'
          )

    const seriRows = buildSeriRows(tumSeriler, seriSayimMap || new Map(), donemFiltre === 'tum')
    const bolumRows = buildBolumRows(tumBolumler, bolumSayimMap || new Map(), donemFiltre === 'tum')

    setTopSeriler(seriRows.slice(0, 12))
    setTopBolumler(bolumRows.slice(0, 12))
    setTumSeriSatirlari(seriRows)
    setTumBolumSatirlari(bolumRows)
    setYukleniyor(false)
  }

  return (
    <div>
      <SectionTitle eyebrow="Icerik Performansi" title="Okuma Sayilari" description="Seri ve bölüm görüntülenmelerini tek yerde takip edelim. Burası özellikle hangi içeriklerin gerçekten açıldığını hızlı görmek için ayrıldı." />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          ['tum', 'Tüm Zamanlar'],
          ['bugun', 'Bugün'],
          ['hafta', 'Bu Hafta'],
          ['ay', 'Bu Ay'],
        ].map(([val, label]) => (
          <button key={val} onClick={() => setDonemFiltre(val)} style={{ ...BS, background: donemFiltre === val ? ACCENT : PANEL_BG, color: donemFiltre === val ? '#111' : '#fff', border: donemFiltre === val ? 'none' : PANEL_BORDER }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { key: 'tum', label: 'Tüm Zamanlar Okuma', alt: 'Seri + bölüm toplam açılış' },
          { key: 'bugun', label: 'Bugün Okuma', alt: 'Bugünkü seri + bölüm açılışı' },
          { key: 'hafta', label: 'Haftalık Okuma', alt: 'Son 7 gündeki seri + bölüm açılışı' },
          { key: 'ay', label: 'Aylık Okuma', alt: 'Son 30 gündeki seri + bölüm açılışı' },
        ].map((kart) => (
          <Surface key={kart.label} style={{ padding: '24px' }}>
            <div style={{ ...LB, marginBottom: '12px' }}>{kart.label}</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '52px', lineHeight: 0.9 }}>
              {yukleniyor ? '–' : (Number(donemOzet[kart.key]?.seri || 0) + Number(donemOzet[kart.key]?.bolum || 0))}
            </div>
            <div style={{ fontSize: '12px', color: TEXT_SOFT, marginTop: '8px', lineHeight: 1.6 }}>
              {kart.alt}
              {!yukleniyor ? ` · Seri ${donemOzet[kart.key]?.seri || 0} · Bölüm ${donemOzet[kart.key]?.bolum || 0}` : ''}
            </div>
          </Surface>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Surface>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>En Çok Okunan Seriler</div>
          <div style={{ fontSize: '11px', color: TEXT_SUBTLE, marginBottom: '14px' }}>{donemFiltre === 'tum' ? 'Tüm zamanlar seri görüntülenme toplamı.' : 'Seçili dönemde seri detayına girişten beslenen seri görüntülenmeleri.'}</div>
          {topSeriler.map((s, i) => (
            <div key={`${s.baslik}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: i < topSeriler.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <span style={{ color: TEXT_SUBTLE, fontSize: '12px', width: '18px' }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.baslik}</span>
              <span style={{ fontSize: '12px', color: TEXT_SOFT }}>{s.sayi || 0} görüntülenme</span>
            </div>
          ))}
          {!yukleniyor && topSeriler.length === 0 && <div style={{ color: TEXT_SUBTLE, fontSize: '13px' }}>Henüz veri yok.</div>}
        </Surface>

        <Surface>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>En Çok Okunan Bölümler</div>
          <div style={{ fontSize: '11px', color: TEXT_SUBTLE, marginBottom: '14px' }}>{donemFiltre === 'tum' ? 'Tüm zamanlar bölüm görüntülenme toplamı.' : 'Seçili dönemde okuyucuda 8 saniye kalındığında artan bölüm görüntülenmeleri.'}</div>
          {topBolumler.map((b, i) => (
            <div key={`${b.id || b.baslik}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: i < topBolumler.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <span style={{ color: TEXT_SUBTLE, fontSize: '12px', width: '18px' }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: TEXT_SUBTLE }}>{b.seriler?.baslik || 'Seri yok'}</div>
                <div style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>#{b.sayiNo || b.sayi} {b.baslik}</div>
              </div>
              <span style={{ fontSize: '12px', color: TEXT_SOFT }}>{b.sayi || b.goruntuleme_sayisi || 0} görüntülenme</span>
            </div>
          ))}
          {!yukleniyor && topBolumler.length === 0 && <div style={{ color: TEXT_SUBTLE, fontSize: '13px' }}>Henüz veri yok.</div>}
        </Surface>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
        <Surface>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Tüm Serilerin Ayrı Ayrı Okuma Sayıları</div>
          <div style={{ fontSize: '11px', color: TEXT_SUBTLE, marginBottom: '14px' }}>{donemFiltre === 'tum' ? 'Tüm zamanlar toplamına göre sıralanır.' : 'Seçili dönem filtresine göre sıralanır.'}</div>
          <div style={{ maxHeight: '540px', overflow: 'auto', paddingRight: '4px' }}>
            {tumSeriSatirlari.map((seri, i) => (
              <div key={seri.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: i < tumSeriSatirlari.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <span style={{ color: TEXT_SUBTLE, fontSize: '12px', width: '18px' }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: '13px' }}>{seri.baslik}</span>
                <span style={{ fontSize: '12px', color: TEXT_SOFT }}>{seri.sayi} görüntülenme</span>
              </div>
            ))}
            {!yukleniyor && tumSeriSatirlari.length === 0 && <div style={{ color: TEXT_SUBTLE, fontSize: '13px' }}>Henüz veri yok.</div>}
          </div>
        </Surface>

        <Surface>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Tüm Bölümlerin Ayrı Ayrı Okuma Sayıları</div>
          <div style={{ fontSize: '11px', color: TEXT_SUBTLE, marginBottom: '14px' }}>{donemFiltre === 'tum' ? 'Tüm zamanlar toplamına göre sıralanır.' : 'Seçili dönem filtresine göre sıralanır.'}</div>
          <div style={{ maxHeight: '540px', overflow: 'auto', paddingRight: '4px' }}>
            {tumBolumSatirlari.map((bolum, i) => (
              <div key={bolum.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: i < tumBolumSatirlari.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <span style={{ color: TEXT_SUBTLE, fontSize: '12px', width: '18px' }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', color: TEXT_SUBTLE }}>{bolum.seriBaslik}</div>
                  <div style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>#{bolum.sayiNo} {bolum.baslik}</div>
                </div>
                <span style={{ fontSize: '12px', color: TEXT_SOFT }}>{bolum.sayi} görüntülenme</span>
              </div>
            ))}
            {!yukleniyor && tumBolumSatirlari.length === 0 && <div style={{ color: TEXT_SUBTLE, fontSize: '13px' }}>Henüz veri yok.</div>}
          </div>
        </Surface>
      </div>
    </div>
  )
}

// ---- SERİLER ----
function SerilerSayfasi() {
  const [seriler, setSeriler] = useState([])
  const [kategoriler, setKategoriler] = useState([])
  const [turler, setTurler] = useState([])
  const [yazarlar, setYazarlar] = useState([])
  const [cizerler, setCizerler] = useState([])
  const [detayVitrinAyarMap, setDetayVitrinAyarMap] = useState({})
  const [mod, setMod] = useState('liste')
  const [gorunum, setGorunum] = useState('liste')
  const [duzenleId, setDuzenleId] = useState(null)
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kapakOnizleme, setKapakOnizleme] = useState(null)
  const [detayArkaOnizleme, setDetayArkaOnizleme] = useState(null)
  const [aramaMetni, setAramaMetni] = useState('')
  const [katFiltre, setKatFiltre] = useState('tumu')
  const [durumFiltre, setDurumFiltre] = useState('tumu')
  const [oneCikanFiltre, setOneCikanFiltre] = useState('tumu')
  const detayPreviewRef = useRef(null)
  const bos = { baslik:'',slug:'',tur:'seri',kategori:'manga',kategori_id:'',ozet:'',durum:'Devam Eden',kapak_url:'',turler:[],yazar_ids:[],cizer_ids:[],yil:'',one_cikan:false, detay_arka_plan_url:'', detay_arka_plan_fit:'cover', detay_arka_plan_pozisyon:'center center', detay_arka_plan_x:50, detay_arka_plan_y:50 }
  const [form, setForm] = useState(bos)

  useEffect(() => { fetchHepsi() }, [])
  async function fetchHepsi() {
    const [s,k,t,y,c,ayar] = await Promise.all([
      supabase.from('seriler').select('*, kategoriler(isim)').order('created_at',{ascending:false}),
      supabase.from('kategoriler').select('*').order('isim'),
      supabase.from('turler').select('*').order('isim'),
      supabase.from('yazarlar').select('*').order('isim'),
      supabase.from('cizerler').select('*').order('isim'),
      supabase.from('site_ayarlari').select('deger').eq('anahtar', 'seri_detay_vitrin').maybeSingle(),
    ])
    setSeriler(s.data||[]); setKategoriler(k.data||[]); setTurler(t.data||[]); setYazarlar(y.data||[]); setCizerler(c.data||[]); setDetayVitrinAyarMap(ayar.data?.deger || {})
  }

  function slugOlustur(v) {
    return v.toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
  }

  async function kaydetDetayVitrinAyar(seriId, detayForm) {
    if (!seriId) return
    const yeniMap = {
      ...detayVitrinAyarMap,
      [String(seriId)]: {
        arka_plan_url: detayForm.detay_arka_plan_url || '',
        arka_plan_fit: detayForm.detay_arka_plan_fit || 'cover',
        arka_plan_pozisyon: detayForm.detay_arka_plan_pozisyon || 'center center',
        arka_plan_x: Number(detayForm.detay_arka_plan_x ?? 50),
        arka_plan_y: Number(detayForm.detay_arka_plan_y ?? 50),
      }
    }
    const temizMap = Object.fromEntries(
      Object.entries(yeniMap).filter(([, ayar]) => ayar?.arka_plan_url)
    )
    await supabase.from('site_ayarlari').upsert({
      anahtar: 'seri_detay_vitrin',
      deger: temizMap,
      guncellendi_at: new Date().toISOString()
    }, { onConflict:'anahtar' })
    setDetayVitrinAyarMap(temizMap)
  }

  async function kaydet() {
    if (!form.baslik) { setMsg('❌ Başlık zorunlu!'); return }
    setYukleniyor(true)
    const payload = { baslik:form.baslik, slug:form.slug||slugOlustur(form.baslik), tur:form.tur, kategori:form.kategori, kategori_id:form.kategori_id||null, ozet:form.ozet, durum:form.tur==='tek'?'Tek Sayılık':form.durum, kapak_url:form.kapak_url, turler:form.turler, yil:form.yil?parseInt(form.yil):null, one_cikan:form.one_cikan }
    let seriId = duzenleId
    if (duzenleId) { await supabase.from('seriler').update(payload).eq('id',duzenleId) }
    else { const { data } = await supabase.from('seriler').insert([payload]).select().single(); seriId = data?.id }
    if (seriId) {
      await supabase.from('seri_yazarlar').delete().eq('seri_id',seriId)
      if (form.yazar_ids.length>0) await supabase.from('seri_yazarlar').insert(form.yazar_ids.map(id=>({seri_id:seriId,yazar_id:id})))
      await supabase.from('seri_cizerler').delete().eq('seri_id',seriId)
      if (form.cizer_ids.length>0) await supabase.from('seri_cizerler').insert(form.cizer_ids.map(id=>({seri_id:seriId,cizer_id:id})))
      await kaydetDetayVitrinAyar(seriId, form)
    }
    setMsg(duzenleId?'✅ Güncellendi!':'✅ Seri eklendi!')
    setForm(bos); setDuzenleId(null); setKapakOnizleme(null); setDetayArkaOnizleme(null); setMod('liste'); fetchHepsi(); setYukleniyor(false)
  }

  async function sil(id) {
    if (!confirm('Silmek istediğine emin misin?')) return
    await supabase.from('seriler').delete().eq('id',id); fetchHepsi()
  }

  async function toggleOneCikan(id, mevcut) {
    await supabase.from('seriler').update({one_cikan:!mevcut}).eq('id',id); fetchHepsi()
  }

  async function duzenle(s) {
    setDuzenleId(s.id); setKapakOnizleme(s.kapak_url)
    const detayAyar = detayVitrinAyarMap[String(s.id)] || {}
    setDetayArkaOnizleme(detayAyar.arka_plan_url || null)
    const [yz,cz] = await Promise.all([supabase.from('seri_yazarlar').select('yazar_id').eq('seri_id',s.id),supabase.from('seri_cizerler').select('cizer_id').eq('seri_id',s.id)])
    setForm({
      ...bos,
      ...s,
      detay_arka_plan_url: detayAyar.arka_plan_url || '',
      detay_arka_plan_fit: detayAyar.arka_plan_fit || 'cover',
      detay_arka_plan_pozisyon: detayAyar.arka_plan_pozisyon || 'center center',
      detay_arka_plan_x: detayAyar.arka_plan_x ?? 50,
      detay_arka_plan_y: detayAyar.arka_plan_y ?? 50,
      yazar_ids:yz.data?.map(x=>x.yazar_id)||[],
      cizer_ids:cz.data?.map(x=>x.cizer_id)||[]
    }); setMod('form')
  }

  function detayPozisyonGuncelle(clientX, clientY) {
    if (!detayPreviewRef.current) return
    const rect = detayPreviewRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    setForm(f => ({
      ...f,
      detay_arka_plan_x: Math.round(x),
      detay_arka_plan_y: Math.round(y),
      detay_arka_plan_pozisyon: `${Math.round(x)}% ${Math.round(y)}%`,
    }))
  }

  function handleDetayPreviewPointerDown(e) {
    detayPozisyonGuncelle(e.clientX, e.clientY)
  }

  function handleDetayPreviewPointerMove(e) {
    if (e.buttons !== 1) return
    detayPozisyonGuncelle(e.clientX, e.clientY)
  }

  const filtreli = seriler
    .filter(s => katFiltre === 'tumu' || s.kategori_id === katFiltre)
    .filter(s => durumFiltre === 'tumu' || s.durum === durumFiltre)
    .filter(s => oneCikanFiltre === 'tumu' || (oneCikanFiltre === 'onecikan' ? s.one_cikan : !s.one_cikan))
    .filter(s => !aramaMetni || s.baslik.toLowerCase().includes(aramaMetni.toLowerCase()))

  if (mod==='form') return (
    <div style={{ maxWidth:'760px' }}>
      <SectionTitle
        eyebrow="Icerik"
        title={duzenleId ? 'Seri Duzenle' : 'Yeni Seri'}
        description="Seri kimligini, kapagini, detay hero alanini ve bagli ekip bilgisini tek akista yonet."
        action={<button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null);setKapakOnizleme(null);setDetayArkaOnizleme(null)}} style={BS}>Listeye Don</button>}
      />
      <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'24px' }}>
        <button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null);setKapakOnizleme(null);setDetayArkaOnizleme(null)}} style={BS}>← Geri</button>
        <div style={{ fontSize:'16px',fontWeight:600 }}>{duzenleId?'Seri Düzenle':'Yeni Seri'}</div>
      </div>
      <Msg text={msg} />
      <Surface style={{ padding:'24px', marginBottom:'18px' }}>
      <div style={{ display:'flex',gap:'20px',marginBottom:'20px' }}>
        <ResimYukle onizleme={kapakOnizleme} onChange={(url,prev)=>{setForm(f=>({...f,kapak_url:url}));setKapakOnizleme(prev)}} />
        <div style={{ flex:1 }}>
          <div style={{ marginBottom:'12px' }}><div style={LB}>Başlık</div><input value={form.baslik} onChange={e=>setForm(f=>({...f,baslik:e.target.value,slug:slugOlustur(e.target.value)}))} style={I} /></div>
          <div style={{ marginBottom:'12px' }}><div style={LB}>Slug</div><input value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))} style={I} /></div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px' }}>
            <div><div style={LB}>Tür</div><select value={form.tur} onChange={e=>setForm(f=>({...f,tur:e.target.value}))} style={S}><option value="seri">Seri</option><option value="tek">Tek Sayılık</option></select></div>
            <div><div style={LB}>Yıl</div><input value={form.yil} onChange={e=>setForm(f=>({...f,yil:e.target.value}))} style={I} type="number" placeholder="2024" /></div>
          </div>
        </div>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px' }}>
        <div><div style={LB}>Kategori</div><AramaSecimTek liste={kategoriler.map(k=>({id:k.id,isim:k.isim}))} secili={form.kategori_id} onChange={v=>setForm(f=>({...f,kategori_id:v}))} placeholder="Kategori seç" /></div>
        <div><div style={LB}>Durum</div><select value={form.durum} onChange={e=>setForm(f=>({...f,durum:e.target.value}))} style={S}><option>Devam Eden</option><option>Tamamlandı</option><option>Askıya Alındı</option><option>Tek Sayılık</option></select></div>
      </div>
      <div style={{ marginBottom:'12px' }}><div style={LB}>Özet</div><textarea value={form.ozet} onChange={e=>setForm(f=>({...f,ozet:e.target.value}))} style={{...I,height:'80px',resize:'vertical'}} /></div>
      <div style={{ ...CARD_INNER, padding:'16px',marginBottom:'16px' }}>
        <div style={{ fontSize:'13px',fontWeight:600,marginBottom:'14px' }}>Seri Detay Hero Alanı</div>
        <div style={{ display:'flex',gap:'16px',flexWrap:'wrap',marginBottom:'14px' }}>
          <div>
            <div style={LB}>Detay Arka Planı</div>
            <ResimYukle onizleme={detayArkaOnizleme || form.detay_arka_plan_url} onChange={(url,prev)=>{setForm(f=>({...f,detay_arka_plan_url:url}));setDetayArkaOnizleme(prev)}} bucket="site" width="180px" height="100px" />
          </div>
          <div style={{ flex:'1 1 280px', minWidth:'260px' }}>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px' }}>
              <div><div style={LB}>Görsel Boyutu</div><select value={form.detay_arka_plan_fit || 'cover'} onChange={e=>setForm(f=>({...f,detay_arka_plan_fit:e.target.value}))} style={S}><option value="cover">Cover</option><option value="contain">Contain</option></select></div>
              <div><div style={LB}>Görsel Hizası</div><select value={form.detay_arka_plan_pozisyon || 'center center'} onChange={e=>{
                const value = e.target.value
                const [xToken, yToken] = value.split(' ')
                const harita = { left: 0, center: 50, right: 100, top: 0, bottom: 100 }
                setForm(f=>({
                  ...f,
                  detay_arka_plan_pozisyon:value,
                  detay_arka_plan_x: harita[xToken] ?? 50,
                  detay_arka_plan_y: harita[yToken] ?? 50
                }))
              }} style={S}><option value="left center">Sol</option><option value="center center">Orta</option><option value="right center">Sağ</option><option value="center top">Üst</option><option value="center bottom">Alt</option></select></div>
            </div>
            <div style={{ fontSize:'12px',color:'#888',lineHeight:1.6 }}>
              Bu görsel seri detay sayfasının üst hero alanında kullanılır. Boş bırakılırsa kapak görseli arka plan olarak kullanılır.
            </div>
          </div>
        </div>
        {(detayArkaOnizleme || form.detay_arka_plan_url || form.kapak_url) && (
          <div
            ref={detayPreviewRef}
            onPointerDown={handleDetayPreviewPointerDown}
            onPointerMove={handleDetayPreviewPointerMove}
            style={{ position:'relative',height:'180px',borderRadius:'14px',overflow:'hidden',background:'#111',cursor:'grab',touchAction:'none' }}
          >
            <img src={detayArkaOnizleme || form.detay_arka_plan_url || form.kapak_url} style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:form.detay_arka_plan_fit || 'cover',objectPosition:`${form.detay_arka_plan_x ?? 50}% ${form.detay_arka_plan_y ?? 50}%`,opacity:0.68 }} />
            <div style={{ position:'absolute',inset:0,background:'linear-gradient(90deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.72) 34%, rgba(0,0,0,0.26) 100%), linear-gradient(180deg, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.82) 100%)' }} />
            <div style={{ position:'absolute',top:'10px',right:'10px',zIndex:1,padding:'6px 10px',borderRadius:'999px',background:'rgba(10,10,10,0.72)',color:'#fff',fontSize:'11px' }}>
              {form.detay_arka_plan_x ?? 50}% / {form.detay_arka_plan_y ?? 50}%
            </div>
            <div style={{ position:'absolute',left:'18px',bottom:'18px',right:'18px',display:'grid',gridTemplateColumns:'96px minmax(0,1fr)',gap:'16px',alignItems:'end' }}>
              <div style={{ borderRadius:'10px',overflow:'hidden',background:'#1a1a1a',aspectRatio:'2 / 3',boxShadow:'0 14px 28px rgba(0,0,0,0.35)' }}>
                {(form.kapak_url || kapakOnizleme) && <img src={kapakOnizleme || form.kapak_url} style={{ width:'100%',height:'100%',objectFit:'cover' }} />}
              </div>
              <div>
                <div style={{ display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'10px' }}>
                  <span style={{ padding:'4px 10px',borderRadius:'999px',background:'#16a34a',color:'#fff',fontSize:'10px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase' }}>{form.durum || 'Devam Eden'}</span>
                  {(kategoriler.find(k=>k.id===form.kategori_id)?.isim || form.kategori) && <span style={{ padding:'4px 10px',borderRadius:'999px',background:'rgba(255,255,255,0.12)',color:'#fff',fontSize:'10px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase' }}>{kategoriler.find(k=>k.id===form.kategori_id)?.isim || form.kategori}</span>}
                </div>
                <div style={{ fontFamily:"'Bebas Neue', sans-serif",fontSize:'42px',lineHeight:0.9,color:'#fff',marginBottom:'10px' }}>{(form.baslik || 'Seri Başlığı').toUpperCase()}</div>
                <div style={{ color:'rgba(255,255,255,0.78)',fontSize:'13px',maxWidth:'54ch',lineHeight:1.6 }}>{form.ozet || 'Seri detay sayfasındaki büyük açılış alanı burada bu görselle önizlenir.'}</div>
              </div>
            </div>
          </div>
        )}
        <div style={{ fontSize:'12px',color:'#888',lineHeight:1.6,marginTop:'10px' }}>
          Görseli fareyle sürükleyerek kadrajı elle ayarlayabilirsin.
        </div>
      </div>
      <div style={{ marginBottom:'12px' }}><div style={LB}>Yazarlar</div><AramaSecim liste={yazarlar.map(y=>({id:y.id,isim:y.isim}))} secili={form.yazar_ids} onChange={v=>setForm(f=>({...f,yazar_ids:v}))} placeholder="Yazar ekle..." /></div>
      <div style={{ marginBottom:'12px' }}><div style={LB}>Çizerler</div><AramaSecim liste={cizerler.map(c=>({id:c.id,isim:c.isim}))} secili={form.cizer_ids} onChange={v=>setForm(f=>({...f,cizer_ids:v}))} placeholder="Çizer ekle..." /></div>
      <div style={{ marginBottom:'12px' }}>
        <div style={LB}>Türler</div>
        <div style={{ display:'flex',flexWrap:'wrap',gap:'8px' }}>
          {turler.map(t=>(
            <button key={t.id} onClick={()=>setForm(f=>({...f,turler:f.turler.includes(t.id)?f.turler.filter(x=>x!==t.id):[...f.turler,t.id]}))} style={{...BS,background:form.turler.includes(t.id)?'#111':'#f5f4f0',color:form.turler.includes(t.id)?'#fff':'#111',border:form.turler.includes(t.id)?'none':'1px solid #e8e6e0'}}>{t.isim}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom:'20px' }}>
        <label style={{ display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13px' }}>
          <input type="checkbox" checked={form.one_cikan} onChange={e=>setForm(f=>({...f,one_cikan:e.target.checked}))} /> Öne Çıkan Seri
        </label>
      </div>
      <div style={{ display:'flex',gap:'10px' }}>
        <button onClick={kaydet} disabled={yukleniyor} style={BP}>{yukleniyor?'Kaydediliyor...':'Kaydet'}</button>
        <button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null);setKapakOnizleme(null);setDetayArkaOnizleme(null)}} style={BS}>İptal</button>
      </div>
      </Surface>
    </div>
  )

  return (
    <div>
      <SectionTitle
        eyebrow="Icerik"
        title="Seriler"
        description="Yeni seri ekle, detay vitrini kur, one cikanlari yonet ve arsivi hizli filtrelerle duzenle."
        action={
          <div style={{ display:'flex',gap:'8px' }}>
            <button onClick={()=>setGorunum(gorunum==='liste'?'grid':'liste')} style={BS}>{gorunum==='liste'?'Grid Gorunumu':'Liste Gorunumu'}</button>
            <button onClick={()=>setMod('form')} style={BP}>Yeni Seri</button>
          </div>
        }
      />
      <Surface style={{ padding:'18px', marginBottom:'18px' }}>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:'12px',marginBottom:'16px' }}>
        <div style={{ ...CARD_INNER, padding:'16px' }}>
          <div style={LB}>Toplam Seri</div>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'42px', lineHeight:0.9 }}>{seriler.length}</div>
        </div>
        <div style={{ ...CARD_INNER, padding:'16px' }}>
          <div style={LB}>Filtrelenmis Sonuc</div>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'42px', lineHeight:0.9 }}>{filtreli.length}</div>
        </div>
        <div style={{ ...CARD_INNER, padding:'16px' }}>
          <div style={LB}>One Cikan</div>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'42px', lineHeight:0.9 }}>{seriler.filter(s => s.one_cikan).length}</div>
        </div>
      </div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px',gap:'12px',flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:'16px',fontWeight:600,marginBottom:'4px' }}>Seri Arsivi</div>
          <div style={{ fontSize:'12px',color:TEXT_SUBTLE }}>Kategori, durum ve öne çıkan filtresiyle arşivi daralt.</div>
        </div>
        <div style={{ display:'flex',gap:'8px',flexWrap:'wrap' }}>
          <button onClick={()=>setGorunum(gorunum==='liste'?'grid':'liste')} style={BS}>{gorunum==='liste'?'⊞ Grid':'☰ Liste'}</button>
          <button onClick={()=>{setKatFiltre('tumu');setDurumFiltre('tumu');setOneCikanFiltre('tumu');setAramaMetni('')}} style={BS}>Filtreleri Temizle</button>
          <button onClick={()=>setMod('form')} style={BP}>+ Yeni Seri</button>
        </div>
      </div>
      <div style={{ display:'flex',gap:'8px',marginBottom:'12px',flexWrap:'wrap' }}>
        <button onClick={()=>setKatFiltre('tumu')} style={{...BS,background:katFiltre==='tumu'?ACCENT:PANEL_BG,color:katFiltre==='tumu'?'#111':'#fff',border:katFiltre==='tumu'?'none':PANEL_BORDER}}>Tümü ({seriler.length})</button>
        {kategoriler.map(k=>{const sayi=seriler.filter(s=>s.kategori_id===k.id).length;return<button key={k.id} onClick={()=>setKatFiltre(k.id)} style={{...BS,background:katFiltre===k.id?ACCENT:PANEL_BG,color:katFiltre===k.id?'#111':'#fff',border:katFiltre===k.id?'none':PANEL_BORDER}}>{k.isim} ({sayi})</button>})}
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'minmax(220px, 1.2fr) minmax(180px, 220px) minmax(180px, 220px)',gap:'12px',marginBottom:'16px' }}>
        <input value={aramaMetni} onChange={e=>setAramaMetni(e.target.value)} placeholder="Seri ara..." style={{...I}} />
        <select value={durumFiltre} onChange={e=>setDurumFiltre(e.target.value)} style={S}>
          <option value="tumu">Tüm Durumlar</option>
          <option value="Devam Eden">Devam Eden</option>
          <option value="Tamamlandı">Tamamlandı</option>
          <option value="Askıya Alındı">Askıya Alındı</option>
          <option value="Tek Sayılık">Tek Sayılık</option>
        </select>
        <select value={oneCikanFiltre} onChange={e=>setOneCikanFiltre(e.target.value)} style={S}>
          <option value="tumu">Tüm Vitrinler</option>
          <option value="onecikan">Sadece Öne Çıkan</option>
          <option value="normal">Öne Çıkmayanlar</option>
        </select>
      </div>
      {gorunum==='grid' ? (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))',gap:'16px' }}>
          {filtreli.map(s=>(
            <div key={s.id} style={{ ...CARD_INNER, overflow:'hidden' }}>
              <div style={{ width:'100%',paddingTop:'133%',position:'relative',background:'rgba(255,255,255,0.05)' }}>
                {s.kapak_url&&<img src={s.kapak_url} style={{ position:'absolute',top:0,left:0,width:'100%',height:'100%',objectFit:'cover' }} />}
                {s.one_cikan&&<span style={{ position:'absolute',top:'8px',right:'8px',background:'#f59e0b',color:'#fff',fontSize:'10px',padding:'2px 6px',borderRadius:'4px' }}>⭐</span>}
              </div>
              <div style={{ padding:'10px' }}>
                <div style={{ fontSize:'13px',fontWeight:600,marginBottom:'4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{s.baslik}</div>
                <div style={{ fontSize:'11px',color:TEXT_SUBTLE,marginBottom:'8px' }}>{s.kategoriler?.isim}</div>
                <div style={{ display:'flex',gap:'6px' }}>
                  <button onClick={()=>duzenle(s)} style={{...BS,flex:1,textAlign:'center'}}>Düzenle</button>
                  <button onClick={()=>sil(s.id)} style={BD}>Sil</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={TABLE_WRAP}>
          {filtreli.map((s,i)=>(
            <div key={s.id} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderBottom:i<filtreli.length-1?TABLE_ROW.borderBottom:'none', background:'transparent' }}>
              {s.kapak_url?<img src={s.kapak_url} style={{ width:'40px',height:'53px',objectFit:'cover',borderRadius:'4px',flexShrink:0 }} />:<div style={{ width:'40px',height:'53px',background:'rgba(255,255,255,0.05)',borderRadius:'4px',flexShrink:0 }} />}
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:'14px',fontWeight:500 }}>{s.baslik} {s.one_cikan&&<span style={{ fontSize:'11px',background:'rgba(245,158,11,0.18)',color:'#fbbf24',padding:'2px 7px',borderRadius:'999px',border:'1px solid rgba(245,158,11,0.28)' }}>One Cikan</span>}</div>
                <div style={{ fontSize:'12px',color:TEXT_SUBTLE }}>{s.kategoriler?.isim} · {s.durum} · {s.goruntuleme_sayisi||0} ham açılış</div>
              </div>
              <button onClick={()=>toggleOneCikan(s.id,s.one_cikan)} style={{...BS,fontSize:'11px'}}>{s.one_cikan?'★ Kaldır':'☆ Öne Çıkar'}</button>
              <button onClick={()=>duzenle(s)} style={BS}>Düzenle</button>
              <button onClick={()=>sil(s.id)} style={BD}>Sil</button>
            </div>
          ))}
          {filtreli.length===0&&<div style={{ padding:'40px',textAlign:'center',color:TEXT_SUBTLE }}>Seri bulunamadı</div>}
        </div>
      )}
      </Surface>
    </div>
  )
}

// ---- BÖLÜMLER ----
function BolumlerSayfasi() {
  const [bolumler, setBolumler] = useState([])
  const [seriler, setSeriler] = useState([])
  const [ekip, setEkip] = useState([])
  const [bolumSayfaMap, setBolumSayfaMap] = useState({})
  const [mod, setMod] = useState('liste')
  const [gorunum, setGorunum] = useState('liste')
  const [duzenleId, setDuzenleId] = useState(null)
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kapakOnizleme, setKapakOnizleme] = useState(null)
  const [seriFiltre, setSeriFiltre] = useState('tumu')
  const [aramaMetni, setAramaMetni] = useState('')
  const [sayfaFiltre, setSayfaFiltre] = useState('tumu')
  const bos = { seri_id:'',sayi:'',baslik:'',kapak_url:'',drive_link:'',indirme_link:'',pdf_indirme_link:'',cbr_indirme_link:'',cevirmen_id:'',balonlama_id:'',grafik_id:'', sayfa_gorselleri:[] }
  const [form, setForm] = useState(bos)

  useEffect(() => { fetchHepsi() }, [])
  async function fetchHepsi() {
    const [b,s,e,ayar] = await Promise.all([
      supabase.from('bolumler').select('*, seriler(baslik)').order('created_at',{ascending:false}),
      supabase.from('seriler').select('id, baslik').order('baslik'),
      supabase.from('ekip').select('*').order('isim'),
      supabase.from('site_ayarlari').select('deger').eq('anahtar', 'bolum_okuma_sayfalari').maybeSingle(),
    ])
    setBolumler(b.data||[]); setSeriler(s.data||[]); setEkip(e.data||[]); setBolumSayfaMap(ayar.data?.deger || {})
  }

  async function kaydetBolumSayfalari(bolumId, sayfalar) {
    if (!bolumId) return
    const yeniMap = {
      ...bolumSayfaMap,
      [String(bolumId)]: (sayfalar || []).filter(Boolean)
    }
    const temizMap = Object.fromEntries(
      Object.entries(yeniMap).filter(([, value]) => Array.isArray(value) && value.length > 0)
    )
    await supabase.from('site_ayarlari').upsert({
      anahtar:'bolum_okuma_sayfalari',
      deger: temizMap,
      guncellendi_at: new Date().toISOString()
    }, { onConflict:'anahtar' })
    setBolumSayfaMap(temizMap)
  }

  async function kaydet() {
    if (!form.seri_id||!form.sayi||!form.baslik) { setMsg('❌ Seri, sayı ve başlık zorunlu!'); return }
    setYukleniyor(true)
    const pdfLink = form.pdf_indirme_link || form.indirme_link || null
    const payload = {
      seri_id:form.seri_id,
      sayi:parseInt(form.sayi),
      baslik:form.baslik,
      kapak_url:form.kapak_url,
      drive_link:form.drive_link,
      indirme_link:pdfLink,
      pdf_indirme_link:pdfLink,
      cbr_indirme_link:form.cbr_indirme_link || null,
      cevirmen_id:form.cevirmen_id||null,
      balonlama_id:form.balonlama_id||null,
      grafik_id:form.grafik_id||null
    }
    let bolumId = duzenleId
    if (duzenleId) await supabase.from('bolumler').update(payload).eq('id',duzenleId)
    else {
      const { data } = await supabase.from('bolumler').insert([payload]).select().single()
      bolumId = data?.id
    }
    if (bolumId) await kaydetBolumSayfalari(bolumId, form.sayfa_gorselleri)
    setMsg(duzenleId?'✅ Güncellendi!':'✅ Bölüm eklendi!')
    setForm(bos); setDuzenleId(null); setKapakOnizleme(null); setMod('liste'); fetchHepsi(); setYukleniyor(false)
  }

  async function sil(id) {
    if (!confirm('Silmek istediğine emin misin?')) return
    await supabase.from('bolumler').delete().eq('id',id); fetchHepsi()
  }

  const filtreli = bolumler
    .filter(b => seriFiltre === 'tumu' || b.seri_id === seriFiltre)
    .filter(b => sayfaFiltre === 'tumu' || (sayfaFiltre === 'sayfali' ? (bolumSayfaMap[String(b.id)]?.length || 0) > 0 : (bolumSayfaMap[String(b.id)]?.length || 0) === 0))
    .filter(b => !aramaMetni || b.baslik.toLowerCase().includes(aramaMetni.toLowerCase()) || b.seriler?.baslik.toLowerCase().includes(aramaMetni.toLowerCase()))

  if (mod==='form') return (
    <div style={{ maxWidth:'680px' }}>
      <SectionTitle
        eyebrow="Icerik"
        title={duzenleId?'Bolum Duzenle':'Yeni Bolum'}
        description="Kapak, okuyucu sayfalari, bagli ekip ve indirme/okuma akisini tek yerden guncelle."
        action={<button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>Listeye Don</button>}
      />
      <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'24px' }}>
        <button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>← Geri</button>
        <div style={{ fontSize:'16px',fontWeight:600 }}>{duzenleId?'Bölüm Düzenle':'Yeni Bölüm'}</div>
      </div>
      <Msg text={msg} />
      <Surface style={{ padding:'24px' }}>
      <div style={{ display:'flex',gap:'20px',marginBottom:'16px' }}>
        <ResimYukle onizleme={kapakOnizleme} onChange={(url,prev)=>{setForm(f=>({...f,kapak_url:url}));setKapakOnizleme(prev)}} />
        <div style={{ flex:1 }}>
          <div style={{ marginBottom:'12px' }}><div style={LB}>Seri</div><AramaSecimTek liste={seriler.map(s=>({id:s.id,isim:s.baslik}))} secili={form.seri_id} onChange={v=>setForm(f=>({...f,seri_id:v}))} placeholder="Seri seç" /></div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 2fr',gap:'12px' }}>
            <div><div style={LB}>Sayı</div><input type="number" value={form.sayi} onChange={e=>setForm(f=>({...f,sayi:e.target.value}))} style={I} /></div>
            <div><div style={LB}>Başlık</div><input value={form.baslik} onChange={e=>setForm(f=>({...f,baslik:e.target.value}))} style={I} /></div>
          </div>
        </div>
      </div>
      <div style={{ marginBottom:'12px' }}><div style={LB}>Drive Linki</div><input value={form.drive_link} onChange={e=>setForm(f=>({...f,drive_link:e.target.value}))} style={I} placeholder="https://drive.google.com/..." /></div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
        <div>
          <div style={LB}>PDF İndirme Linki</div>
          <input value={form.pdf_indirme_link || form.indirme_link || ''} onChange={e=>setForm(f=>({...f,pdf_indirme_link:e.target.value,indirme_link:e.target.value}))} style={I} placeholder="https://..." />
        </div>
        <div>
          <div style={LB}>CBR İndirme Linki</div>
          <input value={form.cbr_indirme_link || ''} onChange={e=>setForm(f=>({...f,cbr_indirme_link:e.target.value}))} style={I} placeholder="https://..." />
        </div>
      </div>
      <div style={{ ...CARD_INNER, padding:'16px', marginBottom:'16px' }}>
        <div style={{ fontSize:'13px', fontWeight:600, marginBottom:'14px' }}>Okuyucu Sayfalari</div>
        <CokluResimYukle gorseller={form.sayfa_gorselleri || []} onChange={(liste) => setForm(f => ({ ...f, sayfa_gorselleri: liste }))} />
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'20px' }}>
        {[['cevirmen_id','Çevirmen'],['balonlama_id','Balonlama'],['grafik_id','Grafik']].map(([key,label])=>(
          <div key={key}><div style={LB}>{label}</div><AramaSecimTek liste={ekip.map(e=>({id:e.id,isim:e.isim}))} secili={form[key]} onChange={v=>setForm(f=>({...f,[key]:v}))} placeholder={label+' seç'} /></div>
        ))}
      </div>
      <div style={{ display:'flex',gap:'10px' }}>
        <button onClick={kaydet} disabled={yukleniyor} style={BP}>{yukleniyor?'Kaydediliyor...':'Kaydet'}</button>
        <button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>İptal</button>
      </div>
      </Surface>
    </div>
  )

  return (
    <div>
      <SectionTitle
        eyebrow="Icerik"
        title="Bolumler"
        description="Okuyucu deneyiminin kalbi burada. Seri bazli filtrele, sayfa sayilarini kontrol et ve bolum akisini hizla yonet."
        action={
          <div style={{ display:'flex',gap:'8px' }}>
            <button onClick={()=>setGorunum(gorunum==='liste'?'grid':'liste')} style={BS}>{gorunum==='liste'?'Grid Gorunumu':'Liste Gorunumu'}</button>
            <button onClick={()=>setMod('form')} style={BP}>Yeni Bolum</button>
          </div>
        }
      />
      <Surface style={{ padding:'18px', marginBottom:'18px' }}>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:'12px',marginBottom:'16px' }}>
        <div style={{ ...CARD_INNER, padding:'16px' }}>
          <div style={LB}>Toplam Bolum</div>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'42px', lineHeight:0.9 }}>{bolumler.length}</div>
        </div>
        <div style={{ ...CARD_INNER, padding:'16px' }}>
          <div style={LB}>Filtrelenmis Sonuc</div>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'42px', lineHeight:0.9 }}>{filtreli.length}</div>
        </div>
        <div style={{ ...CARD_INNER, padding:'16px' }}>
          <div style={LB}>Toplam Sayfa</div>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'42px', lineHeight:0.9 }}>{Object.values(bolumSayfaMap).reduce((sum, pages) => sum + (pages?.length || 0), 0)}</div>
        </div>
      </div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px',gap:'12px',flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:'16px',fontWeight:600,marginBottom:'4px' }}>Bolum Arsivi</div>
          <div style={{ fontSize:'12px',color:TEXT_SUBTLE }}>Seri bazlı filtrele, sayfasız bölümleri bul ve okuma akışını temiz tut.</div>
        </div>
        <div style={{ display:'flex',gap:'8px',flexWrap:'wrap' }}>
          <button onClick={()=>setGorunum(gorunum==='liste'?'grid':'liste')} style={BS}>{gorunum==='liste'?'⊞ Grid':'☰ Liste'}</button>
          <button onClick={()=>{setSeriFiltre('tumu');setSayfaFiltre('tumu');setAramaMetni('')}} style={BS}>Filtreleri Temizle</button>
          <button onClick={()=>setMod('form')} style={BP}>+ Yeni Bölüm</button>
        </div>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'minmax(240px, 1.2fr) minmax(220px, 1fr) minmax(180px, 220px)',gap:'12px',marginBottom:'16px' }}>
        <input value={aramaMetni} onChange={e=>setAramaMetni(e.target.value)} placeholder="Bölüm veya seri ara..." style={I} />
        <AramaSecimTek liste={[{ id:'tumu', isim:'Tum Seriler' }, ...seriler.map(s=>({id:s.id,isim:s.baslik}))]} secili={seriFiltre} onChange={setSeriFiltre} placeholder="Seri filtrele" />
        <select value={sayfaFiltre} onChange={e=>setSayfaFiltre(e.target.value)} style={S}>
          <option value="tumu">Tüm Bölümler</option>
          <option value="sayfali">Sayfası Olanlar</option>
          <option value="sayfasiz">Sayfasızlar</option>
        </select>
      </div>
      {gorunum==='grid' ? (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))',gap:'16px' }}>
          {filtreli.map(b=>(
            <div key={b.id} style={{ ...CARD_INNER, overflow:'hidden' }}>
              <div style={{ width:'100%',paddingTop:'133%',position:'relative',background:'rgba(255,255,255,0.05)' }}>
                {b.kapak_url&&<img src={b.kapak_url} style={{ position:'absolute',top:0,left:0,width:'100%',height:'100%',objectFit:'cover' }} />}
              </div>
              <div style={{ padding:'10px' }}>
                <div style={{ fontSize:'11px',color:TEXT_SUBTLE,marginBottom:'2px' }}>{b.seriler?.baslik}</div>
                <div style={{ fontSize:'13px',fontWeight:600 }}>#{b.sayi} {b.baslik}</div>
                <div style={{ fontSize:'11px',color:TEXT_SUBTLE,marginTop:'4px' }}>{bolumSayfaMap[String(b.id)]?.length || 0} sayfa</div>
                <div style={{ display:'flex',gap:'6px',marginTop:'8px' }}>
                  <button onClick={()=>{setForm({...bos,...b,sayfa_gorselleri:bolumSayfaMap[String(b.id)] || []});setKapakOnizleme(b.kapak_url);setDuzenleId(b.id);setMod('form')}} style={{...BS,flex:1}}>Düzenle</button>
                  <button onClick={()=>sil(b.id)} style={BD}>Sil</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={TABLE_WRAP}>
          {filtreli.map((b,i)=>(
            <div key={b.id} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderBottom:i<filtreli.length-1?TABLE_ROW.borderBottom:'none' }}>
              {b.kapak_url?<img src={b.kapak_url} style={{ width:'40px',height:'53px',objectFit:'cover',borderRadius:'4px',flexShrink:0 }} />:<div style={{ width:'40px',height:'53px',background:'rgba(255,255,255,0.05)',borderRadius:'4px',flexShrink:0 }} />}
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'12px',color:TEXT_SUBTLE }}>{b.seriler?.baslik}</div>
                <div style={{ fontSize:'14px',fontWeight:500 }}>#{b.sayi} {b.baslik}</div>
                <div style={{ fontSize:'12px',color:TEXT_SUBTLE }}>{b.goruntuleme_sayisi||0} ham açılış · {bolumSayfaMap[String(b.id)]?.length || 0} sayfa</div>
              </div>
              <button onClick={()=>{setForm({...bos,...b,sayfa_gorselleri:bolumSayfaMap[String(b.id)] || []});setKapakOnizleme(b.kapak_url);setDuzenleId(b.id);setMod('form')}} style={BS}>Düzenle</button>
              <button onClick={()=>sil(b.id)} style={BD}>Sil</button>
            </div>
          ))}
          {filtreli.length===0&&<div style={{ padding:'40px',textAlign:'center',color:TEXT_SUBTLE }}>Bölüm bulunamadı</div>}
        </div>
      )}
      </Surface>
    </div>
  )
}

// ---- YAZARLAR & ÇİZERLER ----
function YazarCizerSayfasi() {
  const [yazarlar, setYazarlar] = useState([])
  const [cizerler, setCizerler] = useState([])
  const [tab, setTab] = useState('yazarlar')
  const [mod, setMod] = useState('liste')
  const [tip, setTip] = useState('yazar')
  const [duzenleId, setDuzenleId] = useState(null)
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [fotoOnizleme, setFotoOnizleme] = useState(null)
  const bos = { isim:'',biyografi:'',fotograf_url:'' }
  const [form, setForm] = useState(bos)

  useEffect(() => { fetchHepsi() }, [])
  async function fetchHepsi() {
    const [y,c] = await Promise.all([supabase.from('yazarlar').select('*').order('isim'),supabase.from('cizerler').select('*').order('isim')])
    setYazarlar(y.data||[]); setCizerler(c.data||[])
  }

  async function kaydet() {
    if (!form.isim) { setMsg('❌ İsim zorunlu!'); return }
    setYukleniyor(true)
    const tablo = tip==='yazar'?'yazarlar':'cizerler'
    if (duzenleId) await supabase.from(tablo).update(form).eq('id',duzenleId)
    else await supabase.from(tablo).insert([form])
    setMsg('✅ Kaydedildi!'); setForm(bos); setDuzenleId(null); setFotoOnizleme(null); setMod('liste'); fetchHepsi(); setYukleniyor(false)
  }

  async function sil(id) {
    if (!confirm('Silmek istediğine emin misin?')) return
    await supabase.from(tip==='yazar'?'yazarlar':'cizerler').delete().eq('id',id); fetchHepsi()
  }

  if (mod==='form') return (
    <div style={{ maxWidth:'560px' }}>
      <SectionTitle eyebrow="Icerik" title={duzenleId?'Kayit Duzenle':`Yeni ${tip==='yazar'?'Yazar':'Cizer'}`} description="Yazar ve cizer arsivini biyografi, fotograf ve gorunurluk acisindan ayni dilde yonet." action={<button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>Listeye Don</button>} />
      <Msg text={msg} />
      <Surface style={{ padding:'24px' }}>
      <div style={{ display:'flex',gap:'20px',marginBottom:'16px',alignItems:'flex-start' }}>
        <ResimYukle onizleme={fotoOnizleme} onChange={(url,prev)=>{setForm(f=>({...f,fotograf_url:url}));setFotoOnizleme(prev)}} bucket="avatarlar" width="80px" height="80px" />
        <div style={{ flex:1 }}>
          <div style={{ marginBottom:'12px' }}><div style={LB}>İsim</div><input value={form.isim} onChange={e=>setForm(f=>({...f,isim:e.target.value}))} style={I} /></div>
          <div><div style={LB}>Biyografi</div><textarea value={form.biyografi} onChange={e=>setForm(f=>({...f,biyografi:e.target.value}))} style={{...I,height:'80px'}} /></div>
        </div>
      </div>
      <div style={{ display:'flex',gap:'10px' }}><button onClick={kaydet} disabled={yukleniyor} style={BP}>{yukleniyor?'Kaydediliyor...':'Kaydet'}</button><button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>İptal</button></div>
      </Surface>
    </div>
  )

  const liste = tab==='yazarlar'?yazarlar:cizerler
  return (
    <div>
      <SectionTitle eyebrow="Icerik" title="Yazarlar & Cizerler" description="Kunyeyi ve seri baglantilarini besleyen yaratıcı kadroyu tek akista yonet." action={<button onClick={()=>{setTip(tab==='yazarlar'?'yazar':'cizer');setMod('form')}} style={BP}>Yeni Ekle</button>} />
      <Surface style={{ padding:'18px' }}>
      <div style={{ display:'flex',gap:'8px',marginBottom:'16px' }}>
        {[['yazarlar','Yazarlar'],['cizerler','Çizerler']].map(([key,label])=><button key={key} onClick={()=>setTab(key)} style={{...BS,background:tab===key?ACCENT:PANEL_BG,color:tab===key?'#111':'#fff',border:tab===key?'none':PANEL_BORDER}}>{label}</button>)}
      </div>
      <div style={TABLE_WRAP}>
        {liste.map((x,i)=>(
          <div key={x.id} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderBottom:i<liste.length-1?TABLE_ROW.borderBottom:'none' }}>
            {x.fotograf_url?<img src={x.fotograf_url} style={{ width:'40px',height:'40px',borderRadius:'50%',objectFit:'cover' }} />:<div style={{ width:'40px',height:'40px',borderRadius:'50%',background:'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'center' }}>✍️</div>}
            <div style={{ flex:1 }}><div style={{ fontSize:'14px',fontWeight:500 }}>{x.isim}</div>{x.biyografi&&<div style={{ fontSize:'12px',color:TEXT_SUBTLE,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{x.biyografi}</div>}</div>
            <button onClick={()=>{setTip(tab==='yazarlar'?'yazar':'cizer');setForm({...bos,...x});setFotoOnizleme(x.fotograf_url);setDuzenleId(x.id);setMod('form')}} style={BS}>Düzenle</button>
            <button onClick={()=>{setTip(tab==='yazarlar'?'yazar':'cizer');sil(x.id)}} style={BD}>Sil</button>
          </div>
        ))}
        {liste.length===0&&<div style={{ padding:'40px',textAlign:'center',color:TEXT_SUBTLE }}>Henüz kayıt yok</div>}
      </div>
      </Surface>
    </div>
  )
}

// ---- KATEGORİLER ----
function KategoriSayfasi() {
  const [kategoriler, setKategoriler] = useState([])
  const [mod, setMod] = useState('liste')
  const [duzenleId, setDuzenleId] = useState(null)
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [resimOnizleme, setResimOnizleme] = useState(null)
  const bos = { isim:'',aciklama:'',resim_url:'' }
  const [form, setForm] = useState(bos)

  useEffect(() => { fetchHepsi() }, [])
  async function fetchHepsi() { const { data } = await supabase.from('kategoriler').select('*').order('isim'); setKategoriler(data||[]) }

  async function kaydet() {
    if (!form.isim) { setMsg('❌ İsim zorunlu!'); return }
    setYukleniyor(true)
    if (duzenleId) await supabase.from('kategoriler').update(form).eq('id',duzenleId)
    else await supabase.from('kategoriler').insert([form])
    setMsg(duzenleId?'✅ Güncellendi!':'✅ Kategori eklendi!')
    setForm(bos); setDuzenleId(null); setResimOnizleme(null); setMod('liste'); fetchHepsi(); setYukleniyor(false)
  }

  async function sil(id) { if (!confirm('Silmek istediğine emin misin?')) return; await supabase.from('kategoriler').delete().eq('id',id); fetchHepsi() }

  if (mod==='form') return (
    <div style={{ maxWidth:'560px' }}>
      <SectionTitle eyebrow="Icerik" title={duzenleId?'Kategori Duzenle':'Yeni Kategori'} description="Listeleme, filtreleme ve seri kurulumunda kullanilan ana kategori yapisini burada duzenle." action={<button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>Listeye Don</button>} />
      <Msg text={msg} />
      <Surface style={{ padding:'24px' }}>
      <div style={{ display:'flex',gap:'20px',marginBottom:'16px',alignItems:'flex-start' }}>
        <ResimYukle onizleme={resimOnizleme} onChange={(url,prev)=>{setForm(f=>({...f,resim_url:url}));setResimOnizleme(prev)}} bucket="kategoriler" width="80px" height="80px" />
        <div style={{ flex:1 }}>
          <div style={{ marginBottom:'12px' }}><div style={LB}>İsim</div><input value={form.isim} onChange={e=>setForm(f=>({...f,isim:e.target.value}))} style={I} /></div>
          <div><div style={LB}>Açıklama</div><textarea value={form.aciklama} onChange={e=>setForm(f=>({...f,aciklama:e.target.value}))} style={{...I,height:'80px'}} /></div>
        </div>
      </div>
      <div style={{ display:'flex',gap:'10px' }}><button onClick={kaydet} disabled={yukleniyor} style={BP}>{yukleniyor?'Kaydediliyor...':'Kaydet'}</button><button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>İptal</button></div>
      </Surface>
    </div>
  )

  return (
    <div>
      <SectionTitle eyebrow="Icerik" title="Kategoriler" description="Marvel, DC, Manga gibi ana icerik omurgasini tutarli bir yapiyla yonet." action={<button onClick={()=>setMod('form')} style={BP}>Yeni Kategori</button>} />
      <Surface style={{ padding:'18px' }}>
      <div style={TABLE_WRAP}>
        {kategoriler.map((k,i)=>(
          <div key={k.id} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderBottom:i<kategoriler.length-1?TABLE_ROW.borderBottom:'none' }}>
            {k.resim_url?<img src={k.resim_url} style={{ width:'40px',height:'40px',borderRadius:'8px',objectFit:'cover' }} />:<div style={{ width:'40px',height:'40px',borderRadius:'8px',background:'rgba(255,255,255,0.05)' }} />}
            <div style={{ flex:1 }}><div style={{ fontSize:'14px',fontWeight:500 }}>{k.isim}</div>{k.aciklama&&<div style={{ fontSize:'12px',color:TEXT_SUBTLE }}>{k.aciklama}</div>}</div>
            <button onClick={()=>{setForm({...bos,...k});setResimOnizleme(k.resim_url);setDuzenleId(k.id);setMod('form')}} style={BS}>Düzenle</button>
            <button onClick={()=>sil(k.id)} style={BD}>Sil</button>
          </div>
        ))}
        {kategoriler.length===0&&<div style={{ padding:'40px',textAlign:'center',color:TEXT_SUBTLE }}>Henüz kategori yok</div>}
      </div>
      </Surface>
    </div>
  )
}

// ---- TÜRLER ----
function TurlerSayfasi() {
  const [turler, setTurler] = useState([])
  const [mod, setMod] = useState('liste')
  const [duzenleId, setDuzenleId] = useState(null)
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [resimOnizleme, setResimOnizleme] = useState(null)
  const bos = { isim:'',aciklama:'',resim_url:'' }
  const [form, setForm] = useState(bos)

  useEffect(() => { fetchHepsi() }, [])
  async function fetchHepsi() { const { data } = await supabase.from('turler').select('*').order('isim'); setTurler(data||[]) }

  async function kaydet() {
    if (!form.isim) { setMsg('❌ İsim zorunlu!'); return }
    setYukleniyor(true)
    if (duzenleId) await supabase.from('turler').update(form).eq('id',duzenleId)
    else await supabase.from('turler').insert([form])
    setMsg(duzenleId?'✅ Güncellendi!':'✅ Tür eklendi!')
    setForm(bos); setDuzenleId(null); setResimOnizleme(null); setMod('liste'); fetchHepsi(); setYukleniyor(false)
  }

  async function sil(id) { if (!confirm('Silmek istediğine emin misin?')) return; await supabase.from('turler').delete().eq('id',id); fetchHepsi() }

  if (mod==='form') return (
    <div style={{ maxWidth:'560px' }}>
      <SectionTitle eyebrow="Icerik" title={duzenleId?'Tur Duzenle':'Yeni Tur'} description="Gerilim, fantastik, aksiyon gibi ikincil etiketleri duzenli ve aranabilir tut." action={<button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>Listeye Don</button>} />
      <Msg text={msg} />
      <Surface style={{ padding:'24px' }}>
      <div style={{ display:'flex',gap:'20px',marginBottom:'16px',alignItems:'flex-start' }}>
        <ResimYukle onizleme={resimOnizleme} onChange={(url,prev)=>{setForm(f=>({...f,resim_url:url}));setResimOnizleme(prev)}} bucket="kategoriler" width="80px" height="80px" />
        <div style={{ flex:1 }}>
          <div style={{ marginBottom:'12px' }}><div style={LB}>İsim</div><input value={form.isim} onChange={e=>setForm(f=>({...f,isim:e.target.value}))} style={I} /></div>
          <div><div style={LB}>Açıklama</div><textarea value={form.aciklama} onChange={e=>setForm(f=>({...f,aciklama:e.target.value}))} style={{...I,height:'80px'}} /></div>
        </div>
      </div>
      <div style={{ display:'flex',gap:'10px' }}><button onClick={kaydet} disabled={yukleniyor} style={BP}>{yukleniyor?'Kaydediliyor...':'Kaydet'}</button><button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>İptal</button></div>
      </Surface>
    </div>
  )

  return (
    <div>
      <SectionTitle eyebrow="Icerik" title="Turler" description="Seri kesfetme ve filtreleme deneyimini besleyen alt tur etiketlerini yonet." action={<button onClick={()=>setMod('form')} style={BP}>Yeni Tur</button>} />
      <Surface style={{ padding:'18px' }}>
      <div style={TABLE_WRAP}>
        {turler.map((t,i)=>(
          <div key={t.id} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderBottom:i<turler.length-1?TABLE_ROW.borderBottom:'none' }}>
            {t.resim_url?<img src={t.resim_url} style={{ width:'40px',height:'40px',borderRadius:'8px',objectFit:'cover' }} />:<div style={{ width:'40px',height:'40px',borderRadius:'8px',background:'rgba(255,255,255,0.05)' }} />}
            <div style={{ flex:1 }}><div style={{ fontSize:'14px',fontWeight:500 }}>{t.isim}</div>{t.aciklama&&<div style={{ fontSize:'12px',color:TEXT_SUBTLE }}>{t.aciklama}</div>}</div>
            <button onClick={()=>{setForm({...bos,...t});setResimOnizleme(t.resim_url);setDuzenleId(t.id);setMod('form')}} style={BS}>Düzenle</button>
            <button onClick={()=>sil(t.id)} style={BD}>Sil</button>
          </div>
        ))}
        {turler.length===0&&<div style={{ padding:'40px',textAlign:'center',color:TEXT_SUBTLE }}>Henüz tür yok</div>}
      </div>
      </Surface>
    </div>
  )
}

// ---- ANA SAYFA & SEO ----
function AnaSayfaSayfasi() {
  const [ayarlar, setAyarlar] = useState({})
  const [seriler, setSeriler] = useState([])
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [logoOnizleme, setLogoOnizleme] = useState(null)
  const [ogOnizleme, setOgOnizleme] = useState(null)
  const heroBos = { id:'', seri_id:'', aktif:true, badge:'', baslik:'', aciklama:'', arka_plan_url:'', kapak_url:'', arka_plan_fit:'cover', arka_plan_pozisyon:'center center', arka_plan_x:50, arka_plan_y:50, buton1_metin:'', buton1_link:'', buton2_metin:'', buton2_link:'', kategori_etiket:'', durum:'' }
  const [heroForm, setHeroForm] = useState(heroBos)
  const [heroDuzenleIndex, setHeroDuzenleIndex] = useState(null)
  const [heroArkaOnizleme, setHeroArkaOnizleme] = useState(null)
  const [heroKapakOnizleme, setHeroKapakOnizleme] = useState(null)
  const heroPreviewRef = useRef(null)

  useEffect(() => { fetchAyarlar() }, [])
  async function fetchAyarlar() {
    const [{ data, error: ayarError }, { data: seriData, error: seriError }] = await Promise.all([
      supabase.from('site_ayarlari').select('*'),
      supabase.from('seriler').select('id, baslik, slug, ozet, kapak_url, durum, one_cikan, kategori').order('baslik')
    ])
    if (ayarError) setMsg(`❌ Site ayarları yüklenemedi: ${ayarError.message}`)
    if (seriError) setMsg(`❌ Seriler yüklenemedi: ${seriError.message}`)
    const obj = {}; data?.forEach(r=>{obj[r.anahtar]=r.deger})
    setAyarlar(obj); setSeriler(seriData || []); setLogoOnizleme(typeof obj.logo_url==='string'?obj.logo_url:obj.logo_url?.url); setOgOnizleme(typeof obj.og_image==='string'?obj.og_image:obj.og_image?.url)
  }

  async function kaydet() {
    setYukleniyor(true)
    await Promise.all(Object.entries(ayarlar).map(([anahtar,deger])=>supabase.from('site_ayarlari').upsert({anahtar,deger,guncellendi_at:new Date().toISOString()},{onConflict:'anahtar'})))
    setMsg('✅ Ayarlar kaydedildi!'); setYukleniyor(false)
  }

  function guncelle(k,v) { setAyarlar(prev=>({...prev,[k]:v})) }
  const heroSlides = Array.isArray(ayarlar.anasayfa_hero_slider) ? ayarlar.anasayfa_hero_slider : []

  async function tekAyarKaydet(anahtar, deger, basariMesaji) {
    setYukleniyor(true)
    const { error } = await supabase
      .from('site_ayarlari')
      .upsert({ anahtar, deger, guncellendi_at: new Date().toISOString() }, { onConflict: 'anahtar' })
    if (error) setMsg(`❌ ${error.message}`)
    else {
      setAyarlar(prev => ({ ...prev, [anahtar]: deger }))
      if (basariMesaji) setMsg(basariMesaji)
    }
    setYukleniyor(false)
  }

  function heroFormSifirla() {
    setHeroForm(heroBos); setHeroDuzenleIndex(null); setHeroArkaOnizleme(null); setHeroKapakOnizleme(null)
  }

  function heroPozisyonGuncelle(clientX, clientY) {
    if (!heroPreviewRef.current) return
    const rect = heroPreviewRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    setHeroForm(prev => ({
      ...prev,
      arka_plan_x: Math.round(x),
      arka_plan_y: Math.round(y),
      arka_plan_pozisyon: `${Math.round(x)}% ${Math.round(y)}%`,
    }))
  }

  function handleHeroPreviewPointerDown(e) {
    heroPozisyonGuncelle(e.clientX, e.clientY)
  }

  function handleHeroPreviewPointerMove(e) {
    if (e.buttons !== 1) return
    heroPozisyonGuncelle(e.clientX, e.clientY)
  }

  async function heroSlaytKaydet() {
    const seciliSeri = seriler.find(s => String(s.id) === String(heroForm.seri_id))
    if (!heroForm.seri_id && !heroForm.baslik) { setMsg('❌ Hero slide için en az bir seri ya da manuel başlık gerekli!'); return }
    const kayit = {
      ...heroForm,
      id: heroForm.id || `hero-${Date.now()}`,
      badge: heroForm.badge || (seciliSeri?.one_cikan ? 'Öne Çıkan' : ''),
    }
    const yeni = [...heroSlides]
    if (heroDuzenleIndex !== null) yeni[heroDuzenleIndex] = kayit
    else yeni.push(kayit)
    await tekAyarKaydet('anasayfa_hero_slider', yeni, heroDuzenleIndex !== null ? '✅ Hero slide güncellendi!' : '✅ Hero slide eklendi!')
    heroFormSifirla()
  }

  function heroSlaytDuzenle(slide, index) {
    setHeroDuzenleIndex(index)
    setHeroForm({ ...heroBos, ...slide })
    setHeroArkaOnizleme(slide.arka_plan_url || null)
    setHeroKapakOnizleme(slide.kapak_url || null)
  }

  async function heroSlaytSil(index) {
    const yeni = heroSlides.filter((_, i) => i !== index)
    await tekAyarKaydet('anasayfa_hero_slider', yeni, '✅ Hero slide kaldırıldı!')
    if (heroDuzenleIndex === index) heroFormSifirla()
  }

  async function heroSlaytTasi(index, yon) {
    const hedef = index + yon
    if (hedef < 0 || hedef >= heroSlides.length) return
    const yeni = [...heroSlides]
    const gecici = yeni[index]
    yeni[index] = yeni[hedef]
    yeni[hedef] = gecici
    await tekAyarKaydet('anasayfa_hero_slider', yeni, '✅ Hero sırası güncellendi!')
  }

  return (
    <div style={{ maxWidth:'700px' }}>
      <SectionTitle eyebrow="Vitrin" title="Ana Sayfa & SEO" description="Site kimligini, arama gorunurlugunu ve ana sayfa vitrin akisini tek yerden yonet." />
      <Msg text={msg} />
      <Surface style={{ padding:'24px',marginBottom:'16px' }}>
        <div style={{ fontSize:'14px',fontWeight:600,marginBottom:'16px' }}>Site Kimliği</div>
        <div style={{ display:'flex',gap:'20px',marginBottom:'16px',alignItems:'flex-start' }}>
          <div><div style={LB}>Logo</div><ResimYukle onizleme={logoOnizleme} onChange={(url,prev)=>{guncelle('logo_url',url);setLogoOnizleme(prev)}} bucket="site" width="100px" height="60px" /></div>
          <div style={{ flex:1 }}>
            <div style={{ marginBottom:'12px' }}><div style={LB}>Site Adı</div><input value={ayarlar.site_adi||''} onChange={e=>guncelle('site_adi',e.target.value)} style={I} placeholder="KonseyComics" /></div>
            <div><div style={LB}>Site Sloganı</div><input value={ayarlar.site_slogan||''} onChange={e=>guncelle('site_slogan',e.target.value)} style={I} placeholder="Türkçe Çizgi Roman & Manga Okuma Platformu" /></div>
          </div>
        </div>
      </Surface>
      <Surface style={{ padding:'24px',marginBottom:'16px' }}>
        <div style={{ fontSize:'14px',fontWeight:600,marginBottom:'16px' }}>SEO Ayarları</div>
        <div style={{ marginBottom:'12px' }}><div style={LB}>Meta Başlık</div><input value={ayarlar.meta_baslik||''} onChange={e=>guncelle('meta_baslik',e.target.value)} style={I} placeholder="KonseyComics - Türkçe Manga Oku" /></div>
        <div style={{ marginBottom:'12px' }}><div style={LB}>Meta Açıklama</div><textarea value={ayarlar.meta_aciklama||''} onChange={e=>guncelle('meta_aciklama',e.target.value)} style={{...I,height:'80px'}} placeholder="Türkçe çeviri manga, manhwa ve webtoon oku..." /></div>
        <div style={{ marginBottom:'12px' }}><div style={LB}>Anahtar Kelimeler</div><input value={ayarlar.anahtar_kelimeler||''} onChange={e=>guncelle('anahtar_kelimeler',e.target.value)} style={I} placeholder="manga oku, türkçe manga, manhwa..." /></div>
        <div><div style={LB}>OG Image (Sosyal Medya Önizleme)</div><ResimYukle onizleme={ogOnizleme} onChange={(url,prev)=>{guncelle('og_image',url);setOgOnizleme(prev)}} bucket="site" width="120px" height="63px" /></div>
      </Surface>
      <Surface style={{ padding:'24px',marginBottom:'16px' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',marginBottom:'16px' }}>
          <div>
            <div style={{ fontSize:'14px',fontWeight:600,marginBottom:'4px' }}>Hero Slider</div>
            <div style={{ fontSize:'12px',color:TEXT_SUBTLE }}>Ana sayfadaki büyük slider alanını buradan yönet.</div>
          </div>
          <div style={{ fontSize:'12px',color:TEXT_SUBTLE }}>{heroSlides.length} slide</div>
        </div>

        <div style={{ display:'flex',flexDirection:'column',gap:'10px',marginBottom:'18px' }}>
          {heroSlides.map((slide, index) => {
            const seciliSeri = seriler.find(s => String(s.id) === String(slide.seri_id))
            return (
              <div key={slide.id || index} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'12px',border:PANEL_BORDER,borderRadius:'14px',background:'rgba(255,255,255,0.04)' }}>
                <div style={{ width:'64px',height:'40px',borderRadius:'8px',overflow:'hidden',background:'rgba(255,255,255,0.08)',flexShrink:0 }}>
                  {(slide.arka_plan_url || seciliSeri?.hero_gorsel_url || seciliSeri?.arkaplan_url || seciliSeri?.kapak_url) && (
                    <img src={slide.arka_plan_url || seciliSeri?.hero_gorsel_url || seciliSeri?.arkaplan_url || seciliSeri?.kapak_url} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
                  )}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:'13px',fontWeight:600,marginBottom:'2px' }}>{slide.baslik || seciliSeri?.baslik || 'Başlıksız Slide'}</div>
                  <div style={{ fontSize:'12px',color:TEXT_SUBTLE,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                    {seciliSeri ? `Bağlı seri: ${seciliSeri.baslik}` : 'Manuel içerik'} {slide.aktif === false ? '· Pasif' : '· Aktif'}
                  </div>
                </div>
                <button onClick={()=>heroSlaytTasi(index,-1)} style={BS}>↑</button>
                <button onClick={()=>heroSlaytTasi(index,1)} style={BS}>↓</button>
                <button onClick={()=>heroSlaytDuzenle(slide,index)} style={BS}>Düzenle</button>
                <button onClick={()=>heroSlaytSil(index)} style={BD}>Sil</button>
              </div>
            )
          })}
          {heroSlides.length===0 && <div style={{ padding:'18px',textAlign:'center',color:TEXT_SUBTLE,border:'1px dashed rgba(255,255,255,0.14)',borderRadius:'14px' }}>Henüz hero slide yok</div>}
        </div>

        <div style={{ padding:'18px',border:PANEL_BORDER,borderRadius:'16px',background:'rgba(255,255,255,0.03)' }}>
          <div style={{ fontSize:'13px',fontWeight:600,marginBottom:'14px' }}>{heroDuzenleIndex !== null ? 'Hero Slide Düzenle' : 'Yeni Hero Slide'}</div>

          <div style={{ marginBottom:'12px' }}>
            <div style={LB}>Bağlı Seri</div>
            <select value={heroForm.seri_id || ''} onChange={e=>setHeroForm(f=>({...f,seri_id:e.target.value}))} style={{...S, maxWidth:'420px'}}>
              <option value="">Seri seç (opsiyonel)</option>
              {seriler.map(s => (
                <option key={s.id} value={s.id}>{s.baslik}</option>
              ))}
            </select>
            <div style={{ fontSize:'12px', color:TEXT_SUBTLE, marginTop:'6px' }}>
              Toplam {seriler.length} seri arasından seçim yapabilirsin.
            </div>
          </div>

          <div style={{ display:'flex',gap:'16px',marginBottom:'14px',flexWrap:'wrap' }}>
            <div>
              <div style={LB}>Arka Plan Görseli</div>
              <ResimYukle onizleme={heroArkaOnizleme||heroForm.arka_plan_url} onChange={(url,prev)=>{setHeroForm(f=>({...f,arka_plan_url:url}));setHeroArkaOnizleme(prev)}} bucket="site" width="160px" height="90px" />
            </div>
            <div>
              <div style={LB}>Kapak Görseli</div>
              <ResimYukle onizleme={heroKapakOnizleme||heroForm.kapak_url} onChange={(url,prev)=>{setHeroForm(f=>({...f,kapak_url:url}));setHeroKapakOnizleme(prev)}} bucket="site" width="100px" height="140px" />
            </div>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'14px' }}>
            <div>
              <div style={LB}>Arka Plan Boyutlandırma</div>
              <select value={heroForm.arka_plan_fit || 'cover'} onChange={e=>setHeroForm(f=>({...f,arka_plan_fit:e.target.value}))} style={S}>
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
              </select>
            </div>
            <div>
              <div style={LB}>Arka Plan Hizası</div>
              <select value={heroForm.arka_plan_pozisyon || 'center center'} onChange={e=>{
                const value = e.target.value
                const [xToken, yToken] = value.split(' ')
                const harita = { left: 0, center: 50, right: 100, top: 0, bottom: 100 }
                setHeroForm(f=>({
                  ...f,
                  arka_plan_pozisyon:value,
                  arka_plan_x: harita[xToken] ?? 50,
                  arka_plan_y: harita[yToken] ?? 50
                }))
              }} style={S}>
                <option value="left center">Sol</option>
                <option value="center center">Orta</option>
                <option value="right center">Sağ</option>
                <option value="center top">Üst Orta</option>
                <option value="center bottom">Alt Orta</option>
              </select>
            </div>
          </div>

          {(heroArkaOnizleme || heroForm.arka_plan_url) && (
            <div style={{ marginBottom:'16px' }}>
              <div style={LB}>Hero Önizleme</div>
              <div
                ref={heroPreviewRef}
                onPointerDown={handleHeroPreviewPointerDown}
                onPointerMove={handleHeroPreviewPointerMove}
                style={{ position:'relative', height:'180px', borderRadius:'14px', overflow:'hidden', background:'#111', border:PANEL_BORDER, cursor:'grab', touchAction:'none' }}
              >
                <img
                  src={heroArkaOnizleme || heroForm.arka_plan_url}
                  alt="Hero önizleme"
                  style={{
                    position:'absolute',
                    inset:0,
                    width:'100%',
                    height:'100%',
                    objectFit: heroForm.arka_plan_fit || 'cover',
                    objectPosition: `${heroForm.arka_plan_x ?? 50}% ${heroForm.arka_plan_y ?? 50}%`,
                    opacity:0.86
                  }}
                />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg, rgba(0,0,0,0.84) 0%, rgba(0,0,0,0.55) 42%, rgba(0,0,0,0.18) 100%)' }} />
                <div style={{ position:'absolute', top:'10px', right:'10px', zIndex:1, padding:'6px 10px', borderRadius:'999px', background:'rgba(10,10,10,0.72)', color:'#fff', fontSize:'11px' }}>
                  {heroForm.arka_plan_x ?? 50}% / {heroForm.arka_plan_y ?? 50}%
                </div>
                <div style={{ position:'absolute', left:'16px', bottom:'16px', zIndex:1 }}>
                  <div style={{ display:'inline-flex', padding:'4px 10px', borderRadius:'999px', background:'#f59e0b', color:'#fff', fontSize:'10px', fontWeight:700, marginBottom:'10px', letterSpacing:'1px', textTransform:'uppercase' }}>
                    {heroForm.badge || 'Badge'}
                  </div>
                  <div style={{ color:'#fff', fontFamily:"'Bebas Neue', sans-serif", fontSize:'32px', lineHeight:0.92, marginBottom:'8px' }}>
                    {(heroForm.baslik || 'Başlık').toUpperCase()}
                  </div>
                  <div style={{ color:'rgba(255,255,255,0.78)', fontSize:'12px', maxWidth:'34ch', lineHeight:1.5 }}>
                    {heroForm.aciklama || 'Açıklama önizlemesi burada görünür.'}
                  </div>
                </div>
              </div>
              <div style={{ fontSize:'12px', color:TEXT_SUBTLE, marginTop:'8px' }}>
                Görseli fareyle sürükleyerek kadrajı elle ayarlayabilirsin.
              </div>
            </div>
          )}

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px' }}>
            <div><div style={LB}>Badge</div><input value={heroForm.badge} onChange={e=>setHeroForm(f=>({...f,badge:e.target.value}))} style={I} placeholder="Öne Çıkan" /></div>
            <div><div style={LB}>Durum Etiketi</div><input value={heroForm.durum} onChange={e=>setHeroForm(f=>({...f,durum:e.target.value}))} style={I} placeholder="Devam Eden" /></div>
          </div>
          <div style={{ marginBottom:'12px' }}><div style={LB}>Başlık Override</div><input value={heroForm.baslik} onChange={e=>setHeroForm(f=>({...f,baslik:e.target.value}))} style={I} placeholder="Boş bırakılırsa seçili seriden gelir" /></div>
          <div style={{ marginBottom:'12px' }}><div style={LB}>Açıklama Override</div><textarea value={heroForm.aciklama} onChange={e=>setHeroForm(f=>({...f,aciklama:e.target.value}))} style={{...I,height:'80px'}} placeholder="Boş bırakılırsa seçili seriden gelir" /></div>
          <div style={{ marginBottom:'12px' }}><div style={LB}>Kategori Etiketi Override</div><input value={heroForm.kategori_etiket} onChange={e=>setHeroForm(f=>({...f,kategori_etiket:e.target.value}))} style={I} placeholder="Marvel / Manga / Webtoon..." /></div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px' }}>
            <div><div style={LB}>Birincil Buton Metni</div><input value={heroForm.buton1_metin} onChange={e=>setHeroForm(f=>({...f,buton1_metin:e.target.value}))} style={I} placeholder="İncele →" /></div>
            <div><div style={LB}>Birincil Buton Linki</div><input value={heroForm.buton1_link} onChange={e=>setHeroForm(f=>({...f,buton1_link:e.target.value}))} style={I} placeholder="/seri/ornek-seri" /></div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px' }}>
            <div><div style={LB}>İkincil Buton Metni</div><input value={heroForm.buton2_metin} onChange={e=>setHeroForm(f=>({...f,buton2_metin:e.target.value}))} style={I} placeholder="Tüm Seriler" /></div>
            <div><div style={LB}>İkincil Buton Linki</div><input value={heroForm.buton2_link} onChange={e=>setHeroForm(f=>({...f,buton2_link:e.target.value}))} style={I} placeholder="/seriler" /></div>
          </div>
          <div style={{ marginBottom:'16px' }}>
            <label style={{ display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13px' }}>
              <input type="checkbox" checked={heroForm.aktif} onChange={e=>setHeroForm(f=>({...f,aktif:e.target.checked}))} />
              Slide aktif
            </label>
          </div>
          <div style={{ display:'flex',gap:'10px',flexWrap:'wrap' }}>
            <button onClick={heroSlaytKaydet} style={BP}>{heroDuzenleIndex !== null ? 'Slide Güncelle' : 'Slide Ekle'}</button>
            <button onClick={heroFormSifirla} style={BS}>Formu Temizle</button>
          </div>
        </div>
      </Surface>
      <button onClick={kaydet} disabled={yukleniyor} style={BP}>{yukleniyor?'Kaydediliyor...':'Tüm Ayarları Kaydet'}</button>
    </div>
  )
}
