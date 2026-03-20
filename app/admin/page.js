'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

// ... (diğer stil değişkenleri aynı kalıyor)
const L = { fontSize: '11px', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#888', marginBottom: '6px' }
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
            <span onClick={e => { e.stopPropagation(); onChange(secili.filter(s => s !== x.id)) }} style={{ cursor: 'pointer', opacity: 0.7, fontSize: '14px', lineHeight: 1 }}>×</span>
          </span>
        ))}
        <input value={ara} onChange={e => { setAra(e.target.value); setAcik(true) }} placeholder={secili.length === 0 ? placeholder : ''} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontFamily: 'inherit', flex: 1, minWidth: '80px' }} />
      </div>
      {acik && filtrelendi.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', zIndex: 50, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
          {filtrelendi.map(x => (
            <div key={x.id} onClick={() => { onChange([...secili, x.id]); setAra('') }} style={{ padding: '9px 14px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f0ede8' }}
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

export default function Admin() {
  const [giris, setGiris] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [aktif, setAktif] = useState('istatistik')
  const [loginErr, setLoginErr] = useState('')
  const [email, setEmail] = useState('')
  const [sifre, setSifre] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Supabase session kontrolü
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setYukleniyor(false)
        return
      }
      // Rol kontrolü
      const { data: profil } = await supabase
        .from('profiller')
        .select('rol')
        .eq('id', session.user.id)
        .single()

      if (profil?.rol === 'admin' || profil?.rol === 'yonetici') {
        setGiris(true)
      }
      setYukleniyor(false)
    })
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setLoginErr('')
    setYukleniyor(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: sifre })
    if (error) {
      setLoginErr('E-posta veya şifre hatalı.')
      setYukleniyor(false)
      return
    }

    // Rol kontrolü
    const { data: profil } = await supabase
      .from('profiller')
      .select('rol')
      .eq('id', data.user.id)
      .single()

    if (profil?.rol === 'admin' || profil?.rol === 'yonetici') {
      setGiris(true)
    } else {
      await supabase.auth.signOut()
      setLoginErr('Bu hesabın admin yetkisi yok.')
    }
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
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="E-posta"
            required
            style={{ ...I, marginBottom: '10px' }}
          />
          <input
            type="password"
            value={sifre}
            onChange={e => setSifre(e.target.value)}
            placeholder="Şifre"
            required
            style={{ ...I, marginBottom: '10px' }}
          />
          {loginErr && <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '10px' }}>{loginErr}</div>}
          <button type="submit" disabled={yukleniyor} style={{ ...BP, width: '100%', padding: '11px' }}>
            {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <a href="/" style={{ fontSize: '12px', color: '#888', textDecoration: 'none' }}>← Siteye Dön</a>
        </div>
      </div>
    </div>
  )

  const menu = [
    { key: 'istatistik', label: '📊 İstatistikler' },
    { key: 'seriler', label: '📚 Seriler' },
    { key: 'bolumler', label: '📖 Bölümler' },
    { key: 'konsey', label: '🎨 Konsey Ekibi' },
    { key: 'yazarlar', label: '✍️ Yazarlar' },
    { key: 'cizerler', label: '🖊️ Çizerler' },
    { key: 'kategoriler', label: '🏢 Kategoriler' },
    { key: 'turler', label: '🏷️ Türler' },
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
          {aktif === 'yazarlar' && <BasitListe tabloAdi="yazarlar" baslik="Yazarlar" />}
          {aktif === 'cizerler' && <BasitListe tabloAdi="cizerler" baslik="Çizerler" />}
          {aktif === 'kategoriler' && <BasitListe tabloAdi="kategoriler" baslik="Kategoriler" />}
          {aktif === 'turler' && <BasitListe tabloAdi="turler" baslik="Türler" />}
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [seriRes, bolumRes, topSeriRes, topBolumRes] = await Promise.all([
        supabase.from('seriler').select('id', { count: 'exact', head: true }),
        supabase.from('bolumler').select('id', { count: 'exact', head: true }),
        supabase.from('seriler').select('baslik, slug, goruntuleme_sayisi').order('goruntuleme_sayisi', { ascending: false }).limit(5),
        supabase.from('bolumler').select('baslik, sayi, goruntuleme_sayisi, seriler(baslik, slug)').order('goruntuleme_sayisi', { ascending: false }).limit(5),
      ])
      setIstat({ seri: seriRes.count || 0, bolum: bolumRes.count || 0 })
      setTopSeriler(topSeriRes.data || [])
      setTopBolumler(topBolumRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const kart = { background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '20px 24px' }
  if (loading) return <div style={{ color: '#888' }}>Yükleniyor...</div>

  return (
    <div style={{ maxWidth: '720px' }}>
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>İstatistikler</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {[{ etiket: 'Toplam Seri', deger: istat?.seri }, { etiket: 'Toplam Bölüm', deger: istat?.bolum }].map(k => (
          <div key={k.etiket} style={kart}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#888', marginBottom: '8px' }}>{k.etiket}</div>
            <div style={{ fontSize: '32px', fontFamily: "'Bebas Neue', sans-serif" }}>{k.deger}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={kart}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>En Çok Okunan Seriler</div>
          {topSeriler.length === 0 ? <div style={{ fontSize: '13px', color: '#888' }}>Henüz veri yok.</div> : topSeriler.map((s, i) => (
            <div key={s.slug} style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px', marginBottom: '10px', borderBottom: i < topSeriler.length - 1 ? '1px solid #f0ede8' : 'none' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#ccc', width: '16px' }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.baslik}</div>
              </div>
              <span style={{ fontSize: '12px', color: '#888' }}>{s.goruntuleme_sayisi || 0}</span>
            </div>
          ))}
        </div>
        <div style={kart}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>En Çok Okunan Bölümler</div>
          {topBolumler.length === 0 ? <div style={{ fontSize: '13px', color: '#888' }}>Henüz veri yok.</div> : topBolumler.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px', marginBottom: '10px', borderBottom: i < topBolumler.length - 1 ? '1px solid #f0ede8' : 'none' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#ccc', width: '16px' }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: '#aaa' }}>{b.seriler?.baslik}</div>
                <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>#{b.sayi} {b.baslik}</div>
              </div>
              <span style={{ fontSize: '12px', color: '#888' }}>{b.goruntuleme_sayisi || 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---- SERİLER, BÖLÜMLER, KONSEY, BASİT LİSTE ----
// Bu componentler mevcut admin/page.js'deki ile aynı, değişmedi
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
        <button onClick={() => { setMod('liste'); setDuzenleId(null); setForm(bos) }} style={BS}>← Geri</button>
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
            <KapakYukle onizleme={kapakOnizleme} onChange={(url, p) => { setForm(f => ({ ...f, kapak_url: url })); setKapakOnizleme(p) }} bucket="kapaklar" />
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
        {form.tur === 'seri' && (
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
              <div style={{ fontSize: '11px', color: '#888' }}>{s.kategoriler?.isim} · {s.kategori} · {s.yil && `${s.yil} ·`} /{s.slug}</div>
            </div>
            <select value={s.durum} onChange={e => durumDegistir(s.id, e.target.value)} style={{ padding: '5px 10px', background: '#f5f4f0', border: '1px solid #e8e6e0', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer' }}>
              <option>Devam Eden</option><option>Tamamlandı</option><option>Tek Sayılık</option>
            </select>
            <button onClick={() => duzenleAc(s)} style={BS}>Düzenle</button>
            <button onClick={() => sil(s.id)} style={BD}>Sil</button>
          </div>
        ))}
        {filtrelenmis.length === 0 && <div style={{ color: '#888', fontSize: '13px', padding: '20px 0' }}>Sonuç bulunamadı.</div>}
      </div>
    </div>
  )
}

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
        <button onClick={() => { setMod('liste'); setDuzenleId(null); setForm(bos) }} style={BS}>← Geri</button>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>{duzenleId ? 'Bölüm Düzenle' : 'Yeni Bölüm Ekle'}</div>
      </div>
      <Msg text={msg} />
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <div style={L}>Bölüm Kapağı</div>
          <KapakYukle onizleme={kapakOnizleme} onChange={(url, p) => { setForm(f => ({ ...f, kapak_url: url })); setKapakOnizleme(p) }} bucket="bolum-kapaklari" />
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <select value={seciliSeri} onChange={e => setSeciliSeri(e.target.value)} style={{ ...S, maxWidth: '280px' }}>
          <option value="">Seri Seç</option>
          {seriler.map(s => <option key={s.id} value={s.id}>{s.baslik}</option>)}
        </select>
        {seciliSeri && <button onClick={() => setMod('form')} style={BP}>+ Bölüm Ekle</button>}
      </div>
      <Msg text={msg} />
      {seciliSeri && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {bolumler.length === 0 && <div style={{ color: '#888', fontSize: '13px' }}>Henüz bölüm eklenmemiş.</div>}
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

function KonseySayfasi() {
  const [liste, setListe] = useState([])
  const [isim, setIsim] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => { fetchEkip() }, [])

  async function fetchEkip() {
    const { data } = await supabase.from('ekip').select('*').order('isim')
    setListe(data || [])
  }

  async function ekle() {
    if (!isim) return
    await supabase.from('ekip').insert([{ isim }])
    setMsg('✅ Eklendi!'); setIsim(''); fetchEkip()
    setTimeout(() => setMsg(''), 2000)
  }

  async function sil(id) {
    if (!confirm('Silmek istediğine emin misin?')) return
    await supabase.from('ekip').delete().eq('id', id)
    fetchEkip()
  }

  return (
    <div style={{ maxWidth: '500px' }}>
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Konsey Ekibi</div>
      <div style={{ fontSize: '12px', color: '#888', marginBottom: '16px', background: '#f9f8f5', padding: '10px 14px', borderRadius: '8px' }}>
        Ekip üyelerini buraya ekle. Bölüm eklerken çevirmen, balonlama ve grafik olarak seçilebilecekler.
      </div>
      <Msg text={msg} />
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={isim} onChange={e => setIsim(e.target.value)} placeholder="İsim" onKeyDown={e => e.key === 'Enter' && ekle()} style={{ ...I, flex: 1 }} />
          <button onClick={ekle} style={BP}>Ekle</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {liste.map(item => (
          <div key={item.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '10px', padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 500 }}>{item.isim}</span>
            <button onClick={() => sil(item.id)} style={BD}>Sil</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function BasitListe({ tabloAdi, baslik }) {
  const [liste, setListe] = useState([])
  const [isim, setIsim] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => { fetchListe() }, [])

  async function fetchListe() {
    const { data } = await supabase.from(tabloAdi).select('*').order('isim')
    setListe(data || [])
  }

  async function ekle() {
    if (!isim) return
    await supabase.from(tabloAdi).insert([{ isim }])
    setMsg('✅ Eklendi!'); setIsim(''); fetchListe()
    setTimeout(() => setMsg(''), 2000)
  }

  async function sil(id) {
    if (!confirm('Silmek istediğine emin misin?')) return
    await supabase.from(tabloAdi).delete().eq('id', id)
    fetchListe()
  }

  return (
    <div style={{ maxWidth: '500px' }}>
      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>{baslik}</div>
      <Msg text={msg} />
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={isim} onChange={e => setIsim(e.target.value)} placeholder="İsim" onKeyDown={e => e.key === 'Enter' && ekle()} style={{ ...I, flex: 1 }} />
          <button onClick={ekle} style={BP}>Ekle</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {liste.map(item => (
          <div key={item.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '10px', padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 500 }}>{item.isim}</span>
            <button onClick={() => sil(item.id)} style={BD}>Sil</button>
          </div>
        ))}
      </div>
    </div>
  )
}