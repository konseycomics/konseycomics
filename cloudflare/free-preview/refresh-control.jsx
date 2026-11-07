'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { supabase } from '../../app/lib/supabase'

const labels = { current: 'Güncel', pending: 'Yenileme bekliyor', starting: 'Başlatılıyor', queued: 'Yenileniyor', waiting: 'Derleme bekleniyor', daily_limit: 'Günlük yenileme sınırı', failed: 'Yenileme başarısız' }

export default function PreviewRefreshControl() {
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pollKey, setPollKey] = useState(0)
  useEffect(() => { setVisible(window.location.hostname === 'konseycomics-free-preview.konseycomics.workers.dev') }, [])
  useEffect(() => {
    if (!visible) return
    let active = true
    let timer
    async function poll() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return
        const response = await fetch('/api/preview/refresh', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const result = await response.json()
        if (!active) return
        if (!response.ok) throw new Error(result.error || 'Yenileme durumu okunamadi.')
        setState(result)
        if (['pending', 'starting', 'queued', 'waiting'].includes(result.status)) timer = setTimeout(poll, 10000)
      } catch (error) { if (active) setError(error.message) }
    }
    poll()
    return () => { active = false; clearTimeout(timer) }
  }, [visible, pollKey])
  async function refresh() {
    setBusy(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Oturum bulunamadi.')
      const response = await fetch('/api/preview/refresh', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: '{}' })
      const result = await response.json()
      if (!response.ok || ['failed', 'not_configured', 'new_code_push_required', 'snapshot_unavailable'].includes(result.state)) throw new Error(result.error || 'Yenileme baslatilamadi; durumunu kontrol etmeliyiz.')
      setState({ status: 'queued' }); setPollKey(key => key + 1)
    } catch (error) { setError(error.message) }
    finally { setBusy(false) }
  }
  if (!visible) return null
  const pending = ['starting', 'queued', 'waiting', 'daily_limit'].includes(state?.status)
  return <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
    <button onClick={refresh} disabled={busy || pending} title="Deneme sayfalarını yenile" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#fff', color: '#111', border: '1px solid #fff', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', fontWeight: 600, cursor: busy || pending ? 'default' : 'pointer', opacity: busy || pending ? 0.6 : 1 }}>
      <RefreshCw size={16} aria-hidden="true" /> Sayfaları yenile
    </button>
    <span role={error ? 'alert' : 'status'} style={{ fontSize: '12px', color: error ? '#fca5a5' : '#aaa', overflowWrap: 'anywhere' }}>{error || labels[state?.status] || 'Durum kontrol ediliyor'}</span>
  </div>
}
