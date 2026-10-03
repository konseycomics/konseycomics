'use client'

import { useEffect, useImperativeHandle, useRef } from 'react'
import { PageFlip } from 'page-flip'

export default function ReaderBook({ pages, title, page, pageWidth, pageHeight, spread, zoomed, onPage, bookRef }) {
  const hostRef = useRef(null)
  const engineRef = useRef(null)
  const currentPageRef = useRef(page)
  const callbackRef = useRef(onPage)
  useEffect(() => { callbackRef.current = onPage; currentPageRef.current = page })

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    const ui = engine.getUI()
    // Detach only the book gestures when zoomed; the surrounding zoom canvas still receives them.
    ui.removeHandlers()
    ui.touchPoint = null
    if (!zoomed) ui.setHandlers()
  }, [zoomed, pageWidth, pageHeight, spread])

  useImperativeHandle(bookRef, () => ({
    turn(delta) {
      const engine = engineRef.current
      if (!engine || engine.getState() !== 'read') return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (delta > 0) engine.turnToNextPage()
        else engine.turnToPrevPage()
      } else if (delta > 0) engine.flipNext('bottom')
      else engine.flipPrev('bottom')
    }
  }), [])

  useEffect(() => {
    const host = hostRef.current
    // The engine owns this subtree; React never reconciles its folded page nodes.
    const root = document.createElement('div')
    host.append(root)
    const nodes = pages.map((src, index) => {
      const sheet = document.createElement('div')
      sheet.className = 'reader-book-sheet'
      const image = document.createElement('img')
      image.src = src
      image.alt = `${title} sayfa ${index + 1}`
      image.draggable = false
      sheet.append(image)
      root.append(sheet)
      return sheet
    })
    const engine = new PageFlip(root, {
      width: pageWidth, height: pageHeight, size: 'fixed',
      usePortrait: !spread, showCover: spread, autoSize: false,
      startPage: currentPageRef.current - 1, flippingTime: 850,
      drawShadow: true, maxShadowOpacity: 0.32,
      mobileScrollSupport: false, useMouseEvents: true,
      showPageCorners: false, disableFlipByClick: true, swipeDistance: 45
    })
    // In portrait mode the library's previous-page point is not a visible corner.
    // Keep tap-to-flip disabled, but exempt explicit button and swipe navigation.
    for (const method of ['flipPrev', 'flipNext']) {
      const navigate = engine[method].bind(engine)
      engine[method] = corner => {
        const settings = engine.getSettings()
        const previous = settings.disableFlipByClick
        settings.disableFlipByClick = false
        try { navigate(corner) }
        finally { settings.disableFlipByClick = previous }
      }
    }
    engine.on('flip', event => callbackRef.current(event.data + 1))
    engineRef.current = engine
    engine.loadFromHTML(nodes)
    return () => {
      engineRef.current = null
      engine.destroy()
      host.replaceChildren()
    }
  }, [pages, title, pageWidth, pageHeight, spread])

  return <div ref={hostRef} className={`reader-book ${spread ? 'double' : 'single'}`}
    style={{ width: pageWidth * (spread ? 2 : 1), height: pageHeight }}
    onTouchStartCapture={event => {
      if (event.touches.length > 1 && engineRef.current) engineRef.current.getUI().touchPoint = null
    }}
  />
}
