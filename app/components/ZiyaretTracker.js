'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'

function getOturumId() {
  try {
    let id = sessionStorage.getItem('oturum_id')
    if (!id) {
      id = Math.random().toString(36).substr(2, 9)
      sessionStorage.setItem('oturum_id', id)
    }
    return id
  } catch { return 'unknown' }
}

function getZiyaretciId() {
  try {
    let id = localStorage.getItem('ziyaretci_id')
    if (!id) {
      id = `v_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
      localStorage.setItem('ziyaretci_id', id)
    }
    return id
  } catch { return 'unknown' }
}

export default function ZiyaretTracker() {
  const pathname = usePathname()
  useEffect(() => {
    const track = async () => {
      try {
        const oturum_id = getOturumId()
        const ziyaretci_id = getZiyaretciId()
        const { data: { session } } = await supabase.auth.getSession()
        await supabase.from('ziyaretler').insert({
          sayfa: pathname,
          oturum_id,
          ziyaretci_id,
          kullanici_id: session?.user?.id || null,
        })
      } catch {}
    }
    track()
  }, [pathname])
  return null
}
