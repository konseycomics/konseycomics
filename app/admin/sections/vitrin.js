'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { BP, BS, I, LB, Msg, SectionTitle, Surface, TABLE_ROW, TABLE_WRAP, TEXT_SUBTLE, CARD_INNER } from '../ui'

export function SayfalarSayfasi() {
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
      <SectionTitle eyebrow="Vitrin" title={duzenleKey ? 'Sayfa Duzenle' : 'Yeni Sayfa'} description="Kurumsal veya statik icerikleri ayni panel diliyle yonet. Yayin durumu ve URL yapisi burada kontrol edilir." action={<button onClick={()=>{setMod('liste');setForm(bos);setDuzenleKey(null)}} style={BS}>Listeye Don</button>} />
      <Msg text={msg} />
      <Surface style={{ padding:'24px' }}>
        <div style={{ marginBottom:'12px' }}><div style={LB}>Başlık</div><input value={form.baslik} onChange={e=>setForm(f=>({...f,baslik:e.target.value,slug:slugOlustur(e.target.value)}))} style={I} /></div>
        <div style={{ marginBottom:'12px' }}><div style={LB}>Slug</div><input value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))} style={I} /></div>
        <div style={{ marginBottom:'12px' }}><div style={LB}>İçerik</div><textarea value={form.icerik} onChange={e=>setForm(f=>({...f,icerik:e.target.value}))} style={{...I,height:'200px'}} /></div>
        <div style={{ marginBottom:'20px' }}><label style={{ display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13px' }}><input type="checkbox" checked={form.yayinda} onChange={e=>setForm(f=>({...f,yayinda:e.target.checked}))} /> Yayında</label></div>
        <div style={{ display:'flex',gap:'10px' }}><button onClick={kaydet} disabled={yukleniyor} style={BP}>{yukleniyor?'Kaydediliyor...':'Kaydet'}</button><button onClick={()=>{setMod('liste');setForm(bos);setDuzenleKey(null)}} style={BS}>İptal</button></div>
      </Surface>
    </div>
  )

  return (
    <div>
      <SectionTitle eyebrow="Vitrin" title="Sayfalar" description="Hakkimizda, iletisim ve diger statik icerikleri merkezi bir arsiv gibi yonet." action={<button onClick={()=>setMod('form')} style={BP}>Yeni Sayfa</button>} />
      <Surface style={{ padding:'18px', marginBottom:'18px' }}>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:'12px',marginBottom:'16px' }}>
          <div style={{ ...CARD_INNER, padding:'16px' }}>
            <div style={LB}>Toplam Sayfa</div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'42px', lineHeight:0.9 }}>{sayfalar.length}</div>
          </div>
          <div style={{ ...CARD_INNER, padding:'16px' }}>
            <div style={LB}>Yayindaki</div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'42px', lineHeight:0.9 }}>{sayfalar.filter(s => s.deger?.yayinda).length}</div>
          </div>
        </div>
        <div style={TABLE_WRAP}>
          {sayfalar.map((s,i)=>(
            <div key={s.anahtar} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'14px 16px',borderBottom:i<sayfalar.length-1?TABLE_ROW.borderBottom:'none' }}>
              <div style={{ flex:1 }}><div style={{ fontSize:'14px',fontWeight:500 }}>{s.deger?.baslik||s.anahtar}</div><div style={{ fontSize:'12px',color:TEXT_SUBTLE }}>/{s.deger?.slug} · {s.deger?.yayinda?'Yayında':'Taslak'}</div></div>
              <button onClick={()=>{setForm(s.deger||bos);setDuzenleKey(s.anahtar);setMod('form')}} style={BS}>Düzenle</button>
            </div>
          ))}
          {sayfalar.length===0&&<div style={{ padding:'40px',textAlign:'center',color:TEXT_SUBTLE }}>Henüz sayfa yok</div>}
        </div>
      </Surface>
    </div>
  )
}

export function SosyalMedyaSayfasi() {
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
      <SectionTitle eyebrow="Vitrin" title="Sosyal Medya" description="Footer ve kurumsal vitrin baglantilarini tek yerden guncelle." />
      <Msg text={msg} />
      <Surface style={{ padding:'24px' }}>
        {[['instagram','Instagram','https://instagram.com/konseycomics'],['twitter','Twitter / X','https://x.com/konseycomics'],['discord','Discord','https://discord.gg/...'],['youtube','YouTube','https://youtube.com/@konseycomics'],['facebook','Facebook','https://facebook.com/konseycomics']].map(([key,label,ph])=>(
          <div key={key} style={{ marginBottom:'16px' }}><div style={LB}>{label}</div><input value={form[key]||''} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} style={I} placeholder={ph} /></div>
        ))}
        <button onClick={kaydet} disabled={yukleniyor} style={BP}>{yukleniyor?'Kaydediliyor...':'Kaydet'}</button>
      </Surface>
    </div>
  )
}
