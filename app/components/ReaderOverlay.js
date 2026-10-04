'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import { ChevronLeft, ChevronRight, Maximize2, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react'
import { browserReaderStorage, loadReaderState, saveReaderState } from '../lib/readerPreferences'
import ReaderBook from './ReaderBook'
import './ReaderOverlay.css'

const zoomKeys = keys => keys.includes('Control') || keys.includes('Meta')

export default function ReaderOverlay({ pages, title, initialPage = 1, initialMode = 'scroll', onClose, embedded = false, chapterKey, nextChapter, onPosition }) {
  const [expanded, setExpanded] = useState(!embedded)
  const [ready, setReady] = useState(false)
  const [mode, setMode] = useState(initialMode)
  const [page, setPage] = useState(initialPage)
  const [scrollStart, setScrollStart] = useState({ page: initialPage, offset: 0, revision: 0 })
  const [scale, setScale] = useState(1)
  const [spreadPreference, setSpreadPreference] = useState('auto')
  const [pageAspect, setPageAspect] = useState(0.65)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [screen, setScreen] = useState(null)
  const [atEnd, setAtEnd] = useState(false)
  const [jumpOpen, setJumpOpen] = useState(false)
  const [jumpValue, setJumpValue] = useState('')
  const rootRef = useRef(null)
  const viewportRef = useRef(null)
  const transformRef = useRef(null)
  const imageRefs = useRef([])
  const positionedRef = useRef(false)
  const bookRef = useRef(null)
  const actionsRef = useRef(null)
  const positionRef = useRef({ page: initialPage, mode: initialMode, spread: 'auto', offset: 0 })
  const tapRef = useRef(null)
  const preloadedRef = useRef(new Set())
  const sizeRef = useRef({ width: 0, height: 0 })
  const progressTimerRef = useRef(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = loadReaderState(browserReaderStorage(), chapterKey, pages.length, initialPage, initialMode)
      setPage(saved.page)
      setMode(saved.mode)
      setSpreadPreference(saved.spread)
      setScrollStart({ page: saved.page, offset: saved.offset, revision: 0 })
      positionRef.current = saved
      setReady(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [chapterKey, pages.length, initialPage, initialMode])

  useEffect(() => {
    const image = new Image()
    image.onload = () => { if (image.naturalHeight) setPageAspect(image.naturalWidth / image.naturalHeight) }
    image.src = pages[0]
    return () => { image.onload = null }
  }, [pages])

  const spread = spreadPreference === 'double' || (spreadPreference === 'auto' && (size.width >= 980 || size.width > size.height))
  const spreadStart = !spread || page === 1 ? page : page % 2 === 0 ? page : page - 1
  const lastVisible = mode === 'flip' && spread && page !== 1 ? Math.min(pages.length, spreadStart + 1) : page
  const bookPageWidth = Math.max(1, Math.floor(Math.min(size.width / (spread ? 2 : 1), size.height * pageAspect)))
  const bookPageHeight = Math.max(1, Math.floor(bookPageWidth / pageAspect))
  const width = mode === 'flip' ? bookPageWidth * (spread ? 2 : 1) : Math.max(1, Math.min(size.width, 980))

  useEffect(() => {
    if (!ready) return
    positionRef.current = { ...positionRef.current, page, mode, spread: spreadPreference }
    onPosition?.({ page: mode === 'flip' ? spreadStart : page, lastVisible, mode })
    const timer = window.setTimeout(() => saveReaderState(browserReaderStorage(), chapterKey, positionRef.current), 300)
    return () => window.clearTimeout(timer)
  }, [ready, page, mode, spreadPreference, chapterKey, onPosition, spreadStart, lastVisible])

  useEffect(() => {
    if (!ready) return
    const save = () => saveReaderState(browserReaderStorage(), chapterKey, positionRef.current)
    window.addEventListener('pagehide', save)
    document.addEventListener('visibilitychange', save)
    return () => {
      clearTimeout(progressTimerRef.current)
      save()
      window.removeEventListener('pagehide', save)
      document.removeEventListener('visibilitychange', save)
    }
  }, [chapterKey, ready])

  useEffect(() => {
    if (!ready || mode !== 'flip') return
    pages.slice(Math.max(0, page - 2), Math.min(pages.length, page + 4)).forEach(src => {
      if (preloadedRef.current.has(src)) return
      preloadedRef.current.add(src)
      const image = new Image()
      image.decoding = 'async'
      image.src = src
    })
  }, [ready, page, mode, pages])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const resize = new ResizeObserver(([entry]) => {
      const next = { width: entry.contentRect.width, height: entry.contentRect.height }
      if (Math.abs(sizeRef.current.width - next.width) < 1 && Math.abs(sizeRef.current.height - next.height) < 1) return
      sizeRef.current = next
      if (positionRef.current.mode === 'scroll') {
        positionedRef.current = false
        setScrollStart(current => ({ page: positionRef.current.page, offset: positionRef.current.offset, revision: current.revision + 1 }))
      }
      setScale(1)
      setSize(next)
    })
    resize.observe(viewport)
    return () => resize.disconnect()
  }, [expanded])

  useEffect(() => {
    if (!expanded) return
    const previous = document.activeElement
    const body = document.body
    const root = document.documentElement
    const old = { overflow: body.style.overflow, position: body.style.position, top: body.style.top, width: body.style.width, rootOverflow: root.style.overflow }
    const scrollY = window.scrollY
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    root.style.overflow = 'hidden'
    const visual = window.visualViewport
    const measure = () => setScreen({ width: visual?.width ?? window.innerWidth, height: visual?.height ?? window.innerHeight, left: visual?.offsetLeft ?? 0, top: visual?.offsetTop ?? 0 })
    measure()
    window.addEventListener('resize', measure)
    visual?.addEventListener('resize', measure)
    visual?.addEventListener('scroll', measure)
    const background = [...body.children].filter(node => node !== rootRef.current)
    const inertStates = background.map(node => node.inert)
    background.forEach(node => { node.inert = true })
    rootRef.current?.querySelector('.isolated-reader-close')?.focus({ preventScroll: true })
    return () => {
      Object.assign(body.style, { overflow: old.overflow, position: old.position, top: old.top, width: old.width })
      root.style.overflow = old.rootOverflow
      window.scrollTo({ top: scrollY, behavior: 'instant' })
      window.removeEventListener('resize', measure)
      visual?.removeEventListener('resize', measure)
      visual?.removeEventListener('scroll', measure)
      background.forEach((node, index) => { node.inert = inertStates[index] })
      previous?.focus?.({ preventScroll: true })
    }
  }, [expanded])

  useEffect(() => {
    const keyboard = event => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable || event.ctrlKey || event.metaKey || event.altKey) return
      const root = rootRef.current
      if (!root) return
      if (!expanded) {
        const rect = root.getBoundingClientRect()
        if (rect.bottom < 100 || rect.top > window.innerHeight * 0.8 || (event.target !== document.body && !root.contains(event.target))) return
      }
      if (event.key === 'Escape' && expanded) { event.preventDefault(); actionsRef.current?.exit(); return }
      if (positionRef.current.mode === 'flip' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault()
        actionsRef.current?.turn(event.key === 'ArrowRight' ? 1 : -1)
      }
      if (expanded && event.key === 'Tab') {
        const focusable = [...root.querySelectorAll('button:not(:disabled), input, a[href]')]
        const first = focusable[0]
        const last = focusable.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', keyboard)
    return () => document.removeEventListener('keydown', keyboard)
  }, [expanded])

  useEffect(() => {
    const viewport = viewportRef.current
    const wheel = event => {
      if (event.ctrlKey || event.metaKey) return
      const ref = transformRef.current
      if (!ref) return
      const currentMode = positionRef.current.mode
      if (currentMode !== 'scroll' && ref.state.scale <= 1.01) return
      const rect = viewport.getBoundingClientRect()
      const content = ref.instance.contentComponent
      const delta = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1
      const minimumY = Math.min(0, rect.height - content.offsetHeight * ref.state.scale)
      const y = Math.max(minimumY, Math.min(0, ref.state.positionY - event.deltaY * delta))
      if (!expanded && ref.state.scale <= 1.01 && Math.abs(y - ref.state.positionY) < 0.1) return
      event.preventDefault()
      const x = currentMode === 'scroll' && ref.state.scale <= 1.01 ? Math.max(0, (rect.width - content.offsetWidth) / 2) : ref.state.positionX - event.deltaX * delta
      ref.setTransform(x, y, ref.state.scale, 0)
    }
    viewport.addEventListener('wheel', wheel, { passive: false })
    return () => viewport.removeEventListener('wheel', wheel)
  }, [expanded])

  function updatePage(ref) {
    setScale(ref.state.scale)
    if (mode !== 'scroll') return
    const top = viewportRef.current.getBoundingClientRect().top + 1
    const index = imageRefs.current.findIndex(image => image && image.getBoundingClientRect().bottom > top)
    if (index < 0) return
    const rect = imageRefs.current[index].getBoundingClientRect()
    const offset = Math.max(0, Math.min(1, (top - rect.top) / rect.height))
    positionRef.current = { ...positionRef.current, page: index + 1, offset }
    clearTimeout(progressTimerRef.current)
    progressTimerRef.current = window.setTimeout(() => saveReaderState(browserReaderStorage(), chapterKey, positionRef.current), 300)
    setPage(index + 1)
    setAtEnd(ref.state.positionY + ref.instance.contentComponent.offsetHeight * ref.state.scale <= size.height + 2)
    if (ref.state.scale <= 1.01) {
      const centerX = Math.max(0, (size.width - width) / 2)
      if (Math.abs(ref.state.positionX - centerX) > 0.5) ref.setTransform(centerX, ref.state.positionY, ref.state.scale, 0)
    }
  }

  function positionInitialPage() {
    if (mode !== 'scroll' || positionedRef.current) return
    const previous = imageRefs.current.slice(0, scrollStart.page)
    if (previous.length < scrollStart.page || previous.some(image => !image?.complete)) return
    const target = imageRefs.current[scrollStart.page - 1]
    const ref = transformRef.current
    if (!target || !ref) return
    positionedRef.current = true
    const minY = Math.min(0, size.height - ref.instance.contentComponent.offsetHeight)
    ref.setTransform(Math.max(0, (size.width - width) / 2), Math.max(minY, -target.offsetTop - target.offsetHeight * scrollStart.offset), 1, 0)
  }

  function changeMode(next) {
    if (next === mode) return
    positionedRef.current = false
    setScrollStart(current => ({ page, offset: 0, revision: current.revision + 1 }))
    positionRef.current = { ...positionRef.current, mode: next, offset: 0 }
    setScale(1)
    setMode(next)
  }

  function turn(delta) {
    if ((delta < 0 && page <= 1) || (delta > 0 && lastVisible >= pages.length)) return
    transformRef.current?.resetTransform(0)
    setScale(1)
    bookRef.current?.turn(delta)
  }

  function resetZoom() {
    const ref = transformRef.current
    if (!ref) return
    if (mode === 'flip') { ref.resetTransform(); return }
    const midpoint = size.height / 2
    const contentY = (midpoint - ref.state.positionY) / ref.state.scale
    const minY = Math.min(0, size.height - ref.instance.contentComponent.offsetHeight)
    ref.setTransform(Math.max(0, (size.width - width) / 2), Math.max(minY, Math.min(0, midpoint - contentY)), 1, 180)
  }

  function setFullscreen(next) {
    positionedRef.current = false
    setScrollStart(current => ({ page: positionRef.current.page, offset: positionRef.current.offset, revision: current.revision + 1 }))
    setScale(1)
    setJumpOpen(false)
    setExpanded(next)
    if (!next) requestAnimationFrame(() => rootRef.current?.querySelector('[aria-label="Tam ekran"]')?.focus({ preventScroll: true }))
  }

  function exit() {
    saveReaderState(browserReaderStorage(), chapterKey, positionRef.current)
    if (embedded) setFullscreen(false)
    else onClose?.({ page, mode })
  }

  function jump(event) {
    event.preventDefault()
    const target = Number(jumpValue)
    if (!Number.isInteger(target) || target < 1 || target > pages.length) return
    setScale(1)
    positionRef.current = { ...positionRef.current, page: target, offset: 0 }
    if (mode === 'flip') { transformRef.current?.resetTransform(0); bookRef.current?.goTo(target) }
    else {
      positionedRef.current = false
      setScrollStart(current => ({ page: target, offset: 0, revision: current.revision + 1 }))
    }
    setPage(target)
    setJumpOpen(false)
  }

  useEffect(() => { actionsRef.current = { turn, exit } })

  const content = <div ref={rootRef} className={`isolated-reader ${expanded ? '' : 'is-embedded'}`}
    style={expanded && screen ? { ...screen, right: 'auto', bottom: 'auto' } : undefined}
    role={expanded ? 'dialog' : 'region'} aria-modal={expanded ? true : undefined} aria-label={`${title} okuma ekranı`}>
    <header className="isolated-reader-toolbar">
      <div className="isolated-reader-modes" aria-label="Okuma modu">
        <button type="button" aria-pressed={mode === 'scroll'} onClick={() => changeMode('scroll')}>Dikey Oku</button>
        <button type="button" aria-pressed={mode === 'flip'} onClick={() => changeMode('flip')}>Sayfa Çevir</button>
      </div>
      {mode === 'flip' && <div className="isolated-reader-modes" aria-label="Sayfa düzeni">
        {[['single', 'Tek Sayfa'], ['double', 'Çift Sayfa'], ['auto', 'Otomatik']].map(([value, label]) => <button key={value} type="button" aria-pressed={spreadPreference === value} onClick={() => { setSpreadPreference(value); setScale(1); transformRef.current?.resetTransform(0) }}>{label}</button>)}
      </div>}
      <div className="isolated-reader-tools">
        <button type="button" aria-label="Uzaklaştır" title="Uzaklaştır · Ctrl / ⌘ + tekerlek" disabled={scale <= 1.01} onClick={() => transformRef.current?.zoomOut()}><ZoomOut size={19} /></button>
        <output aria-label="Yakınlaştırma oranı">%{Math.round(scale * 100)}</output>
        <button type="button" aria-label="Yakınlaştır" title="Yakınlaştır · Ctrl / ⌘ + tekerlek" disabled={scale >= 3.99} onClick={() => transformRef.current?.zoomIn()}><ZoomIn size={19} /></button>
        <button type="button" aria-label="Sıfırla" title="Sıfırla" onClick={resetZoom}><RotateCcw size={17} /><span>Sıfırla</span></button>
        {expanded ? <button type="button" className="isolated-reader-close" onClick={exit} aria-label="Okuma ekranından çık"><X size={19} /><span>Çık</span></button>
          : <button type="button" className="reader-flip-fullscreen" onClick={() => setFullscreen(true)} aria-label="Tam ekran" title="Tam Ekran"><Maximize2 size={19} /><span>Tam Ekran</span></button>}
      </div>
    </header>
    <div className="isolated-reader-viewport" ref={viewportRef} tabIndex={0} aria-label="Çizgi roman sayfaları"
      onKeyDown={event => { if (!expanded && event.target === event.currentTarget && event.key === 'Enter') setFullscreen(true) }}
      onPointerDownCapture={event => { tapRef.current = tapRef.current ? null : { id: event.pointerId, x: event.clientX, y: event.clientY, pageTarget: !!event.target.closest('.reader-book, .isolated-reader-pages') } }}
      onPointerCancel={() => { tapRef.current = null }}
      onPointerUpCapture={event => {
        const start = tapRef.current
        tapRef.current = null
        if (!expanded && start?.id === event.pointerId && start.pageTarget && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8) setFullscreen(true)
      }}>
      {ready && size.width > 0 && <TransformWrapper
        key={mode === 'flip' ? `flip-${spread}-${width}-${bookPageHeight}` : `scroll-${scrollStart.revision}-${width}-${size.height}`}
        ref={transformRef} minScale={1} maxScale={4}
        centerOnInit={mode === 'flip'} centerZoomedOut={mode === 'flip'}
        wheel={{ activationKeys: zoomKeys, step: 0.003 }} trackPadPanning={{ disabled: true }}
        panning={{ velocityDisabled: true, lockAxisX: mode === 'scroll' && scale <= 1.01, disabled: mode === 'flip' && scale <= 1.01 }}
        doubleClick={{ mode: 'toggle', step: 1 }}
        onInit={() => requestAnimationFrame(positionInitialPage)} onTransform={updatePage}>
        <TransformComponent wrapperStyle={{ width: '100%', height: '100%', touchAction: 'none' }} contentStyle={{ width, display: 'block' }}>
          {mode === 'flip' ? <ReaderBook pages={pages} title={title} page={page} pageWidth={bookPageWidth} pageHeight={bookPageHeight} spread={spread} zoomed={scale > 1.01} onPage={setPage} bookRef={bookRef} />
            : <div className="isolated-reader-pages scroll">
              {pages.map((src, index) => <img key={`${src}-${index}`} ref={node => { imageRefs.current[index] = node }} src={src} alt={`${title} sayfa ${index + 1}`}
                draggable={false} loading={index <= scrollStart.page + 1 ? 'eager' : 'lazy'} decoding="async"
                style={{ aspectRatio: pageAspect, objectFit: 'contain' }} onLoad={positionInitialPage} onError={positionInitialPage} />)}
            </div>}
        </TransformComponent>
      </TransformWrapper>}
    </div>
    <footer className="isolated-reader-footer">
      {mode === 'flip' && <button type="button" onClick={() => turn(-1)} disabled={page === 1} aria-label="Önceki sayfa"><ChevronLeft size={22} /><span>Önceki</span></button>}
      <div className="reader-page-picker">
        <button type="button" onClick={() => { setJumpValue(String(page)); setJumpOpen(!jumpOpen) }} aria-label="Sayfaya git" aria-expanded={jumpOpen}>Sayfa {mode === 'flip' && lastVisible > spreadStart ? `${spreadStart}–${lastVisible}` : page} / {pages.length}</button>
        {jumpOpen && <form className="reader-page-form" onSubmit={jump} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setJumpOpen(false) } }}>
          <input autoFocus type="number" min="1" max={pages.length} step="1" value={jumpValue} onChange={event => setJumpValue(event.target.value)} aria-label="Sayfa numarası" required />
          <button type="submit" aria-label="Seçilen sayfaya git"><ChevronRight size={20} /></button>
          <button type="button" onClick={() => setJumpOpen(false)} aria-label="Sayfa seçimini kapat"><X size={18} /></button>
        </form>}
      </div>
      {(mode === 'flip' ? lastVisible === pages.length : atEnd) && nextChapter ? <Link className="reader-next-chapter" href={nextChapter.href} onClick={() => saveReaderState(browserReaderStorage(), chapterKey, positionRef.current)}>Sonraki Bölüm <ChevronRight size={20} /></Link>
        : mode === 'flip' && <button type="button" onClick={() => turn(1)} disabled={lastVisible === pages.length} aria-label="Sonraki sayfa"><span>Sonraki</span><ChevronRight size={22} /></button>}
    </footer>
  </div>
  return expanded ? createPortal(content, document.body) : content
}
