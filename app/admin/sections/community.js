'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { AramaSecimTek, BS, BP, BD, CARD_INNER, I, LB, Msg, ResimYukle, S, SectionTitle, Surface, TABLE_ROW, TABLE_WRAP, TEXT_SOFT, TEXT_SUBTLE } from '../ui'
import { FORUMS } from '../../lib/forumConfig'

function slugOlustur(value='') {
  return String(value || '')
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function KonseySayfasi() {
  const [ekip, setEkip] = useState([])
  const [profiller, setProfiller] = useState([])
  const [mod, setMod] = useState('liste')
  const [duzenleId, setDuzenleId] = useState(null)
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [avatarOnizleme, setAvatarOnizleme] = useState(null)
  const bos = { isim:'',unvan:'',avatar_url:'',profil_id:null }
  const [form, setForm] = useState(bos)

  useEffect(() => { fetchHepsi() }, [])
  async function fetchHepsi() { const [{ data }, { data: profilData }] = await Promise.all([supabase.from('ekip').select('*').order('isim'), supabase.from('public_profiller').select('id, kullanici_adi, avatar_url').order('kullanici_adi')]); setEkip(data||[]); setProfiller(profilData||[]) }

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
    <div style={{ maxWidth:'560px' }}>
      <SectionTitle eyebrow="Topluluk" title={duzenleId?'Uye Duzenle':'Yeni Uye'} description="Konsey ekibindeki gorunur kisileri, unvanlarini ve avatarlarini tek noktadan yonet." action={<button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>Listeye Don</button>} />
      <Msg text={msg} />
      <Surface style={{ padding:'24px' }}>
        <div style={{ display:'flex',gap:'20px',marginBottom:'16px',alignItems:'flex-start' }}>
          <ResimYukle onizleme={avatarOnizleme} onChange={(url,prev)=>{setForm(f=>({...f,avatar_url:url}));setAvatarOnizleme(prev)}} bucket="avatarlar" width="80px" height="80px" />
          <div style={{ flex:1 }}>
            <div style={{ marginBottom:'12px' }}><div style={LB}>İsim</div><input value={form.isim} onChange={e=>setForm(f=>({...f,isim:e.target.value}))} style={I} /></div>
            <div><div style={LB}>Unvan</div><input value={form.unvan} onChange={e=>setForm(f=>({...f,unvan:e.target.value}))} style={I} placeholder="Çevirmen, Editör..." /></div>
            <div style={{marginTop:'12px'}}><div style={LB}>Bağlı Kullanıcı Profili</div><select value={form.profil_id||''} onChange={e=>setForm(f=>({...f,profil_id:e.target.value||null}))} style={S}><option value="">Profil bağlanmadı</option>{profiller.map(p=><option key={p.id} value={p.id}>{p.kullanici_adi}</option>)}</select></div>
          </div>
        </div>
        <div style={{ display:'flex',gap:'10px' }}><button onClick={kaydet} disabled={yukleniyor} style={BP}>{yukleniyor?'Kaydediliyor...':'Kaydet'}</button><button onClick={()=>{setMod('liste');setForm(bos);setDuzenleId(null)}} style={BS}>İptal</button></div>
      </Surface>
    </div>
  )

  return (
    <div>
      <SectionTitle eyebrow="Topluluk" title="Konsey Ekibi" description="Ekipte yer alan editoryal ve operasyonel rolleri guncel, tutarli ve vitrinde hazir tut." action={<button onClick={()=>setMod('form')} style={BP}>Yeni Uye</button>} />
      <Surface style={{ padding:'18px' }}>
        <div style={TABLE_WRAP}>
          {ekip.map((u,i)=>(
            <div key={u.id} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderBottom:i<ekip.length-1?TABLE_ROW.borderBottom:'none' }}>
              {u.avatar_url?<img src={u.avatar_url} style={{ width:'40px',height:'40px',borderRadius:'50%',objectFit:'cover' }} />:<div style={{ width:'40px',height:'40px',borderRadius:'50%',background:'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'center' }}>👤</div>}
              <div style={{ flex:1 }}><div style={{ fontSize:'14px',fontWeight:500 }}>{u.isim}</div><div style={{ fontSize:'12px',color:TEXT_SUBTLE }}>{u.unvan}{u.profil_id ? ` · @${profiller.find(p=>p.id===u.profil_id)?.kullanici_adi||'profil bağlı'}` : ' · profil bağlanmadı'}</div></div>
              <button onClick={()=>{setForm({...bos,...u});setAvatarOnizleme(u.avatar_url);setDuzenleId(u.id);setMod('form')}} style={BS}>Düzenle</button>
              <button onClick={()=>sil(u.id)} style={BD}>Sil</button>
            </div>
          ))}
          {ekip.length===0&&<div style={{ padding:'40px',textAlign:'center',color:TEXT_SUBTLE }}>Henüz üye yok</div>}
        </div>
      </Surface>
    </div>
  )
}

export function KullanicilarSayfasi() {
  const [kullanicilar, setKullanicilar] = useState([])
  const [aramaMetni, setAramaMetni] = useState('')
  const [rolFiltre, setRolFiltre] = useState('tumu')
  const [durumFiltre, setDurumFiltre] = useState('tumu')
  const [msg, setMsg] = useState('')

  useEffect(() => { fetchHepsi() }, [])
  async function fetchHepsi() { const { data } = await supabase.from('profiller').select('*').order('created_at',{ascending:false}); setKullanicilar(data||[]) }

  async function rolDegistir(id, yeniRol) { await supabase.from('profiller').update({rol:yeniRol}).eq('id',id); fetchHepsi(); setMsg('✅ Rol güncellendi!') }
  async function banToggle(id, mevcut) { await supabase.from('profiller').update({askiya_alindi:!mevcut}).eq('id',id); fetchHepsi(); setMsg(mevcut?'✅ Ban kaldırıldı!':'✅ Kullanıcı banlandı!') }

  const filtreli = kullanicilar
    .filter(k => !aramaMetni || k.kullanici_adi?.toLowerCase().includes(aramaMetni.toLowerCase()))
    .filter(k => rolFiltre === 'tumu' || k.rol === rolFiltre)
    .filter(k => durumFiltre === 'tumu' || (durumFiltre === 'banli' ? k.askiya_alindi : !k.askiya_alindi))

  const banliSayi = kullanicilar.filter(k => k.askiya_alindi).length
  const adminSayi = kullanicilar.filter(k => ['admin', 'yonetici'].includes(k.rol)).length

  return (
    <div>
      <SectionTitle eyebrow="Topluluk" title="Kullanicilar" description="Rolleri, hesap durumlarini ve topluluk akisina etki eden temel yetkileri yonet." />
      <Msg text={msg} />
      <Surface style={{ padding:'18px' }}>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:'12px',marginBottom:'16px' }}>
          <div style={{ ...CARD_INNER, padding:'16px' }}>
            <div style={LB}>Toplam Kullanici</div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'42px', lineHeight:0.9 }}>{kullanicilar.length}</div>
          </div>
          <div style={{ ...CARD_INNER, padding:'16px' }}>
            <div style={LB}>Banli Hesap</div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'42px', lineHeight:0.9 }}>{banliSayi}</div>
          </div>
          <div style={{ ...CARD_INNER, padding:'16px' }}>
            <div style={LB}>Admin / Yonetici</div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'42px', lineHeight:0.9 }}>{adminSayi}</div>
          </div>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'minmax(220px, 1.2fr) minmax(180px, 220px) minmax(180px, 220px)',gap:'12px',marginBottom:'16px' }}>
          <input value={aramaMetni} onChange={e=>setAramaMetni(e.target.value)} placeholder="Kullanıcı ara..." style={I} />
          <select value={rolFiltre} onChange={e=>setRolFiltre(e.target.value)} style={S}>
            <option value="tumu">Tum Roller</option>
            <option value="okuyucu">Okuyucu</option>
            <option value="cevirmeni">Çevirmen</option>
            <option value="grafik">Grafik</option>
            <option value="editor">Editör</option>
            <option value="moderator">Moderatör</option>
            <option value="admin">Admin</option>
            <option value="yonetici">Yönetici</option>
          </select>
          <select value={durumFiltre} onChange={e=>setDurumFiltre(e.target.value)} style={S}>
            <option value="tumu">Tum Durumlar</option>
            <option value="aktif">Aktifler</option>
            <option value="banli">Banlılar</option>
          </select>
        </div>
        <div style={TABLE_WRAP}>
          {filtreli.map((k,i)=>(
            <div key={k.id} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderBottom:i<filtreli.length-1?TABLE_ROW.borderBottom:'none',opacity:k.askiya_alindi?0.5:1 }}>
              {k.avatar_url?<img src={k.avatar_url} style={{ width:'36px',height:'36px',borderRadius:'50%',objectFit:'cover' }} />:<div style={{ width:'36px',height:'36px',borderRadius:'50%',background:'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px' }}>👤</div>}
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'14px',fontWeight:500 }}>{k.kullanici_adi} {k.askiya_alindi&&<span style={{ fontSize:'11px',background:'rgba(220,38,38,0.14)',color:'#fca5a5',padding:'2px 7px',borderRadius:'999px',border:'1px solid rgba(220,38,38,0.28)' }}>Banlı</span>}</div>
                <div style={{ fontSize:'12px',color:TEXT_SUBTLE }}>Seviye {k.seviye} · {k.xp} XP · {new Date(k.created_at).toLocaleDateString('tr-TR')}</div>
              </div>
              <select value={k.rol} onChange={e=>rolDegistir(k.id,e.target.value)} style={{...S,width:'auto',fontSize:'12px',padding:'4px 8px'}}>
                <option value="okuyucu">Okuyucu</option><option value="cevirmeni">Çevirmen</option><option value="grafik">Grafik</option><option value="editor">Editör</option><option value="moderator">Moderatör</option><option value="admin">Admin</option><option value="yonetici">Yönetici</option>
              </select>
              <button onClick={()=>banToggle(k.id,k.askiya_alindi)} style={k.askiya_alindi?BS:BD}>{k.askiya_alindi?'Banı Kaldır':'Banla'}</button>
            </div>
          ))}
          {filtreli.length===0&&<div style={{ padding:'40px',textAlign:'center',color:TEXT_SUBTLE }}>Kullanıcı bulunamadı</div>}
        </div>
      </Surface>
    </div>
  )
}

export function YorumlarSayfasi() {
  const [yorumlar, setYorumlar] = useState([])
  const [secili, setSecili] = useState([])
  const [msg, setMsg] = useState('')
  const [aramaMetni, setAramaMetni] = useState('')
  const [seriFiltre, setSeriFiltre] = useState('tumu')

  useEffect(() => { fetchHepsi() }, [])
  async function fetchHepsi() { const { data } = await supabase.from('yorumlar').select('*, profiller(kullanici_adi), seriler(baslik)').eq('silindi',false).order('created_at',{ascending:false}); setYorumlar(data||[]) }

  async function topluSil() {
    if (secili.length===0) return
    if (!confirm(`${secili.length} yorumu silmek istediğine emin misin?`)) return
    await supabase.from('yorumlar').update({silindi:true}).in('id',secili)
    setSecili([]); fetchHepsi(); setMsg('✅ Yorumlar silindi!')
  }

  async function tekSil(id) { await supabase.from('yorumlar').update({silindi:true}).eq('id',id); fetchHepsi(); setMsg('✅ Yorum silindi!') }

  const seriSecenekleri = Array.from(new Map(yorumlar.filter(y => y.seriler?.baslik).map(y => [y.seriler.baslik, { id: y.seriler.baslik, isim: y.seriler.baslik }])).values())
  const filtreli = yorumlar
    .filter(y => !aramaMetni || y.icerik.toLowerCase().includes(aramaMetni.toLowerCase()) || y.profiller?.kullanici_adi?.toLowerCase().includes(aramaMetni.toLowerCase()))
    .filter(y => seriFiltre === 'tumu' || y.seriler?.baslik === seriFiltre)

  return (
    <div>
      <SectionTitle eyebrow="Topluluk" title="Yorumlar" description="Seriler altindaki topluluk akisina mudahale et, sorunlu yorumlari hizli sekilde temizle." action={secili.length>0&&<button onClick={topluSil} style={BD}>🗑️ {secili.length} Yorumu Sil</button>} />
      <Msg text={msg} />
      <Surface style={{ padding:'18px' }}>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:'12px',marginBottom:'16px' }}>
          <div style={{ ...CARD_INNER, padding:'16px' }}>
            <div style={LB}>Toplam Yorum</div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'42px', lineHeight:0.9 }}>{yorumlar.length}</div>
          </div>
          <div style={{ ...CARD_INNER, padding:'16px' }}>
            <div style={LB}>Secili Yorum</div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'42px', lineHeight:0.9 }}>{secili.length}</div>
          </div>
          <div style={{ ...CARD_INNER, padding:'16px' }}>
            <div style={LB}>Seri Cesidi</div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'42px', lineHeight:0.9 }}>{seriSecenekleri.length}</div>
          </div>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'minmax(220px, 1.2fr) minmax(220px, 1fr)',gap:'12px',marginBottom:'16px' }}>
          <input value={aramaMetni} onChange={e=>setAramaMetni(e.target.value)} placeholder="Yorum veya kullanıcı ara..." style={I} />
          <AramaSecimTek liste={[{ id:'tumu', isim:'Tum Seriler' }, ...seriSecenekleri]} secili={seriFiltre} onChange={setSeriFiltre} placeholder="Seriye göre filtrele" />
        </div>
        <div style={TABLE_WRAP}>
          {filtreli.map((y,i)=>(
            <div key={y.id} style={{ display:'flex',alignItems:'flex-start',gap:'12px',padding:'12px 16px',borderBottom:i<filtreli.length-1?TABLE_ROW.borderBottom:'none',background:secili.includes(y.id)?'rgba(139,92,246,0.12)':'transparent' }}>
              <input type="checkbox" checked={secili.includes(y.id)} onChange={e=>setSecili(e.target.checked?[...secili,y.id]:secili.filter(id=>id!==y.id))} style={{ marginTop:'3px' }} />
              <div style={{ flex:1 }}>
                <div style={{ display:'flex',gap:'8px',alignItems:'center',marginBottom:'4px',flexWrap:'wrap' }}>
                  <span style={{ fontSize:'13px',fontWeight:500 }}>{y.profiller?.kullanici_adi}</span>
                  <span style={{ fontSize:'11px',color:TEXT_SUBTLE }}>→</span>
                  <span style={{ fontSize:'12px',color:TEXT_SOFT }}>{y.seriler?.baslik}</span>
                  <span style={{ fontSize:'11px',color:TEXT_SUBTLE }}>{new Date(y.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
                <div style={{ fontSize:'13px' }}>{y.icerik}</div>
              </div>
              <button onClick={()=>tekSil(y.id)} style={BD}>Sil</button>
            </div>
          ))}
          {filtreli.length===0&&<div style={{ padding:'40px',textAlign:'center',color:TEXT_SUBTLE }}>Yorum bulunamadı</div>}
        </div>
      </Surface>
    </div>
  )
}

export function PlanetSayfasi() {
  const bos = { baslik:'', slug:'', ozet:'', icerik:'', kapak_url:'', tip:'manset', one_cikan:false, yayinlandi:true }
  const [yazilar, setYazilar] = useState([])
  const [form, setForm] = useState(bos)
  const [mod, setMod] = useState('liste')
  const [duzenleId, setDuzenleId] = useState(null)
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kapakOnizleme, setKapakOnizleme] = useState(null)

  useEffect(() => { fetchHepsi() }, [])

  async function fetchHepsi() {
    const { data } = await supabase.from('konsey_planet_yazilari').select('*').order('one_cikan', { ascending: false }).order('created_at', { ascending: false })
    setYazilar(data || [])
  }

  async function kaydet() {
    if (!form.baslik || !form.icerik) {
      setMsg('❌ Başlık ve içerik zorunlu.')
      return
    }
    setYukleniyor(true)
    const payload = {
      ...form,
      slug: slugOlustur(form.slug || form.baslik),
    }
    const { data: sessionData } = await supabase.auth.getSession()
    const currentUserId = sessionData?.session?.user?.id || null
    if (!duzenleId) payload.created_by = currentUserId

    if (duzenleId) await supabase.from('konsey_planet_yazilari').update(payload).eq('id', duzenleId)
    else await supabase.from('konsey_planet_yazilari').insert([payload])

    setMsg(duzenleId ? '✅ Planet yazısı güncellendi.' : '✅ Planet yazısı eklendi.')
    setForm(bos)
    setDuzenleId(null)
    setKapakOnizleme(null)
    setMod('liste')
    setYukleniyor(false)
    fetchHepsi()
  }

  async function sil(id) {
    if (!confirm('Bu Planet yazısını silmek istediğine emin misin?')) return
    await supabase.from('konsey_planet_yazilari').delete().eq('id', id)
    fetchHepsi()
    setMsg('✅ Planet yazısı silindi.')
  }

  if (mod === 'form') {
    return (
      <div style={{ maxWidth:'860px' }}>
        <SectionTitle eyebrow="Topluluk" title={duzenleId ? 'Planet Yazisini Duzenle' : 'Yeni Planet Yazisi'} description="Konsey Planet manşetlerini, duyurularini ve editoryal notlarini tek yerden yonet." action={<button onClick={() => { setMod('liste'); setForm(bos); setDuzenleId(null); setKapakOnizleme(null); setMsg('') }} style={BS}>Listeye Don</button>} />
        <Msg text={msg} />
        <Surface style={{ padding:'24px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'140px minmax(0, 1fr)', gap:'18px', marginBottom:'14px', alignItems:'start' }}>
            <ResimYukle onizleme={kapakOnizleme} onChange={(url,prev)=>{ setForm(f=>({...f, kapak_url:url })); setKapakOnizleme(prev) }} bucket="kapaklar" width="140px" height="190px" />
            <div style={{ display:'grid', gap:'12px' }}>
              <div>
                <div style={LB}>Baslik</div>
                <input value={form.baslik} onChange={e=>setForm(f=>({ ...f, baslik:e.target.value, slug: f.slug || slugOlustur(e.target.value) }))} style={I} placeholder="Konsey Planet manşeti" />
              </div>
              <div>
                <div style={LB}>Slug</div>
                <input value={form.slug} onChange={e=>setForm(f=>({ ...f, slug: slugOlustur(e.target.value) }))} style={I} placeholder="konsey-planet-manseti" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div>
                  <div style={LB}>Tip</div>
                  <select value={form.tip} onChange={e=>setForm(f=>({ ...f, tip:e.target.value }))} style={S}>
                    <option value="manset">Manşet</option>
                    <option value="duyuru">Duyuru</option>
                    <option value="editor">Editör Yazısı</option>
                    <option value="secki">Topluluktan Seçki</option>
                  </select>
                </div>
                <div style={{ display:'flex', gap:'18px', flexWrap:'wrap', alignItems:'end' }}>
                  <label style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', color:'#fff' }}>
                    <input type="checkbox" checked={form.one_cikan} onChange={e=>setForm(f=>({ ...f, one_cikan:e.target.checked }))} />
                    Öne çıkan manşet
                  </label>
                  <label style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', color:'#fff' }}>
                    <input type="checkbox" checked={form.yayinlandi} onChange={e=>setForm(f=>({ ...f, yayinlandi:e.target.checked }))} />
                    Yayında
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom:'12px' }}>
            <div style={LB}>Ozet</div>
            <textarea value={form.ozet} onChange={e=>setForm(f=>({ ...f, ozet:e.target.value }))} style={{ ...I, minHeight:'88px', resize:'vertical' }} placeholder="Kartlarda ve manşette görünecek kısa özet." />
          </div>

          <div style={{ marginBottom:'18px' }}>
            <div style={LB}>Icerik</div>
            <textarea value={form.icerik} onChange={e=>setForm(f=>({ ...f, icerik:e.target.value }))} style={{ ...I, minHeight:'240px', resize:'vertical' }} placeholder="Planet yazısının tam içeriği..." />
          </div>

          <div style={{ display:'flex', gap:'10px' }}>
            <button onClick={kaydet} disabled={yukleniyor} style={BP}>{yukleniyor ? 'Kaydediliyor...' : 'Kaydet'}</button>
            <button onClick={() => { setMod('liste'); setForm(bos); setDuzenleId(null); setKapakOnizleme(null); setMsg('') }} style={BS}>Iptal</button>
          </div>
        </Surface>
      </div>
    )
  }

  return (
    <div>
      <SectionTitle eyebrow="Topluluk" title="Konsey Planet" description="Sadece yönetici ekibinin girdiği resmi manşet, duyuru ve editöryal yayın akışını yönet." action={<button onClick={()=>setMod('form')} style={BP}>Yeni Planet Yazisi</button>} />
      <Msg text={msg} />
      <div style={{ display:'grid', gap:'12px' }}>
        {yazilar.map((item) => (
          <Surface key={item.id}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:'16px', flexWrap:'wrap' }}>
              <div style={{ minWidth:0, flex:'1 1 420px' }}>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'10px' }}>
                  <span style={{ padding:'4px 10px', borderRadius:'999px', background:'rgba(243,210,135,0.14)', color:'#f3d287', fontSize:'10px', fontWeight:800, letterSpacing:'1px', textTransform:'uppercase' }}>{item.tip}</span>
                  <span style={{ padding:'4px 10px', borderRadius:'999px', background:item.yayinlandi ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.08)', color:item.yayinlandi ? '#a7f3d0' : TEXT_SUBTLE, fontSize:'10px', fontWeight:800, letterSpacing:'1px', textTransform:'uppercase' }}>{item.yayinlandi ? 'yayında' : 'taslak'}</span>
                  {item.one_cikan ? <span style={{ padding:'4px 10px', borderRadius:'999px', background:'rgba(255,255,255,0.08)', color:'#fff', fontSize:'10px', fontWeight:800, letterSpacing:'1px', textTransform:'uppercase' }}>öne çıkan</span> : null}
                </div>
                <div style={{ fontSize:'22px', fontWeight:800, color:'#fff', marginBottom:'8px' }}>{item.baslik}</div>
                <div style={{ fontSize:'12px', color:TEXT_SUBTLE, marginBottom:'10px' }}>{item.slug}</div>
                <div style={{ fontSize:'14px', color:TEXT_SOFT, lineHeight:1.7, marginBottom:'10px' }}>{item.ozet || 'Özet girilmedi.'}</div>
                <div style={{ fontSize:'12px', color:TEXT_SUBTLE }}>
                  {new Date(item.created_at).toLocaleDateString('tr-TR')} · {item.kapak_url ? 'kapak var' : 'kapak yok'}
                </div>
              </div>
              <div style={{ display:'flex', gap:'8px', alignItems:'flex-start', flexWrap:'wrap' }}>
                <button onClick={() => { setForm({ ...bos, ...item }); setKapakOnizleme(item.kapak_url || null); setDuzenleId(item.id); setMod('form') }} style={BS}>Duzenle</button>
                <button onClick={() => sil(item.id)} style={BD}>Sil</button>
              </div>
            </div>
          </Surface>
        ))}
        {yazilar.length===0 && <Surface><div style={{ color:TEXT_SUBTLE, fontSize:'13px' }}>Henüz Konsey Planet yazısı yok.</div></Surface>}
      </div>
    </div>
  )
}

const RAPOR_NEDENLERI = {
  spam: 'Spam veya reklam',
  hakaret: 'Hakaret veya taciz',
  spoiler: 'İşaretlenmemiş spoiler',
  yanlis_bolum: 'Yanlış forum bölümü',
  yasadisi: 'Yasa dışı içerik',
  diger: 'Diğer',
}

export function ForumModerasyonSayfasi() {
  const [veri, setVeri] = useState({ reports: [], topics: [], logs: [], reportTopics: [], replies: [], profiles: [] })
  const [sekme, setSekme] = useState('raporlar')
  const [durum, setDurum] = useState('acik')
  const [arama, setArama] = useState('')
  const [msg, setMsg] = useState('')
  const [yukleniyor, setYukleniyor] = useState(true)

  async function apiFetch(url, options = {}) {
    const { data: { session } } = await supabase.auth.getSession()
    return fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${session?.access_token || ''}` } })
  }

  async function fetchData() {
    setYukleniyor(true)
    const response = await apiFetch('/api/community/moderation')
    const result = await response.json().catch(() => ({}))
    if (response.ok) setVeri(result)
    else setMsg(`❌ ${result.error || 'Topluluk verileri yüklenemedi.'}`)
    setYukleniyor(false)
  }

  useEffect(() => { fetchData() }, [])

  async function moderasyon(action, payload = {}) {
    setMsg('')
    const response = await apiFetch('/api/community/moderation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) })
    const result = await response.json().catch(() => ({}))
    setMsg(response.ok ? '✅ İşlem kaydedildi.' : `❌ ${result.error || 'İşlem tamamlanamadı.'}`)
    if (response.ok) fetchData()
  }

  async function konuIslemi(konuId, action, forumSlug) {
    setMsg('')
    const response = await apiFetch('/api/community/topics/manage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ konuId, action, forumSlug }) })
    const result = await response.json().catch(() => ({}))
    setMsg(response.ok ? '✅ Konu güncellendi.' : `❌ ${result.error || 'Konu güncellenemedi.'}`)
    if (response.ok) fetchData()
  }

  const profileMap = new Map(veri.profiles.map((item) => [item.id, item]))
  const topicMap = new Map(veri.reportTopics.map((item) => [item.id, item]))
  const replyMap = new Map(veri.replies.map((item) => [item.id, item]))
  const raporlar = veri.reports.filter((item) => durum === 'tumu' || item.durum === durum)
  const konular = veri.topics.filter((item) => !arama || `${item.baslik} ${item.kategori}`.toLocaleLowerCase('tr-TR').includes(arama.toLocaleLowerCase('tr-TR')))

  return (
    <div>
      <SectionTitle eyebrow="Topluluk" title="Forum Moderasyonu" description="Bildirimleri incele, forum konularini yonet ve tum yonetim islemlerini kayit altinda tut." />
      <Msg text={msg} />
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:'12px',marginBottom:'16px' }}>
        {[['Açık Bildirim',veri.reports.filter(r=>r.durum==='acik').length],['İncelenen',veri.reports.filter(r=>r.durum==='inceleniyor').length],['Aktif Konu',veri.topics.filter(t=>t.aktif).length],['Gizli Konu',veri.topics.filter(t=>!t.aktif).length]].map(([label,value])=><div key={label} style={{...CARD_INNER,padding:'16px'}}><div style={LB}>{label}</div><div style={{fontFamily:"'Bebas Neue', sans-serif",fontSize:'42px',lineHeight:.95}}>{value}</div></div>)}
      </div>
      <div style={{ display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap' }}>
        {[['raporlar','Bildirimler'],['konular','Konular'],['gecmis','İşlem Geçmişi']].map(([key,label])=><button key={key} onClick={()=>setSekme(key)} style={sekme===key?BP:BS}>{label}</button>)}
      </div>
      {yukleniyor ? <Surface><div style={{color:TEXT_SUBTLE}}>Yükleniyor...</div></Surface> : null}
      {!yukleniyor && sekme === 'raporlar' ? <Surface style={{padding:'18px'}}>
        <div style={{display:'flex',gap:'10px',marginBottom:'14px',flexWrap:'wrap'}}><select value={durum} onChange={e=>setDurum(e.target.value)} style={{...S,maxWidth:'220px'}}><option value="tumu">Tüm Durumlar</option><option value="acik">Açık</option><option value="inceleniyor">İnceleniyor</option><option value="cozuldu">Çözüldü</option><option value="reddedildi">Reddedildi</option></select></div>
        <div style={{display:'grid',gap:'10px'}}>{raporlar.map((rapor)=>{const konu=topicMap.get(rapor.konu_id);const yanit=replyMap.get(rapor.yanit_id);const bildiren=profileMap.get(rapor.bildiren_id);return <div key={rapor.id} style={{...CARD_INNER,padding:'16px'}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:'12px',flexWrap:'wrap',marginBottom:'10px'}}><div><span style={{color:'#f3d287',fontSize:'11px',fontWeight:800}}>{RAPOR_NEDENLERI[rapor.neden]||rapor.neden}</span><div style={{fontSize:'17px',fontWeight:800,marginTop:'5px'}}>{konu?.baslik||'Forum içeriği'}</div><div style={{fontSize:'11px',color:TEXT_SUBTLE,marginTop:'4px'}}>{bildiren?.kullanici_adi||'Üye'} · {new Date(rapor.created_at).toLocaleString('tr-TR')} · {rapor.durum}</div></div>{konu?.slug?<a href={`/forum/konu/${konu.slug}`} target="_blank" rel="noreferrer" style={{...BS,textDecoration:'none',display:'inline-flex',alignItems:'center'}}>İçeriğe Git</a>:null}</div>
          {yanit?.icerik?<div style={{padding:'10px',background:'rgba(255,255,255,.04)',borderRadius:'8px',color:TEXT_SOFT,fontSize:'12px',lineHeight:1.6,marginBottom:'10px'}}>{yanit.icerik.slice(0,260)}</div>:null}{rapor.aciklama?<div style={{color:TEXT_SOFT,fontSize:'12px',marginBottom:'10px'}}>Not: {rapor.aciklama}</div>:null}
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>{rapor.durum==='acik'?<button onClick={()=>moderasyon('report_review',{reportId:rapor.id})} style={BS}>İncelemeye Al</button>:null}<button onClick={()=>moderasyon('report_resolve',{reportId:rapor.id})} style={BP}>Çözüldü</button><button onClick={()=>moderasyon('report_reject',{reportId:rapor.id})} style={BS}>Reddet</button>{yanit?.id&&yanit.aktif?<button onClick={()=>moderasyon('hide_reply',{replyId:yanit.id})} style={BD}>Yanıtı Gizle</button>:null}{yanit?.id&&!yanit.aktif?<button onClick={()=>moderasyon('restore_reply',{replyId:yanit.id})} style={BS}>Yanıtı Aç</button>:null}</div>
        </div>})}{raporlar.length===0?<div style={{padding:'30px',textAlign:'center',color:TEXT_SUBTLE}}>Bu durumda bildirim yok.</div>:null}</div>
      </Surface> : null}
      {!yukleniyor && sekme === 'konular' ? <Surface style={{padding:'18px'}}><input value={arama} onChange={e=>setArama(e.target.value)} placeholder="Konu veya kategori ara..." style={{...I,marginBottom:'14px'}}/><div style={{display:'grid',gap:'8px'}}>{konular.map(konu=><div key={konu.id} style={{...CARD_INNER,padding:'14px',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}><div style={{flex:'1 1 300px'}}><div style={{fontWeight:800,fontSize:'14px'}}>{konu.baslik}</div><div style={{fontSize:'11px',color:TEXT_SUBTLE,marginTop:'4px'}}>{konu.kategori} · {konu.aktif?'yayında':'gizli'} · {konu.yanit_sayisi} yanıt</div></div><a href={`/forum/konu/${konu.slug}`} target="_blank" rel="noreferrer" style={{...BS,textDecoration:'none'}}>Aç</a><button onClick={()=>konuIslemi(konu.id,konu.sabitlendi?'unpin':'pin')} style={BS}>{konu.sabitlendi?'Sabiti Kaldır':'Sabitle'}</button><button onClick={()=>konuIslemi(konu.id,konu.kilitli?'unlock':'lock')} style={BS}>{konu.kilitli?'Kilidi Aç':'Kilitle'}</button><select defaultValue="" onChange={e=>{if(e.target.value)konuIslemi(konu.id,'move',e.target.value)}} style={{...S,width:'170px'}}><option value="">Bölüme taşı...</option>{FORUMS.map(f=><option key={f.slug} value={f.slug}>{f.name}</option>)}</select><button onClick={()=>konuIslemi(konu.id,konu.aktif?'hide':'restore')} style={konu.aktif?BD:BP}>{konu.aktif?'Gizle':'Geri Aç'}</button></div>)}</div></Surface> : null}
      {!yukleniyor && sekme === 'gecmis' ? <Surface style={{padding:'18px'}}><div style={{display:'grid',gap:'8px'}}>{veri.logs.map(log=><div key={log.id} style={{...CARD_INNER,padding:'13px',display:'flex',justifyContent:'space-between',gap:'12px'}}><div><strong style={{fontSize:'12px'}}>{log.eylem}</strong><div style={{fontSize:'10px',color:TEXT_SUBTLE,marginTop:'4px'}}>{profileMap.get(log.moderator_id)?.kullanici_adi||'Yönetici'}</div></div><span style={{fontSize:'10px',color:TEXT_SUBTLE}}>{new Date(log.created_at).toLocaleString('tr-TR')}</span></div>)}{veri.logs.length===0?<div style={{color:TEXT_SUBTLE}}>Henüz işlem kaydı yok.</div>:null}</div></Surface> : null}
    </div>
  )
}
