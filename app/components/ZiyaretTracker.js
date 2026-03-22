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

export default function ZiyaretTracker() {
  const pathname = usePathname()
  useEffect(() => {
    const track = async () => {
      try {
        const oturum_id = getOturumId()
        const { data: { session } } = await supabase.auth.getSession()
        await supabase.from('ziyaretler').insert({
          sayfa: pathname,
          oturum_id,
          kullanici_id: session?.user?.id || null
        })
      } catch {}
    }
    track()
  }, [pathname])
  return null
}
