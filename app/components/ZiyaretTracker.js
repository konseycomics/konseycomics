'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { getOturumId, getZiyaretciId } from '../lib/visitorTracking'

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
