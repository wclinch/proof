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

  const [showFind,   setShowFind]   = useState(false)
  const [findTerm,   setFindTerm]   = useState('')
  const [findIdx,    setFindIdx]    = useState(0)
  const [textsReady, setTextsReady] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const [btnPos,      setBtnPos]      = useState<{ x: number; y: number } | null>(null)
  const [btnIsRemove, setBtnIsRemove] = useState(false)
  const highlightsRef = useRef(highlights)
  useEffect(() => { highlightsRef.current = highlights }, [highlights])

  const containerRef  = useRef<HTMLDivElement>(null)
  const pageRefs      = useRef<(HTMLDivElement | null)[]>([])
  const slotRoRef     = useRef<ResizeObserver | null>(null)
  const findInputRef  = useRef<HTMLInputElement>(null)
  const pageTexts     = useRef<Map<number, string[]>>(new Map())

  useEffect(() => {
    setFile(null); setMissing(false); setNPages(0)
    setCurrentPage(1); setFindTerm(''); setShowFind(false)
    setTextsReady(false)
    pageTexts.current = new Map()
    pageRefs.current = []
    getFile(srcId).then(f => f ? setFile(f) : setMissing(true))
  }, [srcId])

  useEffect(() => {
    if (!file) return
    pageTexts.current = new Map()
    setTextsReady(false)
    const url = URL.createObjectURL(file)
    let revoked = false
    const revoke = () => { if (!revoked) { revoked = true; URL.revokeObjectURL(url) } }
    const task = (pdfjs as any).getDocument(url)
    task.promise.then(async (pdf: any) => {
      for (let i = 1; i <= pdf.numPages; i++) {
        const pg = await pdf.getPage(i)
        const content = await pg.getTextContent()
        const strs = (content.items as any[])
          .filter(item => typeof item.str === 'string' && item.str.trim())
          .map(item => item.str as string)
        pageTexts.current.set(i, strs)
      }
      setTextsReady(true)
      revoke()
    }).catch(revoke)
    return () => { task.destroy?.(); revoke() }
  }, [file])

  useEffect(() => {
    const el = containerRef.current
    if (!el || !nPages) return
    function onScroll() {
      const containerTop = el!.getBoundingClientRect().top
      let closest = 1, minDist = Infinity
      pageRefs.current.forEach((ref, i) => {
        if (!ref) return
        const dist = Math.abs(ref.getBoundingClientRect().top - containerTop)
        if (dist < minDist) { minDist = dist; closest = i + 1 }
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
    ro.observe(el)
    slotRoRef.current = ro
  }, [])

  useEffect(() => {
    if (!jumpTo) return
    pageRefs.current[jumpTo.page - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [jumpTo])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setShowFind(true)
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

  // ─── Highlight capture — rect overlay approach ─────────────────────────────────
  // We capture range.getClientRects() (the browser's exact visual selection
  // rectangles) and store them as fractions of the page dimensions.
  // On render, we draw absolute-positioned divs over the PDF. No span matching,
  // no text search, no charOffsetInSpan — just pixel coordinates.

  const processSelection = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const text = sel.toString().trim()
    if (!text || text.length < 3) { sel.removeAllRanges(); setBtnPos(null); return }

    const anchorInLayer = pageRefs.current.some(ref =>
      ref?.querySelector('.textLayer')?.contains(sel.anchorNode)
    )
    if (!anchorInLayer) { sel.removeAllRanges(); setBtnPos(null); return }

    let page = 1
    let pageEl: HTMLDivElement | null = null
    pageRefs.current.forEach((ref, i) => {
      if (ref?.contains(sel.anchorNode)) { page = i + 1; pageEl = ref }
    })
    if (!pageEl) { sel.removeAllRanges(); setBtnPos(null); return }

    const range = sel.getRangeAt(0)
    const pageRect = (pageEl as HTMLDivElement).getBoundingClientRect()

    const rects: HighlightRect[] = Array.from(range.getClientRects())
      .filter(r => r.width > 1 && r.height > 1)
      .map(r => ({
        x: (r.left - pageRect.left) / pageRect.width,
        y: (r.top  - pageRect.top)  / pageRect.height,
        w: r.width  / pageRect.width,
        h: r.height / pageRect.height,
      }))

    sel.removeAllRanges()
    setBtnPos(null)
    if (rects.length === 0) return
    onHighlight?.(text, page, rects)
  }, [onHighlight])

  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.toString().trim()) { setBtnPos(null); return }
      const inLayer = pageRefs.current.some(ref =>
        ref?.querySelector('.textLayer')?.contains(sel.anchorNode)
      )
      if (!inLayer) { setBtnPos(null); return }
      const rect = sel.getRangeAt(0).getBoundingClientRect()
      if (!rect.width && !rect.height) { setBtnPos(null); return }

      // Detect overlap using rects — find which page, convert selection rects to fractions
      let pageEl: HTMLDivElement | null = null
      let pageIdx = -1
      pageRefs.current.forEach((ref, i) => {
        if (ref?.contains(sel.anchorNode)) { pageEl = ref; pageIdx = i + 1 }
      })

      let isRemove = false
      if (pageEl) {
        const pr = (pageEl as HTMLDivElement).getBoundingClientRect()
        const selFracs = Array.from(sel.getRangeAt(0).getClientRects())
          .filter(r => r.width > 1 && r.height > 1)
          .map(r => ({ x: (r.left-pr.left)/pr.width, y: (r.top-pr.top)/pr.height, w: r.width/pr.width, h: r.height/pr.height }))
        const ov = (a: {x:number;y:number;w:number;h:number}, b: {x:number;y:number;w:number;h:number}) =>
          a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y
        isRemove = highlightsRef.current
          .filter(h => h.page === pageIdx)
          .some(h => (h.rects ?? []).some(hr => selFracs.some(sr => ov(hr, sr))))
      }

      setBtnIsRemove(isRemove)
      setBtnPos({ x: rect.left + rect.width / 2, y: rect.top })
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function onMouseDown(e: MouseEvent) {
      const inLayer = pageRefs.current.some(ref =>
        ref?.querySelector('.textLayer')?.contains(e.target as Node)
      )
      if (!inLayer) window.getSelection()?.removeAllRanges()
    }
    el.addEventListener('mousedown', onMouseDown)
    return () => el.removeEventListener('mousedown', onMouseDown)
  }, [])


  function commitPageJump(val: string) {
    const n = parseInt(val)
    if (n >= 1 && n <= nPages) {
      pageRefs.current[n - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {btnPos && onHighlight && (
        <button
          onMouseDown={e => { e.preventDefault(); e.stopPropagation() }}
          onClick={processSelection}
          style={{
            position: 'fixed',
            left: btnPos.x, top: btnPos.y - 10,
            transform: 'translate(-50%, -100%)',
            zIndex: 1000,
            background: '#1c1c1c', border: '1px solid #333', borderRadius: '4px',
            padding: '5px 14px', fontSize: '11px', color: '#ccc',
            cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.08em',
            textTransform: 'uppercase', outline: 'none',
            boxShadow: '0 2px 12px rgba(0,0,0,0.6)', whiteSpace: 'nowrap',
          }}
        >
          {btnIsRemove ? 'remove →' : 'highlight →'}
        </button>
      )}

      {file && !missing && nPages > 0 && (
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px',
          padding: '0 12px', height: '32px', borderBottom: '1px solid #111',
          background: '#080808',
        }}>
          <button
            onClick={() => { setShowFind(v => !v); setTimeout(() => findInputRef.current?.focus(), 30) }}
            title="Search in PDF (Cmd+F)"
            style={{
              background: showFind ? '#1a1a1a' : 'none', border: 'none', padding: '3px 8px',
              borderRadius: '3px', cursor: 'pointer', fontSize: '10px',
              color: showFind ? '#aaa' : '#555', letterSpacing: '0.08em',
              textTransform: 'uppercase', fontFamily: 'inherit', outline: 'none',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
            onMouseLeave={e => (e.currentTarget.style.color = showFind ? '#aaa' : '#555')}
          >find</button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#444', letterSpacing: '0.06em' }}>p.</span>
            <input
              key={currentPage}
              defaultValue={currentPage}
              title="Jump to page"
              onFocus={e => e.target.select()}
              onBlur={e => commitPageJump(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { commitPageJump((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur() }
                if (e.key === 'Escape') { (e.target as HTMLInputElement).blur() }
              }}
              style={{
                width: '28px', background: 'transparent', border: 'none', outline: 'none',
                fontSize: '10px', color: '#777', fontFamily: 'inherit',
                letterSpacing: '0.06em', textAlign: 'center', padding: 0,
              }}
            />
            <span style={{ fontSize: '10px', color: '#333', letterSpacing: '0.06em' }}>/ {nPages}</span>
          </div>
        </div>
      )}

      {showFind && (
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px',
          padding: '0 12px', height: '34px', borderBottom: '1px solid #111',
          background: '#0a0a0a',
        }}>
          <input
            ref={findInputRef}
            value={findTerm}
            onChange={e => setFindTerm(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && findResults.length) setFindIdx(i => (i + 1) % findResults.length)
              if (e.key === 'Escape') { setShowFind(false); setFindTerm('') }
            }}
            placeholder="search..."
            style={{
              flex: 1, background: '#111', border: '1px solid #1a1a1a', borderRadius: '3px',
              padding: '4px 10px', fontSize: '12px', color: '#bbb', outline: 'none',
              fontFamily: 'inherit', letterSpacing: '0.04em',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#333')}
            onBlur={e => (e.currentTarget.style.borderColor = '#1a1a1a')}
          />
          {findTerm.trim() && (
            <span style={{ fontSize: '10px', color: '#555', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
              {findResults.length === 0 ? 'no matches' : `${findIdx + 1} / ${findResults.length}`}
            </span>
          )}
          {findResults.length > 1 && (
            <>
              <button onClick={() => setFindIdx(i => (i - 1 + findResults.length) % findResults.length)} style={navBtn}>↑</button>
              <button onClick={() => setFindIdx(i => (i + 1) % findResults.length)} style={navBtn}>↓</button>
            </>
          )}
          <button onClick={() => { setShowFind(false); setFindTerm('') }} style={{ ...navBtn, color: '#555' }}>×</button>
        </div>
      )}

      <div
        ref={containerRef}
        style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: 'scroll', overflowX: 'hidden' }}
      >
        {missing   && <div style={MSG}>file not found — re-upload to view.</div>}
        {!file && !missing && <div style={MSG}>loading...</div>}
        {file && !missing && (
          <Document
            file={file}
            onLoadSuccess={pdf => setNPages(pdf.numPages)}
            loading={<div style={MSG}>rendering...</div>}
            error={<div style={MSG}>could not render pdf.</div>}
          >
            {Array.from({ length: nPages }, (_, pi) => (
              <div
                key={pi}
                ref={el => { pageRefs.current[pi] = el }}
                style={{ padding: '12px 16px', boxSizing: 'border-box', position: 'relative' }}
              >
                <div ref={pi === 0 ? attachSlot : undefined}>
                  {pW > 0 && (
                    <Page
                      pageNumber={pi + 1}
                      width={pW}
                      renderTextLayer
                      renderAnnotationLayer={false}
                      customTextRenderer={customTextRenderer}
                    />
                  )}
                </div>
                {/* Highlight overlays — absolute within outer page div */}
                {highlights
                  .filter(h => h.page === pi + 1)
                  .flatMap(h => (h.rects ?? []).map((rect, ri) => (
                    <div
                      key={`${h.id}-${ri}`}
                      style={{
                        position: 'absolute',
                        left:   `${rect.x * 100}%`,
                        top:    `${rect.y * 100}%`,
                        width:  `${rect.w * 100}%`,
                        height: `${rect.h * 100}%`,
                        background: 'rgba(255, 213, 0, 0.38)',
                        borderRadius: '1px',
                        pointerEvents: 'none',
                        zIndex: 1,
                      }}
                    />
                  )))}
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
  fontSize: '12px', color: '#777', fontFamily: 'inherit', outline: 'none',
  borderRadius: '3px',
}
