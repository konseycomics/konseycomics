'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

const LB = { fontSize: '11px', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#888', marginBottom: '6px' }
const I = { width: '100%', padding: '9px 12px', background: '#f5f4f0', border: '1px solid #e8e6e0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
const S = { width: '100%', padding: '9px 12px', background: '#f5f4f0', border: '1px solid #e8e6e0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }
const BP = { padding: '10px 20px', background: '#111', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }
const BS = { padding: '6px 12px', background: '#f5f4f0', border: '1px solid #e8e6e0', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }
const BD = { padding: '6px 12px', background: '#fff0f0', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }
const L = LB

function Msg({ text }) {
  if (!text) return null
  const err = text.includes('❌')
  return <div style={{ background: err ? '#fff0f0' : '#f0fdf4', border: `1px solid ${err ? '#fecaca' : '#bbf7d0'}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: err ? '#dc2626' : '#166534' }}>{text}</div>
}

function KapakYukle({ onizleme, onChange, bucket = 'kapaklar' }) {
  async function handle(e) {
    const file = e.target.files[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    const path = `kapak-${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      onChange(data.publicUrl, preview)
    }
  }
  return (
    <label style={{ width: '100px', height: '133px', border: '2px dashed #e8e6e0', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#f5f4f0', flexShrink: 0 }}>
      {onizleme ? <img src={onizleme} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '28px', color: '#ccc' }}>+</span>}
      <input type="file" accept="image/*" onChange={handle} style={{ display: 'none' }} />
    </label>
  )
}

// Çoklu seçim için arama bileşeni
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
            {x.isim}
            <span onClick={e => { e.stopPropagation(); onChange(secili.filter(id => id !== x.id)) }} style={{ cursor: 'pointer', opacity: 0.6 }}>×</span>
          </span>
        ))}
        <input value={ara} onChange={e => setAra(e.target.value)} onFocus={() => setAcik(true)} placeholder={seciliOlanlar.length === 0 ? placeholder : ''} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontFamily: 'inherit', minWidth: '120px', flex: 1 }} />
      </div>
      {acik && filtrelendi.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', zIndex: 50, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
          {filtrelendi.map(x => (
            <div key={x.id} onClick={() => { onChange([...secili, x.id]); setAra('') }} style={{ padding: '9px 14px', fontSize: '13px', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f4f0'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              {x.isim}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Tek seçim için arama bileşeni (Bölümler > Seri Seç)
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
        {acik
          ? <input autoFocus value={ara} onChange={e => { setAra(e.target.value); setAcik(true) }} onClick={e => e.stopPropagation()} placeholder="Ara..." style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontFamily: 'inherit', flex: 1 }} />
          : <span style={{ fontSize: '13px', flex: 1, color: seciliOlan ? '#111' : '#aaa' }}>{seciliOlan ? seciliOlan.isim : placeholder}</span>
        }
        <span style={{ color: '#aaa', fontSize: '10px' }}>▼</span>
      </div>
      {acik && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', zIndex: 50, maxHeight: '240px', overflowY: 'auto', marginTop: '4px' }}>
          {filtrelendi.length === 0 && <div style={{ padding: '12px 14px', fontSize: '13px', color: '#aaa' }}>Sonuç yok</div>}
          {filtrelendi.map(x => (
            <div key={x.id} onClick={() => { onChange(x.id); setAcik(false); setAra('') }}
              style={{ padding: '9px 14px', fontSize: '13px', cursor: 'pointer', background: secili === x.id ? '#f0ede8' : '#fff', fontWeight: secili === x.id ? 600 : 400 }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f4f0'}
              onMouseLeave={e => e.currentTarget.style.background = secili === x.id ? '#f0ede8' : '#fff'}>
              {x.isim}
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

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setYukleniyor(false); return }
      const { data: profil } = await supabase.from('profiller').select('rol').eq('id', session.user.id).single()
      if (profil?.rol === 'admin' || profil?.rol === 'yonetici') setGiris(true)
      setYukleniyor(false)
    })
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setLoginErr('')
    setYukleniyor(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: sifre })
    if (error) { setLoginErr('E-posta veya şifre hatalı.'); setYukleniyor(false); return }
    const { data: profil } = await supabase.from('profiller').select('rol').eq('id', data.user.id).single()
    if (profil?.rol === 'admin' || profil?.rol === 'yonetici') { setGiris(true) }
    else { setLoginErr('Admin yetkisi yok.'); await supabase.auth.signOut() }
    setYukleniyor(false)
  }

  async function handleCikis() {
    await supabase.auth.signOut()
    setGiris(false)
  }

  if (yukleniyor) return (
    <div style={{ minHeight: '100vh', background: '#f5f4f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ color: '#888' }}>Yükleniyor...</div>
    </div>
  )

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
    { key: 'anasayfa', label: '🖼️ Ana Sayfa' },
    { key: 'sayfalar', label: '📄 Sayfalar' },
    { key: 'sosyalmedya', label: '🌐 Sosyal Medya' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f5f4f0', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: '#111', padding: '0 32px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: '16px' }}>KonseyComics <span style={{ fontWeight: 300 }}>Admin</span></span>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <a href="/" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', textDecoration: 'none' }}>← Siteye Dön</a>
          <button onClick={handleCikis} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Çıkış</button>
        </div>
      </div>
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <div style={{ width: '210px', background: '#fff', borderRight: '1px solid #e8e6e0', padding: '20px 12px', flexShrink: 0 }}>
          {menu.map(item => (
            <button key={item.key} onClick={() => setAktif(item.key)}
              style={{ width: '100%', padding: '9px 12px', textAlign: 'left', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 500, marginBottom: '4px', background: aktif === item.key ? '#f0ede8' : 'transparent', color: aktif === item.key ? '#111' : '#888' }}>
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
  const [topSeriler, setTopSeriler] = useState([])
  const [topBolumler, setTopBolumler] = useState([])

  useEffect(() => {
    async function fetchData() {
      const [s, b, u, y] = await Promise.all([
        supabase.from('seriler').select('id', { count: 'exact', head: true }),
        supabase.from('bolumler').select('id', { count: 'exact', head: true }),
        supabase.from('profiller').select('id', { count: 'exact', head: true }),
        supabase.from('yorumlar').select('id', { count: 'exact', head: true }).eq('silindi', false),
      ])
      setIstat({ seri: s.count || 0, bolum: b.count || 0, kullanici: u.count || 0, yorum: y.count || 0 })

      const { data: ts } = await supabase.from('seriler').select('baslik, goruntuleme_sayisi').order('goruntuleme_sayisi', { ascending: false }).limit(5)
      const { data: tb } = await supabase.from('bolumler').select('baslik, sayi, goruntuleme_sayisi, seriler(baslik)').order('goruntuleme_sayisi', { ascending: false }).limit(5)
      setTopSeriler(ts || [])
      setTopBolumler(tb || [])
    }
    fetchData()
  }, [])

  const kartlar = [
    { label: 'Toplam Seri', deger: istat?.seri, emoji: '📚' },
    { label: 'Toplam Bölüm', deger: istat?.bolum, emoji: '📖' },
    { label: 'Toplam Kullanıcı', deger: istat?.kullanici, emoji: '👥' },
    { label: 'Toplam Yorum', deger: istat?.yorum, emoji: '💬' },
  ]

  return (
    <div>
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>İstatistikler</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {kartlar.map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>{k.emoji}</div>
            <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{k.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{istat ? k.deger : '—'}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>En Çok Okunan Seriler</div>
          {topSeriler.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: i < topSeriler.length - 1 ? '1px solid #f0ede8' : 'none' }}>
              <span style={{ color: '#aaa', fontSize: '12px', width: '16px' }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.baslik}</span>
              <span style={{ fontSize: '12px', color: '#888' }}>{s.goruntuleme_sayisi || 0}</span>
            </div>
          ))}
        </div>
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>En Çok Okunan Bölümler</div>
          {topBolumler.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: i < topBolumler.length - 1 ? '1px solid #f0ede8' : 'none' }}>
              <span style={{ color: '#aaa', fontSize: '12px', width: '16px' }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: '#aaa' }}>{b.seriler?.baslik}</div>
                <div style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>#{b.sayi} {b.baslik}</div>
              </div>
              <span style={{ fontSize: '12px', color: '#888' }}>{b.goruntuleme_sayisi || 0}</span>
            </div>
          ))}
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
  const [duzenleId, setDuzenleId] = useState(null)
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kapakOnizleme, setKapakOnizleme] = useState(null)
  const [aramaMetni, setAramaMetni] = useState('')

  const bos = { baslik: '', slug: '', tur: 'seri', kategori: 'manga', kategori_id: '', ozet: '', durum: 'Devam Eden', kapak_url: '', turler: [], yazar_ids: [], cizer_ids: [], yil: '' }
  const [form, setForm] = useState(bos)

  useEffect(() => { fetchHepsi() }, [])

  async function fetchHepsi() {
    const [s, k, t, y, c] = await Promise.all([
      supabase.from('seriler').select('*, kategoriler(isim)').order('created_at', { ascending: false }),
      supabase.from('kategoriler').select('*').order('isim'),
      supabase.from('turler').select('*').order('isim'),
      supabase.from('yazarlar').select('*').order('isim'),
      supabase.from('cizerler').select('*').order('isim'),
    ])
    setSeriler(s.data || [])
    setKategoriler(k.data || [])
    setTurler(t.data || [])
    setYazarlar(y.data || [])
    setCizerler(c.data || [])
  }

  function slugOlustur(v) {
    return v.toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  }

  function toggleTur(id) { setForm(f => ({ ...f, turler: f.turler.includes(id) ? f.turler.filter(x => x !== id) : [...f.turler, id] })) }

  async function kaydet() {
    if (!form.baslik) { setMsg('❌ Başlık zorunlu!'); return }
    setYukleniyor(true)
    const payload = {
      baslik: form.baslik, slug: form.slug || slugOlustur(form.baslik),
      tur: form.tur, kategori: form.kategori,
      kategori_id: form.kategori_id || null,
      ozet: form.ozet,
      durum: form.tur === 'tek' ? 'Tek Sayılık' : form.durum,
      kapak_url: form.kapak_url, turler: form.turler,
      yil: form.yil ? parseInt(form.yil) : null,
    }
    let seriId = duzenleId
    if (duzenleId) {
      await supabase.from('seriler').update(payload).eq('id', duzenleId)
    } else {
      const { data } = await supabase.from('seriler').insert([payload]).select().single()
      seriId = data?.id
    }
    if (seriId) {
      await supabase.from('seri_yazarlar').delete().eq('seri_id', seriId)
      if (form.yazar_ids.length > 0) await supabase.from('seri_yazarlar').insert(form.yazar_ids.map(id => ({ seri_id: seriId, yazar_id: id })))
      await supabase.from('seri_cizerler').delete().eq('seri_id', seriId)
      if (form.cizer_ids.length > 0) await supabase.from('seri_cizerler').insert(form.cizer_ids.map(id => ({ seri_id: seriId, cizer_id: id })))
    }
    setMsg(duzenleId ? '✅ Güncellendi!' : '✅ Seri eklendi!')
    setForm(bos); setDuzenleId(null); setKapakOnizleme(null); setMod('liste'); fetchHepsi()
    setYukleniyor(false)
  }

  async function sil(id) {
    if (!confirm('Silmek istediğine emin misin?')) return
    await supabase.from('seriler').delete().eq('id', id)
    fetchHepsi()
  }

  async function durumDegistir(id, d) {
    await supabase.from('seriler').update({ durum: d }).eq('id', id)
    fetchHepsi()
  }

  async function duzenleAc(s) {
    const [y, c] = await Promise.all([
      supabase.from('seri_yazarlar').select('yazar_id').eq('seri_id', s.id),
      supabase.from('seri_cizerler').select('cizer_id').eq('seri_id', s.id),
    ])
    setForm({
      baslik: s.baslik, slug: s.slug, tur: s.tur || 'seri', kategori: s.kategori || 'manga',
      kategori_id: s.kategori_id || '', ozet: s.ozet || '', durum: s.durum || 'Devam Eden',
      kapak_url: s.kapak_url || '', turler: s.turler || [],
      yazar_ids: y.data?.map(x => x.yazar_id) || [],
      cizer_ids: c.data?.map(x => x.cizer_id) || [],
      yil: s.yil || '',
    })
    setKapakOnizleme(s.kapak_url || null)
    setDuzenleId(s.id); setMod('form')
  }

  const filtrelenmis = aramaMetni ? seriler.filter(s => s.baslik.toLowerCase().includes(aramaMetni.toLowerCase())) : seriler

  if (mod === 'form') return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => { setMod('liste'); setDuzenleId(null); setForm(bos); setKapakOnizleme(null) }} style={{ ...BS, padding: '7px 14px' }}>← Geri</button>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>{duzenleId ? 'Seri Düzenle' : 'Yeni Seri Ekle'}</div>
      </div>
      <Msg text={msg} />
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <div style={L}>Tür</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[['seri', 'Seri'], ['tek', 'Tek Sayılık']].map(([val, lbl]) => (
              <button key={val} onClick={() => setForm(f => ({ ...f, tur: val, durum: val === 'tek' ? 'Tek Sayılık' : 'Devam Eden' }))}
                style={{ padding: '7px 18px', borderRadius: '100px', border: `1px solid ${form.tur === val ? '#111' : '#e8e6e0'}`, background: form.tur === val ? '#111' : '#fff', color: form.tur === val ? '#fff' : '#888', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>{lbl}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={L}>Başlık *</div>
          <input value={form.baslik} onChange={e => setForm(f => ({ ...f, baslik: e.target.value, slug: slugOlustur(e.target.value) }))} placeholder="Seri başlığı" style={I} />
        </div>
        <div>
          <div style={L}>Slug (URL)</div>
          <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} style={I} />
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>konseycomics.com/seri/{form.slug || '...'}</div>
        </div>
        <div>
          <div style={L}>Kapak Resmi</div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <KapakYukle onizleme={kapakOnizleme} onChange={(url, prev) => { setForm(f => ({ ...f, kapak_url: url })); setKapakOnizleme(prev) }} />
            <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.7, paddingTop: '8px' }}>JPG, PNG, WEBP desteklenir.<br />Önerilen oran: 2:3</div>
          </div>
        </div>
        <div>
          <div style={L}>Kategori</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['manga', 'çizgi roman', 'webtoon'].map(k => (
              <button key={k} onClick={() => setForm(f => ({ ...f, kategori: k }))}
                style={{ padding: '6px 16px', borderRadius: '100px', border: `1px solid ${form.kategori === k ? '#111' : '#e8e6e0'}`, background: form.kategori === k ? '#111' : '#fff', color: form.kategori === k ? '#fff' : '#888', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>{k}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={L}>Yayıncı</div>
          <select value={form.kategori_id} onChange={e => setForm(f => ({ ...f, kategori_id: e.target.value }))} style={S}>
            <option value="">Seçiniz</option>
            {kategoriler.map(k => <option key={k.id} value={k.id}>{k.isim}</option>)}
          </select>
        </div>
        <div>
          <div style={L}>Yayın Yılı</div>
          <input type="number" value={form.yil} onChange={e => setForm(f => ({ ...f, yil: e.target.value }))} placeholder="2024" style={I} />
        </div>
        <div style={{ background: '#f9f8f5', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Orijinal Yapımcılar</div>
          <div>
            <div style={L}>Yazar(lar)</div>
            <AramaSecim liste={yazarlar} secili={form.yazar_ids} onChange={v => setForm(f => ({ ...f, yazar_ids: v }))} placeholder="Yazar ara veya seç..." />
          </div>
          <div>
            <div style={L}>Çizer(ler)</div>
            <AramaSecim liste={cizerler} secili={form.cizer_ids} onChange={v => setForm(f => ({ ...f, cizer_ids: v }))} placeholder="Çizer ara veya seç..." />
          </div>
        </div>
        <div>
          <div style={L}>Özet</div>
          <textarea value={form.ozet} onChange={e => setForm(f => ({ ...f, ozet: e.target.value }))} placeholder="Seri hakkında açıklama..." rows={6} style={{ ...I, resize: 'vertical', lineHeight: 1.65 }} />
        </div>
        <div>
          <div style={L}>Türler</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {turler.map(t => (
              <button key={t.id} onClick={() => toggleTur(t.id)}
                style={{ padding: '6px 14px', borderRadius: '100px', border: `1px solid ${form.turler.includes(t.id) ? '#111' : '#e8e6e0'}`, background: form.turler.includes(t.id) ? '#111' : '#fff', color: form.turler.includes(t.id) ? '#fff' : '#555', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>{t.isim}</button>
            ))}
          </div>
        </div>
        {form.tur !== 'tek' && (
          <div>
            <div style={L}>Yayın Durumu</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['Devam Eden', 'Tamamlandı'].map(d => (
                <button key={d} onClick={() => setForm(f => ({ ...f, durum: d }))}
                  style={{ padding: '7px 18px', borderRadius: '100px', border: `1px solid ${form.durum === d ? '#111' : '#e8e6e0'}`, background: form.durum === d ? '#111' : '#fff', color: form.durum === d ? '#fff' : '#888', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>{d}</button>
              ))}
            </div>
          </div>
        )}
        <button onClick={kaydet} disabled={yukleniyor} style={{ ...BP, padding: '13px', fontSize: '14px' }}>
          {yukleniyor ? 'Kaydediliyor...' : duzenleId ? '✓ Güncelle' : '+ Seri Ekle'}
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>Seriler ({filtrelenmis.length})</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input value={aramaMetni} onChange={e => setAramaMetni(e.target.value)} placeholder="Seri ara..." style={{ ...I, width: '200px' }} />
          <button onClick={() => setMod('form')} style={BP}>+ Yeni Seri</button>
        </div>
      </div>
      <Msg text={msg} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtrelenmis.map(s => (
          <div key={s.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '58px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: '#f0ede8' }}>
              {s.kapak_url ? <img src={s.kapak_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📚</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.baslik}</div>
              <div style={{ fontSize: '11px', color: '#aaa' }}>{s.kategoriler?.isim || s.kategori} · {s.yil || '—'}</div>
            </div>
            <select value={s.durum} onChange={e => durumDegistir(s.id, e.target.value)} style={{ padding: '5px 10px', background: '#f5f4f0', border: '1px solid #e8e6e0', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer' }}>
              <option>Devam Eden</option><option>Tamamlandı</option><option>Tek Sayılık</option>
            </select>
            <button onClick={() => duzenleAc(s)} style={BS}>Düzenle</button>
            <button onClick={() => sil(s.id)} style={BD}>Sil</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- BÖLÜMLER ----
function BolumlerSayfasi() {
  const [seriler, setSeriler] = useState([])
  const [ekip, setEkip] = useState([])
  const [seciliSeri, setSeciliSeri] = useState('')
  const [bolumler, setBolumler] = useState([])
  const [mod, setMod] = useState('liste')
  const [duzenleId, setDuzenleId] = useState(null)
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kapakOnizleme, setKapakOnizleme] = useState(null)

  const bos = { sayi: '', baslik: '', drive_link: '', indirme_link: '', kapak_url: '', cevirmen_id: '', balonlama_id: '', grafik_id: '' }
  const [form, setForm] = useState(bos)

  useEffect(() => {
    supabase.from('seriler').select('id, baslik').order('baslik').then(({ data }) => setSeriler(data || []))
    supabase.from('ekip').select('*').order('isim').then(({ data }) => setEkip(data || []))
  }, [])

  useEffect(() => {
    if (!seciliSeri) return
    supabase.from('bolumler').select('*').eq('seri_id', seciliSeri).order('sayi').then(({ data }) => setBolumler(data || []))
  }, [seciliSeri])

  async function refreshBolumler() {
    const { data } = await supabase.from('bolumler').select('*').eq('seri_id', seciliSeri).order('sayi')
    setBolumler(data || [])
  }

  async function kaydet() {
    if (!seciliSeri || !form.baslik) { setMsg('❌ Seri ve başlık zorunlu!'); return }
    setYukleniyor(true)
    const payload = {
      seri_id: seciliSeri, sayi: parseInt(form.sayi) || 0,
      baslik: form.baslik, drive_link: form.drive_link,
      indirme_link: form.indirme_link, kapak_url: form.kapak_url,
      cevirmen_id: form.cevirmen_id || null,
      balonlama_id: form.balonlama_id || null,
      grafik_id: form.grafik_id || null,
    }
    if (duzenleId) await supabase.from('bolumler').update(payload).eq('id', duzenleId)
    else await supabase.from('bolumler').insert([payload])
    setMsg(duzenleId ? '✅ Güncellendi!' : '✅ Bölüm eklendi!')
    setForm(bos); setDuzenleId(null); setKapakOnizleme(null); setMod('liste')
    await refreshBolumler()
    setYukleniyor(false)
  }

  async function sil(id) {
    if (!confirm('Silmek istediğine emin misin?')) return
    await supabase.from('bolumler').delete().eq('id', id)
    await refreshBolumler()
  }

  function duzenleAc(b) {
    setForm({ sayi: b.sayi, baslik: b.baslik, drive_link: b.drive_link || '', indirme_link: b.indirme_link || '', kapak_url: b.kapak_url || '', cevirmen_id: b.cevirmen_id || '', balonlama_id: b.balonlama_id || '', grafik_id: b.grafik_id || '' })
    setKapakOnizleme(b.kapak_url || null); setDuzenleId(b.id); setMod('form')
  }

  if (mod === 'form') return (
    <div style={{ maxWidth: '560px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => { setMod('liste'); setDuzenleId(null); setForm(bos); setKapakOnizleme(null) }} style={{ ...BS, padding: '7px 14px' }}>← Geri</button>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>{duzenleId ? 'Bölüm Düzenle' : 'Yeni Bölüm Ekle'}</div>
      </div>
      <Msg text={msg} />
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <div style={L}>Bölüm Kapağı</div>
          <KapakYukle onizleme={kapakOnizleme} onChange={(url, prev) => { setForm(f => ({ ...f, kapak_url: url })); setKapakOnizleme(prev) }} />
        </div>
        <div><div style={L}>Bölüm No</div><input type="number" value={form.sayi} onChange={e => setForm(f => ({ ...f, sayi: e.target.value }))} placeholder="1" style={I} /></div>
        <div><div style={L}>Bölüm Başlığı *</div><input value={form.baslik} onChange={e => setForm(f => ({ ...f, baslik: e.target.value }))} placeholder="Bölüm başlığı" style={I} /></div>
        <div><div style={L}>Google Drive Linki</div><input value={form.drive_link} onChange={e => setForm(f => ({ ...f, drive_link: e.target.value }))} placeholder="https://drive.google.com/file/d/..." style={I} /></div>
        <div><div style={L}>İndirme Linki</div><input value={form.indirme_link} onChange={e => setForm(f => ({ ...f, indirme_link: e.target.value }))} placeholder="https://mediafire.com/..." style={I} /></div>
        <div style={{ background: '#f9f8f5', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Konsey Ekibi</div>
          {[['cevirmen_id', 'Çevirmen'], ['balonlama_id', 'Balonlama'], ['grafik_id', 'Grafik']].map(([field, lbl]) => (
            <div key={field}>
              <div style={L}>{lbl}</div>
              <select value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} style={S}>
                <option value="">Seçiniz</option>
                {ekip.map(e => <option key={e.id} value={e.id}>{e.isim}</option>)}
              </select>
            </div>
          ))}
        </div>
        <button onClick={kaydet} disabled={yukleniyor} style={{ ...BP, padding: '13px', fontSize: '14px' }}>
          {yukleniyor ? 'Kaydediliyor...' : duzenleId ? '✓ Güncelle' : '+ Bölüm Ekle'}
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>Bölümler</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <AramaSecimTek
          liste={seriler.map(s => ({ id: s.id, isim: s.baslik }))}
          secili={seciliSeri}
          onChange={setSeciliSeri}
          placeholder="Seri seç..."
        />
        {seciliSeri && <button onClick={() => { setMod('form') }} style={BP}>+ Yeni Bölüm</button>}
      </div>
      <Msg text={msg} />
      {seciliSeri && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {bolumler.length === 0 && <div style={{ color: '#aaa', fontSize: '13px', padding: '20px 0' }}>Bu seriye ait bölüm yok.</div>}
          {bolumler.map(b => (
            <div key={b.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '48px', borderRadius: '6px', overflow: 'hidden', background: '#f0ede8', flexShrink: 0 }}>
                {b.kapak_url ? <img src={b.kapak_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>📖</div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>#{b.sayi} — {b.baslik}</div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{b.drive_link ? '✓ Drive' : '✗ Drive'}{b.indirme_link ? ' · ✓ İndirme' : ''}</div>
              </div>
              <button onClick={() => duzenleAc(b)} style={BS}>Düzenle</button>
              <button onClick={() => sil(b.id)} style={BD}>Sil</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- KONSEY EKİBİ ----
function KonseySayfasi() {
  const [kullanicilar, setKullanicilar] = useState([])
  const [ekip, setEkip] = useState([])
  const [aramaMetni, setAramaMetni] = useState('')
  const [msg, setMsg] = useState('')
  const [ekipIsim, setEkipIsim] = useState('')
  const [ekipUnvan, setEkipUnvan] = useState('')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [p, e] = await Promise.all([
      supabase.from('profiller').select('id, kullanici_adi, avatar_url, rol').in('rol', ['admin', 'yonetici', 'konsey']).order('rol'),
      supabase.from('ekip').select('*').order('isim'),
    ])
    setKullanicilar(p.data || [])
    setEkip(e.data || [])
  }

  async function rolDegistir(id, yeniRol) {
    await supabase.from('profiller').update({ rol: yeniRol }).eq('id', id)
    setMsg('✅ Rol güncellendi!')
    fetchData()
    setTimeout(() => setMsg(''), 2000)
  }

  async function ekipEkle() {
    if (!ekipIsim) return
    await supabase.from('ekip').insert([{ isim: ekipIsim, unvan: ekipUnvan }])
    setEkipIsim(''); setEkipUnvan(''); fetchData()
    setMsg('✅ Ekip üyesi eklendi!'); setTimeout(() => setMsg(''), 2000)
  }

  async function ekipSil(id) {
    if (!confirm('Silmek istediğine emin misin?')) return
    await supabase.from('ekip').delete().eq('id', id)
    fetchData()
  }

  const rolRenk = { admin: '#7c3aed', yonetici: '#1d4ed8', konsey: '#065f46', okuyucu: '#888' }
  const rolEtiket = { admin: 'Admin', yonetici: 'Yönetici', konsey: 'Konsey', okuyucu: 'Okuyucu' }

  const filtreliKullanicilar = aramaMetni
    ? kullanicilar.filter(u => u.kullanici_adi?.toLowerCase().includes(aramaMetni.toLowerCase()))
    : kullanicilar

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Sol: Yetkili Kullanıcılar */}
        <div>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>🎖️ Yetkili Kullanıcılar</div>
          <Msg text={msg} />
          <input value={aramaMetni} onChange={e => setAramaMetni(e.target.value)} placeholder="Kullanıcı ara..." style={{ ...I, marginBottom: '12px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtreliKullanicilar.map(u => (
              <div key={u.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#f0ede8', flexShrink: 0 }}>
                  {u.avatar_url ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>👤</div>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{u.kullanici_adi}</div>
                  <span style={{ fontSize: '11px', color: rolRenk[u.rol] || '#888', fontWeight: 600 }}>{rolEtiket[u.rol] || u.rol}</span>
                </div>
                <select value={u.rol} onChange={e => rolDegistir(u.id, e.target.value)} style={{ padding: '5px 8px', background: '#f5f4f0', border: '1px solid #e8e6e0', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer' }}>
                  <option value="admin">Admin</option>
                  <option value="yonetici">Yönetici</option>
                  <option value="konsey">Konsey</option>
                  <option value="okuyucu">Okuyucu</option>
                </select>
              </div>
            ))}
            {filtreliKullanicilar.length === 0 && <div style={{ color: '#aaa', fontSize: '13px', padding: '12px 0' }}>Yetkili kullanıcı yok.</div>}
          </div>
        </div>

        {/* Sağ: Çeviri Ekibi */}
        <div>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>🛠️ Çeviri Ekibi</div>
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
              <input value={ekipIsim} onChange={e => setEkipIsim(e.target.value)} placeholder="İsim *" style={I} />
              <input value={ekipUnvan} onChange={e => setEkipUnvan(e.target.value)} placeholder="Unvan (Çevirmen, Balonlama...)" style={I} />
            </div>
            <button onClick={ekipEkle} style={BP}>+ Ekip Üyesi Ekle</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {ekip.map(e => (
              <div key={e.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', minWidth: '160px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{e.isim}</div>
                  {e.unvan && <div style={{ fontSize: '11px', color: '#888' }}>{e.unvan}</div>}
                </div>
                <button onClick={() => ekipSil(e.id)} style={{ ...BD, padding: '4px 8px', fontSize: '11px' }}>Sil</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- YAZARLAR & ÇİZERLER ----
function YazarCizerSayfasi() {
  const [liste, setListe] = useState([])
  const [aramaMetni, setAramaMetni] = useState('')
  const [filtre, setFiltre] = useState('hepsi') // hepsi, yazar, cizer
  const [secili, setSecili] = useState(null) // detay göster
  const [secilenSeriler, setSecilenSeriler] = useState([])
  const [mod, setMod] = useState('liste')
  const [form, setForm] = useState({ isim: '', biyografi: '', fotograf_url: '', tip: 'yazar' })
  const [duzenleId, setDuzenleId] = useState(null)
  const [duzenleType, setDuzenleType] = useState('yazar')
  const [msg, setMsg] = useState('')

  useEffect(() => { fetchListe() }, [])

  async function fetchListe() {
    const [y, c] = await Promise.all([
      supabase.from('yazarlar').select('*').order('isim'),
      supabase.from('cizerler').select('*').order('isim'),
    ])
    const yazarlar = (y.data || []).map(x => ({ ...x, tip: 'yazar' }))
    const cizerler = (c.data || []).map(x => ({ ...x, tip: 'cizer' }))
    setListe([...yazarlar, ...cizerler].sort((a, b) => a.isim.localeCompare(b.isim)))
  }

  async function detayGoster(kisi) {
    setSecili(kisi)
    const tablo = kisi.tip === 'yazar' ? 'seri_yazarlar' : 'seri_cizerler'
    const alan = kisi.tip === 'yazar' ? 'yazar_id' : 'cizer_id'
    const { data } = await supabase.from(tablo).select('seriler(id, baslik, kapak_url, durum)').eq(alan, kisi.id)
    setSecilenSeriler(data?.map(x => x.seriler).filter(Boolean) || [])
  }

  async function kaydet() {
    if (!form.isim) { setMsg('❌ İsim zorunlu!'); return }
    const tablo = form.tip === 'yazar' ? 'yazarlar' : 'cizerler'
    const payload = { isim: form.isim, biyografi: form.biyografi, fotograf_url: form.fotograf_url }
    if (duzenleId) {
      await supabase.from(tablo).update(payload).eq('id', duzenleId)
      if (duzenleType !== form.tip) {
        const eskiTablo = duzenleType === 'yazar' ? 'yazarlar' : 'cizerler'
        await supabase.from(eskiTablo).delete().eq('id', duzenleId)
        await supabase.from(tablo).insert([payload])
      }
    } else {
      await supabase.from(tablo).insert([payload])
    }
    setMsg(duzenleId ? '✅ Güncellendi!' : '✅ Eklendi!')
    setForm({ isim: '', biyografi: '', fotograf_url: '', tip: 'yazar' })
    setDuzenleId(null); setMod('liste'); fetchListe()
    setTimeout(() => setMsg(''), 2000)
  }

  async function sil(id, tip) {
    if (!confirm('Silmek istediğine emin misin?')) return
    await supabase.from(tip === 'yazar' ? 'yazarlar' : 'cizerler').delete().eq('id', id)
    if (secili?.id === id) setSecili(null)
    fetchListe()
  }

  function duzenleAc(kisi) {
    setForm({ isim: kisi.isim, biyografi: kisi.biyografi || '', fotograf_url: kisi.fotograf_url || '', tip: kisi.tip })
    setDuzenleId(kisi.id); setDuzenleType(kisi.tip); setMod('form')
  }

  const filtrelenmis = liste.filter(k => {
    const aramaUyumu = k.isim.toLowerCase().includes(aramaMetni.toLowerCase())
    const tipUyumu = filtre === 'hepsi' || (filtre === 'yazar' && k.tip === 'yazar') || (filtre === 'cizer' && k.tip === 'cizer')
    return aramaUyumu && tipUyumu
  })

  if (mod === 'form') return (
    <div style={{ maxWidth: '480px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => { setMod('liste'); setDuzenleId(null) }} style={{ ...BS, padding: '7px 14px' }}>← Geri</button>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>{duzenleId ? 'Düzenle' : 'Yeni Ekle'}</div>
      </div>
      <Msg text={msg} />
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <div style={L}>Tür</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[['yazar', '✍️ Yazar'], ['cizer', '🖊️ Çizer']].map(([val, lbl]) => (
              <button key={val} onClick={() => setForm(f => ({ ...f, tip: val }))}
                style={{ padding: '7px 18px', borderRadius: '100px', border: `1px solid ${form.tip === val ? '#111' : '#e8e6e0'}`, background: form.tip === val ? '#111' : '#fff', color: form.tip === val ? '#fff' : '#888', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>{lbl}</button>
            ))}
          </div>
        </div>
        <div><div style={L}>İsim *</div><input value={form.isim} onChange={e => setForm(f => ({ ...f, isim: e.target.value }))} placeholder="Ad Soyad" style={I} /></div>
        <div><div style={L}>Fotoğraf URL</div><input value={form.fotograf_url} onChange={e => setForm(f => ({ ...f, fotograf_url: e.target.value }))} placeholder="https://..." style={I} /></div>
        <div><div style={L}>Biyografi</div><textarea value={form.biyografi} onChange={e => setForm(f => ({ ...f, biyografi: e.target.value }))} placeholder="Kısa biyografi..." rows={4} style={{ ...I, resize: 'vertical' }} /></div>
        <button onClick={kaydet} style={{ ...BP, padding: '12px' }}>{duzenleId ? '✓ Güncelle' : '+ Ekle'}</button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: secili ? '1fr 340px' : '1fr', gap: '20px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '16px', fontWeight: 600 }}>Yazarlar & Çizerler ({filtrelenmis.length})</div>
          <button onClick={() => setMod('form')} style={BP}>+ Yeni Ekle</button>
        </div>
        <Msg text={msg} />
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <input value={aramaMetni} onChange={e => setAramaMetni(e.target.value)} placeholder="Ara..." style={{ ...I, flex: 1, minWidth: '160px' }} />
          {['hepsi', 'yazar', 'cizer'].map(f => (
            <button key={f} onClick={() => setFiltre(f)}
              style={{ padding: '7px 14px', borderRadius: '100px', border: `1px solid ${filtre === f ? '#111' : '#e8e6e0'}`, background: filtre === f ? '#111' : '#fff', color: filtre === f ? '#fff' : '#888', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
              {f === 'hepsi' ? 'Hepsi' : f === 'yazar' ? '✍️ Yazarlar' : '🖊️ Çizerler'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtrelenmis.map(kisi => (
            <div key={kisi.id + kisi.tip} onClick={() => detayGoster(kisi)}
              style={{ background: secili?.id === kisi.id && secili?.tip === kisi.tip ? '#f0ede8' : '#fff', border: `1px solid ${secili?.id === kisi.id && secili?.tip === kisi.tip ? '#d0c8be' : '#e8e6e0'}`, borderRadius: '10px', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', background: '#f0ede8', flexShrink: 0 }}>
                {kisi.fotograf_url ? <img src={kisi.fotograf_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>{kisi.tip === 'yazar' ? '✍️' : '🖊️'}</div>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{kisi.isim}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>{kisi.tip === 'yazar' ? 'Yazar' : 'Çizer'}</div>
              </div>
              <button onClick={e => { e.stopPropagation(); duzenleAc(kisi) }} style={BS}>Düzenle</button>
              <button onClick={e => { e.stopPropagation(); sil(kisi.id, kisi.tip) }} style={BD}>Sil</button>
            </div>
          ))}
        </div>
      </div>
      {secili && (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '20px', alignSelf: 'start', position: 'sticky', top: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{secili.isim}</div>
            <button onClick={() => setSecili(null)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#aaa' }}>×</button>
          </div>
          {secili.biyografi && <div style={{ fontSize: '12px', color: '#888', marginBottom: '14px', lineHeight: 1.6 }}>{secili.biyografi}</div>}
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Serileri ({secilenSeriler.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {secilenSeriler.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #f0ede8' }}>
                <div style={{ width: '28px', height: '38px', borderRadius: '4px', overflow: 'hidden', background: '#f0ede8', flexShrink: 0 }}>
                  {s.kapak_url ? <img src={s.kapak_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>📚</div>}
                </div>
                <div style={{ flex: 1, fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.baslik}</div>
              </div>
            ))}
            {secilenSeriler.length === 0 && <div style={{ fontSize: '12px', color: '#aaa' }}>Henüz seri yok.</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ---- KATEGORİLER ----
function KategoriSayfasi() {
  const [liste, setListe] = useState([])
  const [secili, setSecili] = useState(null)
  const [seciliSeriler, setSeciliSeriler] = useState([])
  const [mod, setMod] = useState('liste')
  const [form, setForm] = useState({ isim: '', aciklama: '', resim_url: '' })
  const [duzenleId, setDuzenleId] = useState(null)
  const [msg, setMsg] = useState('')
  const [aramaMetni, setAramaMetni] = useState('')

  useEffect(() => { fetchListe() }, [])

  async function fetchListe() {
    const { data } = await supabase.from('kategoriler').select('*').order('isim')
    setListe(data || [])
  }

  async function detayGoster(kat) {
    setSecili(kat)
    const { data } = await supabase.from('seriler').select('id, baslik, kapak_url, durum').eq('kategori_id', kat.id).order('baslik')
    setSeciliSeriler(data || [])
  }

  async function kaydet() {
    if (!form.isim) { setMsg('❌ İsim zorunlu!'); return }
    const payload = { isim: form.isim, aciklama: form.aciklama, resim_url: form.resim_url }
    if (duzenleId) await supabase.from('kategoriler').update(payload).eq('id', duzenleId)
    else await supabase.from('kategoriler').insert([payload])
    setMsg(duzenleId ? '✅ Güncellendi!' : '✅ Eklendi!')
    setForm({ isim: '', aciklama: '', resim_url: '' }); setDuzenleId(null); setMod('liste'); fetchListe()
    setTimeout(() => setMsg(''), 2000)
  }

  async function sil(id) {
    if (!confirm('Silmek istediğine emin misin?')) return
    await supabase.from('kategoriler').delete().eq('id', id)
    if (secili?.id === id) setSecili(null)
    fetchListe()
  }

  function duzenleAc(kat) {
    setForm({ isim: kat.isim, aciklama: kat.aciklama || '', resim_url: kat.resim_url || '' })
    setDuzenleId(kat.id); setMod('form')
  }

  const filtrelenmis = aramaMetni ? liste.filter(k => k.isim.toLowerCase().includes(aramaMetni.toLowerCase())) : liste

  if (mod === 'form') return (
    <div style={{ maxWidth: '480px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => { setMod('liste'); setDuzenleId(null) }} style={{ ...BS, padding: '7px 14px' }}>← Geri</button>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>{duzenleId ? 'Kategori Düzenle' : 'Yeni Kategori'}</div>
      </div>
      <Msg text={msg} />
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div><div style={L}>İsim *</div><input value={form.isim} onChange={e => setForm(f => ({ ...f, isim: e.target.value }))} placeholder="Kategori adı" style={I} /></div>
        <div><div style={L}>Resim URL</div><input value={form.resim_url} onChange={e => setForm(f => ({ ...f, resim_url: e.target.value }))} placeholder="https://..." style={I} /></div>
        {form.resim_url && <img src={form.resim_url} style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e8e6e0' }} />}
        <div><div style={L}>Açıklama</div><textarea value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))} placeholder="Kategori açıklaması..." rows={3} style={{ ...I, resize: 'vertical' }} /></div>
        <button onClick={kaydet} style={{ ...BP, padding: '12px' }}>{duzenleId ? '✓ Güncelle' : '+ Ekle'}</button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: secili ? '1fr 300px' : '1fr', gap: '20px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
          <div style={{ fontSize: '16px', fontWeight: 600 }}>Kategoriler ({filtrelenmis.length})</div>
          <button onClick={() => setMod('form')} style={BP}>+ Yeni Kategori</button>
        </div>
        <Msg text={msg} />
        <input value={aramaMetni} onChange={e => setAramaMetni(e.target.value)} placeholder="Ara..." style={{ ...I, marginBottom: '12px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtrelenmis.map(kat => (
            <div key={kat.id} onClick={() => detayGoster(kat)}
              style={{ background: secili?.id === kat.id ? '#f0ede8' : '#fff', border: `1px solid ${secili?.id === kat.id ? '#d0c8be' : '#e8e6e0'}`, borderRadius: '10px', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              {kat.resim_url && <img src={kat.resim_url} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }} />}
              {!kat.resim_url && <div style={{ width: '40px', height: '40px', background: '#f0ede8', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🏢</div>}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{kat.isim}</div>
                {kat.aciklama && <div style={{ fontSize: '11px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kat.aciklama}</div>}
              </div>
              <button onClick={e => { e.stopPropagation(); duzenleAc(kat) }} style={BS}>Düzenle</button>
              <button onClick={e => { e.stopPropagation(); sil(kat.id) }} style={BD}>Sil</button>
            </div>
          ))}
        </div>
      </div>
      {secili && (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '20px', alignSelf: 'start', position: 'sticky', top: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{secili.isim}</div>
            <button onClick={() => setSecili(null)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#aaa' }}>×</button>
          </div>
          {secili.resim_url && <img src={secili.resim_url} style={{ width: '100%', maxHeight: '100px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }} />}
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Seriler ({seciliSeriler.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {seciliSeriler.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #f0ede8' }}>
                <div style={{ width: '24px', height: '32px', borderRadius: '3px', overflow: 'hidden', background: '#f0ede8', flexShrink: 0 }}>
                  {s.kapak_url && <img src={s.kapak_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.baslik}</span>
              </div>
            ))}
            {seciliSeriler.length === 0 && <div style={{ fontSize: '12px', color: '#aaa' }}>Bu kategoride seri yok.</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ---- TÜRLER ----
function TurlerSayfasi() {
  const [liste, setListe] = useState([])
  const [secili, setSecili] = useState(null)
  const [seciliSeriler, setSeciliSeriler] = useState([])
  const [mod, setMod] = useState('liste')
  const [form, setForm] = useState({ isim: '', aciklama: '', resim_url: '' })
  const [duzenleId, setDuzenleId] = useState(null)
  const [msg, setMsg] = useState('')
  const [aramaMetni, setAramaMetni] = useState('')

  useEffect(() => { fetchListe() }, [])

  async function fetchListe() {
    const { data } = await supabase.from('turler').select('*').order('isim')
    setListe(data || [])
  }

  async function detayGoster(tur) {
    setSecili(tur)
    const { data } = await supabase.from('seriler').select('id, baslik, kapak_url').filter('turler', 'cs', `{${tur.id}}`).order('baslik')
    setSeciliSeriler(data || [])
  }

  async function kaydet() {
    if (!form.isim) { setMsg('❌ İsim zorunlu!'); return }
    const payload = { isim: form.isim, aciklama: form.aciklama, resim_url: form.resim_url }
    if (duzenleId) await supabase.from('turler').update(payload).eq('id', duzenleId)
    else await supabase.from('turler').insert([payload])
    setMsg(duzenleId ? '✅ Güncellendi!' : '✅ Eklendi!')
    setForm({ isim: '', aciklama: '', resim_url: '' }); setDuzenleId(null); setMod('liste'); fetchListe()
    setTimeout(() => setMsg(''), 2000)
  }

  async function sil(id) {
    if (!confirm('Silmek istediğine emin misin?')) return
    await supabase.from('turler').delete().eq('id', id)
    if (secili?.id === id) setSecili(null)
    fetchListe()
  }

  function duzenleAc(tur) {
    setForm({ isim: tur.isim, aciklama: tur.aciklama || '', resim_url: tur.resim_url || '' })
    setDuzenleId(tur.id); setMod('form')
  }

  const filtrelenmis = aramaMetni ? liste.filter(t => t.isim.toLowerCase().includes(aramaMetni.toLowerCase())) : liste

  if (mod === 'form') return (
    <div style={{ maxWidth: '480px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => { setMod('liste'); setDuzenleId(null) }} style={{ ...BS, padding: '7px 14px' }}>← Geri</button>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>{duzenleId ? 'Tür Düzenle' : 'Yeni Tür'}</div>
      </div>
      <Msg text={msg} />
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div><div style={L}>İsim *</div><input value={form.isim} onChange={e => setForm(f => ({ ...f, isim: e.target.value }))} placeholder="Tür adı" style={I} /></div>
        <div><div style={L}>Resim URL</div><input value={form.resim_url} onChange={e => setForm(f => ({ ...f, resim_url: e.target.value }))} placeholder="https://..." style={I} /></div>
        {form.resim_url && <img src={form.resim_url} style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e8e6e0' }} />}
        <div><div style={L}>Açıklama</div><textarea value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))} placeholder="Tür açıklaması..." rows={3} style={{ ...I, resize: 'vertical' }} /></div>
        <button onClick={kaydet} style={{ ...BP, padding: '12px' }}>{duzenleId ? '✓ Güncelle' : '+ Ekle'}</button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: secili ? '1fr 280px' : '1fr', gap: '20px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
          <div style={{ fontSize: '16px', fontWeight: 600 }}>Türler ({filtrelenmis.length})</div>
          <button onClick={() => setMod('form')} style={BP}>+ Yeni Tür</button>
        </div>
        <Msg text={msg} />
        <input value={aramaMetni} onChange={e => setAramaMetni(e.target.value)} placeholder="Ara..." style={{ ...I, marginBottom: '12px' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {filtrelenmis.map(tur => (
            <div key={tur.id} onClick={() => detayGoster(tur)}
              style={{ background: secili?.id === tur.id ? '#f0ede8' : '#fff', border: `1px solid ${secili?.id === tur.id ? '#d0c8be' : '#e8e6e0'}`, borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              {tur.resim_url && <img src={tur.resim_url} style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }} />}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{tur.isim}</div>
              </div>
              <button onClick={e => { e.stopPropagation(); duzenleAc(tur) }} style={{ ...BS, padding: '4px 8px', fontSize: '11px' }}>Düzenle</button>
              <button onClick={e => { e.stopPropagation(); sil(tur.id) }} style={{ ...BD, padding: '4px 8px', fontSize: '11px' }}>Sil</button>
            </div>
          ))}
        </div>
      </div>
      {secili && (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '20px', alignSelf: 'start', position: 'sticky', top: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{secili.isim}</div>
            <button onClick={() => setSecili(null)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#aaa' }}>×</button>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Bu türdeki seriler ({seciliSeriler.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {seciliSeriler.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #f0ede8' }}>
                <div style={{ width: '24px', height: '32px', borderRadius: '3px', overflow: 'hidden', background: '#f0ede8', flexShrink: 0 }}>
                  {s.kapak_url && <img src={s.kapak_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.baslik}</span>
              </div>
            ))}
            {seciliSeriler.length === 0 && <div style={{ fontSize: '12px', color: '#aaa' }}>Bu türde seri yok.</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ---- KULLANICILAR ----
function KullanicilarSayfasi() {
  const [liste, setListe] = useState([])
  const [aramaMetni, setAramaMetni] = useState('')
  const [msg, setMsg] = useState('')
  const [mevcutKullanici, setMevcutKullanici] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setMevcutKullanici(session?.user?.id))
    fetchListe()
  }, [])

  async function fetchListe() {
    const { data } = await supabase.from('profiller').select('id, kullanici_adi, avatar_url, rol, askiya_alindi, created_at').order('created_at', { ascending: false })
    setListe(data || [])
  }

  async function rolDegistir(id, yeniRol) {
    await supabase.from('profiller').update({ rol: yeniRol }).eq('id', id)
    setMsg('✅ Rol güncellendi!'); fetchListe(); setTimeout(() => setMsg(''), 2000)
  }

  async function askiyaAl(id, durum) {
    await supabase.from('profiller').update({ askiya_alindi: durum }).eq('id', id)
    setMsg(durum ? '⚠️ Hesap askıya alındı.' : '✅ Hesap aktif edildi.'); fetchListe(); setTimeout(() => setMsg(''), 2000)
  }

  const rolRenk = { admin: '#7c3aed', yonetici: '#1d4ed8', konsey: '#065f46', okuyucu: '#888' }

  const filtrelenmis = aramaMetni ? liste.filter(u => u.kullanici_adi?.toLowerCase().includes(aramaMetni.toLowerCase())) : liste

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>Kullanıcılar ({filtrelenmis.length})</div>
      </div>
      <Msg text={msg} />
      <input value={aramaMetni} onChange={e => setAramaMetni(e.target.value)} placeholder="Kullanıcı ara..." style={{ ...I, maxWidth: '320px', marginBottom: '14px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filtrelenmis.map(u => (
          <div key={u.id} style={{ background: u.askiya_alindi ? '#fff8f8' : '#fff', border: `1px solid ${u.askiya_alindi ? '#fecaca' : '#e8e6e0'}`, borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', background: '#f0ede8', flexShrink: 0 }}>
              {u.avatar_url ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>👤</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>{u.kullanici_adi || 'İsimsiz'}{u.askiya_alindi && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#dc2626', background: '#fff0f0', padding: '1px 6px', borderRadius: '4px', border: '1px solid #fecaca' }}>Askıda</span>}</div>
              <span style={{ fontSize: '11px', color: rolRenk[u.rol] || '#888', fontWeight: 600 }}>{u.rol}</span>
            </div>
            {u.id !== mevcutKullanici && (
              <>
                <select value={u.rol} onChange={e => rolDegistir(u.id, e.target.value)} style={{ padding: '5px 8px', background: '#f5f4f0', border: '1px solid #e8e6e0', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer' }}>
                  <option value="okuyucu">Okuyucu</option>
                  <option value="konsey">Konsey</option>
                  <option value="yonetici">Yönetici</option>
                  <option value="admin">Admin</option>
                </select>
                <button onClick={() => askiyaAl(u.id, !u.askiya_alindi)} style={{ ...BS, color: u.askiya_alindi ? '#16a34a' : '#dc2626', borderColor: u.askiya_alindi ? '#bbf7d0' : '#fecaca', background: u.askiya_alindi ? '#f0fdf4' : '#fff0f0' }}>
                  {u.askiya_alindi ? '✓ Aktif Et' : '⊘ Askıya Al'}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- YORUMLAR ----
function YorumlarSayfasi() {
  const [yorumlar, setYorumlar] = useState([])
  const [filtre, setFiltre] = useState('aktif')
  const [msg, setMsg] = useState('')

  useEffect(() => { fetchYorumlar() }, [filtre])

  async function fetchYorumlar() {
    let q = supabase.from('yorumlar').select('*, profiller(kullanici_adi, avatar_url), seriler(baslik), bolumler(baslik, sayi)').order('created_at', { ascending: false }).limit(100)
    if (filtre === 'aktif') q = q.eq('silindi', false)
    if (filtre === 'silindi') q = q.eq('silindi', true)
    const { data } = await q
    setYorumlar(data || [])
  }

  async function sil(id) {
    await supabase.from('yorumlar').update({ silindi: true }).eq('id', id)
    setMsg('✅ Yorum gizlendi.'); fetchYorumlar(); setTimeout(() => setMsg(''), 2000)
  }

  async function geriAl(id) {
    await supabase.from('yorumlar').update({ silindi: false }).eq('id', id)
    setMsg('✅ Yorum geri yüklendi.'); fetchYorumlar(); setTimeout(() => setMsg(''), 2000)
  }

  async function kaliciSil(id) {
    if (!confirm('Kalıcı olarak silinecek. Emin misin?')) return
    await supabase.from('yorumlar').delete().eq('id', id)
    setMsg('✅ Kalıcı olarak silindi.'); fetchYorumlar(); setTimeout(() => setMsg(''), 2000)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>Yorumlar</div>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        {[['aktif', 'Aktif'], ['silindi', 'Gizlenen'], ['hepsi', 'Hepsi']].map(([val, lbl]) => (
          <button key={val} onClick={() => setFiltre(val)}
            style={{ padding: '7px 14px', borderRadius: '100px', border: `1px solid ${filtre === val ? '#111' : '#e8e6e0'}`, background: filtre === val ? '#111' : '#fff', color: filtre === val ? '#fff' : '#888', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>{lbl}</button>
        ))}
      </div>
      <Msg text={msg} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {yorumlar.map(y => (
          <div key={y.id} style={{ background: y.silindi ? '#fff8f8' : '#fff', border: `1px solid ${y.silindi ? '#fecaca' : '#e8e6e0'}`, borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', background: '#f0ede8', flexShrink: 0 }}>
                {y.profiller?.avatar_url ? <img src={y.profiller.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>👤</div>}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>{y.profiller?.kullanici_adi || 'Anonim'}</span>
                <span style={{ fontSize: '11px', color: '#aaa', marginLeft: '8px' }}>{y.seriler?.baslik}{y.bolumler ? ` › #${y.bolumler.sayi}` : ''}</span>
              </div>
              {y.silindi && <span style={{ fontSize: '10px', color: '#dc2626', background: '#fff0f0', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fecaca' }}>Gizlendi</span>}
            </div>
            <div style={{ fontSize: '13px', color: '#333', marginBottom: '8px', lineHeight: 1.5 }}>{y.icerik}</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {!y.silindi && <button onClick={() => sil(y.id)} style={BD}>Gizle</button>}
              {y.silindi && <button onClick={() => geriAl(y.id)} style={{ ...BS, color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}>Geri Al</button>}
              <button onClick={() => kaliciSil(y.id)} style={{ ...BD, background: '#dc2626', color: '#fff', borderColor: '#dc2626' }}>Kalıcı Sil</button>
            </div>
          </div>
        ))}
        {yorumlar.length === 0 && <div style={{ color: '#aaa', fontSize: '13px', padding: '20px 0' }}>Yorum yok.</div>}
      </div>
    </div>
  )
}

// ---- ANA SAYFA YÖNETİMİ ----
function AnaSayfaSayfasi() {
  const [logoUrl, setLogoUrl] = useState('')
  const [sliderSeriler, setSliderSeriler] = useState([])
  const [tumSeriler, setTumSeriler] = useState([])
  const [msg, setMsg] = useState('')

  useEffect(() => {
    async function fetchData() {
      const [logo, slider, seriler] = await Promise.all([
        supabase.from('site_ayarlari').select('deger').eq('anahtar', 'logo_url').single(),
        supabase.from('site_ayarlari').select('deger').eq('anahtar', 'slider').single(),
        supabase.from('seriler').select('id, baslik, kapak_url').order('baslik'),
      ])
      setLogoUrl(logo.data?.deger?.url || '')
      setSliderSeriler(slider.data?.deger || [])
      setTumSeriler(seriler.data || [])
    }
    fetchData()
  }, [])

  async function logoKaydet() {
    await supabase.from('site_ayarlari').upsert({ anahtar: 'logo_url', deger: { url: logoUrl }, guncellendi_at: new Date().toISOString() })
    setMsg('✅ Logo kaydedildi!'); setTimeout(() => setMsg(''), 2000)
  }

  function sliderEkle(seriId) {
    if (!seriId || sliderSeriler.find(s => s.seri_id === seriId)) return
    setSliderSeriler(prev => [...prev, { seri_id: seriId, siralama: prev.length }])
  }

  function sliderCikar(seriId) {
    setSliderSeriler(prev => prev.filter(s => s.seri_id !== seriId))
  }

  async function sliderKaydet() {
    await supabase.from('site_ayarlari').upsert({ anahtar: 'slider', deger: sliderSeriler, guncellendi_at: new Date().toISOString() })
    setMsg('✅ Slider kaydedildi!'); setTimeout(() => setMsg(''), 2000)
  }

  const [secilenSeri, setSecilenSeri] = useState('')

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '24px' }}>Ana Sayfa Yönetimi</div>
      <Msg text={msg} />

      {/* Logo */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px' }}>🖼️ Site Logosu</div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
          <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="Logo URL (https://...)" style={{ ...I, flex: 1 }} />
          {logoUrl && <img src={logoUrl} style={{ height: '40px', maxWidth: '120px', objectFit: 'contain', border: '1px solid #e8e6e0', borderRadius: '6px', padding: '4px' }} />}
        </div>
        <button onClick={logoKaydet} style={BP}>Kaydet</button>
      </div>

      {/* Slider */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px' }}>🎠 Öne Çıkan Slider</div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <AramaSecimTek liste={tumSeriler.map(s => ({ id: s.id, isim: s.baslik }))} secili={secilenSeri} onChange={setSecilenSeri} placeholder="Seri seç..." />
          <button onClick={() => { sliderEkle(secilenSeri); setSecilenSeri('') }} style={BP}>Ekle</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
          {sliderSeriler.map((item, i) => {
            const seri = tumSeriler.find(s => s.id === item.seri_id)
            return (
              <div key={item.seri_id} style={{ background: '#f9f8f5', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#aaa', fontSize: '12px', width: '20px', textAlign: 'center' }}>{i + 1}</span>
                {seri?.kapak_url && <img src={seri.kapak_url} style={{ width: '28px', height: '38px', objectFit: 'cover', borderRadius: '4px' }} />}
                <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>{seri?.baslik || item.seri_id}</span>
                <button onClick={() => sliderCikar(item.seri_id)} style={{ ...BD, padding: '4px 8px', fontSize: '11px' }}>Çıkar</button>
              </div>
            )
          })}
          {sliderSeriler.length === 0 && <div style={{ fontSize: '12px', color: '#aaa', padding: '8px 0' }}>Slider'a seri eklenmemiş.</div>}
        </div>
        <button onClick={sliderKaydet} style={BP}>Slider'ı Kaydet</button>
      </div>
    </div>
  )
}

// ---- SAYFA YÖNETİMİ ----
function SayfalarSayfasi() {
  const [sayfalar, setSayfalar] = useState({ hakkimizda: '', iletisim: '', kullanim_kosullari: '' })
  const [aktifSayfa, setAktifSayfa] = useState('hakkimizda')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.from('site_ayarlari').select('deger').eq('anahtar', 'sayfalar').single().then(({ data }) => {
      if (data?.deger) setSayfalar(data.deger)
    })
  }, [])

  async function kaydet() {
    await supabase.from('site_ayarlari').upsert({ anahtar: 'sayfalar', deger: sayfalar, guncellendi_at: new Date().toISOString() })
    setMsg('✅ Sayfa kaydedildi!'); setTimeout(() => setMsg(''), 2000)
  }

  const sayfaEtiketleri = { hakkimizda: 'Hakkımızda', iletisim: 'İletişim', kullanim_kosullari: 'Kullanım Koşulları' }

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>Sayfa Yönetimi</div>
      <Msg text={msg} />
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {Object.entries(sayfaEtiketleri).map(([key, lbl]) => (
          <button key={key} onClick={() => setAktifSayfa(key)}
            style={{ padding: '7px 14px', borderRadius: '100px', border: `1px solid ${aktifSayfa === key ? '#111' : '#e8e6e0'}`, background: aktifSayfa === key ? '#111' : '#fff', color: aktifSayfa === key ? '#fff' : '#888', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>{lbl}</button>
        ))}
      </div>
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>{sayfaEtiketleri[aktifSayfa]}</div>
        <textarea
          value={sayfalar[aktifSayfa]}
          onChange={e => setSayfalar(p => ({ ...p, [aktifSayfa]: e.target.value }))}
          rows={14}
          placeholder="Sayfa içeriği..."
          style={{ ...I, resize: 'vertical', lineHeight: 1.7, marginBottom: '12px' }}
        />
        <button onClick={kaydet} style={BP}>Kaydet</button>
      </div>
    </div>
  )
}

// ---- SOSYAL MEDYA ----
function SosyalMedyaSayfasi() {
  const [form, setForm] = useState({ instagram: '', twitter: '', discord: '', youtube: '', tiktok: '' })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.from('site_ayarlari').select('deger').eq('anahtar', 'sosyal_medya').single().then(({ data }) => {
      if (data?.deger) setForm(prev => ({ ...prev, ...data.deger }))
    })
  }, [])

  async function kaydet() {
    await supabase.from('site_ayarlari').upsert({ anahtar: 'sosyal_medya', deger: form, guncellendi_at: new Date().toISOString() })
    setMsg('✅ Sosyal medya linkleri kaydedildi!'); setTimeout(() => setMsg(''), 2000)
  }

  const alanlar = [
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/konseycomics', emoji: '📸' },
    { key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/konseycomics', emoji: '🐦' },
    { key: 'discord', label: 'Discord', placeholder: 'https://discord.gg/...', emoji: '💬' },
    { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@konseycomics', emoji: '▶️' },
    { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@konseycomics', emoji: '🎵' },
  ]

  return (
    <div style={{ maxWidth: '560px' }}>
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>Sosyal Medya</div>
      <Msg text={msg} />
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {alanlar.map(alan => (
          <div key={alan.key}>
            <div style={L}>{alan.emoji} {alan.label}</div>
            <input value={form[alan.key]} onChange={e => setForm(f => ({ ...f, [alan.key]: e.target.value }))} placeholder={alan.placeholder} style={I} />
          </div>
        ))}
        <button onClick={kaydet} style={{ ...BP, padding: '12px', fontSize: '14px' }}>Kaydet</button>
      </div>
    </div>
  )
}
