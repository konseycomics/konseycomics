'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const Comments = dynamic(() => import('./YorumSistemi'), {
  loading: () => <div role="status">Yorumlar yükleniyor...</div>,
})

export default function ReaderComments(props) {
  const host = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true)
        observer.disconnect()
      }
    }, { rootMargin: '600px' })
    observer.observe(host.current)
    return () => observer.disconnect()
  }, [])

  return <div ref={host} style={{ minHeight: 180 }}>{visible ? <Comments {...props} /> : null}</div>
}
