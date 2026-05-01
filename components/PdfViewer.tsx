'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import { getFile } from '@/lib/idb'
import type { Highlight, SpanEntry } from '@/lib/types'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

function charOffsetInSpan(span: Element, container: Node, offset: number): number {
  if (container.nodeType !== Node.TEXT_NODE) return -1
  const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT)
  let chars = 0
  let node: Node | null
  while ((node = walker.nextNode())) {
    if (node === container) return chars + offset
    chars += (node as Text).length
  }
  return -1
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const MSG: React.CSSProperties = {
  padding: '24px', fontSize: '11px', color: '#555',
  letterSpacing: '0.08em', textTransform: 'uppercase',
}

const MARK      = `style="background:rgba(255,213,0,0.38);border-radius:1px;color:inherit;"`
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
  onHighlight?: (text: string, page: number, spans: SpanEntry[]) => void
}) {
  const [file,    setFile]    = useState<File | null>(null)
  const [nPages,  setNPages]  = useState(0)
  const [missing, setMissing] = useState(false)
  const [pW,      setPW]      = useState(0)

  // Find state
  const [showFind,  setShowFind]  = useState(false)
  const [findTerm,  setFindTerm]  = useState('')
  const [findIdx,   setFindIdx]   = useState(0)
  const [textsReady, setTextsReady] = useState(false)

  // Page jump
  const [currentPage, setCurrentPage] = useState(1)

  // Floating save button
  const [btnPos,      setBtnPos]      = useState<{ x: number; y: number } | null>(null)
  const [btnIsRemove, setBtnIsRemove] = useState(false)
  const highlightsRef = useRef(highlights)
  useEffect(() => { highlightsRef.current = highlights }, [highlights])

  const containerRef  = useRef<HTMLDivElement>(null)
  const pageRefs      = useRef<(HTMLDivElement | null)[]>([])
  const slotRoRef     = useRef<ResizeObserver | null>(null)
  const findInputRef  = useRef<HTMLInputElement>(null)
  const pageTexts     = useRef<Map<number, string[]>>(new Map())

  // Reset on source change
  useEffect(() => {
    setFile(null); setMissing(false); setNPages(0)
    setCurrentPage(1); setFindTerm(''); setShowFind(false)
    setTextsReady(false)
    pageTexts.current = new Map()
    pageRefs.current = []
    getFile(srcId).then(f => f ? setFile(f) : setMissing(true))
  }, [srcId])

  // Extract all page texts up front using pdf.js so find works across every page
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

  // Track current page by finding which page top is closest to the container top
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
    onScroll() // set correct page on initial load
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

  // Jump to highlight page
  useEffect(() => {
    if (!jumpTo) return
    pageRefs.current[jumpTo.page - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [jumpTo])

  // Cmd+F opens find, Escape closes
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setShowFind(true)
        setTimeout(() => findInputRef.current?.focus(), 30)
      }
      if (e.key === 'Escape' && showFind) {
        setShowFind(false)
        setFindTerm('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showFind])

  // ─── Find results ─────────────────────────────────────────────────────────────

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

  // Reset findIdx when results change
  useEffect(() => { setFindIdx(0) }, [findResults])

  // Scroll to current find result
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

  // ─── Floating save button ─────────────────────────────────────────────────────
  // selectionchange fires whenever the browser selection changes — drag, double-
  // click, triple-click, shift+click, keyboard — we don't care how. If the
  // selection is non-empty and inside the text layer, show a button above it.
  // User clicks the button to save. No timing hacks needed.

  const processSelection = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const text = sel.toString().trim()
    if (!text || text.length < 3) { sel.removeAllRanges(); setBtnPos(null); return }

    const anchorInLayer = pageRefs.current.some(ref =>
      ref?.querySelector('.textLayer')?.contains(sel.anchorNode)
    )
    if (!anchorInLayer) { sel.removeAllRanges(); setBtnPos(null); return }

    const range = sel.getRangeAt(0)
    if (
      range.startContainer.nodeType !== Node.TEXT_NODE ||
      range.endContainer.nodeType   !== Node.TEXT_NODE
    ) { sel.removeAllRanges(); setBtnPos(null); return }

    let page = 1
    pageRefs.current.forEach((ref, i) => {
      if (ref?.contains(sel.anchorNode)) page = i + 1
    })

    const pageRef = pageRefs.current[page - 1]
    if (!pageRef) { sel.removeAllRanges(); setBtnPos(null); return }

    const allSpans = Array.from(
      pageRef.querySelectorAll('.textLayer span:not(.markedContent)')
    ) as HTMLSpanElement[]

    // intersectsNode directly tests each span against the selection —
    // no firstIdx/lastIdx iteration that can include out-of-range spans.
    const selectedSpans = allSpans.filter(s => s.textContent?.trim() && range.intersectsNode(s))
    if (selectedSpans.length === 0) { sel.removeAllRanges(); setBtnPos(null); return }

    const spans: SpanEntry[] = []
    for (const spanEl of selectedSpans) {
      const t = (spanEl.textContent ?? '').trim()
      if (!t) continue
      let start: number | undefined, end: number | undefined
      if (spanEl.contains(range.startContainer)) {
        const off = charOffsetInSpan(spanEl, range.startContainer, range.startOffset)
        if (off === -1) { sel.removeAllRanges(); setBtnPos(null); return }
        if (off > 0) start = off
      }
      if (spanEl.contains(range.endContainer)) {
        const off = charOffsetInSpan(spanEl, range.endContainer, range.endOffset)
        if (off === -1) { sel.removeAllRanges(); setBtnPos(null); return }
        if (off < t.length) end = off
      }
      spans.push({ text: t, start, end })
    }

    sel.removeAllRanges()
    setBtnPos(null)
    if (spans.length === 0) return
    onHighlight?.(text, page, spans)
  }, [onHighlight])

  // Show button whenever there's a valid selection inside the text layer
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

      // Use DOM to detect if selection is inside a highlighted mark — more
      // reliable than text comparison and matches what handleHighlight actually does.
      const anchor = sel.anchorNode
      const anchorEl = anchor?.nodeType === Node.TEXT_NODE
        ? anchor.parentElement
        : anchor as Element | null
      const isRemove = !!(anchorEl?.closest?.('mark'))

      setBtnIsRemove(isRemove)
      setBtnPos({ x: rect.left + rect.width / 2, y: rect.top })
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [])

  // Clear selection when clicking outside the text layer
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

  // Triple-click: extend selection to full paragraph.
  // Intercept at mousedown (before browser sets selection) and preventDefault
  // so the browser never gets to set its own single-line triple-click selection.
  // Spans are sorted by vertical position because PDF structure doesn't
  // guarantee they appear in top-to-bottom DOM order.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function onTripleMouseDown(e: MouseEvent) {
      if (e.detail < 3) return

      // caretRangeFromPoint gives the exact text node at mouse coordinates —
      // e.target can be a .markedContent span (filtered out) causing clickedIdx=-1.
      const caretRange = document.caretRangeFromPoint?.(e.clientX, e.clientY) ?? (() => {
        const pos = (document as any).caretPositionFromPoint?.(e.clientX, e.clientY)
        if (!pos) return null
        const r = document.createRange(); r.setStart(pos.offsetNode, pos.offset); return r
      })()
      if (!caretRange) return

      let pageRef: HTMLDivElement | null = null
      pageRefs.current.forEach(ref => { if (ref?.contains(caretRange.startContainer)) pageRef = ref })
      if (!pageRef) return

      e.preventDefault()

      const allSpans = Array.from(
        (pageRef as HTMLDivElement).querySelectorAll('.textLayer span:not(.markedContent)')
      ) as HTMLSpanElement[]
      const sorted = allSpans
        .map(s => ({ el: s, rect: s.getBoundingClientRect() }))
        .filter(s => s.rect.height > 0)
        .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)

      const clickedIdx = sorted.findIndex(s => s.el.contains(caretRange.startContainer))
      if (clickedIdx === -1) return

      const lineH = sorted[clickedIdx].rect.height
      const gap   = lineH * 1.2 // gap larger than a line height = paragraph break

      let startIdx = clickedIdx
      while (startIdx > 0) {
        const gapSize = sorted[startIdx].rect.top - sorted[startIdx - 1].rect.bottom
        if (gapSize > gap) break
        startIdx--
      }
      let endIdx = clickedIdx
      while (endIdx < sorted.length - 1) {
        const gapSize = sorted[endIdx + 1].rect.top - sorted[endIdx].rect.bottom
        if (gapSize > gap) break
        endIdx++
      }

      const range = document.createRange()
      range.setStart(sorted[startIdx].el, 0)
      range.setEnd(sorted[endIdx].el, sorted[endIdx].el.childNodes.length)
      const sel = window.getSelection()
      if (sel) { sel.removeAllRanges(); sel.addRange(range) }
    }
    el.addEventListener('mousedown', onTripleMouseDown)
    return () => el.removeEventListener('mousedown', onTripleMouseDown)
  }, [])

  // ─── Span map for highlights ──────────────────────────────────────────────────

  const spanMaps = useMemo(() => {
    const maps: Record<number, Map<string, SpanEntry>> = {}
    highlights.forEach(h => {
      if (!maps[h.page]) maps[h.page] = new Map()
      ;(h.spans ?? []).forEach(entry => {
        const e: SpanEntry = typeof entry === 'string' ? { text: entry as string } : entry
        if (e.text?.trim()) maps[h.page].set(e.text.trim(), e)
      })
    })
    return maps
  }, [highlights])

  // ─── Custom text renderer (highlights + find) ─────────────────────────────────

  const customTextRenderer = useCallback(
    ({ str, pageIndex }: { str: string; pageIndex: number }) => {
      if (!str.trim()) return str
      const pageNum = pageIndex + 1

      // Highlight takes priority over find
      const map   = spanMaps[pageNum]
      const entry = map?.get(str.trim())
      if (entry) {
        const { start, end } = entry
        if (start === undefined && end === undefined) {
          return `<mark ${MARK}>${esc(str)}</mark>`
        }
        const s = Math.max(0, start ?? 0)
        const e = Math.min(str.length, end ?? str.length)
        if (s >= e) return str
        const hl = str.slice(s, e)
        if (!hl.trim()) return str
        return `${esc(str.slice(0, s))}<mark ${MARK}>${esc(hl)}</mark>${esc(str.slice(e))}`
      }

      // Find match
      const findSpans = findMatchMap.get(pageNum)
      if (findSpans?.has(str) && findTerm.trim()) {
        const term  = findTerm.toLowerCase()
        const lower = str.toLowerCase()
        let result = ''
        let i = 0
        while (i < str.length) {
          const idx = lower.indexOf(term, i)
          if (idx === -1) { result += esc(str.slice(i)); break }
          result += esc(str.slice(i, idx))
          result += `<mark ${FIND_MARK}>${esc(str.slice(idx, idx + term.length))}</mark>`
          i = idx + term.length
        }
        return result
      }

      return str
    },
    [spanMaps, findMatchMap, findTerm]
  )

  // ─── Page jump ────────────────────────────────────────────────────────────────

  function commitPageJump(val: string) {
    const n = parseInt(val)
    if (n >= 1 && n <= nPages) {
      pageRefs.current[n - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Floating highlight button — appears above any text selection in the PDF */}
      {btnPos && onHighlight && (
        <button
          onMouseDown={e => { e.preventDefault(); e.stopPropagation() }}
          onClick={processSelection}
          style={{
            position: 'fixed',
            left: btnPos.x,
            top: btnPos.y - 10,
            transform: 'translate(-50%, -100%)',
            zIndex: 1000,
            background: '#1c1c1c',
            border: '1px solid #333',
            borderRadius: '4px',
            padding: '5px 14px',
            fontSize: '11px',
            color: '#ccc',
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            outline: 'none',
            boxShadow: '0 2px 12px rgba(0,0,0,0.6)',
            whiteSpace: 'nowrap',
          }}
        >
          {btnIsRemove ? 'remove →' : 'highlight →'}
        </button>
      )}

      {/* Toolbar */}
      {file && !missing && nPages > 0 && (
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px',
          padding: '0 12px', height: '32px', borderBottom: '1px solid #111',
          background: '#080808',
        }}>
          {/* Find toggle */}
          <button
            onClick={() => { setShowFind(v => !v); setTimeout(() => findInputRef.current?.focus(), 30) }}
            title="Search in PDF (Cmd+F)"
            style={{
              background: showFind ? '#1a1a1a' : 'none', border: 'none', padding: '3px 8px',
              borderRadius: '3px', cursor: 'pointer', fontSize: '10px', color: showFind ? '#aaa' : '#555',
              letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'inherit', outline: 'none',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
            onMouseLeave={e => (e.currentTarget.style.color = showFind ? '#aaa' : '#555')}
          >
            find
          </button>

          <div style={{ flex: 1 }} />

          {/* Page jump */}
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

      {/* Find bar */}
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
              if (e.key === 'Enter') {
                if (!findResults.length) return
                setFindIdx(i => (i + 1) % findResults.length)
              }
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
              <button onClick={() => setFindIdx(i => (i - 1 + findResults.length) % findResults.length)}
                style={navBtn}>↑</button>
              <button onClick={() => setFindIdx(i => (i + 1) % findResults.length)}
                style={navBtn}>↓</button>
            </>
          )}

          <button
            onClick={() => { setShowFind(false); setFindTerm('') }}
            style={{ ...navBtn, color: '#555' }}
          >
            ×
          </button>
        </div>
      )}

      {/* PDF scroll area */}
      <div
        ref={containerRef}
        style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: 'scroll', overflowX: 'hidden' }}
      >
        {missing  && <div style={MSG}>file not found — re-upload to view.</div>}
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
                style={{ padding: '12px 16px', boxSizing: 'border-box' }}
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
  borderRadius: '3px', transition: 'color 0.15s',
}
