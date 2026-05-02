'use client'
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
  onHighlight?: (text: string, page: number, rects: HighlightRect[], spans: string[]) => void
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

  const containerRef    = useRef<HTMLDivElement>(null)
  const pageRefs        = useRef<(HTMLDivElement | null)[]>([])
  const innerPageRefs   = useRef<(HTMLDivElement | null)[]>([])
  const slotRoRef       = useRef<ResizeObserver | null>(null)
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

      // Find which page and its inner div (coords relative to the PDF canvas)
      let pageRef: HTMLDivElement | null = null
      let innerRef: HTMLDivElement | null = null
      let page = 1
      pageRefs.current.forEach((ref, i) => {
        if (ref?.contains(caretRange.startContainer)) {
          pageRef = ref; innerRef = innerPageRefs.current[i]; page = i + 1
        }
      })
      if (!pageRef || !innerRef) return

      // Get all non-junk spans, sorted by reading order
      const allSpans = Array.from(
        (pageRef as HTMLDivElement).querySelectorAll('.textLayer span:not(.markedContent)')
      ) as HTMLSpanElement[]
      const sorted = allSpans
        .map(s => ({ el: s, rect: s.getBoundingClientRect() }))
        .filter(s => {
          const t = s.el.textContent?.trim() ?? ''
          if (!t || s.rect.height === 0 || s.rect.width === 0) return false
          if (/^\d+$/.test(t) && t.length <= 3) return false
          return true
        })
        .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)

      const clickedIdx = sorted.findIndex(s => s.el.contains(caretRange.startContainer))
      if (clickedIdx === -1) return

      // Group spans into visual lines (±4px tolerance)
      type Line = { spans: typeof sorted; top: number }
      const lines: Line[] = []
      for (const sp of sorted) {
        const last = lines[lines.length - 1]
        if (last && Math.abs(sp.rect.top - last.top) <= 4) {
          last.spans.push(sp)
        } else {
          lines.push({ spans: [sp], top: sp.rect.top })
        }
      }

      const clickedLineIdx = lines.findIndex(l =>
        l.spans.some(s => s.el.contains(caretRange.startContainer))
      )
      if (clickedLineIdx === -1) return

      // Median line spacing in ±5 window → threshold for spacing-based paragraph break
      const lineSpacings: number[] = []
      const winStart = Math.max(1, clickedLineIdx - 5)
      const winEnd   = Math.min(lines.length - 1, clickedLineIdx + 5)
      for (let i = winStart; i <= winEnd; i++) {
        const gap = lines[i].top - lines[i - 1].top
        if (gap > 2 && gap < 100) lineSpacings.push(gap)
      }
      lineSpacings.sort((a, b) => a - b)
      const median = lineSpacings.length > 0
        ? lineSpacings[Math.floor(lineSpacings.length / 2)]
        : sorted[clickedIdx].rect.height * 1.3
      const gapThreshold = Math.min(median * 1.4, 60)

      // Indentation-based paragraph detection (for papers with first-line indent)
      // 25th-percentile left edge = typical body margin; indented lines sit further right
      const leftEdges = lines.map(l => Math.min(...l.spans.map(s => s.rect.left)))
      const sortedLefts = [...leftEdges].sort((a, b) => a - b)
      const marginLeft = sortedLefts[Math.floor(sortedLefts.length * 0.25)]
      const INDENT_PX   = 18  // finding paragraph start (going up) — looser
      const BREAK_PX    = 36  // detecting next paragraph (going down) — stricter to avoid short centered lines
      const hasIndents  = leftEdges.some(le => le > marginLeft + INDENT_PX)
      const isParaStart = (li: number) => hasIndents && leftEdges[li] > marginLeft + INDENT_PX
      const isParaBreak = (li: number) => hasIndents && leftEdges[li] > marginLeft + BREAK_PX

      const MAX_UP   = 20  // plenty to reach any paragraph start
      const MAX_DOWN = 60  // generous — detection stops it early anyway

      let startLineIdx = clickedLineIdx
      let endLineIdx   = clickedLineIdx
      if (!isParaStart(clickedLineIdx)) {
        while (startLineIdx > 0 && clickedLineIdx - startLineIdx < MAX_UP) {
          if (lines[startLineIdx].top - lines[startLineIdx - 1].top > gapThreshold) break
          startLineIdx--
          if (isParaStart(startLineIdx)) break
        }
      }
      while (endLineIdx < lines.length - 1 && endLineIdx - clickedLineIdx < MAX_DOWN) {
        if (lines[endLineIdx + 1].top - lines[endLineIdx].top > gapThreshold) break
        if (isParaBreak(endLineIdx + 1)) break
        endLineIdx++
      }

      // One rect per line; coordinates relative to the inner div (no padding offset)
      const paraLines = lines.slice(startLineIdx, endLineIdx + 1)
      let combinedText  = paraLines.flatMap(l => l.spans).map(s => s.el.textContent?.trim()).filter(Boolean).join(' ')
      if (!combinedText || combinedText.length < 3) return

      let combinedSpans = paraLines.flatMap(l => l.spans).map(s => s.el.textContent ?? '').filter(s => s.trim())
      const innerRect   = (innerRef as HTMLDivElement).getBoundingClientRect()
      function lineRect(line: Line, iRect: DOMRect, pgNum?: number): HighlightRect {
        const ls  = line.spans
        const lft = Math.min(...ls.map(s => s.rect.left))
        const rgt = Math.max(...ls.map(s => s.rect.left + s.rect.width))
        const tp  = Math.min(...ls.map(s => s.rect.top))
        const bt  = Math.max(...ls.map(s => s.rect.top + s.rect.height))
        return {
          x: (lft - iRect.left) / iRect.width,
          y: (tp  - iRect.top)  / iRect.height,
          w: (rgt - lft)        / iRect.width,
          h: (bt  - tp)         / iRect.height,
          ...(pgNum !== undefined ? { pg: pgNum } : {}),
        }
      }
      let combinedRects: HighlightRect[] = paraLines.map(l => lineRect(l, innerRect))

      // If we hit the first line on this page and it has no indent, the paragraph
      // may have started on the previous page — look backward and prepend those lines.
      if (startLineIdx === 0 && !isParaStart(0) && page > 1) {
        const prevPageEl  = pageRefs.current[page - 2]
        const prevInnerEl = innerPageRefs.current[page - 2]
        if (prevPageEl && prevInnerEl) {
          const prevSpanEls = Array.from(
            prevPageEl.querySelectorAll('.textLayer span:not(.markedContent)')
          ) as HTMLSpanElement[]
          const prevSorted = prevSpanEls
            .map(s => ({ el: s, rect: s.getBoundingClientRect() }))
            .filter(s => {
              const t = s.el.textContent?.trim() ?? ''
              return t && s.rect.height > 0 && s.rect.width > 0 && !(/^\d+$/.test(t) && t.length <= 3)
            })
            .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)

          if (prevSorted.length > 0) {
            const prevLines: Line[] = []
            for (const sp of prevSorted) {
              const last = prevLines[prevLines.length - 1]
              if (last && Math.abs(sp.rect.top - last.top) <= 4) last.spans.push(sp)
              else prevLines.push({ spans: [sp], top: sp.rect.top })
            }
            const pLeftEdges   = prevLines.map(l => Math.min(...l.spans.map(s => s.rect.left)))
            const pIsParaStart = (li: number) => pLeftEdges[li] > marginLeft + INDENT_PX

            // Walk backward from the last line of the prev page
            let prevStart = prevLines.length
            for (let i = prevLines.length - 1; i >= Math.max(0, prevLines.length - 30); i--) {
              if (i < prevLines.length - 1) {
                const gap = prevLines[i + 1].top - prevLines[i].top
                if (gap > gapThreshold) break
              }
              prevStart = i
              if (pIsParaStart(i)) break  // include this indented first line and stop
            }

            if (prevStart < prevLines.length) {
              const prevParaLines = prevLines.slice(prevStart)
              const prevInnerRect = prevInnerEl.getBoundingClientRect()
              const prevText      = prevParaLines.flatMap(l => l.spans).map(s => s.el.textContent?.trim()).filter(Boolean).join(' ')
              combinedText  = prevText + ' ' + combinedText
              combinedSpans = [...prevParaLines.flatMap(l => l.spans).map(s => s.el.textContent ?? '').filter(s => s.trim()), ...combinedSpans]
              combinedRects = [...prevParaLines.map(l => lineRect(l, prevInnerRect, page - 1)), ...combinedRects]
            }
          }
        }
      }

      // If we consumed the last line on this page, check whether the paragraph
      // continues at the top of the next page (no indent = continuation).
      if (endLineIdx === lines.length - 1) {
        const nextInnerEl = innerPageRefs.current[page]   // page is 1-indexed → next page index
        const nextPageEl  = pageRefs.current[page]
        if (nextPageEl && nextInnerEl) {
          const nextSpanEls = Array.from(
            nextPageEl.querySelectorAll('.textLayer span:not(.markedContent)')
          ) as HTMLSpanElement[]
          const nextSorted = nextSpanEls
            .map(s => ({ el: s, rect: s.getBoundingClientRect() }))
            .filter(s => {
              const t = s.el.textContent?.trim() ?? ''
              return t && s.rect.height > 0 && s.rect.width > 0 && !(/^\d+$/.test(t) && t.length <= 3)
            })
            .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)

          if (nextSorted.length > 0) {
            const nextLines: Line[] = []
            for (const sp of nextSorted) {
              const last = nextLines[nextLines.length - 1]
              if (last && Math.abs(sp.rect.top - last.top) <= 4) last.spans.push(sp)
              else nextLines.push({ spans: [sp], top: sp.rect.top })
            }
            // Reuse page N's marginLeft for indent detection on page N+1 — both pages
            // share the same horizontal layout so the reference stays consistent.
            const nLeftEdges  = nextLines.map(l => Math.min(...l.spans.map(s => s.rect.left)))
            const nIsParaStart = (li: number) => nLeftEdges[li] > marginLeft + INDENT_PX
            const nIsParaBreak = (li: number) => nLeftEdges[li] > marginLeft + BREAK_PX

            let nextEnd = -1
            for (let i = 0; i < Math.min(nextLines.length, 20); i++) {
              if (i === 0 && nIsParaStart(0)) break
              if (i > 0 && nIsParaBreak(i)) break
              if (i > 0 && nextLines[i].top - nextLines[i - 1].top > gapThreshold) break
              nextEnd = i
            }

            if (nextEnd >= 0) {
              const nextParaLines  = nextLines.slice(0, nextEnd + 1)
              const nextInnerRect  = nextInnerEl.getBoundingClientRect()
              combinedText  += ' ' + nextParaLines.flatMap(l => l.spans).map(s => s.el.textContent?.trim()).filter(Boolean).join(' ')
              combinedSpans  = [...combinedSpans, ...nextParaLines.flatMap(l => l.spans).map(s => s.el.textContent ?? '').filter(s => s.trim())]
              combinedRects  = [...combinedRects, ...nextParaLines.map(l => lineRect(l, nextInnerRect, page + 1))]
            }
          }
        }
      }

      onHighlight?.(combinedText, page, combinedRects, combinedSpans)
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
          {findTerm.trim() && <span style={{ fontSize: '10px', color: '#555', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{findResults.length === 0 ? 'no results' : `${findIdx + 1} / ${findResults.length}`}</span>}
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
                {/* Left margin bars — positioned in the outer (padded) div */}
                {highlights.map(h => {
                  const pageNum = pi + 1
                  const rs = (h.rects ?? []).filter(r => (r.pg ?? h.page) === pageNum)
                  if (!rs.length) return null
                  const topFrac    = Math.max(0, Math.min(...rs.map(r => r.y)))
                  const bottomFrac = Math.min(1, Math.max(...rs.map(r => r.y + r.h)))
                  return (
                    <div key={h.id} style={{
                      position: 'absolute', left: '5px', width: '3px',
                      top: `${topFrac * 100}%`, bottom: `${(1 - bottomFrac) * 100}%`,
                      minHeight: '6px', background: 'rgba(220,170,0,0.9)',
                      borderRadius: '2px', pointerEvents: 'none',
                    }} />
                  )
                })}
                {/* Inner div = exact PDF canvas area; overlays use same coord origin as stored rects */}
                <div
                  ref={el => { innerPageRefs.current[pi] = el; if (pi === 0) attachSlot(el) }}
                  style={{ position: 'relative' }}
                >
                  {pW > 0 && <Page pageNumber={pi + 1} width={pW} renderTextLayer renderAnnotationLayer={false} customTextRenderer={customTextRenderer} />}
                  {/* Gold tint: one overlay per line-rect, top+bottom anchors (height:% collapses on auto parents) */}
                  {highlights.map(h =>
                    (h.rects ?? [])
                      .filter(r => (r.pg ?? h.page) === pi + 1)
                      .map((r, ri) => (
                        <div key={`${h.id}-${ri}`} style={{
                          position: 'absolute',
                          left:   `${Math.max(0, r.x) * 100}%`,
                          width:  `${r.w * 100}%`,
                          top:    `${Math.max(0, r.y) * 100}%`,
                          bottom: `${Math.max(0, 1 - r.y - r.h) * 100}%`,
                          background: 'rgba(200,160,0,0.15)',
                          borderRadius: '1px',
                          pointerEvents: 'none',
                        }} />
                      ))
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
  fontSize: '12px', color: '#777', fontFamily: 'inherit', outline: 'none', borderRadius: '3px',
}
