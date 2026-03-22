'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const LB = { fontSize: '11px', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#888', marginBottom: '6px' }
const I = { width: '100%', padding: '9px 12px', background: '#f5f4f0', border: '1px solid #e8e6e0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
const S = { width: '100%', padding: '9px 12px', background: '#f5f4f0', border: '1px solid #e8e6e0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }
const BP = { padding: '10px 20px', background: '#111', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }
const BS = { padding: '6px 12px', background: '#f5f4f0', border: '1px solid #e8e6e0', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }
const BD = { padding: '6px 12px', background: '#fff0f0', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }

function Msg({ text }) {
  if (!text) return null
  const err = text.includes('❌')
  return <div style={{ background: err ? '#fff0f0' : '#f0fdf4', border: `1px solid ${err ? '#fecaca' : '#bbf7d0'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: err ? '#dc2626' : '#166534' }}>{text}</div>
}

function ResimYukle({ onizleme, onChange, bucket = 'kapaklar', width = '100px', height = '133px' }) {
  async function handle(e) {
    const file = e.target.files[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    const path = `resim-${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      onChange(data.publicUrl, preview)
    }
  }
  return (
    <label style={{ width, height, border: '2px dashed #e8e6e0', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#f5f4f0', flexShrink: 0 }}>
      {onizleme ? <img src={onizleme} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '28px', color: '#ccc' }}>+</span>}
      <input type="file" accept="image/*" onChange={handle} style={{ display: 'none' }} />
    </label>
  )
}

function AramaSecim({ liste, secili, onChange, placeholder }) {
  const [ara, setAra] = useState('')
  const [acik, setAcik] = useState(false)
  const ref = useRef()
  useEffect(() => {
    function kapat(e) { if (ref.current && !ref.current.contains(e.target)) setAcik(false) }
    document.addEventListener('mousedown', kapat)
    return () => document.removeEventListener('mousedown', kapat)
  }, [])
  const filtrelendi = liste.filter(x => x.isim.toLowerCase().includes(ara.toLowerCase()) && !secili.includes(x.id))
  const seciliOlanlar = liste.filter(x => secili.includes(x.id))
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px', background: '#f5f4f0', border: '1px solid #e8e6e0', borderRadius: '8px', minHeight: '42px', cursor: 'text' }} onClick={() => setAcik(true)}>
        {seciliOlanlar.map(x => (
          <span key={x.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#111', color: '#fff', borderRadius: '100px', padding: '3px 10px', fontSize: '12px' }}>
            {x.isim}<span onClick={e => { e.stopPropagation(); onChange(secili.filter(id => id !== x.id)) }} style={{ cursor: 'pointer', opacity: 0.6 }}>×</span>
          </span>
        ))}
        <input value={ara} onChange={e => setAra(e.target.value)} onFocus={() => setAcik(true)} placeholder={seciliOlanlar.length === 0 ? placeholder : ''} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontFamily: 'inherit', minWidth: '120px', flex: 1 }} />
      </div>
      {acik && filtrelendi.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', zIndex: 50, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
          {filtrelendi.map(x => (
            <div key={x.id} onClick={() => { onChange([...secili, x.id]); setAra('') }} style={{ padding: '9px 14px', fontSize: '13px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#f5f4f0'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>{x.isim}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function AramaSecimTek({ liste, secili, onChange, placeholder }) {
  const [ara, setAra] = useState('')
  const [acik, setAcik] = useState(false)
  const ref = useRef()
  useEffect(() => {
    function kapat(e) { if (ref.current && !ref.current.contains(e.target)) setAcik(false) }
    document.addEventListener('mousedown', kapat)
    return () => document.removeEventListener('mousedown', kapat)
  }, [])
  const seciliOlan = liste.find(x => x.id === secili)
  const filtrelendi = liste.filter(x => x.isim.toLowerCase().includes(ara.toLowerCase()))
  return (
    <div ref={ref} style={{ position: 'relative', maxWidth: '320px' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: '#f5f4f0', border: '1px solid #e8e6e0', borderRadius: '8px', cursor: 'pointer', gap: '8px' }} onClick={() => { setAcik(!acik); setAra('') }}>
        {acik ? <input autoFocus value={ara} onChange={e => { setAra(e.target.value); setAcik(true) }} onClick={e => e.stopPropagation()} placeholder="Ara..." style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontFamily: 'inherit', flex: 1 }} />
          : <span style={{ fontSize: '13px', flex: 1, color: seciliOlan ? '#111' : '#aaa' }}>{seciliOlan ? seciliOlan.isim : placeholder}</span>}
        <span style={{ color: '#aaa', fontSize: '10px' }}>▼</span>
      </div>
      {acik && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', zIndex: 50, maxHeight: '240px', overflowY: 'auto', marginTop: '4px' }}>
          {filtrelendi.length === 0 && <div style={{ padding: '12px 14px', fontSize: '13px', color: '#aaa' }}>Sonuç yok</div>}
          {filtrelendi.map(x => (
            <div key={x.id} onClick={() => { onChange(x.id); setAcik(false); setAra('') }} style={{ padding: '9px 14px', fontSize: '13px', cursor: 'pointer', background: secili === x.id ? '#f0ede8' : '#fff', fontWeight: secili === x.id ? 600 : 400 }} onMouseEnter={e => e.currentTarget.style.background = '#f5f4f0'} onMouseLeave={e => e.currentTarget.style.background = secili === x.id ? '#f0ede8' : '#fff'}>{x.isim}</div>
          ))}
        </div>
      )}
    </div>
  )
}

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
      <input value={ara} onChange={e => { setAra(e.target.value); setAcik(true) }} onFocus={() => setAcik(true)} placeholder="🔍 Ara..." style={{ width: '100%', padding: '7px 12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
      {acik && sonuclar.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 200, marginTop: '4px' }}>
          {sonuclar.map((s, i) => (
            <div key={i} onClick={() => { onSec(s.key); setAra(''); setAcik(false) }} style={{ padding: '9px 14px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={e => e.currentTarget.style.background = '#f5f4f0'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              <span style={{ fontSize: '10px', background: '#f0ede8', padding: '2px 6px', borderRadius: '4px', color: '#666' }}>{s.tip}</span>{s.isim}
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
  const [loginErr, setLoginErr] = useState('')
  const [email, setEmail] = useState('')
  const [sifre, setSifre] = useState('')
  const [bildirimSayisi, setBildirimSayisi] = useState(0)
  const [bildirimAcik, setBildirimAcik] = useState(false)
  const [bildirimler, setBildirimler] = useState([])
  const [globalSeriler, setGlobalSeriler] = useState([])
  const [globalBolumler, setGlobalBolumler] = useState([])
  const [globalKullanicilar, setGlobalKullanicilar] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setYukleniyor(false); return }
      const { data: profil } = await supabase.from('profiller').select('rol').eq('id', session.user.id).single()
      if (profil?.rol === 'admin' || profil?.rol === 'yonetici') { setGiris(true); yukleGlobal() }
      setYukleniyor(false)
    })
  }, [])

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

  async function handleLogin(e) {
    e.preventDefault(); setLoginErr(''); setYukleniyor(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: sifre })
    if (error) { setLoginErr('E-posta veya şifre hatalı.'); setYukleniyor(false); return }
    const { data: profil } = await supabase.from('profiller').select('rol').eq('id', data.user.id).single()
    if (profil?.rol === 'admin' || profil?.rol === 'yonetici') { setGiris(true); yukleGlobal() }
    else { setLoginErr('Admin yetkisi yok.'); await supabase.auth.signOut() }
    setYukleniyor(false)
  }

  if (yukleniyor) return <div style={{ minHeight: '100vh', background: '#f5f4f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}><div style={{ color: '#888' }}>Yükleniyor...</div></div>

  if (!giris) return (
    <div style={{ minHeight: '100vh', background: '#f5f4f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '20px', padding: '40px', width: '360px' }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '28px', marginBottom: '6px' }}>Admin Girişi</div>
        <div style={{ fontSize: '13px', color: '#888', marginBottom: '24px' }}>KonseyComics yönetim paneli</div>
        <form onSubmit={handleLogin}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-posta" required style={{ ...I, marginBottom: '10px' }} />
          <input type="password" value={sifre} onChange={e => setSifre(e.target.value)} placeholder="Şifre" required style={{ ...I, marginBottom: '16px' }} />
          {loginErr && <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{loginErr}</div>}
          <button type="submit" style={{ ...BP, width: '100%', padding: '12px' }}>Giriş Yap</button>
        </form>
      </div>
    </div>
  )

  const menu = [
    { key: 'istatistik', label: '📊 İstatistikler' },
    { key: 'seriler', label: '📚 Seriler' },
    { key: 'bolumler', label: '📖 Bölümler' },
    { key: 'konsey', label: '🎨 Konsey Ekibi' },
    { key: 'yazarcizerler', label: '✍️ Yazarlar & Çizerler' },
    { key: 'kategoriler', label: '🏢 Kategoriler' },
    { key: 'turler', label: '🏷️ Türler' },
    { key: 'kullanicilar', label: '👥 Kullanıcılar' },
    { key: 'yorumlar', label: '💬 Yorumlar' },
    { key: 'anasayfa', label: '🖼️ Ana Sayfa & SEO' },
    { key: 'sayfalar', label: '📄 Sayfalar' },
    { key: 'sosyalmedya', label: '🌐 Sosyal Medya' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f5f4f0', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: '#111', padding: '0 32px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: '16px' }}>KonseyComics <span style={{ fontWeight: 300 }}>Admin</span></span>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <GlobalArama seriler={globalSeriler} bolumler={globalBolumler} kullanicilar={globalKullanicilar} onSec={setAktif} />
          <div style={{ position: 'relative' }}>
            <button onClick={() => setBildirimAcik(!bildirimAcik)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '16px', cursor: 'pointer', position: 'relative' }}>
              🔔{bildirimSayisi > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#dc2626', color: '#fff', borderRadius: '100px', fontSize: '10px', padding: '1px 5px', fontWeight: 700 }}>{bildirimSayisi}</span>}
            </button>
            {bildirimAcik && (
              <div style={{ position: 'absolute', top: '100%', right: 0, width: '300px', background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 200, marginTop: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0ede8', fontWeight: 600, fontSize: '13px' }}>Bildirimler</div>
                {bildirimler.length === 0 ? <div style={{ padding: '20px', color: '#aaa', fontSize: '13px', textAlign: 'center' }}>Yeni bildirim yok</div> : bildirimler.map(b => (
                  <div key={b.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f5f4f0', fontSize: '13px' }}>
                    <div style={{ fontWeight: 500 }}>{b.baslik}</div>
                    <div style={{ color: '#888', fontSize: '12px' }}>{b.mesaj}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <a href="/" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textDecoration: 'none' }}>← Siteye Dön</a>
          <button onClick={async () => { await supabase.auth.signOut(); setGiris(false) }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Çıkış</button>
        </div>
      </div>
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <div style={{ width: '210px', background: '#fff', borderRight: '1px solid #e8e6e0', padding: '20px 12px', flexShrink: 0 }}>
          {menu.map(item => (
            <button key={item.key} onClick={() => setAktif(item.key)} style={{ width: '100%', padding: '9px 12px', textAlign: 'left', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 500, marginBottom: '4px', background: aktif === item.key ? '#f0ede8' : 'transparent', color: aktif === item.key ? '#111' : '#888' }}>
              {item.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, padding: '28px 32px', overflow: 'auto' }}>
          {aktif === 'istatistik' && <IstatistikSayfasi />}
          {aktif === 'seriler' && <SerilerSayfasi />}
          {aktif === 'bolumler' && <BolumlerSayfasi />}
          {aktif === 'konsey' && <KonseySayfasi />}
          {aktif === 'yazarcizerler' && <YazarCizerSayfasi />}
          {aktif === 'kategoriler' && <KategoriSayfasi />}
          {aktif === 'turler' && <TurlerSayfasi />}
          {aktif === 'kullanicilar' && <KullanicilarSayfasi />}
          {aktif === 'yorumlar' && <YorumlarSayfasi />}
          {aktif === 'anasayfa' && <AnaSayfaSayfasi />}
          {aktif === 'sayfalar' && <SayfalarSayfasi />}
          {aktif === 'sosyalmedya' && <SosyalMedyaSayfasi />}
        </div>
      </div>
    </div>
  )
}

// ---- İSTATİSTİK ----
function IstatistikSayfasi() {
  const [istat, setIstat] = useState(null)
  const [zamanFiltre, setZamanFiltre] = useState('hafta')
  const [topSeriler, setTopSeriler] = useState([])
  const [topBolumler, setTopBolumler] = useState([])
  const [katDagilim, setKatDagilim] = useState([])
  const [kayitGrafik, setKayitGrafik] = useState([])
  const [ziyaretGrafik, setZiyaretGrafik] = useState([])

  useEffect(() => { fetchData() }, [zamanFiltre])

  async function fetchData() {
    const simdi = new Date()
    const bugunBaslangic = new Date(simdi); bugunBaslangic.setHours(0,0,0,0)
    const haftaBaslangic = new Date(simdi); haftaBaslangic.setDate(simdi.getDate() - 7)
    const ayBaslangic = new Date(simdi); ayBaslangic.setDate(simdi.getDate() - 30)
    const filtreTarih = zamanFiltre === 'bugun' ? bugunBaslangic : zamanFiltre === 'hafta' ? haftaBaslangic : ayBaslangic

    const [s, u, y, kat, topS, topB, kayitlar, ziyaretler] = await Promise.all([
      supabase.from('seriler').select('id', { count: 'exact', head: true }),
      supabase.from('profiller').select('id', { count: 'exact', head: true }),
      supabase.from('yorumlar').select('id', { count: 'exact', head: true }).eq('silindi', false),
      supabase.from('seriler').select('kategori_id, kategoriler(isim)'),
      supabase.from('seriler').select('baslik, goruntuleme_sayisi').order('goruntuleme_sayisi', { ascending: false }).limit(5),
      supabase.from('bolumler').select('baslik, sayi, goruntuleme_sayisi, seriler(baslik)').order('goruntuleme_sayisi', { ascending: false }).limit(5),
      supabase.from('profiller').select('created_at').gte('created_at', filtreTarih.toISOString()),
      supabase.from('ziyaretler').select('created_at, oturum_id').gte('created_at', filtreTarih.toISOString()),
    ])

    setIstat({ seri: s.count||0, kullanici: u.count||0, yorum: y.count||0 })
    setTopSeriler(topS.data||[])
    setTopBolumler(topB.data||[])

    const katMap = {}
    kat.data?.forEach(s => { const isim = s.kategoriler?.isim||'Diğer'; katMap[isim] = (katMap[isim]||0)+1 })
    setKatDagilim(Object.entries(katMap).map(([isim,sayi]) => ({isim,sayi})).sort((a,b)=>b.sayi-a.sayi))

    const gunler = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i)
      const label = `${d.getDate()}/${d.getMonth()+1}`
      const sayi = kayitlar.data?.filter(k => { const kd = new Date(k.created_at); return kd.getDate()===d.getDate()&&kd.getMonth()===d.getMonth() }).length||0
      gunler.push({ etiket: label, deger: sayi })
    }
    setKayitGrafik(gunler)

    const zGunler = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i)
      const label = `${d.getDate()}/${d.getMonth()+1}`
      const benzersiz = new Set(ziyaretler.data?.filter(z => { const zd = new Date(z.created_at); return zd.getDate()===d.getDate()&&zd.getMonth()===d.getMonth() }).map(z=>z.oturum_id))
      zGunler.push({ etiket: label, deger: benzersiz.size })
    }
    setZiyaretGrafik(zGunler)
  }

  return (
    <div>
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>İstatistikler</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[{label:'Toplam Seri',deger:istat?.seri,emoji:'📚'},{label:'Toplam Kullanıcı',deger:istat?.kullanici,emoji:'👥'},{label:'Toplam Yorum',deger:istat?.yorum,emoji:'💬'}].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>{k.emoji}</div>
            <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{k.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{istat ? k.deger : '–'}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[['bugun','Bugün'],['hafta','Bu Hafta'],['ay','Bu Ay']].map(([val,label]) => (
          <button key={val} onClick={() => setZamanFiltre(val)} style={{ ...BS, background: zamanFiltre===val?'#111':'#f5f4f0', color: zamanFiltre===val?'#fff':'#111', border: zamanFiltre===val?'none':'1px solid #e8e6e0' }}>{label}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>Yeni Kayıtlar (Son 7 Gün)</div>
          <BarChart data={kayitGrafik} renk="#111" />
        </div>
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>Ziyaretçiler (Son 7 Gün)</div>
          <BarChart data={ziyaretGrafik} renk="#6366f1" />
        </div>
      </div>
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>Kategoriye Göre Seri Dağılımı</div>
        {katDagilim.map((k,i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', width: '100px', flexShrink: 0 }}>{k.isim}</span>
            <div style={{ flex: 1, background: '#f5f4f0', borderRadius: '4px', height: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${(k.sayi/(katDagilim[0]?.sayi||1))*100}%`, background: '#111', height: '100%', borderRadius: '4px', transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: '13px', color: '#888', width: '30px', textAlign: 'right' }}>{k.sayi}</span>
          </div>
        ))}
        {katDagilim.length === 0 && <div style={{ color: '#aaa', fontSize: '13px' }}>Veri yok</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>En Çok Okunan Seriler</div>
          {topSeriler.map((s,i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: i<topSeriler.length-1?'1px solid #f0ede8':'none' }}>
              <span style={{ color: '#aaa', fontSize: '12px', width: '16px' }}>{i+1}</span>
              <span style={{ flex: 1, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.baslik}</span>
              <span style={{ fontSize: '12px', color: '#888' }}>{s.goruntuleme_sayisi||0}</span>
            </div>
          ))}
          {topSeriler.length===0 && <div style={{ color: '#aaa', fontSize: '13px' }}>Veri yok</div>}
        </div>
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>En Çok Okunan Bölümler</div>
          {topBolumler.map((b,i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: i<topBolumler.length-1?'1px solid #f0ede8':'none' }}>
              <span style={{ color: '#aaa', fontSize: '12px', width: '16px' }}>{i+1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: '#aaa' }}>{b.seriler?.baslik}</div>
                <div style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>#{b.sayi} {b.baslik}</div>
              </div>
              <span style={{ fontSize: '12px', color: '#888' }}>{b.goruntuleme_sayisi||0}</span>
            </div>
          ))}
          {topBolumler.length===0 && <div style={{ color: '#aaa', fontSize: '13px' }}>Veri yok</div>}
        </div>
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
  const [mod, setMod] = useState('liste')
  const [gorunum, setGorunum] = useState('liste')
  const [duzenleId, setDuzenleId] = useState(null)
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kapakOnizleme, setKapakOnizleme] = useState(null)
  const [aramaMetni, setAramaMetni] = useState('')
  const [katFiltre, setKatFiltre] = useState('tumu')
  const bos = { baslik:'',slug:'',tur:'seri',kategori:'manga',kategori_id:'',ozet:'',durum:'Devam Eden',kapak_url:'',turler:[],yazar_ids:[],cizer_ids:[],yil:'',one_cikan:false }
  const [form, setForm] = useState(bos)

  useEffect(() => { fetchHepsi() }, [])
  async function fetchHepsi() {
    const [s,k,t,y,c] = await Promise.all([
      supabase.from('seriler').select('*, kategoriler(isim)').order('created_at',{ascending:false}),
      supabase.from('kategoriler').select('*').order('isim'),
      supabase.from('turler').select('*').order('isim'),
      supabase.from('yazarlar').select('*').order('isim'),
      supabase.from('cizerler').select('*').order('isim'),
    ])
    setSeriler(s.data||[]); setKategoriler(k.data||[]); setTurler(t.data||[]); setYazarlar(y.data||[]); setCizerler(c.data||[])
  }

  function slugOlustur(v) {
    return v.toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
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
    }
    setMsg(duzenleId?'✅ Güncellendi!':'✅ Seri eklendi!')
    setForm(bos); setDuzenleId(null); setKapakOnizleme(null); setMod('liste'); fetchHepsi(); setYukleniyor(false)
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
    const [yz,cz] = await Promise.all([supabase.from('seri_yazarlar').select('yazar_id').eq('seri_id',s.id),supabase.from('seri_cizerler').select('cizer_id').eq('seri_id',s.id)])
    setForm({...bos,...s,yazar_ids:yz.data?.map(x=>x.yazar_id)||[],cizer_ids:cz.data?.map(x=>x.cizer_id)||[]}); setMod('form')
  }

  const filtreli = seriler.filter(s=>katFiltre==='tumu'||s.kategori_id===katFiltre).filter(s=>!aramaMetni||s.baslik.toLowerCase().includes(aramaMetni.toLowerCase()))

  if (mod==='form') return (
    <div style={{ maxWidth:'700px' }}>
      <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'24px' }}>
        <button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null);setKapakOnizleme(null)}} style={BS}>← Geri</button>
        <div style={{ fontSize:'16px',fontWeight:600 }}>{duzenleId?'Seri Düzenle':'Yeni Seri'}</div>
      </div>
      <Msg text={msg} />
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
        <button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>İptal</button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px' }}>
        <div style={{ fontSize:'16px',fontWeight:600 }}>Seriler</div>
        <div style={{ display:'flex',gap:'8px' }}>
          <button onClick={()=>setGorunum(gorunum==='liste'?'grid':'liste')} style={BS}>{gorunum==='liste'?'⊞ Grid':'☰ Liste'}</button>
          <button onClick={()=>setMod('form')} style={BP}>+ Yeni Seri</button>
        </div>
      </div>
      <div style={{ display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap' }}>
        <button onClick={()=>setKatFiltre('tumu')} style={{...BS,background:katFiltre==='tumu'?'#111':'#f5f4f0',color:katFiltre==='tumu'?'#fff':'#111',border:'none'}}>Tümü ({seriler.length})</button>
        {kategoriler.map(k=>{const sayi=seriler.filter(s=>s.kategori_id===k.id).length;return<button key={k.id} onClick={()=>setKatFiltre(k.id)} style={{...BS,background:katFiltre===k.id?'#111':'#f5f4f0',color:katFiltre===k.id?'#fff':'#111',border:'none'}}>{k.isim} ({sayi})</button>})}
      </div>
      <input value={aramaMetni} onChange={e=>setAramaMetni(e.target.value)} placeholder="Seri ara..." style={{...I,marginBottom:'16px',maxWidth:'300px'}} />
      {gorunum==='grid' ? (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))',gap:'16px' }}>
          {filtreli.map(s=>(
            <div key={s.id} style={{ background:'#fff',borderRadius:'12px',overflow:'hidden',border:'1px solid #e8e6e0' }}>
              <div style={{ width:'100%',paddingTop:'133%',position:'relative',background:'#f5f4f0' }}>
                {s.kapak_url&&<img src={s.kapak_url} style={{ position:'absolute',top:0,left:0,width:'100%',height:'100%',objectFit:'cover' }} />}
                {s.one_cikan&&<span style={{ position:'absolute',top:'8px',right:'8px',background:'#f59e0b',color:'#fff',fontSize:'10px',padding:'2px 6px',borderRadius:'4px' }}>⭐</span>}
              </div>
              <div style={{ padding:'10px' }}>
                <div style={{ fontSize:'13px',fontWeight:600,marginBottom:'4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{s.baslik}</div>
                <div style={{ fontSize:'11px',color:'#888',marginBottom:'8px' }}>{s.kategoriler?.isim}</div>
                <div style={{ display:'flex',gap:'6px' }}>
                  <button onClick={()=>duzenle(s)} style={{...BS,flex:1,textAlign:'center'}}>Düzenle</button>
                  <button onClick={()=>sil(s.id)} style={BD}>Sil</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background:'#fff',border:'1px solid #e8e6e0',borderRadius:'12px',overflow:'hidden' }}>
          {filtreli.map((s,i)=>(
            <div key={s.id} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderBottom:i<filtreli.length-1?'1px solid #f0ede8':'none' }}>
              {s.kapak_url?<img src={s.kapak_url} style={{ width:'40px',height:'53px',objectFit:'cover',borderRadius:'4px',flexShrink:0 }} />:<div style={{ width:'40px',height:'53px',background:'#f5f4f0',borderRadius:'4px',flexShrink:0 }} />}
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:'14px',fontWeight:500 }}>{s.baslik} {s.one_cikan&&<span style={{ fontSize:'11px',background:'#fef3c7',color:'#d97706',padding:'1px 6px',borderRadius:'4px' }}>⭐ Öne Çıkan</span>}</div>
                <div style={{ fontSize:'12px',color:'#888' }}>{s.kategoriler?.isim} · {s.durum} · {s.goruntuleme_sayisi||0} görüntülenme</div>
              </div>
              <button onClick={()=>toggleOneCikan(s.id,s.one_cikan)} style={{...BS,fontSize:'11px'}}>{s.one_cikan?'★ Kaldır':'☆ Öne Çıkar'}</button>
              <button onClick={()=>duzenle(s)} style={BS}>Düzenle</button>
              <button onClick={()=>sil(s.id)} style={BD}>Sil</button>
            </div>
          ))}
          {filtreli.length===0&&<div style={{ padding:'40px',textAlign:'center',color:'#aaa' }}>Seri bulunamadı</div>}
        </div>
      )}
    </div>
  )
}

// ---- BÖLÜMLER ----
function BolumlerSayfasi() {
  const [bolumler, setBolumler] = useState([])
  const [seriler, setSeriler] = useState([])
  const [ekip, setEkip] = useState([])
  const [mod, setMod] = useState('liste')
  const [gorunum, setGorunum] = useState('liste')
  const [duzenleId, setDuzenleId] = useState(null)
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kapakOnizleme, setKapakOnizleme] = useState(null)
  const [seriFiltre, setSeriFiltre] = useState('tumu')
  const [aramaMetni, setAramaMetni] = useState('')
  const bos = { seri_id:'',sayi:'',baslik:'',kapak_url:'',drive_link:'',indirme_link:'',cevirmen_id:'',balonlama_id:'',grafik_id:'' }
  const [form, setForm] = useState(bos)

  useEffect(() => { fetchHepsi() }, [])
  async function fetchHepsi() {
    const [b,s,e] = await Promise.all([
      supabase.from('bolumler').select('*, seriler(baslik)').order('created_at',{ascending:false}),
      supabase.from('seriler').select('id, baslik').order('baslik'),
      supabase.from('ekip').select('*').order('isim'),
    ])
    setBolumler(b.data||[]); setSeriler(s.data||[]); setEkip(e.data||[])
  }

  async function kaydet() {
    if (!form.seri_id||!form.sayi||!form.baslik) { setMsg('❌ Seri, sayı ve başlık zorunlu!'); return }
    setYukleniyor(true)
    const payload = { seri_id:form.seri_id, sayi:parseInt(form.sayi), baslik:form.baslik, kapak_url:form.kapak_url, drive_link:form.drive_link, indirme_link:form.indirme_link, cevirmen_id:form.cevirmen_id||null, balonlama_id:form.balonlama_id||null, grafik_id:form.grafik_id||null }
    if (duzenleId) await supabase.from('bolumler').update(payload).eq('id',duzenleId)
    else await supabase.from('bolumler').insert([payload])
    setMsg(duzenleId?'✅ Güncellendi!':'✅ Bölüm eklendi!')
    setForm(bos); setDuzenleId(null); setKapakOnizleme(null); setMod('liste'); fetchHepsi(); setYukleniyor(false)
  }

  async function sil(id) {
    if (!confirm('Silmek istediğine emin misin?')) return
    await supabase.from('bolumler').delete().eq('id',id); fetchHepsi()
  }

  const filtreli = bolumler.filter(b=>seriFiltre==='tumu'||b.seri_id===seriFiltre).filter(b=>!aramaMetni||b.baslik.toLowerCase().includes(aramaMetni.toLowerCase())||b.seriler?.baslik.toLowerCase().includes(aramaMetni.toLowerCase()))

  if (mod==='form') return (
    <div style={{ maxWidth:'600px' }}>
      <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'24px' }}>
        <button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>← Geri</button>
        <div style={{ fontSize:'16px',fontWeight:600 }}>{duzenleId?'Bölüm Düzenle':'Yeni Bölüm'}</div>
      </div>
      <Msg text={msg} />
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
      <div style={{ marginBottom:'12px' }}><div style={LB}>İndirme Linki</div><input value={form.indirme_link} onChange={e=>setForm(f=>({...f,indirme_link:e.target.value}))} style={I} /></div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'20px' }}>
        {[['cevirmen_id','Çevirmen'],['balonlama_id','Balonlama'],['grafik_id','Grafik']].map(([key,label])=>(
          <div key={key}><div style={LB}>{label}</div><AramaSecimTek liste={ekip.map(e=>({id:e.id,isim:e.isim}))} secili={form[key]} onChange={v=>setForm(f=>({...f,[key]:v}))} placeholder={label+' seç'} /></div>
        ))}
      </div>
      <div style={{ display:'flex',gap:'10px' }}>
        <button onClick={kaydet} disabled={yukleniyor} style={BP}>{yukleniyor?'Kaydediliyor...':'Kaydet'}</button>
        <button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>İptal</button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px' }}>
        <div style={{ fontSize:'16px',fontWeight:600 }}>Bölümler</div>
        <div style={{ display:'flex',gap:'8px' }}>
          <button onClick={()=>setGorunum(gorunum==='liste'?'grid':'liste')} style={BS}>{gorunum==='liste'?'⊞ Grid':'☰ Liste'}</button>
          <button onClick={()=>setMod('form')} style={BP}>+ Yeni Bölüm</button>
        </div>
      </div>
      <div style={{ display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap' }}>
        <button onClick={()=>setSeriFiltre('tumu')} style={{...BS,background:seriFiltre==='tumu'?'#111':'#f5f4f0',color:seriFiltre==='tumu'?'#fff':'#111',border:'none'}}>Tümü</button>
        {seriler.slice(0,8).map(s=><button key={s.id} onClick={()=>setSeriFiltre(s.id)} style={{...BS,background:seriFiltre===s.id?'#111':'#f5f4f0',color:seriFiltre===s.id?'#fff':'#111',border:'none'}}>{s.baslik}</button>)}
      </div>
      <input value={aramaMetni} onChange={e=>setAramaMetni(e.target.value)} placeholder="Bölüm ara..." style={{...I,marginBottom:'16px',maxWidth:'300px'}} />
      {gorunum==='grid' ? (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))',gap:'16px' }}>
          {filtreli.map(b=>(
            <div key={b.id} style={{ background:'#fff',borderRadius:'12px',overflow:'hidden',border:'1px solid #e8e6e0' }}>
              <div style={{ width:'100%',paddingTop:'133%',position:'relative',background:'#f5f4f0' }}>
                {b.kapak_url&&<img src={b.kapak_url} style={{ position:'absolute',top:0,left:0,width:'100%',height:'100%',objectFit:'cover' }} />}
              </div>
              <div style={{ padding:'10px' }}>
                <div style={{ fontSize:'11px',color:'#aaa',marginBottom:'2px' }}>{b.seriler?.baslik}</div>
                <div style={{ fontSize:'13px',fontWeight:600 }}>#{b.sayi} {b.baslik}</div>
                <div style={{ display:'flex',gap:'6px',marginTop:'8px' }}>
                  <button onClick={()=>{setForm({...bos,...b});setKapakOnizleme(b.kapak_url);setDuzenleId(b.id);setMod('form')}} style={{...BS,flex:1}}>Düzenle</button>
                  <button onClick={()=>sil(b.id)} style={BD}>Sil</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background:'#fff',border:'1px solid #e8e6e0',borderRadius:'12px',overflow:'hidden' }}>
          {filtreli.map((b,i)=>(
            <div key={b.id} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderBottom:i<filtreli.length-1?'1px solid #f0ede8':'none' }}>
              {b.kapak_url?<img src={b.kapak_url} style={{ width:'40px',height:'53px',objectFit:'cover',borderRadius:'4px',flexShrink:0 }} />:<div style={{ width:'40px',height:'53px',background:'#f5f4f0',borderRadius:'4px',flexShrink:0 }} />}
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'12px',color:'#aaa' }}>{b.seriler?.baslik}</div>
                <div style={{ fontSize:'14px',fontWeight:500 }}>#{b.sayi} {b.baslik}</div>
                <div style={{ fontSize:'12px',color:'#888' }}>{b.goruntuleme_sayisi||0} görüntülenme</div>
              </div>
              <button onClick={()=>{setForm({...bos,...b});setKapakOnizleme(b.kapak_url);setDuzenleId(b.id);setMod('form')}} style={BS}>Düzenle</button>
              <button onClick={()=>sil(b.id)} style={BD}>Sil</button>
            </div>
          ))}
          {filtreli.length===0&&<div style={{ padding:'40px',textAlign:'center',color:'#aaa' }}>Bölüm bulunamadı</div>}
        </div>
      )}
    </div>
  )
}

// ---- KONSEY EKİBİ ----
function KonseySayfasi() {
  const [ekip, setEkip] = useState([])
  const [mod, setMod] = useState('liste')
  const [duzenleId, setDuzenleId] = useState(null)
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [avatarOnizleme, setAvatarOnizleme] = useState(null)
  const bos = { isim:'',unvan:'',avatar_url:'' }
  const [form, setForm] = useState(bos)

  useEffect(() => { fetchHepsi() }, [])
  async function fetchHepsi() { const { data } = await supabase.from('ekip').select('*').order('isim'); setEkip(data||[]) }

  async function kaydet() {
    if (!form.isim) { setMsg('❌ İsim zorunlu!'); return }
    setYukleniyor(true)
    if (duzenleId) await supabase.from('ekip').update(form).eq('id',duzenleId)
    else await supabase.from('ekip').insert([form])
    setMsg(duzenleId?'✅ Güncellendi!':'✅ Üye eklendi!')
    setForm(bos); setDuzenleId(null); setAvatarOnizleme(null); setMod('liste'); fetchHepsi(); setYukleniyor(false)
  }

  async function sil(id) { if (!confirm('Silmek istediğine emin misin?')) return; await supabase.from('ekip').delete().eq('id',id); fetchHepsi() }

  if (mod==='form') return (
    <div style={{ maxWidth:'500px' }}>
      <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'24px' }}><button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>← Geri</button><div style={{ fontSize:'16px',fontWeight:600 }}>{duzenleId?'Üye Düzenle':'Yeni Üye'}</div></div>
      <Msg text={msg} />
      <div style={{ display:'flex',gap:'20px',marginBottom:'16px',alignItems:'flex-start' }}>
        <ResimYukle onizleme={avatarOnizleme} onChange={(url,prev)=>{setForm(f=>({...f,avatar_url:url}));setAvatarOnizleme(prev)}} bucket="avatarlar" width="80px" height="80px" />
        <div style={{ flex:1 }}>
          <div style={{ marginBottom:'12px' }}><div style={LB}>İsim</div><input value={form.isim} onChange={e=>setForm(f=>({...f,isim:e.target.value}))} style={I} /></div>
          <div><div style={LB}>Unvan</div><input value={form.unvan} onChange={e=>setForm(f=>({...f,unvan:e.target.value}))} style={I} placeholder="Çevirmen, Editör..." /></div>
        </div>
      </div>
      <div style={{ display:'flex',gap:'10px' }}><button onClick={kaydet} disabled={yukleniyor} style={BP}>{yukleniyor?'Kaydediliyor...':'Kaydet'}</button><button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>İptal</button></div>
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px' }}><div style={{ fontSize:'16px',fontWeight:600 }}>Konsey Ekibi</div><button onClick={()=>setMod('form')} style={BP}>+ Yeni Üye</button></div>
      <div style={{ background:'#fff',border:'1px solid #e8e6e0',borderRadius:'12px',overflow:'hidden' }}>
        {ekip.map((u,i)=>(
          <div key={u.id} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderBottom:i<ekip.length-1?'1px solid #f0ede8':'none' }}>
            {u.avatar_url?<img src={u.avatar_url} style={{ width:'40px',height:'40px',borderRadius:'50%',objectFit:'cover' }} />:<div style={{ width:'40px',height:'40px',borderRadius:'50%',background:'#f5f4f0',display:'flex',alignItems:'center',justifyContent:'center' }}>👤</div>}
            <div style={{ flex:1 }}><div style={{ fontSize:'14px',fontWeight:500 }}>{u.isim}</div><div style={{ fontSize:'12px',color:'#888' }}>{u.unvan}</div></div>
            <button onClick={()=>{setForm({...bos,...u});setAvatarOnizleme(u.avatar_url);setDuzenleId(u.id);setMod('form')}} style={BS}>Düzenle</button>
            <button onClick={()=>sil(u.id)} style={BD}>Sil</button>
          </div>
        ))}
        {ekip.length===0&&<div style={{ padding:'40px',textAlign:'center',color:'#aaa' }}>Henüz üye yok</div>}
      </div>
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
    <div style={{ maxWidth:'500px' }}>
      <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'24px' }}><button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>← Geri</button><div style={{ fontSize:'16px',fontWeight:600 }}>{duzenleId?'Düzenle':`Yeni ${tip==='yazar'?'Yazar':'Çizer'}`}</div></div>
      <Msg text={msg} />
      <div style={{ display:'flex',gap:'20px',marginBottom:'16px',alignItems:'flex-start' }}>
        <ResimYukle onizleme={fotoOnizleme} onChange={(url,prev)=>{setForm(f=>({...f,fotograf_url:url}));setFotoOnizleme(prev)}} bucket="avatarlar" width="80px" height="80px" />
        <div style={{ flex:1 }}>
          <div style={{ marginBottom:'12px' }}><div style={LB}>İsim</div><input value={form.isim} onChange={e=>setForm(f=>({...f,isim:e.target.value}))} style={I} /></div>
          <div><div style={LB}>Biyografi</div><textarea value={form.biyografi} onChange={e=>setForm(f=>({...f,biyografi:e.target.value}))} style={{...I,height:'80px'}} /></div>
        </div>
      </div>
      <div style={{ display:'flex',gap:'10px' }}><button onClick={kaydet} disabled={yukleniyor} style={BP}>{yukleniyor?'Kaydediliyor...':'Kaydet'}</button><button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>İptal</button></div>
    </div>
  )

  const liste = tab==='yazarlar'?yazarlar:cizerler
  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px' }}>
        <div style={{ fontSize:'16px',fontWeight:600 }}>Yazarlar & Çizerler</div>
        <button onClick={()=>{setTip(tab==='yazarlar'?'yazar':'cizer');setMod('form')}} style={BP}>+ Yeni Ekle</button>
      </div>
      <div style={{ display:'flex',gap:'8px',marginBottom:'16px' }}>
        {[['yazarlar','Yazarlar'],['cizerler','Çizerler']].map(([key,label])=><button key={key} onClick={()=>setTab(key)} style={{...BS,background:tab===key?'#111':'#f5f4f0',color:tab===key?'#fff':'#111',border:'none'}}>{label}</button>)}
      </div>
      <div style={{ background:'#fff',border:'1px solid #e8e6e0',borderRadius:'12px',overflow:'hidden' }}>
        {liste.map((x,i)=>(
          <div key={x.id} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderBottom:i<liste.length-1?'1px solid #f0ede8':'none' }}>
            {x.fotograf_url?<img src={x.fotograf_url} style={{ width:'40px',height:'40px',borderRadius:'50%',objectFit:'cover' }} />:<div style={{ width:'40px',height:'40px',borderRadius:'50%',background:'#f5f4f0',display:'flex',alignItems:'center',justifyContent:'center' }}>✍️</div>}
            <div style={{ flex:1 }}><div style={{ fontSize:'14px',fontWeight:500 }}>{x.isim}</div>{x.biyografi&&<div style={{ fontSize:'12px',color:'#888',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{x.biyografi}</div>}</div>
            <button onClick={()=>{setTip(tab==='yazarlar'?'yazar':'cizer');setForm({...bos,...x});setFotoOnizleme(x.fotograf_url);setDuzenleId(x.id);setMod('form')}} style={BS}>Düzenle</button>
            <button onClick={()=>{setTip(tab==='yazarlar'?'yazar':'cizer');sil(x.id)}} style={BD}>Sil</button>
          </div>
        ))}
        {liste.length===0&&<div style={{ padding:'40px',textAlign:'center',color:'#aaa' }}>Henüz kayıt yok</div>}
      </div>
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
    <div style={{ maxWidth:'500px' }}>
      <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'24px' }}><button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>← Geri</button><div style={{ fontSize:'16px',fontWeight:600 }}>{duzenleId?'Kategori Düzenle':'Yeni Kategori'}</div></div>
      <Msg text={msg} />
      <div style={{ display:'flex',gap:'20px',marginBottom:'16px',alignItems:'flex-start' }}>
        <ResimYukle onizleme={resimOnizleme} onChange={(url,prev)=>{setForm(f=>({...f,resim_url:url}));setResimOnizleme(prev)}} bucket="kategoriler" width="80px" height="80px" />
        <div style={{ flex:1 }}>
          <div style={{ marginBottom:'12px' }}><div style={LB}>İsim</div><input value={form.isim} onChange={e=>setForm(f=>({...f,isim:e.target.value}))} style={I} /></div>
          <div><div style={LB}>Açıklama</div><textarea value={form.aciklama} onChange={e=>setForm(f=>({...f,aciklama:e.target.value}))} style={{...I,height:'80px'}} /></div>
        </div>
      </div>
      <div style={{ display:'flex',gap:'10px' }}><button onClick={kaydet} disabled={yukleniyor} style={BP}>{yukleniyor?'Kaydediliyor...':'Kaydet'}</button><button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>İptal</button></div>
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px' }}><div style={{ fontSize:'16px',fontWeight:600 }}>Kategoriler</div><button onClick={()=>setMod('form')} style={BP}>+ Yeni Kategori</button></div>
      <div style={{ background:'#fff',border:'1px solid #e8e6e0',borderRadius:'12px',overflow:'hidden' }}>
        {kategoriler.map((k,i)=>(
          <div key={k.id} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderBottom:i<kategoriler.length-1?'1px solid #f0ede8':'none' }}>
            {k.resim_url?<img src={k.resim_url} style={{ width:'40px',height:'40px',borderRadius:'8px',objectFit:'cover' }} />:<div style={{ width:'40px',height:'40px',borderRadius:'8px',background:'#f5f4f0' }} />}
            <div style={{ flex:1 }}><div style={{ fontSize:'14px',fontWeight:500 }}>{k.isim}</div>{k.aciklama&&<div style={{ fontSize:'12px',color:'#888' }}>{k.aciklama}</div>}</div>
            <button onClick={()=>{setForm({...bos,...k});setResimOnizleme(k.resim_url);setDuzenleId(k.id);setMod('form')}} style={BS}>Düzenle</button>
            <button onClick={()=>sil(k.id)} style={BD}>Sil</button>
          </div>
        ))}
        {kategoriler.length===0&&<div style={{ padding:'40px',textAlign:'center',color:'#aaa' }}>Henüz kategori yok</div>}
      </div>
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
    <div style={{ maxWidth:'500px' }}>
      <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'24px' }}><button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>← Geri</button><div style={{ fontSize:'16px',fontWeight:600 }}>{duzenleId?'Tür Düzenle':'Yeni Tür'}</div></div>
      <Msg text={msg} />
      <div style={{ display:'flex',gap:'20px',marginBottom:'16px',alignItems:'flex-start' }}>
        <ResimYukle onizleme={resimOnizleme} onChange={(url,prev)=>{setForm(f=>({...f,resim_url:url}));setResimOnizleme(prev)}} bucket="kategoriler" width="80px" height="80px" />
        <div style={{ flex:1 }}>
          <div style={{ marginBottom:'12px' }}><div style={LB}>İsim</div><input value={form.isim} onChange={e=>setForm(f=>({...f,isim:e.target.value}))} style={I} /></div>
          <div><div style={LB}>Açıklama</div><textarea value={form.aciklama} onChange={e=>setForm(f=>({...f,aciklama:e.target.value}))} style={{...I,height:'80px'}} /></div>
        </div>
      </div>
      <div style={{ display:'flex',gap:'10px' }}><button onClick={kaydet} disabled={yukleniyor} style={BP}>{yukleniyor?'Kaydediliyor...':'Kaydet'}</button><button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>İptal</button></div>
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px' }}><div style={{ fontSize:'16px',fontWeight:600 }}>Türler</div><button onClick={()=>setMod('form')} style={BP}>+ Yeni Tür</button></div>
      <div style={{ background:'#fff',border:'1px solid #e8e6e0',borderRadius:'12px',overflow:'hidden' }}>
        {turler.map((t,i)=>(
          <div key={t.id} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderBottom:i<turler.length-1?'1px solid #f0ede8':'none' }}>
            {t.resim_url?<img src={t.resim_url} style={{ width:'40px',height:'40px',borderRadius:'8px',objectFit:'cover' }} />:<div style={{ width:'40px',height:'40px',borderRadius:'8px',background:'#f5f4f0' }} />}
            <div style={{ flex:1 }}><div style={{ fontSize:'14px',fontWeight:500 }}>{t.isim}</div>{t.aciklama&&<div style={{ fontSize:'12px',color:'#888' }}>{t.aciklama}</div>}</div>
            <button onClick={()=>{setForm({...bos,...t});setResimOnizleme(t.resim_url);setDuzenleId(t.id);setMod('form')}} style={BS}>Düzenle</button>
            <button onClick={()=>sil(t.id)} style={BD}>Sil</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- KULLANICILAR ----
function KullanicilarSayfasi() {
  const [kullanicilar, setKullanicilar] = useState([])
  const [aramaMetni, setAramaMetni] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => { fetchHepsi() }, [])
  async function fetchHepsi() { const { data } = await supabase.from('profiller').select('*').order('created_at',{ascending:false}); setKullanicilar(data||[]) }

  async function rolDegistir(id, yeniRol) { await supabase.from('profiller').update({rol:yeniRol}).eq('id',id); fetchHepsi(); setMsg('✅ Rol güncellendi!') }
  async function banToggle(id, mevcut) { await supabase.from('profiller').update({askiya_alindi:!mevcut}).eq('id',id); fetchHepsi(); setMsg(mevcut?'✅ Ban kaldırıldı!':'✅ Kullanıcı banlandı!') }

  const filtreli = kullanicilar.filter(k=>!aramaMetni||k.kullanici_adi?.toLowerCase().includes(aramaMetni.toLowerCase()))

  return (
    <div>
      <div style={{ fontSize:'16px',fontWeight:600,marginBottom:'20px' }}>Kullanıcılar</div>
      <Msg text={msg} />
      <input value={aramaMetni} onChange={e=>setAramaMetni(e.target.value)} placeholder="Kullanıcı ara..." style={{...I,marginBottom:'16px',maxWidth:'300px'}} />
      <div style={{ background:'#fff',border:'1px solid #e8e6e0',borderRadius:'12px',overflow:'hidden' }}>
        {filtreli.map((k,i)=>(
          <div key={k.id} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderBottom:i<filtreli.length-1?'1px solid #f0ede8':'none',opacity:k.askiya_alindi?0.5:1 }}>
            {k.avatar_url?<img src={k.avatar_url} style={{ width:'36px',height:'36px',borderRadius:'50%',objectFit:'cover' }} />:<div style={{ width:'36px',height:'36px',borderRadius:'50%',background:'#f5f4f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px' }}>👤</div>}
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'14px',fontWeight:500 }}>{k.kullanici_adi} {k.askiya_alindi&&<span style={{ fontSize:'11px',background:'#fee2e2',color:'#dc2626',padding:'1px 6px',borderRadius:'4px' }}>Banlı</span>}</div>
              <div style={{ fontSize:'12px',color:'#888' }}>Seviye {k.seviye} · {k.xp} XP · {new Date(k.created_at).toLocaleDateString('tr-TR')}</div>
            </div>
            <select value={k.rol} onChange={e=>rolDegistir(k.id,e.target.value)} style={{...S,width:'auto',fontSize:'12px',padding:'4px 8px'}}>
              <option value="okuyucu">Okuyucu</option><option value="cevirmeni">Çevirmen</option><option value="grafik">Grafik</option><option value="editor">Editör</option><option value="moderator">Moderatör</option><option value="admin">Admin</option><option value="yonetici">Yönetici</option>
            </select>
            <button onClick={()=>banToggle(k.id,k.askiya_alindi)} style={k.askiya_alindi?BS:BD}>{k.askiya_alindi?'Banı Kaldır':'Banla'}</button>
          </div>
        ))}
        {filtreli.length===0&&<div style={{ padding:'40px',textAlign:'center',color:'#aaa' }}>Kullanıcı bulunamadı</div>}
      </div>
    </div>
  )
}

// ---- YORUMLAR ----
function YorumlarSayfasi() {
  const [yorumlar, setYorumlar] = useState([])
  const [secili, setSecili] = useState([])
  const [msg, setMsg] = useState('')
  const [aramaMetni, setAramaMetni] = useState('')

  useEffect(() => { fetchHepsi() }, [])
  async function fetchHepsi() { const { data } = await supabase.from('yorumlar').select('*, profiller(kullanici_adi), seriler(baslik)').eq('silindi',false).order('created_at',{ascending:false}); setYorumlar(data||[]) }

  async function topluSil() {
    if (secili.length===0) return
    if (!confirm(`${secili.length} yorumu silmek istediğine emin misin?`)) return
    await supabase.from('yorumlar').update({silindi:true}).in('id',secili)
    setSecili([]); fetchHepsi(); setMsg('✅ Yorumlar silindi!')
  }

  async function tekSil(id) { await supabase.from('yorumlar').update({silindi:true}).eq('id',id); fetchHepsi(); setMsg('✅ Yorum silindi!') }

  const filtreli = yorumlar.filter(y=>!aramaMetni||y.icerik.toLowerCase().includes(aramaMetni.toLowerCase()))

  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px' }}>
        <div style={{ fontSize:'16px',fontWeight:600 }}>Yorumlar</div>
        {secili.length>0&&<button onClick={topluSil} style={BD}>🗑️ {secili.length} Yorumu Sil</button>}
      </div>
      <Msg text={msg} />
      <input value={aramaMetni} onChange={e=>setAramaMetni(e.target.value)} placeholder="Yorum ara..." style={{...I,marginBottom:'16px',maxWidth:'300px'}} />
      <div style={{ background:'#fff',border:'1px solid #e8e6e0',borderRadius:'12px',overflow:'hidden' }}>
        {filtreli.map((y,i)=>(
          <div key={y.id} style={{ display:'flex',alignItems:'flex-start',gap:'12px',padding:'12px 16px',borderBottom:i<filtreli.length-1?'1px solid #f0ede8':'none',background:secili.includes(y.id)?'#fef9f0':'#fff' }}>
            <input type="checkbox" checked={secili.includes(y.id)} onChange={e=>setSecili(e.target.checked?[...secili,y.id]:secili.filter(id=>id!==y.id))} style={{ marginTop:'3px' }} />
            <div style={{ flex:1 }}>
              <div style={{ display:'flex',gap:'8px',alignItems:'center',marginBottom:'4px' }}>
                <span style={{ fontSize:'13px',fontWeight:500 }}>{y.profiller?.kullanici_adi}</span>
                <span style={{ fontSize:'11px',color:'#aaa' }}>→</span>
                <span style={{ fontSize:'12px',color:'#888' }}>{y.seriler?.baslik}</span>
                <span style={{ fontSize:'11px',color:'#aaa' }}>{new Date(y.created_at).toLocaleDateString('tr-TR')}</span>
              </div>
              <div style={{ fontSize:'13px' }}>{y.icerik}</div>
            </div>
            <button onClick={()=>tekSil(y.id)} style={BD}>Sil</button>
          </div>
        ))}
        {filtreli.length===0&&<div style={{ padding:'40px',textAlign:'center',color:'#aaa' }}>Yorum bulunamadı</div>}
      </div>
    </div>
  )
}

// ---- ANA SAYFA & SEO ----
function AnaSayfaSayfasi() {
  const [ayarlar, setAyarlar] = useState({})
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [logoOnizleme, setLogoOnizleme] = useState(null)
  const [ogOnizleme, setOgOnizleme] = useState(null)

  useEffect(() => { fetchAyarlar() }, [])
  async function fetchAyarlar() {
    const { data } = await supabase.from('site_ayarlari').select('*')
    const obj = {}; data?.forEach(r=>{obj[r.anahtar]=r.deger})
    setAyarlar(obj); setLogoOnizleme(typeof obj.logo_url==='string'?obj.logo_url:obj.logo_url?.url); setOgOnizleme(typeof obj.og_image==='string'?obj.og_image:obj.og_image?.url)
  }

  async function kaydet() {
    setYukleniyor(true)
    await Promise.all(Object.entries(ayarlar).map(([anahtar,deger])=>supabase.from('site_ayarlari').upsert({anahtar,deger,guncellendi_at:new Date().toISOString()},{onConflict:'anahtar'})))
    setMsg('✅ Ayarlar kaydedildi!'); setYukleniyor(false)
  }

  function guncelle(k,v) { setAyarlar(prev=>({...prev,[k]:v})) }

  return (
    <div style={{ maxWidth:'700px' }}>
      <div style={{ fontSize:'16px',fontWeight:600,marginBottom:'20px' }}>Ana Sayfa & SEO Ayarları</div>
      <Msg text={msg} />
      <div style={{ background:'#fff',border:'1px solid #e8e6e0',borderRadius:'12px',padding:'24px',marginBottom:'16px' }}>
        <div style={{ fontSize:'14px',fontWeight:600,marginBottom:'16px' }}>Site Kimliği</div>
        <div style={{ display:'flex',gap:'20px',marginBottom:'16px',alignItems:'flex-start' }}>
          <div><div style={LB}>Logo</div><ResimYukle onizleme={logoOnizleme} onChange={(url,prev)=>{guncelle('logo_url',url);setLogoOnizleme(prev)}} bucket="site" width="100px" height="60px" /></div>
          <div style={{ flex:1 }}>
            <div style={{ marginBottom:'12px' }}><div style={LB}>Site Adı</div><input value={ayarlar.site_adi||''} onChange={e=>guncelle('site_adi',e.target.value)} style={I} placeholder="KonseyComics" /></div>
            <div><div style={LB}>Site Sloganı</div><input value={ayarlar.site_slogan||''} onChange={e=>guncelle('site_slogan',e.target.value)} style={I} placeholder="Türkçe Çizgi Roman & Manga Okuma Platformu" /></div>
          </div>
        </div>
      </div>
      <div style={{ background:'#fff',border:'1px solid #e8e6e0',borderRadius:'12px',padding:'24px',marginBottom:'16px' }}>
        <div style={{ fontSize:'14px',fontWeight:600,marginBottom:'16px' }}>SEO Ayarları</div>
        <div style={{ marginBottom:'12px' }}><div style={LB}>Meta Başlık</div><input value={ayarlar.meta_baslik||''} onChange={e=>guncelle('meta_baslik',e.target.value)} style={I} placeholder="KonseyComics - Türkçe Manga Oku" /></div>
        <div style={{ marginBottom:'12px' }}><div style={LB}>Meta Açıklama</div><textarea value={ayarlar.meta_aciklama||''} onChange={e=>guncelle('meta_aciklama',e.target.value)} style={{...I,height:'80px'}} placeholder="Türkçe çeviri manga, manhwa ve webtoon oku..." /></div>
        <div style={{ marginBottom:'12px' }}><div style={LB}>Anahtar Kelimeler</div><input value={ayarlar.anahtar_kelimeler||''} onChange={e=>guncelle('anahtar_kelimeler',e.target.value)} style={I} placeholder="manga oku, türkçe manga, manhwa..." /></div>
        <div><div style={LB}>OG Image (Sosyal Medya Önizleme)</div><ResimYukle onizleme={ogOnizleme} onChange={(url,prev)=>{guncelle('og_image',url);setOgOnizleme(prev)}} bucket="site" width="120px" height="63px" /></div>
      </div>
      <button onClick={kaydet} disabled={yukleniyor} style={BP}>{yukleniyor?'Kaydediliyor...':'Tüm Ayarları Kaydet'}</button>
    </div>
  )
}

// ---- SAYFALAR ----
function SayfalarSayfasi() {
  const [sayfalar, setSayfalar] = useState([])
  const [mod, setMod] = useState('liste')
  const [duzenleKey, setDuzenleKey] = useState(null)
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const bos = { baslik:'',slug:'',icerik:'',yayinda:true }
  const [form, setForm] = useState(bos)

  useEffect(() => { fetchHepsi() }, [])
  async function fetchHepsi() { const { data } = await supabase.from('site_ayarlari').select('*').like('anahtar','sayfa_%'); setSayfalar(data||[]) }

  function slugOlustur(v) { return v.toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'') }

  async function kaydet() {
    if (!form.baslik) { setMsg('❌ Başlık zorunlu!'); return }
    setYukleniyor(true)
    const anahtar = `sayfa_${form.slug||slugOlustur(form.baslik)}`
    await supabase.from('site_ayarlari').upsert({anahtar,deger:form,guncellendi_at:new Date().toISOString()},{onConflict:'anahtar'})
    setMsg('✅ Sayfa kaydedildi!'); setForm(bos); setDuzenleKey(null); setMod('liste'); fetchHepsi(); setYukleniyor(false)
  }

  if (mod==='form') return (
    <div style={{ maxWidth:'600px' }}>
      <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'24px' }}><button onClick={()=>{setMod('liste');setForm(bos);setDuzenleKey(null)}} style={BS}>← Geri</button><div style={{ fontSize:'16px',fontWeight:600 }}>{duzenleKey?'Sayfa Düzenle':'Yeni Sayfa'}</div></div>
      <Msg text={msg} />
      <div style={{ marginBottom:'12px' }}><div style={LB}>Başlık</div><input value={form.baslik} onChange={e=>setForm(f=>({...f,baslik:e.target.value,slug:slugOlustur(e.target.value)}))} style={I} /></div>
      <div style={{ marginBottom:'12px' }}><div style={LB}>Slug</div><input value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))} style={I} /></div>
      <div style={{ marginBottom:'12px' }}><div style={LB}>İçerik</div><textarea value={form.icerik} onChange={e=>setForm(f=>({...f,icerik:e.target.value}))} style={{...I,height:'200px'}} /></div>
      <div style={{ marginBottom:'20px' }}><label style={{ display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13px' }}><input type="checkbox" checked={form.yayinda} onChange={e=>setForm(f=>({...f,yayinda:e.target.checked}))} /> Yayında</label></div>
      <div style={{ display:'flex',gap:'10px' }}><button onClick={kaydet} disabled={yukleniyor} style={BP}>{yukleniyor?'Kaydediliyor...':'Kaydet'}</button><button onClick={()=>{setMod('liste');setForm(bos);setDuzenleKey(null)}} style={BS}>İptal</button></div>
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px' }}><div style={{ fontSize:'16px',fontWeight:600 }}>Sayfalar</div><button onClick={()=>setMod('form')} style={BP}>+ Yeni Sayfa</button></div>
      <div style={{ background:'#fff',border:'1px solid #e8e6e0',borderRadius:'12px',overflow:'hidden' }}>
        {sayfalar.map((s,i)=>(
          <div key={s.anahtar} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'14px 16px',borderBottom:i<sayfalar.length-1?'1px solid #f0ede8':'none' }}>
            <div style={{ flex:1 }}><div style={{ fontSize:'14px',fontWeight:500 }}>{s.deger?.baslik||s.anahtar}</div><div style={{ fontSize:'12px',color:'#888' }}>/{s.deger?.slug} · {s.deger?.yayinda?'Yayında':'Taslak'}</div></div>
            <button onClick={()=>{setForm(s.deger||bos);setDuzenleKey(s.anahtar);setMod('form')}} style={BS}>Düzenle</button>
          </div>
        ))}
        {sayfalar.length===0&&<div style={{ padding:'40px',textAlign:'center',color:'#aaa' }}>Henüz sayfa yok</div>}
      </div>
    </div>
  )
}

// ---- SOSYAL MEDYA ----
function SosyalMedyaSayfasi() {
  const [form, setForm] = useState({ instagram:'',twitter:'',discord:'',youtube:'',facebook:'' })
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)

  useEffect(() => {
    supabase.from('site_ayarlari').select('*').eq('anahtar','sosyal_medya').single().then(({data})=>{
      if (data?.deger) setForm(prev=>({...prev,...data.deger}))
    })
  }, [])

  async function kaydet() {
    setYukleniyor(true)
    await supabase.from('site_ayarlari').upsert({anahtar:'sosyal_medya',deger:form,guncellendi_at:new Date().toISOString()},{onConflict:'anahtar'})
    setMsg('✅ Kaydedildi!'); setYukleniyor(false)
  }

  return (
    <div style={{ maxWidth:'500px' }}>
      <div style={{ fontSize:'16px',fontWeight:600,marginBottom:'20px' }}>Sosyal Medya</div>
      <Msg text={msg} />
      <div style={{ background:'#fff',border:'1px solid #e8e6e0',borderRadius:'12px',padding:'24px' }}>
        {[['instagram','Instagram','https://instagram.com/konseycomics'],['twitter','Twitter / X','https://x.com/konseycomics'],['discord','Discord','https://discord.gg/...'],['youtube','YouTube','https://youtube.com/@konseycomics'],['facebook','Facebook','https://facebook.com/konseycomics']].map(([key,label,ph])=>(
          <div key={key} style={{ marginBottom:'16px' }}><div style={LB}>{label}</div><input value={form[key]||''} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} style={I} placeholder={ph} /></div>
        ))}
        <button onClick={kaydet} disabled={yukleniyor} style={BP}>{yukleniyor?'Kaydediliyor...':'Kaydet'}</button>
      </div>
    </div>
  )
}
