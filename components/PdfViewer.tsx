'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import { getFile } from '@/lib/idb'
import type { Highlight, HighlightRect } from '@/lib/types'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const MSG: React.CSSProperties = {
  padding: '24px', fontSize: '11px', color: '#555',
  letterSpacing: '0.08em', textTransform: 'uppercase',
}

const FIND_MARK = `style="background:rgba(100,180,255,0.35);border-radius:1px;color:inherit;"`

export default function PdfViewer({
  srcId,
  highlights = [],
  jumpTo,
  onHighlight,
}: {
  srcId: string
  highlights?: Highlight[]
  jumpTo?: { page: number; ts: number } | null
  onHighlight?: (text: string, page: number, rects: HighlightRect[]) => void
}) {
  const [file,    setFile]    = useState<File | null>(null)
  const [nPages,  setNPages]  = useState(0)
  const [missing, setMissing] = useState(false)
  const [pW,      setPW]      = useState(0)
  const [showFind,  setShowFind]  = useState(false)
  const [findTerm,  setFindTerm]  = useState('')
  const [findIdx,   setFindIdx]   = useState(0)
  const [textsReady, setTextsReady] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const containerRef  = useRef<HTMLDivElement>(null)
  const pageRefs      = useRef<(HTMLDivElement | null)[]>([])
  const slotRoRef     = useRef<ResizeObserver | null>(null)
  const findInputRef  = useRef<HTMLInputElement>(null)
  const pageTexts     = useRef<Map<number, string[]>>(new Map())
  const highlightsRef = useRef(highlights)
  useEffect(() => { highlightsRef.current = highlights }, [highlights])

  useEffect(() => {
    setFile(null); setMissing(false); setNPages(0)
    setCurrentPage(1); setFindTerm(''); setShowFind(false)
    setTextsReady(false); pageTexts.current = new Map(); pageRefs.current = []
    getFile(srcId).then(f => f ? setFile(f) : setMissing(true))
  }, [srcId])

  // Extract text for find
  useEffect(() => {
    if (!file) return
    pageTexts.current = new Map(); setTextsReady(false)
    const url = URL.createObjectURL(file)
    let revoked = false
    const revoke = () => { if (!revoked) { revoked = true; URL.revokeObjectURL(url) } }
    const task = (pdfjs as any).getDocument(url)
    task.promise.then(async (pdf: any) => {
      for (let i = 1; i <= pdf.numPages; i++) {
        const pg = await pdf.getPage(i)
        const content = await pg.getTextContent()
        pageTexts.current.set(i, (content.items as any[]).filter(x => x.str?.trim()).map((x: any) => x.str as string))
      }
      setTextsReady(true); revoke()
    }).catch(revoke)
    return () => { task.destroy?.(); revoke() }
  }, [file])

  // Current page via scroll
  useEffect(() => {
    const el = containerRef.current
    if (!el || !nPages) return
    function onScroll() {
      const top = el!.getBoundingClientRect().top
      let closest = 1, minDist = Infinity
      pageRefs.current.forEach((ref, i) => {
        if (!ref) return
        const d = Math.abs(ref.getBoundingClientRect().top - top)
        if (d < minDist) { minDist = d; closest = i + 1 }
      })
      setCurrentPage(closest)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => el.removeEventListener('scroll', onScroll)
  }, [nPages])

  const attachSlot = useCallback((el: HTMLDivElement | null) => {
    if (slotRoRef.current) { slotRoRef.current.disconnect(); slotRoRef.current = null }
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = Math.floor(el.getBoundingClientRect().width)
      if (w > 0) setPW(w)
    })
    ro.observe(el); slotRoRef.current = ro
  }, [])

  useEffect(() => {
    if (!jumpTo) return
    pageRefs.current[jumpTo.page - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [jumpTo])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault(); setShowFind(true)
        setTimeout(() => findInputRef.current?.focus(), 30)
      }
      if (e.key === 'Escape' && showFind) { setShowFind(false); setFindTerm('') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showFind])

  // ─── Find ─────────────────────────────────────────────────────────────────────

  const findResults = useMemo(() => {
    if (!findTerm.trim() || !textsReady) return []
    const term = findTerm.toLowerCase()
    const out: { page: number; spanText: string }[] = []
    Array.from(pageTexts.current.keys()).sort((a, b) => a - b).forEach(page => {
      pageTexts.current.get(page)?.forEach(span => {
        if (span.toLowerCase().includes(term)) out.push({ page, spanText: span })
      })
    })
    return out
  }, [findTerm, textsReady])

  useEffect(() => { setFindIdx(0) }, [findResults])

  useEffect(() => {
    if (!findResults.length) return
    const r = findResults[Math.min(findIdx, findResults.length - 1)]
    if (r) pageRefs.current[r.page - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [findIdx, findResults])

  const findMatchMap = useMemo(() => {
    const map = new Map<number, Set<string>>()
    findResults.forEach(r => {
      if (!map.has(r.page)) map.set(r.page, new Set())
      map.get(r.page)!.add(r.spanText)
    })
    return map
  }, [findResults])

  const customTextRenderer = useCallback(
    ({ str, pageIndex }: { str: string; pageIndex: number }) => {
      if (!findTerm.trim()) return str
      const findSpans = findMatchMap.get(pageIndex + 1)
      if (!findSpans?.has(str)) return str
      const term = findTerm.toLowerCase()
      const lower = str.toLowerCase()
      let result = '', i = 0
      while (i < str.length) {
        const idx = lower.indexOf(term, i)
        if (idx === -1) { result += esc(str.slice(i)); break }
        result += esc(str.slice(i, idx))
        result += `<mark ${FIND_MARK}>${esc(str.slice(idx, idx + term.length))}</mark>`
        i = idx + term.length
      }
      return result
    },
    [findMatchMap, findTerm]
  )

  // ─── Click-to-paragraph ───────────────────────────────────────────────────────
  // Single click on any text detects the whole paragraph (by vertical gap between
  // spans), saves it as a highlight with rect overlays. Click again to remove.

  useEffect(() => {
    const el = containerRef.current
    if (!el || !onHighlight) return

    function handleClick(e: MouseEvent) {
      // Don't capture clicks on the find bar or toolbar buttons
      const target = e.target as HTMLElement
      if (target.closest('button') || target.closest('input')) return

      const caretRange = document.caretRangeFromPoint?.(e.clientX, e.clientY) ?? (() => {
        const pos = (document as any).caretPositionFromPoint?.(e.clientX, e.clientY)
        if (!pos) return null
        const r = document.createRange(); r.setStart(pos.offsetNode, pos.offset); return r
      })()
      if (!caretRange) return

      // Must be inside the text layer
      const inLayer = pageRefs.current.some(ref =>
        ref?.querySelector('.textLayer')?.contains(caretRange.startContainer)
      )
      if (!inLayer) return

      // Find which page
      let pageRef: HTMLDivElement | null = null
      let page = 1
      pageRefs.current.forEach((ref, i) => {
        if (ref?.contains(caretRange.startContainer)) { pageRef = ref; page = i + 1 }
      })
      if (!pageRef) return

      // Get all spans sorted by reading order
      const allSpans = Array.from(
        (pageRef as HTMLDivElement).querySelectorAll('.textLayer span:not(.markedContent)')
      ) as HTMLSpanElement[]
      const sorted = allSpans
        .map(s => ({ el: s, rect: s.getBoundingClientRect() }))
        .filter(s => s.rect.height > 0 && s.el.textContent?.trim())
        .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)

      const clickedIdx = sorted.findIndex(s => s.el.contains(caretRange.startContainer))
      if (clickedIdx === -1) return

      // Paragraph detection: find the minimum top-to-top spacing among nearby
      // spans — that's the within-paragraph line spacing. Break when spacing
      // jumps > 1.5× that minimum. Cap at 10 spans so we never grab a whole page.
      const MAX_SPANS = 10

      const nearbySpacings: number[] = []
      for (let i = Math.max(1, clickedIdx - 8); i <= Math.min(sorted.length - 1, clickedIdx + 8); i++) {
        const d = sorted[i].rect.top - sorted[i - 1].rect.top
        if (d > 2 && d < 150) nearbySpacings.push(d)
      }
      const minSpacing = nearbySpacings.length > 0
        ? Math.min(...nearbySpacings)
        : sorted[clickedIdx].rect.height * 1.5
      const threshold = minSpacing * 1.5

      let startIdx = clickedIdx
      while (startIdx > 0 && clickedIdx - startIdx < MAX_SPANS) {
        if (sorted[startIdx].rect.top - sorted[startIdx - 1].rect.top > threshold) break
        startIdx--
      }
      let endIdx = clickedIdx
      while (endIdx < sorted.length - 1 && endIdx - clickedIdx < MAX_SPANS) {
        if (sorted[endIdx + 1].rect.top - sorted[endIdx].rect.top > threshold) break
        endIdx++
      }

      const pageRect = (pageRef as HTMLDivElement).getBoundingClientRect()
      const para = sorted.slice(startIdx, endIdx + 1)

      const text = para.map(s => s.el.textContent?.trim()).filter(Boolean).join(' ')
      if (!text || text.length < 3) return

      const rects: HighlightRect[] = para.map(s => ({
        x: (s.rect.left - pageRect.left) / pageRect.width,
        y: (s.rect.top  - pageRect.top)  / pageRect.height,
        w: s.rect.width  / pageRect.width,
        h: s.rect.height / pageRect.height,
      }))

      onHighlight?.(text, page, rects)
    }

    el.addEventListener('click', handleClick)
    return () => el.removeEventListener('click', handleClick)
  }, [onHighlight])

  function commitPageJump(val: string) {
    const n = parseInt(val)
    if (n >= 1 && n <= nPages) pageRefs.current[n - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {file && !missing && nPages > 0 && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', height: '32px', borderBottom: '1px solid #111', background: '#080808' }}>
          <button
            onClick={() => { setShowFind(v => !v); setTimeout(() => findInputRef.current?.focus(), 30) }}
            title="Search in PDF (Cmd+F)"
            style={{ background: showFind ? '#1a1a1a' : 'none', border: 'none', padding: '3px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', color: showFind ? '#aaa' : '#555', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'inherit', outline: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
            onMouseLeave={e => (e.currentTarget.style.color = showFind ? '#aaa' : '#555')}
          >find</button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#444', letterSpacing: '0.06em' }}>p.</span>
            <input
              key={currentPage} defaultValue={currentPage} title="Jump to page"
              onFocus={e => e.target.select()}
              onBlur={e => commitPageJump(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { commitPageJump((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur() } if (e.key === 'Escape') (e.target as HTMLInputElement).blur() }}
              style={{ width: '28px', background: 'transparent', border: 'none', outline: 'none', fontSize: '10px', color: '#777', fontFamily: 'inherit', letterSpacing: '0.06em', textAlign: 'center', padding: 0 }}
            />
            <span style={{ fontSize: '10px', color: '#333', letterSpacing: '0.06em' }}>/ {nPages}</span>
          </div>
        </div>
      )}

      {showFind && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', height: '34px', borderBottom: '1px solid #111', background: '#0a0a0a' }}>
          <input ref={findInputRef} value={findTerm} onChange={e => setFindTerm(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && findResults.length) setFindIdx(i => (i + 1) % findResults.length); if (e.key === 'Escape') { setShowFind(false); setFindTerm('') } }}
            placeholder="search..." style={{ flex: 1, background: '#111', border: '1px solid #1a1a1a', borderRadius: '3px', padding: '4px 10px', fontSize: '12px', color: '#bbb', outline: 'none', fontFamily: 'inherit', letterSpacing: '0.04em' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#333')} onBlur={e => (e.currentTarget.style.borderColor = '#1a1a1a')}
          />
          {findTerm.trim() && <span style={{ fontSize: '10px', color: '#555', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{findResults.length === 0 ? 'no matches' : `${findIdx + 1} / ${findResults.length}`}</span>}
          {findResults.length > 1 && <><button onClick={() => setFindIdx(i => (i - 1 + findResults.length) % findResults.length)} style={navBtn}>↑</button><button onClick={() => setFindIdx(i => (i + 1) % findResults.length)} style={navBtn}>↓</button></>}
          <button onClick={() => { setShowFind(false); setFindTerm('') }} style={{ ...navBtn, color: '#555' }}>×</button>
        </div>
      )}

      <div ref={containerRef} style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: 'scroll', overflowX: 'hidden' }}>
        {missing   && <div style={MSG}>file not found — re-upload to view.</div>}
        {!file && !missing && <div style={MSG}>loading...</div>}
        {file && !missing && (
          <Document file={file} onLoadSuccess={pdf => setNPages(pdf.numPages)} loading={<div style={MSG}>rendering...</div>} error={<div style={MSG}>could not render pdf.</div>}>
            {Array.from({ length: nPages }, (_, pi) => (
              <div key={pi} ref={el => { pageRefs.current[pi] = el }} style={{ padding: '12px 16px', boxSizing: 'border-box', position: 'relative' }}>
                <div ref={pi === 0 ? attachSlot : undefined}>
                  {pW > 0 && <Page pageNumber={pi + 1} width={pW} renderTextLayer renderAnnotationLayer={false} customTextRenderer={customTextRenderer} />}
                </div>
                {/* Thin left bar shows which paragraphs are clipped */}
                {highlights.filter(h => h.page === pi + 1).map(h => {
                  const rs = h.rects ?? []
                  if (!rs.length) return null
                  const top    = Math.min(...rs.map(r => r.y))
                  const bottom = Math.max(...rs.map(r => r.y + r.h))
                  return (
                    <div key={h.id} style={{
                      position: 'absolute',
                      left: '4px',
                      top:    `${top    * 100}%`,
                      height: `${(bottom - top) * 100}%`,
                      width: '2px',
                      background: 'rgba(255,200,0,0.7)',
                      borderRadius: '1px',
                      pointerEvents: 'none',
                    }} />
                  )
                })}
              </div>
            ))}
          </Document>
        )}
      </div>
    </div>
  )
}

const navBtn: React.CSSProperties = {
  background: 'none', border: 'none', padding: '2px 6px', cursor: 'pointer',
  fontSize: '12px', color: '#777', fontFamily: 'inherit', outline: 'none', borderRadius: '3px',
}
