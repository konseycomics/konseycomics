'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Camera, Check, Clock3, Eye, ImagePlus, Library, PenLine, Plus, Send, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { BP, BS, CARD_INNER, CokluResimYukle, I, LB, Msg, PANEL_BORDER, ResimYukle, S, SectionTitle, Surface, TEXT_SOFT, TEXT_SUBTLE, AramaSecimTek } from '../ui'

function slugOlustur(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function yerelTarihDegeri(date = new Date(Date.now() + 60 * 60 * 1000)) {
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function yayinBilgisi(item) {
  const tarih = item?.yayin_tarihi ? new Date(item.yayin_tarihi) : null
  if (item?.yayin_durumu === 'taslak') return { key: 'taslak', label: 'Taslak', color: '#b5b5b0' }
  if (item?.yayin_durumu === 'planlandi' && tarih && tarih > new Date()) return { key: 'planlandi', label: 'Planlandı', color: '#e0b74c' }
  return { key: 'yayinda', label: 'Yayında', color: '#6fd29a' }
}

function tarihYaz(value) {
  if (!value) return 'Tarih yok'
  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
  })
}

const bosForm = {
  seri_tipi: 'mevcut',
  seri_id: '',
  yeni_seri_baslik: '',
  yeni_seri_slug: '',
  yeni_seri_ozet: '',
  yeni_seri_kapak_url: '',
  yeni_seri_kategori_id: '',
  yeni_seri_yil: String(new Date().getFullYear()),
  sayi: '',
  baslik: '',
  kapak_url: '',
  drive_link: '',
  pdf_indirme_link: '',
  cbr_indirme_link: '',
  cevirmen_id: '',
  balonlama_id: '',
  grafik_id: '',
  sayfa_gorselleri: [],
  yayin_sekli: 'planla',
  yayin_zamani: yerelTarihDegeri(),
  slider_ekle: false,
  slider_arka_plan_url: '',
  slider_bitis_zamani: '',
  instagram_ekle: false,
  instagram_gorselleri: [],
  instagram_aciklama: '',
  instagram_farkli_zaman: false,
  instagram_yayin_zamani: yerelTarihDegeri(),
}

export function YayinMerkeziSayfasi() {
  const [form, setForm] = useState(bosForm)
  const [seriler, setSeriler] = useState([])
  const [bolumler, setBolumler] = useState([])
  const [kategoriler, setKategoriler] = useState([])
  const [ekip, setEkip] = useState([])
  const [msg, setMsg] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [seriKapakOnizleme, setSeriKapakOnizleme] = useState(null)
  const [bolumKapakOnizleme, setBolumKapakOnizleme] = useState(null)
  const [sliderOnizleme, setSliderOnizleme] = useState(null)
  const [instagramDurumu, setInstagramDurumu] = useState({ yukleniyor: true, connected: false })
  const [instagramGonderileri, setInstagramGonderileri] = useState([])

  useEffect(() => { verileriYukle(); instagramVerileriniYukle() }, [])

  async function instagramVerileriniYukle() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    const headers = { Authorization: `Bearer ${session.access_token}` }
    const [statusResponse, postsResponse] = await Promise.all([
      fetch('/api/instagram/status', { headers }),
      fetch('/api/instagram/posts', { headers }),
    ])
    const status = await statusResponse.json().catch(() => ({}))
    const posts = await postsResponse.json().catch(() => ({}))
    setInstagramDurumu({ yukleniyor: false, ...status })
    setInstagramGonderileri(posts.posts || [])
  }

  async function verileriYukle() {
    const [seriSonuc, bolumSonuc, kategoriSonuc, ekipSonuc] = await Promise.all([
      supabase.from('seriler').select('id, baslik, slug, ozet, kapak_url, kategori_id, yayin_durumu, yayin_tarihi').order('baslik'),
      supabase.from('bolumler').select('id, seri_id, sayi, baslik, yayin_durumu, yayin_tarihi, seriler(baslik, slug)').order('yayin_tarihi', { ascending: false, nullsFirst: false }),
      supabase.from('kategoriler').select('id, isim').order('isim'),
      supabase.from('ekip').select('id, isim').order('isim'),
    ])
    setSeriler(seriSonuc.data || [])
    setBolumler(bolumSonuc.data || [])
    setKategoriler(kategoriSonuc.data || [])
    setEkip(ekipSonuc.data || [])
  }

  function seriSec(seriId) {
    const seriBolumleri = bolumler.filter(item => String(item.seri_id) === String(seriId))
    const sonrakiSayi = Math.max(0, ...seriBolumleri.map(item => Number(item.sayi || 0))) + 1
    setForm(current => ({
      ...current,
      seri_id: seriId,
      sayi: String(sonrakiSayi),
      baslik: current.baslik || `Bölüm ${sonrakiSayi}`,
    }))
  }

  const seciliSeri = useMemo(
    () => seriler.find(item => String(item.id) === String(form.seri_id)),
    [form.seri_id, seriler]
  )
  const yayinTarihi = form.yayin_sekli === 'taslak'
    ? null
    : form.yayin_sekli === 'simdi'
      ? new Date().toISOString()
      : form.yayin_zamani ? new Date(form.yayin_zamani).toISOString() : null
  const instagramYayinTarihi = form.instagram_farkli_zaman || form.yayin_sekli === 'taslak'
    ? (form.instagram_yayin_zamani ? new Date(form.instagram_yayin_zamani).toISOString() : null)
    : yayinTarihi
  const gelecekYayinlar = bolumler
    .filter(item => item.yayin_durumu === 'planlandi' && item.yayin_tarihi && new Date(item.yayin_tarihi) > new Date())
    .sort((a, b) => new Date(a.yayin_tarihi) - new Date(b.yayin_tarihi))
  const sonYayinlar = bolumler.slice(0, 6)

  function formuSifirla() {
    setForm({ ...bosForm, yayin_zamani: yerelTarihDegeri(), instagram_yayin_zamani: yerelTarihDegeri() })
    setSeriKapakOnizleme(null)
    setBolumKapakOnizleme(null)
    setSliderOnizleme(null)
  }

  async function bildirimHazirla({ seriId, seriBaslik, bolumBaslik, bolumNo, availableAt }) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    const response = await fetch('/api/notifications/new-chapter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ seriId, seriBaslik, bolumBaslik, bolumNo, availableAt }),
    })
    if (!response.ok) throw new Error((await response.json().catch(() => ({})))?.error || 'Bildirim hazırlanamadı.')
  }

  async function sliderEkle({ seri, baslangicTarihi }) {
    if (!form.slider_ekle || !seri?.id) return
    const { data: ayar, error: ayarError } = await supabase
      .from('site_ayarlari')
      .select('deger')
      .eq('anahtar', 'anasayfa_hero_slider')
      .maybeSingle()
    if (ayarError) throw ayarError

    const mevcut = Array.isArray(ayar?.deger) ? ayar.deger : []
    const slide = {
      id: `hero-${Date.now()}`,
      seri_id: seri.id,
      aktif: true,
      badge: 'Yeni Yayın',
      baslik: seri.baslik,
      aciklama: seri.ozet || '',
      arka_plan_url: form.slider_arka_plan_url || seri.kapak_url || '',
      kapak_url: seri.kapak_url || '',
      arka_plan_fit: 'cover',
      arka_plan_pozisyon: 'center center',
      arka_plan_x: 50,
      arka_plan_y: 50,
      buton1_metin: 'İncele',
      buton1_link: `/seri/${seri.slug}`,
      buton2_metin: 'Tüm Seriler',
      buton2_link: '/seriler',
      baslangic_tarihi: baslangicTarihi,
      bitis_tarihi: form.slider_bitis_zamani ? new Date(form.slider_bitis_zamani).toISOString() : null,
    }
    const { error } = await supabase.from('site_ayarlari').upsert({
      anahtar: 'anasayfa_hero_slider',
      deger: [...mevcut, slide],
      guncellendi_at: new Date().toISOString(),
    }, { onConflict: 'anahtar' })
    if (error) throw error
  }

  async function instagramPlanla({ bolumId }) {
    if (!form.instagram_ekle) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Instagram planlaması için oturum bulunamadı.')
    const response = await fetch('/api/instagram/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        bolumId,
        gorseller: form.instagram_gorselleri,
        aciklama: form.instagram_aciklama,
        yayinTarihi: instagramYayinTarihi,
        taslak: form.yayin_sekli === 'taslak',
      }),
    })
    if (!response.ok) throw new Error((await response.json().catch(() => ({})))?.error || 'Instagram gönderisi planlanamadı.')
  }

  async function yayiniKaydet() {
    setMsg('')
    if (form.seri_tipi === 'mevcut' && !form.seri_id) return setMsg('❌ Bir seri seçmelisin.')
    if (form.seri_tipi === 'yeni' && (!form.yeni_seri_baslik || !form.yeni_seri_kategori_id)) return setMsg('❌ Yeni seri başlığı ve kategorisi zorunlu.')
    if (!form.sayi || !form.baslik) return setMsg('❌ Bölüm numarası ve başlığı zorunlu.')
    if (form.sayfa_gorselleri.length === 0 && !form.drive_link) return setMsg('❌ Sayfa görselleri veya Drive bağlantısı gerekli.')
    if (form.yayin_sekli === 'planla' && (!yayinTarihi || new Date(yayinTarihi) <= new Date())) return setMsg('❌ Planlama zamanı gelecekte olmalı.')
    if (form.yayin_sekli === 'taslak' && form.slider_ekle) return setMsg('❌ Taslak yayın için slider planlanamaz.')
    if (form.instagram_ekle && !instagramDurumu.connected) return setMsg('❌ Önce Instagram hesabını bağlamalısın.')
    if (form.instagram_ekle && form.instagram_gorselleri.length === 0) return setMsg('❌ Instagram için en az bir görsel gerekli.')
    if (form.instagram_ekle && form.instagram_farkli_zaman && (!instagramYayinTarihi || (form.yayin_sekli !== 'taslak' && new Date(instagramYayinTarihi) <= new Date()))) return setMsg('❌ Instagram yayın zamanı gelecekte olmalı.')

    setKaydediliyor(true)
    let olusturulanSeriId = null
    let olusturulanBolumId = null
    try {
      const yayinDurumu = form.yayin_sekli === 'taslak' ? 'taslak' : form.yayin_sekli === 'planla' ? 'planlandi' : 'yayinda'
      let seri = seciliSeri

      if (form.seri_tipi === 'yeni') {
        const seriPayload = {
          baslik: form.yeni_seri_baslik.trim(),
          slug: form.yeni_seri_slug || slugOlustur(form.yeni_seri_baslik),
          ozet: form.yeni_seri_ozet.trim(),
          kapak_url: form.yeni_seri_kapak_url,
          kategori_id: form.yeni_seri_kategori_id,
          kategori: kategoriler.find(item => item.id === form.yeni_seri_kategori_id)?.isim || 'Çizgi Roman',
          tur: 'seri',
          durum: 'Devam Eden',
          yil: Number(form.yeni_seri_yil) || null,
          one_cikan: false,
          yayin_durumu: yayinDurumu,
          yayin_tarihi: yayinTarihi,
        }
        const { data, error } = await supabase.from('seriler').insert(seriPayload).select().single()
        if (error) throw error
        seri = data
        olusturulanSeriId = data.id
      }

      const bolumPayload = {
        seri_id: seri.id,
        sayi: Number(form.sayi),
        baslik: form.baslik.trim(),
        kapak_url: form.kapak_url || seri.kapak_url || '',
        drive_link: form.drive_link || null,
        indirme_link: form.pdf_indirme_link || null,
        pdf_indirme_link: form.pdf_indirme_link || null,
        cbr_indirme_link: form.cbr_indirme_link || null,
        cevirmen_id: form.cevirmen_id || null,
        balonlama_id: form.balonlama_id || null,
        grafik_id: form.grafik_id || null,
        yayin_durumu: yayinDurumu,
        yayin_tarihi: yayinTarihi,
      }
      const { data: bolum, error: bolumError } = await supabase.from('bolumler').insert(bolumPayload).select().single()
      if (bolumError) throw bolumError
      olusturulanBolumId = bolum.id

      if (form.sayfa_gorselleri.length > 0) {
        const { error: sayfaError } = await supabase.from('bolum_sayfalari').insert(
          form.sayfa_gorselleri.map((url, index) => ({ bolum_id: bolum.id, sira: index + 1, gorsel_url: url }))
        )
        if (sayfaError) throw sayfaError
      }

      if (yayinDurumu !== 'taslak') {
        await bildirimHazirla({
          seriId: seri.id,
          seriBaslik: seri.baslik,
          bolumBaslik: bolum.baslik,
          bolumNo: bolum.sayi,
          availableAt: yayinTarihi,
        })
        await sliderEkle({ seri, baslangicTarihi: yayinTarihi })
      }

      await instagramPlanla({ bolumId: bolum.id })

      setMsg(yayinDurumu === 'planlandi' ? `✅ Yayın ${tarihYaz(yayinTarihi)} için planlandı.` : yayinDurumu === 'taslak' ? '✅ Taslak kaydedildi.' : '✅ Bölüm yayınlandı.')
      formuSifirla()
      await verileriYukle()
      await instagramVerileriniYukle()
    } catch (error) {
      if (olusturulanBolumId) await supabase.from('bolumler').delete().eq('id', olusturulanBolumId)
      if (olusturulanSeriId) await supabase.from('seriler').delete().eq('id', olusturulanSeriId)
      setMsg(`❌ ${error?.message || 'Yayın kaydedilemedi.'}`)
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <div>
      <SectionTitle
        eyebrow="İçerik Operasyonu"
        title="Yayın Merkezi"
        description="Seri, bölüm, okuyucu sayfaları, yayın zamanı ve ana sayfa vitrini tek kayıt akışında."
        action={<div style={{ display:'inline-flex',alignItems:'center',gap:'8px',padding:'9px 12px',border:PANEL_BORDER,borderRadius:'10px',color:TEXT_SOFT,fontSize:'12px' }}><Clock3 size={15} /> İstanbul saati</div>}
      />
      <Msg text={msg} />

      <div style={{ display:'grid',gridTemplateColumns:'minmax(0, 1fr) 330px',gap:'18px',alignItems:'start' }}>
        <div style={{ display:'grid',gap:'16px' }}>
          <Surface>
            <div style={{ display:'flex',alignItems:'center',gap:'9px',fontSize:'15px',fontWeight:800,marginBottom:'18px' }}><Library size={18} /> 1. Seri</div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'16px' }}>
              <button type="button" onClick={()=>setForm(current=>({...current,seri_tipi:'mevcut'}))} style={{...BS,borderRadius:'10px',minHeight:'42px',background:form.seri_tipi==='mevcut'?'rgba(214,173,77,0.16)':undefined,borderColor:form.seri_tipi==='mevcut'?'#6b5728':undefined}}>Mevcut Seri</button>
              <button type="button" onClick={()=>setForm(current=>({...current,seri_tipi:'yeni'}))} style={{...BS,borderRadius:'10px',minHeight:'42px',background:form.seri_tipi==='yeni'?'rgba(214,173,77,0.16)':undefined,borderColor:form.seri_tipi==='yeni'?'#6b5728':undefined}}><Plus size={14} /> Hızlı Seri Oluştur</button>
            </div>
            {form.seri_tipi === 'mevcut' ? (
              <div><div style={LB}>Seri</div><AramaSecimTek liste={seriler.map(item=>({id:item.id,isim:item.baslik}))} secili={form.seri_id} onChange={seriSec} placeholder="Seri seç" /></div>
            ) : (
              <div style={{ display:'grid',gridTemplateColumns:'120px minmax(0,1fr)',gap:'18px',alignItems:'start' }}>
                <ResimYukle onizleme={seriKapakOnizleme || form.yeni_seri_kapak_url} onChange={(url,preview)=>{setForm(current=>({...current,yeni_seri_kapak_url:url}));setSeriKapakOnizleme(preview)}} />
                <div style={{ display:'grid',gap:'12px' }}>
                  <div><div style={LB}>Seri Başlığı</div><input value={form.yeni_seri_baslik} onChange={e=>setForm(current=>({...current,yeni_seri_baslik:e.target.value,yeni_seri_slug:slugOlustur(e.target.value)}))} style={I} /></div>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 130px',gap:'10px' }}>
                    <div><div style={LB}>Kategori</div><select value={form.yeni_seri_kategori_id} onChange={e=>setForm(current=>({...current,yeni_seri_kategori_id:e.target.value}))} style={S}><option value="">Kategori seç</option>{kategoriler.map(item=><option key={item.id} value={item.id}>{item.isim}</option>)}</select></div>
                    <div><div style={LB}>Yıl</div><input type="number" value={form.yeni_seri_yil} onChange={e=>setForm(current=>({...current,yeni_seri_yil:e.target.value}))} style={I} /></div>
                  </div>
                  <div><div style={LB}>Özet</div><textarea value={form.yeni_seri_ozet} onChange={e=>setForm(current=>({...current,yeni_seri_ozet:e.target.value}))} style={{...I,minHeight:'84px',resize:'vertical'}} /></div>
                </div>
              </div>
            )}
          </Surface>

          <Surface>
            <div style={{ display:'flex',alignItems:'center',gap:'9px',fontSize:'15px',fontWeight:800,marginBottom:'18px' }}><PenLine size={18} /> 2. Bölüm</div>
            <div style={{ display:'grid',gridTemplateColumns:'110px minmax(0,1fr) 120px',gap:'12px',marginBottom:'14px' }}>
              <div><div style={LB}>Sayı</div><input type="number" min="1" value={form.sayi} onChange={e=>setForm(current=>({...current,sayi:e.target.value}))} style={I} /></div>
              <div><div style={LB}>Başlık</div><input value={form.baslik} onChange={e=>setForm(current=>({...current,baslik:e.target.value}))} style={I} /></div>
              <div><div style={LB}>Kapak</div><ResimYukle onizleme={bolumKapakOnizleme || form.kapak_url} onChange={(url,preview)=>{setForm(current=>({...current,kapak_url:url}));setBolumKapakOnizleme(preview)}} width="92px" height="68px" /></div>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:'12px',marginBottom:'14px' }}>
              {[['cevirmen_id','Çevirmen'],['balonlama_id','Balonlama'],['grafik_id','Grafik']].map(([key,label])=><div key={key}><div style={LB}>{label}</div><select value={form[key]} onChange={e=>setForm(current=>({...current,[key]:e.target.value}))} style={S}><option value="">Seçilmedi</option>{ekip.map(item=><option key={item.id} value={item.id}>{item.isim}</option>)}</select></div>)}
            </div>
            <details><summary style={{ cursor:'pointer',color:TEXT_SOFT,fontSize:'12px',fontWeight:700 }}>İndirme ve Drive bağlantıları</summary><div style={{ display:'grid',gap:'10px',marginTop:'12px' }}><input value={form.drive_link} onChange={e=>setForm(current=>({...current,drive_link:e.target.value}))} style={I} placeholder="Drive bağlantısı" /><div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px' }}><input value={form.pdf_indirme_link} onChange={e=>setForm(current=>({...current,pdf_indirme_link:e.target.value}))} style={I} placeholder="PDF bağlantısı" /><input value={form.cbr_indirme_link} onChange={e=>setForm(current=>({...current,cbr_indirme_link:e.target.value}))} style={I} placeholder="CBR bağlantısı" /></div></div></details>
          </Surface>

          <Surface>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',marginBottom:'16px' }}><div style={{ display:'flex',alignItems:'center',gap:'9px',fontSize:'15px',fontWeight:800 }}><ImagePlus size={18} /> 3. Okuyucu Sayfaları</div><span style={{ color:TEXT_SUBTLE,fontSize:'12px' }}>{form.sayfa_gorselleri.length} sayfa</span></div>
            <CokluResimYukle gorseller={form.sayfa_gorselleri} onChange={liste=>setForm(current=>({...current,sayfa_gorselleri:liste}))} />
          </Surface>

          <Surface>
            <div style={{ display:'flex',alignItems:'center',gap:'9px',fontSize:'15px',fontWeight:800,marginBottom:'18px' }}><CalendarClock size={18} /> 4. Yayın Zamanı</div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginBottom:'14px' }}>
              {[['simdi','Şimdi Yayınla',Send],['planla','Tarih Planla',CalendarClock],['taslak','Taslak Kaydet',PenLine]].map(([value,label,Icon])=><button type="button" key={value} onClick={()=>setForm(current=>({...current,yayin_sekli:value}))} style={{...BS,minHeight:'48px',borderRadius:'10px',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'7px',background:form.yayin_sekli===value?'rgba(214,173,77,0.16)':undefined,borderColor:form.yayin_sekli===value?'#6b5728':undefined}}><Icon size={15} /> {label}</button>)}
            </div>
            {form.yayin_sekli === 'planla' && <div><div style={LB}>Yayın Tarihi ve Saati</div><input type="datetime-local" value={form.yayin_zamani} onChange={e=>setForm(current=>({...current,yayin_zamani:e.target.value}))} style={{...I,maxWidth:'320px'}} /></div>}
          </Surface>

          <Surface>
            <label style={{ display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',fontSize:'14px',fontWeight:800 }}><input type="checkbox" checked={form.slider_ekle} onChange={e=>setForm(current=>({...current,slider_ekle:e.target.checked}))} /><Sparkles size={17} /> Ana sayfa slider’ına ekle</label>
            {form.slider_ekle && <div style={{ display:'grid',gridTemplateColumns:'150px minmax(0,1fr)',gap:'16px',marginTop:'16px',alignItems:'start' }}><ResimYukle bucket="site" width="150px" height="86px" onizleme={sliderOnizleme || form.slider_arka_plan_url} onChange={(url,preview)=>{setForm(current=>({...current,slider_arka_plan_url:url}));setSliderOnizleme(preview)}} /><div><div style={LB}>Slider Bitiş Zamanı</div><input type="datetime-local" value={form.slider_bitis_zamani} onChange={e=>setForm(current=>({...current,slider_bitis_zamani:e.target.value}))} style={I} /><div style={{ color:TEXT_SUBTLE,fontSize:'11px',marginTop:'7px' }}>Boş bırakılırsa sen kaldırana kadar kalır.</div></div></div>}
          </Surface>

          <Surface>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',marginBottom:'16px' }}>
              <label style={{ display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',fontSize:'14px',fontWeight:800 }}><input type="checkbox" checked={form.instagram_ekle} onChange={e=>setForm(current=>({...current,instagram_ekle:e.target.checked}))} /><Camera size={18} /> Instagram gönderisi planla</label>
              <span style={{ display:'inline-flex',alignItems:'center',gap:'6px',fontSize:'11px',color:instagramDurumu.connected?'#6fd29a':'#e0b74c' }}><i style={{ width:'7px',height:'7px',borderRadius:'50%',background:'currentColor' }} />{instagramDurumu.yukleniyor?'Kontrol ediliyor':instagramDurumu.connected?`@${instagramDurumu.account?.username || 'bağlı'}`:'Bağlantı bekliyor'}</span>
            </div>
            {form.instagram_ekle && <div style={{ display:'grid',gap:'16px' }}>
              <CokluResimYukle gorseller={form.instagram_gorselleri} onChange={liste=>setForm(current=>({...current,instagram_gorselleri:liste}))} bucket="instagram" format="jpeg" maxFiles={10} />
              <div><div style={LB}>Gönderi Açıklaması</div><textarea maxLength={2200} value={form.instagram_aciklama} onChange={e=>setForm(current=>({...current,instagram_aciklama:e.target.value}))} style={{...I,minHeight:'130px',resize:'vertical'}} placeholder="Yeni bölüm yayında! Açıklama ve etiketler..." /><div style={{ textAlign:'right',color:TEXT_SUBTLE,fontSize:'10px',marginTop:'5px' }}>{form.instagram_aciklama.length} / 2200</div></div>
              <label style={{ display:'flex',alignItems:'center',gap:'9px',fontSize:'12px',fontWeight:700,cursor:'pointer' }}><input type="checkbox" checked={form.instagram_farkli_zaman} onChange={e=>setForm(current=>({...current,instagram_farkli_zaman:e.target.checked}))} /> Site yayınından farklı zamanda paylaş</label>
              {form.instagram_farkli_zaman && <div><div style={LB}>Instagram Yayın Zamanı</div><input type="datetime-local" value={form.instagram_yayin_zamani} onChange={e=>setForm(current=>({...current,instagram_yayin_zamani:e.target.value}))} style={{...I,maxWidth:'320px'}} /></div>}
              {!instagramDurumu.connected && <div style={{ padding:'12px',border:'1px solid rgba(224,183,76,.28)',borderRadius:'10px',background:'rgba(224,183,76,.07)',color:'#e8cf8a',fontSize:'12px',lineHeight:1.6 }}>Meta bağlantısı tamamlandığında bu alan yayınlamaya hazır olacak.</div>}
            </div>}
          </Surface>

          <button type="button" onClick={yayiniKaydet} disabled={kaydediliyor} style={{...BP,minHeight:'52px',borderRadius:'12px',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'9px',fontSize:'13px',opacity:kaydediliyor ? .65 : 1}}>{kaydediliyor ? <Clock3 size={17} /> : <Check size={17} />}{kaydediliyor ? 'Kaydediliyor' : form.yayin_sekli === 'planla' ? 'Yayını Planla' : form.yayin_sekli === 'taslak' ? 'Taslağı Kaydet' : 'Şimdi Yayınla'}</button>
        </div>

        <aside style={{ display:'grid',gap:'14px',position:'sticky',top:'112px' }}>
          <Surface>
            <div style={{ ...LB,marginBottom:'12px' }}>Yayın Özeti</div>
            <div style={{ display:'grid',gap:'12px' }}>
              <div><div style={{ color:TEXT_SUBTLE,fontSize:'10px' }}>SERİ</div><strong style={{ fontSize:'14px' }}>{form.seri_tipi==='yeni' ? form.yeni_seri_baslik || 'Yeni seri' : seciliSeri?.baslik || 'Seçilmedi'}</strong></div>
              <div><div style={{ color:TEXT_SUBTLE,fontSize:'10px' }}>BÖLÜM</div><strong style={{ fontSize:'14px' }}>#{form.sayi || '—'} {form.baslik || 'Başlık bekleniyor'}</strong></div>
              <div><div style={{ color:TEXT_SUBTLE,fontSize:'10px' }}>ZAMAN</div><strong style={{ fontSize:'13px',color:'#e0b74c' }}>{form.yayin_sekli==='simdi'?'Hemen':form.yayin_sekli==='taslak'?'Taslak':tarihYaz(yayinTarihi)}</strong></div>
              <div><div style={{ color:TEXT_SUBTLE,fontSize:'10px' }}>SAYFALAR</div><strong style={{ fontSize:'14px' }}>{form.sayfa_gorselleri.length}</strong></div>
              {form.instagram_ekle&&<div><div style={{ color:TEXT_SUBTLE,fontSize:'10px' }}>INSTAGRAM</div><strong style={{ fontSize:'13px',color:'#e0b74c' }}>{form.instagram_gorselleri.length} görsel · {tarihYaz(instagramYayinTarihi)}</strong></div>}
            </div>
          </Surface>

          <Surface>
            <div style={{ display:'flex',alignItems:'center',gap:'7px',fontSize:'13px',fontWeight:800,marginBottom:'12px' }}><Camera size={16} /> Instagram Kuyruğu</div>
            <div style={{ display:'grid',gap:'8px' }}>{instagramGonderileri.slice(0,5).map(post=><div key={post.id} style={{ ...CARD_INNER,padding:'10px' }}><strong style={{ display:'block',fontSize:'11px',textTransform:'capitalize' }}>{post.durum}</strong><span style={{ display:'block',color:TEXT_SUBTLE,fontSize:'9px',marginTop:'3px' }}>{tarihYaz(post.yayin_tarihi)}</span>{post.hata_mesaji&&<span style={{ display:'block',color:'#fca5a5',fontSize:'9px',marginTop:'4px' }}>{post.hata_mesaji}</span>}</div>)}{instagramGonderileri.length===0&&<div style={{ color:TEXT_SUBTLE,fontSize:'12px' }}>Henüz gönderi yok.</div>}</div>
          </Surface>

          <Surface>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px' }}><div style={{ display:'flex',alignItems:'center',gap:'7px',fontSize:'13px',fontWeight:800 }}><CalendarClock size={16} /> Yaklaşan</div><span style={{ color:TEXT_SUBTLE,fontSize:'11px' }}>{gelecekYayinlar.length}</span></div>
            <div style={{ display:'grid',gap:'8px' }}>{gelecekYayinlar.slice(0,6).map(item=><div key={item.id} style={{ ...CARD_INNER,padding:'11px' }}><strong style={{ display:'block',fontSize:'12px',lineHeight:1.4 }}>{item.seriler?.baslik} · #{item.sayi}</strong><span style={{ display:'block',marginTop:'4px',color:'#e0b74c',fontSize:'10px' }}>{tarihYaz(item.yayin_tarihi)}</span></div>)}{gelecekYayinlar.length===0&&<div style={{ color:TEXT_SUBTLE,fontSize:'12px' }}>Planlanmış yayın yok.</div>}</div>
          </Surface>

          <Surface>
            <div style={{ display:'flex',alignItems:'center',gap:'7px',fontSize:'13px',fontWeight:800,marginBottom:'12px' }}><Eye size={16} /> Son Kayıtlar</div>
            <div style={{ display:'grid',gap:'9px' }}>{sonYayinlar.map(item=>{const durum=yayinBilgisi(item);return <div key={item.id} style={{ display:'grid',gridTemplateColumns:'8px minmax(0,1fr)',gap:'9px',alignItems:'start' }}><i style={{ width:'7px',height:'7px',marginTop:'5px',borderRadius:'50%',background:durum.color }} /><div><strong style={{ display:'block',fontSize:'11px' }}>{item.seriler?.baslik} · #{item.sayi}</strong><span style={{ color:TEXT_SUBTLE,fontSize:'9px' }}>{durum.label} · {tarihYaz(item.yayin_tarihi)}</span></div></div>})}</div>
          </Surface>
        </aside>
      </div>
    </div>
  )
}
