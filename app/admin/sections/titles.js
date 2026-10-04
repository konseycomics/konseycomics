'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { BP, BS, I, LB, Msg, S, SectionTitle, Surface, TEXT_SUBTLE } from '../ui'

const EMPTY = { isim: '', kazanma_tipi: 'level', gereken_seviye: 1, seri_id: '', aktif: true }

export function UnvanlarSayfasi() {
  const [titles, setTitles] = useState([])
  const [series, setSeries] = useState([])
  const [form, setForm] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const [t, s] = await Promise.all([
      supabase.from('unvan_tanimlari').select('*').order('siralama'),
      supabase.from('seriler').select('id, baslik').order('baslik'),
    ])
    if (t.error || s.error) { setMessage((t.error || s.error).message); return }
    if (t.data.some(row => !row.kazanma_tipi)) {
      setMessage('Yeni unvan sistemi icin unvan_sade_v2.sql dosyasini calistirin.')
      return
    }
    setTitles(t.data)
    setSeries(s.data)
  }
  useEffect(() => { Promise.resolve().then(load) }, [])

  async function save(e) {
    e.preventDefault()
    if (busy) return
    const level = Number(form.gereken_seviye)
    if (!form.isim.trim() || (form.kazanma_tipi === 'level' && (!Number.isInteger(level) || level < 1)) || (form.kazanma_tipi === 'series' && !form.seri_id)) return
    setBusy(true)
    setMessage('')
    const payload = {
      isim: form.isim.trim(), kazanma_tipi: form.kazanma_tipi,
      gereken_seviye: form.kazanma_tipi === 'level' ? level : null,
      seri_id: form.kazanma_tipi === 'series' ? form.seri_id : null,
      aktif: form.aktif,
      aciklama: form.kazanma_tipi === 'level' ? `Seviye ${level}` : 'Yayimlanmis tum bolumleri okuyarak kazanilir.',
      siralama: form.kazanma_tipi === 'level' ? level : 100,
    }
    const query = form.id
      ? supabase.from('unvan_tanimlari').update(payload).eq('id', form.id).select('id')
      : supabase.from('unvan_tanimlari').insert({ ...payload, kod: `unvan_${crypto.randomUUID()}` }).select('id')
    const { data, error } = await query
    setBusy(false)
    if (error || !data?.length) { setMessage(error?.message || 'Kayit guncellenemedi. Yetkinizi kontrol edin.'); return }
    setForm(null)
    setMessage('Unvan kaydedildi.')
    await load()
  }

  return <div>
    <SectionTitle title="Ünvanlar" action={<button style={BP} onClick={() => setForm({ ...EMPTY })}>Yeni Ünvan</button>} />
    <Msg text={message} />
    {form && <Surface><form onSubmit={save} style={{ display: 'grid', gap: 16 }}>
      <label style={LB}>Ünvan Adı<input required maxLength={80} style={I} value={form.isim} onChange={e => setForm({ ...form, isim: e.target.value })} /></label>
      <label style={LB}>Kazanma Şartı<select style={S} value={form.kazanma_tipi} onChange={e => setForm({ ...form, kazanma_tipi: e.target.value })}>
        <option value="level">Seviyeye ulaşmak</option><option value="series">Serinin tüm bölümlerini okumak</option>
      </select></label>
      {form.kazanma_tipi === 'level'
        ? <label style={LB}>Gereken Seviye<input type="number" required min={1} step={1} style={I} value={form.gereken_seviye} onChange={e => setForm({ ...form, gereken_seviye: e.target.value })} /></label>
        : <label style={LB}>Seri<select aria-label="Seri" required style={S} value={form.seri_id} onChange={e => setForm({ ...form, seri_id: e.target.value })}><option value="">Seri seç</option>{series.map(s => <option key={s.id} value={s.id}>{s.baslik}</option>)}</select></label>}
      <label><input type="checkbox" checked={form.aktif} onChange={e => setForm({ ...form, aktif: e.target.checked })} /> Yeni kazanımlara açık</label>
      <div style={{ display: 'flex', gap: 12 }}><button disabled={busy} style={BP}>Kaydet</button><button type="button" style={BS} onClick={() => setForm(null)}>Vazgeç</button></div>
    </form></Surface>}
    <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>{titles.filter(t => t.kazanma_tipi !== 'legacy').map(t => <Surface key={t.id}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div><strong>{t.isim}</strong><div style={{ color: TEXT_SUBTLE, marginTop: 6 }}>{t.kazanma_tipi === 'level' ? `Seviye ${t.gereken_seviye}` : series.find(s => s.id === t.seri_id)?.baslik} · {t.aktif ? 'Aktif' : 'Pasif'}</div></div>
        <button style={BS} onClick={() => setForm({ ...t, seri_id: t.seri_id || '' })}>Düzenle</button>
      </div>
    </Surface>)}</div>
    {titles.some(t => t.kazanma_tipi === 'legacy') && <details style={{ marginTop: 24 }}><summary>Önceki Ünvanlar</summary>
      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>{titles.filter(t => t.kazanma_tipi === 'legacy').map(t => <Surface key={t.id}><strong>{t.isim}</strong><div style={{ color: TEXT_SUBTLE }}>Mevcut kazanımlar korunuyor; yeni kazanım kapalı.</div></Surface>)}</div>
    </details>}
  </div>
}
