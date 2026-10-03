'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import { ChevronLeft, ChevronRight, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react'
import './ReaderOverlay.css'

export default function ReaderOverlay({ pages, title, initialPage, initialMode, onClose }) {
  const [mode, setMode] = useState(initialMode)
  const [page, setPage] = useState(initialPage)
  const [scrollStart, setScrollStart] = useState(initialPage)
  const [scale, setScale] = useState(1)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const viewportRef = useRef(null)
  const transformRef = useRef(null)
  const imageRefs = useRef([])
  const positionedRef = useRef(false)
  const closeRef = useRef(onClose)
  const positionRef = useRef({ page, mode })
  useEffect(() => {
    closeRef.current = onClose
    positionRef.current = { page, mode }
  }, [onClose, page, mode])

  useEffect(() => {
    const previous = document.activeElement
    const bodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const background = [...document.body.children].filter(node => !node.classList.contains('isolated-reader'))
    const inertStates = background.map(node => node.inert)
    background.forEach(node => { node.inert = true })
    const exit = event => {
      if (event.key === 'Escape') closeRef.current(positionRef.current)
      if (positionRef.current.mode === 'flip' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault()
        setScale(1)
        setPage(current => Math.max(1, Math.min(pages.length, current + (event.key === 'ArrowRight' ? 1 : -1))))
      }
    }
    document.addEventListener('keydown', exit)
    const viewport = viewportRef.current
    const resize = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    resize.observe(viewport)
    document.querySelector('.isolated-reader-close')?.focus()
    return () => {
      resize.disconnect()
      document.body.style.overflow = bodyOverflow
      background.forEach((node, index) => { node.inert = inertStates[index] })
      document.removeEventListener('keydown', exit)
      previous?.focus?.({ preventScroll: true })
    }
  }, [pages.length])

  function updatePage(ref) {
    setScale(ref.state.scale)
    if (mode !== 'scroll') return
    const midpoint = viewportRef.current.getBoundingClientRect().top + size.height / 2
    let nearest = 0
    let distance = Infinity
    imageRefs.current.forEach((image, index) => {
      if (!image) return
      const rect = image.getBoundingClientRect()
      const candidate = midpoint < rect.top ? rect.top - midpoint : midpoint > rect.bottom ? midpoint - rect.bottom : 0
      if (candidate < distance) { nearest = index; distance = candidate }
    })
    setPage(nearest + 1)
  }

  function positionInitialPage() {
    if (mode !== 'scroll' || positionedRef.current) return
    const previousImages = imageRefs.current.slice(0, scrollStart)
    if (previousImages.length < scrollStart || previousImages.some(image => !image?.complete)) return
    const target = imageRefs.current[scrollStart - 1]
    if (!target || !transformRef.current) return
    positionedRef.current = true
    transformRef.current.setTransform(0, -target.offsetTop, 1, 0)
  }

  function changeMode(next) {
    if (next === mode) return
    positionedRef.current = false
    setScrollStart(page)
    setScale(1)
    setMode(next)
  }

  function turn(delta) {
    setScale(1)
    setPage(current => Math.max(1, Math.min(pages.length, current + delta)))
  }

  const width = Math.max(1, Math.min(size.width, 980))
  return createPortal(
    <div className="isolated-reader" role="dialog" aria-modal="true" aria-label={`${title} okuma ekranı`}>
      <header className="isolated-reader-toolbar">
        <div className="isolated-reader-modes" aria-label="Okuma modu">
          <button type="button" aria-pressed={mode === 'scroll'} onClick={() => changeMode('scroll')}>Dikey Oku</button>
          <button type="button" aria-pressed={mode === 'flip'} onClick={() => changeMode('flip')}>Sayfa Çevir</button>
        </div>
        <div className="isolated-reader-tools">
          <button type="button" aria-label="Uzaklaştır" title="Uzaklaştır" disabled={scale <= 1.01} onClick={() => transformRef.current?.zoomOut()}><ZoomOut size={19} /></button>
          <output aria-label="Yakınlaştırma oranı">%{Math.round(scale * 100)}</output>
          <button type="button" aria-label="Yakınlaştır" title="Yakınlaştır" disabled={scale >= 3.99} onClick={() => transformRef.current?.zoomIn()}><ZoomIn size={19} /></button>
          <button type="button" aria-label="Yakınlaştırmayı sıfırla" title="Yakınlaştırmayı sıfırla" onClick={() => transformRef.current?.resetTransform()}><RotateCcw size={17} /></button>
          <button type="button" className="isolated-reader-close" onClick={() => onClose({ page, mode })} aria-label="Okuma ekranından çık"><X size={19} /><span>Çık</span></button>
        </div>
      </header>
      <div className="isolated-reader-viewport" ref={viewportRef}>
        {size.width > 0 && <TransformWrapper
          key={mode === 'flip' ? `flip-${page}` : `scroll-${scrollStart}`}
          ref={transformRef}
          minScale={1}
          maxScale={4}
          centerOnInit={mode === 'flip'}
          centerZoomedOut={mode === 'flip'}
          wheel={{ disabled: mode === 'scroll' }}
          panning={{ velocityDisabled: true }}
          doubleClick={{ mode: 'toggle', step: 1 }}
          onInit={() => requestAnimationFrame(positionInitialPage)}
          onTransform={updatePage}
        >
          <TransformComponent wrapperStyle={{ width: '100%', height: '100%', touchAction: 'none' }} contentStyle={{ width, display: 'block' }}>
            <div className={`isolated-reader-pages ${mode}`} onWheel={event => {
              if (mode !== 'scroll' || !transformRef.current) return
              const ref = transformRef.current
              const content = ref.instance.contentComponent
              const minimumY = Math.min(0, size.height - content.offsetHeight * ref.state.scale)
              ref.setTransform(ref.state.positionX, Math.max(minimumY, Math.min(0, ref.state.positionY - event.deltaY)), ref.state.scale, 0)
            }}>
              {(mode === 'flip' ? [pages[page - 1]] : pages).map((src, index) => <img
                key={`${src}-${index}`}
                ref={node => { if (mode === 'scroll') imageRefs.current[index] = node }}
                src={src}
                alt={`${title} sayfa ${mode === 'flip' ? page : index + 1}`}
                draggable={false}
                onLoad={positionInitialPage}
                onError={positionInitialPage}
                style={mode === 'flip' ? { maxHeight: size.height, objectFit: 'contain' } : undefined}
              />)}
            </div>
          </TransformComponent>
        </TransformWrapper>}
      </div>
      <footer className="isolated-reader-footer">
        {mode === 'flip' && <button type="button" onClick={() => turn(-1)} disabled={page === 1} aria-label="Önceki sayfa"><ChevronLeft size={22} /><span>Önceki</span></button>}
        <span>Sayfa {page} / {pages.length}</span>
        {mode === 'flip' && <button type="button" onClick={() => turn(1)} disabled={page === pages.length} aria-label="Sonraki sayfa"><span>Sonraki</span><ChevronRight size={22} /></button>}
      </footer>
    </div>, document.body
  )
}
