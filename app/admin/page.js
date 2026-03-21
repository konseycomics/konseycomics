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
              {['Devam Eden', 'Tamamlandı'].map(d => (    const { data: profil } = await supabase.from('profiller').select('rol').eq('id', data.user.id).single()
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
              {['Devam Eden', 'Tamamlandı'].map(d => (        <button onClick={kaydet} style={{ ...BP, padding: '12px', fontSize: '14px' }}>Kaydet</button>
      </div>
    </div>
  )
}

// ---- BÖLÜMLER ----
function BolumlerSayfasi() {
  const [bolumler, setBolumler] = useState([])
  const [seriler, setSeriler] = useState([])
  const [mod, setMod] = useState('liste')
  const [duzenleId, setDuzenleId] = useState(null)
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kapakOnizleme, setKapakOnizleme] = useState(null)
  const [aramaMetni, setAramaMetni] = useState('')

  const bos = { baslik: '', sayi: '', seri_id: '', ozet: '', bolum_url: '', yil_ay: '', kapak_url: '', durum: 'Yayında' }
  const [form, setForm] = useState(bos)

  useEffect(() => { fetchHepsi() }, [])

  async function fetchHepsi() {
    const [b, s] = await Promise.all([
      supabase.from('bolumler').select('*, seriler(baslik)').order('created_at', { ascending: false }),
      supabase.from('seriler').select('id, baslik').order('baslik'),
    ])
    setBolumler(b.data || [])
    setSeriler(s.data || [])
  }

  async function kaydet() {
    if (!form.baslik || !form.seri_id) { setMsg('❌ Başlık ve seri zorunlu!'); return }
    setYukleniyor(true)
    const payload = {
      baslik: form.baslik,
      sayi: form.sayi || null,
      seri_id: form.seri_id,
      ozet: form.ozet,
      bolum_url: form.bolum_url,
      yil_ay: form.yil_ay || null,
      kapak_url: form.kapak_url,
      durum: form.durum,
    }
    if (duzenleId) {
      await supabase.from('bolumler').update(payload).eq('id', duzenleId)
    } else {
      await supabase.from('bolumler').insert([payload])
    }
    setMsg(duzenleId ? '✅ Güncellendi!' : '✅ Bölüm eklendi!')
    setForm(bos); setDuzenleId(null); setKapakOnizleme(null); setMod('liste'); fetchHepsi()
    setYukleniyor(false)
  }

  async function sil(id) {
    if (!confirm('Silmek istediğine emin misin?')) return
    await supabase.from('bolumler').delete().eq('id', id)
    fetchHepsi()
  }

  async function duzenleAc(b) {
    setForm({
      baslik: b.baslik,
      sayi: b.sayi || '',
      seri_id: b.seri_id,
      ozet: b.ozet || '',
      bolum_url: b.bolum_url || '',
      yil_ay: b.yil_ay || '',
      kapak_url: b.kapak_url || '',
      durum: b.durum || 'Yayında',
    })
    setKapakOnizleme(b.kapak_url || null)
    setDuzenleId(b.id); setMod('form')
  }

  const filtrelenmis = aramaMetni ? bolumler.filter(b => b.baslik.toLowerCase().includes(aramaMetni.toLowerCase())) : bolumler

  if (mod === 'form') return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => { setMod('liste'); setDuzenleId(null); setForm(bos); setKapakOnizleme(null) }} style={{ ...BS, padding: '7px 14px' }}>← Geri</button>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>{duzenleId ? 'Bölüm Düzenle' : 'Yeni Bölüm Ekle'}</div>
      </div>
      <Msg text={msg} />
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <div style={L}>Seri *</div>
          <AramaSecimTek liste={seriler} secili={form.seri_id} onChange={v => setForm(f => ({ ...f, seri_id: v }))} placeholder="Seri seç" />
        </div>
        <div>
          <div style={L}>Başlık *</div>
          <input value={form.baslik} onChange={e => setForm(f => ({ ...f, baslik: e.target.value }))} placeholder="Bölüm başlığı" style={I} />
        </div>
        <div>
          <div style={L}>Bölüm Numarası</div>
          <input type="number" step="0.1" value={form.sayi} onChange={e => setForm(f => ({ ...f, sayi: e.target.value }))} placeholder="1, 1.5, 2" style={I} />
        </div>
        <div>
          <div style={L}>Yıl-Ay</div>
          <input value={form.yil_ay} onChange={e => setForm(f => ({ ...f, yil_ay: e.target.value }))} placeholder="2024-01" style={I} />
        </div>
        <div>
          <div style={L}>Bölüm URL</div>
          <input value={form.bolum_url} onChange={e => setForm(f => ({ ...f, bolum_url: e.target.value }))} placeholder="https://..." style={I} />
        </div>
        <div>
          <div style={L}>Kapak Resmi</div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <KapakYukle onizleme={kapakOnizleme} onChange={(url, prev) => { setForm(f => ({ ...f, kapak_url: url })); setKapakOnizleme(prev) }} />
            <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.7, paddingTop: '8px' }}>JPG, PNG, WEBP desteklenir</div>
          </div>
        </div>
        <div>
          <div style={L}>Durum</div>
          <select value={form.durum} onChange={e => setForm(f => ({ ...f, durum: e.target.value }))} style={S}>
            <option>Yayında</option>
            <option>Taslak</option>
            <option>Arşiv</option>
          </select>
        </div>
        <div>
          <div style={L}>Özet</div>
          <textarea value={form.ozet} onChange={e => setForm(f => ({ ...f, ozet: e.target.value }))} placeholder="Bölüm hakkında açıklama..." rows={4} style={{ ...I, resize: 'vertical' }} />
        </div>
        <button onClick={kaydet} style={{ ...BP, padding: '12px', fontSize: '14px' }}>Kaydet</button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>Bölümler</div>
        <button onClick={() => { setMod('form'); setDuzenleId(null); setForm(bos); setKapakOnizleme(null) }} style={BP}>+ Bölüm Ekle</button>
      </div>
      <div style={{ marginBottom: '16px' }}>
        <input value={aramaMetni} onChange={e => setAramaMetni(e.target.value)} placeholder="Bölüm ara..." style={I} />
      </div>
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0', borderBottom: '1px solid #e8e6e0', padding: '14px 16px', background: '#f9f8f5', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: '#888', letterSpacing: '0.5px' }}>
          <div>Başlık</div>
          <div>No</div>
          <div>Durum</div>
          <div style={{ textAlign: 'right' }}>İşlem</div>
        </div>
        {filtrelenmis.map(b => (
          <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0', padding: '14px 16px', borderBottom: '1px solid #f0ede8', alignItems: 'center' }}>
            <div style={{ fontSize: '13px' }}>
              <div style={{ fontWeight: 500 }}>{b.baslik}</div>
              <div style={{ fontSize: '11px', color: '#aaa', marginTop: '3px' }}>{b.seriler?.baslik}</div>
            </div>
            <div style={{ fontSize: '13px', color: '#888' }}>{b.sayi || '-'}</div>
            <div style={{ fontSize: '12px' }}>
              <span style={{ background: b.durum === 'Yayında' ? '#dcfce7' : '#fef3c7', padding: '4px 8px', borderRadius: '4px', color: b.durum === 'Yayında' ? '#166534' : '#92400e' }}>{b.durum}</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button onClick={() => duzenleAc(b)} style={BS}>Düzenle</button>
              <button onClick={() => sil(b.id)} style={BD}>Sil</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- KONSEY EKIBI ----
function KonseySayfasi() {
  const [ekip, setEkip] = useState([])
  const [mod, setMod] = useState('liste')
  const [duzenleId, setDuzenleId] = useState(null)
  const [msg, setMsg] = useState('')
  const bos = { ad_soyad: '', rol: '', bio: '' }
  const [form, setForm] = useState(bos)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data } = await supabase.from('konsey_ekibi').select('*').order('created_at')
    setEkip(data || [])
  }

  async function kaydet() {
    if (!form.ad_soyad) { setMsg('❌ Ad-soyad zorunlu!'); return }
    if (duzenleId) {
      await supabase.from('konsey_ekibi').update(form).eq('id', duzenleId)
    } else {
      await supabase.from('konsey_ekibi').insert([form])
    }
    setMsg(duzenleId ? '✅ Güncellendi!' : '✅ Üye eklendi!')
    setForm(bos); setDuzenleId(null); setMod('liste'); fetchData()
  }

  async function sil(id) {
    if (!confirm('Silmek istediğine emin misin?')) return
    await supabase.from('konsey_ekibi').delete().eq('id', id)
    fetchData()
  }

  if (mod === 'form') return (
    <div style={{ maxWidth: '480px' }}>
      <button onClick={() => { setMod('liste'); setDuzenleId(null); setForm(bos) }} style={{ ...BS, marginBottom: '24px' }}>← Geri</button>
      <Msg text={msg} />
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <input value={form.ad_soyad} onChange={e => setForm(f => ({ ...f, ad_soyad: e.target.value }))} placeholder="Ad Soyad" style={I} />
        <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))} style={S}>
          <option value="">Rol Seç</option>
          <option>Kurucu</option>
          <option>Editör</option>
          <option>Tasarımcı</option>
          <option>Danışman</option>
        </select>
        <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Biyografi" rows={4} style={{ ...I, resize: 'vertical' }} />
        <button onClick={kaydet} style={BP}>Kaydet</button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>Konsey Ekibi</div>
        <button onClick={() => { setMod('form'); setDuzenleId(null); setForm(bos) }} style={BP}>+ Üye Ekle</button>
      </div>
      <Msg text={msg} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {ekip.map(u => (
          <div key={u.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{u.ad_soyad}</div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>{u.rol}</div>
            <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.4, marginBottom: '12px', minHeight: '40px' }}>{u.bio}</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => { setForm(u); setDuzenleId(u.id); setMod('form') }} style={{ ...BS, flex: 1, fontSize: '11px', padding: '5px' }}>Düzenle</button>
              <button onClick={() => sil(u.id)} style={{ ...BD, flex: 1, fontSize: '11px', padding: '5px' }}>Sil</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- YAZARLAR & ÇİZERLER ----
function YazarCizerSayfasi() {
  const [yazarlar, setYazarlar] = useState([])
  const [cizerler, setCizerler] = useState([])
  const [aktif, setAktif] = useState('yazarlar')
  const [mod, setMod] = useState('liste')
  const [duzenleId, setDuzenleId] = useState(null)
  const [msg, setMsg] = useState('')
  const bos = { isim: '', tur: 'yazar' }
  const [form, setForm] = useState(bos)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: y } = await supabase.from('yazarlar').select('*').order('isim')
    const { data: c } = await supabase.from('cizerler').select('*').order('isim')
    setYazarlar(y || [])
    setCizerler(c || [])
  }

  async function kaydet() {
    if (!form.isim) { setMsg('❌ İsim zorunlu!'); return }
    const table = aktif === 'yazarlar' ? 'yazarlar' : 'cizerler'
    if (duzenleId) {
      await supabase.from(table).update({ isim: form.isim }).eq('id', duzenleId)
    } else {
      await supabase.from(table).insert([{ isim: form.isim }])
    }
    setMsg(duzenleId ? '✅ Güncellendi!' : '✅ Eklendi!')
    setForm(bos); setDuzenleId(null); setMod('liste'); fetchData()
  }

  async function sil(id, table) {
    if (!confirm('Silmek istediğine emin misin?')) return
    await supabase.from(table).delete().eq('id', id)
    fetchData()
  }

  const liste = aktif === 'yazarlar' ? yazarlar : cizerler
  const baslik = aktif === 'yazarlar' ? 'Yazarlar' : 'Çizerler'

  if (mod === 'form') return (
    <div style={{ maxWidth: '400px' }}>
      <button onClick={() => { setMod('liste'); setDuzenleId(null); setForm(bos) }} style={{ ...BS, marginBottom: '24px' }}>← Geri</button>
      <Msg text={msg} />
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '24px' }}>
        <input value={form.isim} onChange={e => setForm(f => ({ ...f, isim: e.target.value }))} placeholder={baslik + ' adı'} style={I} />
        <button onClick={kaydet} style={{ ...BP, width: '100%', marginTop: '16px', padding: '12px' }}>Kaydet</button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        {['yazarlar', 'cizerler'].map(tab => (
          <button key={tab} onClick={() => setAktif(tab)}
            style={{ padding: '10px 20px', border: 'none', borderRadius: '8px', background: aktif === tab ? '#111' : '#f5f4f0', color: aktif === tab ? '#fff' : '#888', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
            {tab === 'yazarlar' ? '✍️ Yazarlar' : '🖌️ Çizerler'}
          </button>
        ))}
      </div>
      <button onClick={() => { setMod('form'); setDuzenleId(null); setForm(bos) }} style={{ ...BP, marginBottom: '16px' }}>+ Ekle</button>
      <Msg text={msg} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {liste.map(item => (
          <div key={item.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px' }}>{item.isim}</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => { setForm({ isim: item.isim }); setDuzenleId(item.id); setMod('form') }} style={{ ...BS, fontSize: '11px', padding: '4px 8px' }}>D</button>
              <button onClick={() => sil(item.id, aktif === 'yazarlar' ? 'yazarlar' : 'cizerler')} style={{ ...BD, fontSize: '11px', padding: '4px 8px' }}>S</button>
            </div>
          </div>
        ))}
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
  const bos = { isim: '' }
  const [form, setForm] = useState(bos)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data } = await supabase.from('kategoriler').select('*').order('isim')
    setKategoriler(data || [])
  }

  async function kaydet() {
    if (!form.isim) { setMsg('❌ İsim zorunlu!'); return }
    if (duzenleId) {
      await supabase.from('kategoriler').update(form).eq('id', duzenleId)
    } else {
      await supabase.from('kategoriler').insert([form])
    }
    setMsg(duzenleId ? '✅ Güncellendi!' : '✅ Kategori eklendi!')
    setForm(bos); setDuzenleId(null); setMod('liste'); fetchData()
  }

  async function sil(id) {
    if (!confirm('Silmek istediğine emin misin?')) return
    await supabase.from('kategoriler').delete().eq('id', id)
    fetchData()
  }

  if (mod === 'form') return (
    <div style={{ maxWidth: '400px' }}>
      <button onClick={() => { setMod('liste'); setDuzenleId(null); setForm(bos) }} style={{ ...BS, marginBottom: '24px' }}>← Geri</button>
      <Msg text={msg} />
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '24px' }}>
        <input value={form.isim} onChange={e => setForm(f => ({ ...f, isim: e.target.value }))} placeholder="Kategori adı" style={I} />
        <button onClick={kaydet} style={{ ...BP, width: '100%', marginTop: '16px', padding: '12px' }}>Kaydet</button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>Kategoriler</div>
        <button onClick={() => { setMod('form'); setDuzenleId(null); setForm(bos) }} style={BP}>+ Kategori Ekle</button>
      </div>
      <Msg text={msg} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
        {kategoriler.map(k => (
          <div key={k.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontWeight: 500, marginBottom: '8px' }}>{k.isim}</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => { setForm(k); setDuzenleId(k.id); setMod('form') }} style={{ ...BS, flex: 1, fontSize: '11px', padding: '4px' }}>D</button>
              <button onClick={() => sil(k.id)} style={{ ...BD, flex: 1, fontSize: '11px', padding: '4px' }}>S</button>
            </div>
          </div>
        ))}
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
  const bos = { isim: '' }
  const [form, setForm] = useState(bos)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data } = await supabase.from('turler').select('*').order('isim')
    setTurler(data || [])
  }

  async function kaydet() {
    if (!form.isim) { setMsg('❌ İsim zorunlu!'); return }
    if (duzenleId) {
      await supabase.from('turler').update(form).eq('id', duzenleId)
    } else {
      await supabase.from('turler').insert([form])
    }
    setMsg(duzenleId ? '✅ Güncellendi!' : '✅ Tür eklendi!')
    setForm(bos); setDuzenleId(null); setMod('liste'); fetchData()
  }

  async function sil(id) {
    if (!confirm('Silmek istediğine emin misin?')) return
    await supabase.from('turler').delete().eq('id', id)
    fetchData()
  }

  if (mod === 'form') return (
    <div style={{ maxWidth: '400px' }}>
      <button onClick={() => { setMod('liste'); setDuzenleId(null); setForm(bos) }} style={{ ...BS, marginBottom: '24px' }}>← Geri</button>
      <Msg text={msg} />
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '24px' }}>
        <input value={form.isim} onChange={e => setForm(f => ({ ...f, isim: e.target.value }))} placeholder="Tür adı" style={I} />
        <button onClick={kaydet} style={{ ...BP, width: '100%', marginTop: '16px', padding: '12px' }}>Kaydet</button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>Türler</div>
        <button onClick={() => { setMod('form'); setDuzenleId(null); setForm(bos) }} style={BP}>+ Tür Ekle</button>
      </div>
      <Msg text={msg} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
        {turler.map(t => (
          <div key={t.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontWeight: 500, marginBottom: '8px' }}>{t.isim}</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => { setForm(t); setDuzenleId(t.id); setMod('form') }} style={{ ...BS, flex: 1, fontSize: '11px', padding: '4px' }}>D</button>
              <button onClick={() => sil(t.id)} style={{ ...BD, flex: 1, fontSize: '11px', padding: '4px' }}>S</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- KULLANICILAR ----
function KullanicilarSayfasi() {
  const [kullanicilar, setKullanicilar] = useState([])
  const [mod, setMod] = useState('liste')
  const [duzenleId, setDuzenleId] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data } = await supabase.from('profiller').select('*').order('created_at', { ascending: false }).limit(50)
    setKullanicilar(data || [])
  }

  async function updateRol(id, newRol) {
    await supabase.from('profiller').update({ rol: newRol }).eq('id', id)
    fetchData()
  }

  async function sil(id) {
    if (!confirm('Kullanıcıyı silmek istediğine emin misin?')) return
    await supabase.from('profiller').delete().eq('id', id)
    fetchData()
  }

  return (
    <div>
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>Kullanıcılar</div>
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0', borderBottom: '1px solid #e8e6e0', padding: '14px 16px', background: '#f9f8f5', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: '#888' }}>
          <div>Email</div>
          <div>Rol</div>
          <div>Üyelik Tarihi</div>
          <div style={{ textAlign: 'right' }}>İşlem</div>
        </div>
        {kullanicilar.map(k => (
          <div key={k.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0', padding: '14px 16px', borderBottom: '1px solid #f0ede8', alignItems: 'center' }}>
            <div style={{ fontSize: '13px' }}>{k.email}</div>
            <div>
              <select value={k.rol || 'kullanici'} onChange={e => updateRol(k.id, e.target.value)} style={{ ...S, fontSize: '12px', padding: '4px' }}>
                <option value="kullanici">Kullanıcı</option>
                <option value="admin">Admin</option>
                <option value="yonetici">Yönetici</option>
              </select>
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>{new Date(k.created_at).toLocaleDateString('tr-TR')}</div>
            <div style={{ textAlign: 'right' }}>
              <button onClick={() => sil(k.id)} style={BD}>Sil</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- YORUMLAR ----
function YorumlarSayfasi() {
  const [yorumlar, setYorumlar] = useState([])
  const [filtre, setFiltre] = useState('hepsi')

  useEffect(() => { fetchData() }, [filtre])

  async function fetchData() {
    let q = supabase.from('yorumlar').select('*, profiller(email), bolumler(baslik)')
    if (filtre === 'bekleme') q = q.eq('onaylandi', false)
    else if (filtre === 'silinen') q = q.eq('silindi', true)
    const { data } = await q.order('created_at', { ascending: false }).limit(100)
    setYorumlar(data || [])
  }

  async function onayla(id) {
    await supabase.from('yorumlar').update({ onaylandi: true }).eq('id', id)
    fetchData()
  }

  async function sil(id) {
    await supabase.from('yorumlar').update({ silindi: true }).eq('id', id)
    fetchData()
  }

  return (
    <div>
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>Yorumlar</div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['hepsi', 'bekleme', 'silinen'].map(f => (
          <button key={f} onClick={() => setFiltre(f)}
            style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: filtre === f ? '#111' : '#f5f4f0', color: filtre === f ? '#fff' : '#888', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px' }}>
            {f === 'hepsi' ? 'Tümü' : f === 'bekleme' ? 'Onay Bekleyen' : 'Silinen'}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {yorumlar.map(y => (
          <div key={y.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>{y.profiller?.email}</div>
            <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px' }}>Bölüm: {y.bolumler?.baslik}</div>
            <div style={{ fontSize: '13px', marginBottom: '12px', lineHeight: 1.5 }}>{y.icerik}</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {!y.onaylandi && <button onClick={() => onayla(y.id)} style={{ ...BS, fontSize: '11px', padding: '6px 12px' }}>Onayla</button>}
              {!y.silindi && <button onClick={() => sil(y.id)} style={{ ...BD, fontSize: '11px', padding: '6px 12px' }}>Sil</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- ANA SAYFA ----
function AnaSayfaSayfasi() {
  const [anasayfa, setAnasayfa] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    baslik: '',
    aciklama: '',
    resim_url: '',
  })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data } = await supabase.from('sayfalar').select('*').eq('slug', 'home').single()
    if (data) {
      setAnasayfa(data)
      setForm({ baslik: data.baslik || '', aciklama: data.icerik || '', resim_url: data.resim_url || '' })
    }
  }

  async function kaydet() {
    setYukleniyor(true)
    if (anasayfa) {
      await supabase.from('sayfalar').update({ baslik: form.baslik, icerik: form.aciklama, resim_url: form.resim_url }).eq('id', anasayfa.id)
    } else {
      await supabase.from('sayfalar').insert([{ slug: 'home', baslik: form.baslik, icerik: form.aciklama, resim_url: form.resim_url }])
    }
    setMsg('✅ Ana sayfa güncellendi!')
    fetchData()
    setYukleniyor(false)
  }

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>Ana Sayfa</div>
      <Msg text={msg} />
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <div style={L}>Başlık</div>
          <input value={form.baslik} onChange={e => setForm(f => ({ ...f, baslik: e.target.value }))} placeholder="Ana sayfa başlığı" style={I} />
        </div>
        <div>
          <div style={L}>Açıklama</div>
          <textarea value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))} placeholder="Ana sayfa açıklaması..." rows={8} style={{ ...I, resize: 'vertical', lineHeight: 1.65 }} />
        </div>
        <div>
          <div style={L}>Resim URL</div>
          <input value={form.resim_url} onChange={e => setForm(f => ({ ...f, resim_url: e.target.value }))} placeholder="https://..." style={I} />
        </div>
        <button onClick={kaydet} disabled={yukleniyor} style={{ ...BP, padding: '12px', fontSize: '14px', opacity: yukleniyor ? 0.7 : 1 }}>Kaydet</button>
      </div>
    </div>
  )
}

// ---- SAYFALAR ----
function SayfalarSayfasi() {
  const [sayfalar, setSayfalar] = useState([])
  const [mod, setMod] = useState('liste')
  const [duzenleId, setDuzenleId] = useState(null)
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const bos = { baslik: '', slug: '', icerik: '' }
  const [form, setForm] = useState(bos)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data } = await supabase.from('sayfalar').select('*').neq('slug', 'home').order('created_at')
    setSayfalar(data || [])
  }

  async function kaydet() {
    if (!form.baslik || !form.slug) { setMsg('❌ Başlık ve slug zorunlu!'); return }
    setYukleniyor(true)
    if (duzenleId) {
      await supabase.from('sayfalar').update(form).eq('id', duzenleId)
    } else {
      await supabase.from('sayfalar').insert([form])
    }
    setMsg(duzenleId ? '✅ Güncellendi!' : '✅ Sayfa eklendi!')
    setForm(bos); setDuzenleId(null); setMod('liste'); fetchData()
    setYukleniyor(false)
  }

  async function sil(id) {
    if (!confirm('Silmek istediğine emin misin?')) return
    await supabase.from('sayfalar').delete().eq('id', id)
    fetchData()
  }

  if (mod === 'form') return (
    <div style={{ maxWidth: '680px' }}>
      <button onClick={() => { setMod('liste'); setDuzenleId(null); setForm(bos) }} style={{ ...BS, marginBottom: '24px' }}>← Geri</button>
      <Msg text={msg} />
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <div style={L}>Başlık</div>
          <input value={form.baslik} onChange={e => setForm(f => ({ ...f, baslik: e.target.value }))} placeholder="Sayfa başlığı" style={I} />
        </div>
        <div>
          <div style={L}>Slug (URL)</div>
          <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="hakkimizda" style={I} />
        </div>
        <div>
          <div style={L}>İçerik</div>
          <textarea value={form.icerik} onChange={e => setForm(f => ({ ...f, icerik: e.target.value }))} placeholder="Sayfa içeriği..." rows={10} style={{ ...I, resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.5 }} />
        </div>
        <button onClick={kaydet} disabled={yukleniyor} style={{ ...BP, padding: '12px', fontSize: '14px', opacity: yukleniyor ? 0.7 : 1 }}>Kaydet</button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>Sayfalar</div>
        <button onClick={() => { setMod('form'); setDuzenleId(null); setForm(bos) }} style={BP}>+ Sayfa Ekle</button>
      </div>
      <Msg text={msg} />
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0', borderBottom: '1px solid #e8e6e0', padding: '14px 16px', background: '#f9f8f5', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: '#888' }}>
          <div>Başlık</div>
          <div>Slug</div>
          <div style={{ textAlign: 'right' }}>İşlem</div>
        </div>
        {sayfalar.map(s => (
          <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0', padding: '14px 16px', borderBottom: '1px solid #f0ede8', alignItems: 'center' }}>
            <div style={{ fontSize: '13px' }}>{s.baslik}</div>
            <div style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace' }}>{s.slug}</div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setForm(s); setDuzenleId(s.id); setMod('form') }} style={BS}>Düzenle</button>
              <button onClick={() => sil(s.id)} style={BD}>Sil</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- SOSYAL MEDYA ----
function SosyalMedyaSayfasi() {
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [form, setForm] = useState({
    instagram: '',
    twitter: '',
    discord: '',
    youtube: '',
    tiktok: '',
  })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data } = await supabase.from('ayarlar').select('sosyal_medya').single().catch(() => null)
    if (data?.sosyal_medya) {
      setForm(data.sosyal_medya)
    }
  }

  async function kaydet() {
    setYukleniyor(true)
    await supabase.from('ayarlar').update({ sosyal_medya: form }).eq('id', 1).catch(() => supabase.from('ayarlar').insert([{ id: 1, sosyal_medya: form }]))
    setMsg('✅ Sosyal medya bağlantıları güncellendi!')
    setYukleniyor(false)
  }

  const alanlar = [
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/@konseycomics', emoji: '📷' },
    { key: 'twitter', label: 'Twitter', placeholder: 'https://twitter.com/konseycomics', emoji: '𝕏' },
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
