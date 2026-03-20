'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function TakipButonu({ hedefId, hedefKullaniciAdi }) {
  const [takipEdiyor, setTakipEdiyor] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [benimId, setBenimId] = useState(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      setBenimId(session.user.id)
      supabase.from('takipler')
        .select('id').eq('takip_eden', session.user.id).eq('takip_edilen', hedefId).single()
        .then(({ data }) => setTakipEdiyor(!!data))
    })
  }, [hedefId])

  async function toggle() {
    if (!benimId) { router.push('/giris'); return }
    setYukleniyor(true)
    if (takipEdiyor) {
      await supabase.from('takipler').delete().eq('takip_eden', benimId).eq('takip_edilen', hedefId)
      setTakipEdiyor(false)
    } else {
      await supabase.from('takipler').insert([{ takip_eden: benimId, takip_edilen: hedefId }])
      setTakipEdiyor(true)
    }
    setYukleniyor(false)
  }

  if (benimId === hedefId) return null

  return (
    <button onClick={toggle} disabled={yukleniyor} style={{
      padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
      cursor: yukleniyor ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
      background: takipEdiyor ? 'var(--bg)' : '#111',
      color: takipEdiyor ? 'var(--text)' : '#fff',
      border: takipEdiyor ? '1px solid var(--border)' : 'none',
      transition: 'all 0.15s',
    }}>
      {yukleniyor ? '...' : takipEdiyor ? 'Takibi Bırak' : 'Takip Et'}
    </button>
  )
}