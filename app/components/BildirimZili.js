'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getPublicProfilesByIds } from '../lib/publicProfiles'
import Link from 'next/link'

export default function BildirimZili({ kullaniciId }) {
  const [bildirimler, setBildirimler] = useState([])
  const [acik, setAcik] = useState(false)
  const [okunmamis, setOkunmamis] = useState(0)
  const ref = useRef()

  const fetchBildirimler = useCallback(async () => {
    const { data } = await supabase
      .from('bildirimler')
      .select('*')
      .eq('alici_id', kullaniciId)
      .order('created_at', { ascending: false })
      .limit(20)
    const profilMap = await getPublicProfilesByIds((data || []).map(bildirim => bildirim.gonderen_id))
    const zenginlestirilmis = (data || []).map(bildirim => ({
      ...bildirim,
      gonderen: profilMap[bildirim.gonderen_id] || null,
    }))
    setBildirimler(zenginlestirilmis)
    setOkunmamis(zenginlestirilmis.filter(b => !b.okundu).length)
  }, [kullaniciId])

  useEffect(() => {
    if (!kullaniciId) return
    async function yukle() {
      await fetchBildirimler()
    }
    yukle()

    // Dışarı tıklanınca kapat
    function kapat(e) { if (ref.current && !ref.current.contains(e.target)) setAcik(false) }
    document.addEventListener('mousedown', kapat)
    return () => document.removeEventListener('mousedown', kapat)
  }, [fetchBildirimler, kullaniciId])

  async function handleAc() {
    setAcik(!acik)
    if (!acik && okunmamis > 0) {
      await supabase.rpc('bildirimleri_okundu_yap', { kullanici: kullaniciId })
      setBildirimler(b => b.map(x => ({ ...x, okundu: true })))
      setOkunmamis(0)
    }
  }

  const BildirimIkonu = ({ tip }) => {
    const ikonlar = {
      yeni_bolum: '📖', yeni_takipci: '👤', yorum_begeni: '❤️',
      yorum_cevap: '💬', rozet_kazanildi: '🏆', seviye_atlandi: '⬆️', yorum_mention: '📢'
    }
    return <span style={{ fontSize: '16px' }}>{ikonlar[tip] || '🔔'}</span>
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={handleAc} style={{ position: 'relative', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center' }}>
        🔔
        {okunmamis > 0 && (
          <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '18px', height: '18px', background: '#ef4444', borderRadius: '50%', fontSize: '10px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {okunmamis > 9 ? '9+' : okunmamis}
          </span>
        )}
      </button>

      {acik && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: '320px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', zIndex: 200, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: '14px', fontWeight: 600 }}>Bildirimler</div>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {bildirimler.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>Henüz bildirim yok.</div>
            ) : bildirimler.map(b => (
              <div key={b.id} style={{ display: 'flex', gap: '10px', padding: '12px 16px', background: b.okundu ? 'transparent' : 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                {b.gonderen?.avatar_url ? (
                  <img src={b.gonderen.avatar_url} alt={b.gonderen.kullanici_adi || 'Gonderen avatar'} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#111', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BildirimIkonu tip={b.tip} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '2px' }}>{b.baslik}</div>
                  {b.mesaj && <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.mesaj}</div>}
                  <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>
                    {new Date(b.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {!b.okundu && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0, marginTop: '4px' }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
