'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import { getFile } from '@/lib/idb'
import type { Highlight, SpanEntry } from '@/lib/types'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

import { normStr } from '@/lib/norm'

// Walk text nodes to find the absolute char offset of container+offset within span.
// Returns -1 when the container is not a TEXT_NODE or is not found inside span.
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

const MARK = `style="background:rgba(255,213,0,0.38);border-radius:1px;color:inherit;"`

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

  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs     = useRef<(HTMLDivElement | null)[]>([])
  const slotRoRef    = useRef<ResizeObserver | null>(null)

  useEffect(() => {
    setFile(null); setMissing(false); setNPages(0)
    pageRefs.current = []
    getFile(srcId).then(f => f ? setFile(f) : setMissing(true))
  }, [srcId])

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

  // ─── Text selection capture ───────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el || !onHighlight) return

    function handleMouseDown(e: MouseEvent) {
      // Only clear lingering selections when clicking OUTSIDE the text layer.
      // Must NOT clear inside — that breaks triple-click (click→word→paragraph
      // accumulates across three mousedown/up cycles and any clear resets it).
      const target = e.target as Node
      const inLayer = pageRefs.current.some(ref =>
        ref?.querySelector('.textLayer')?.contains(target)
      )
      if (!inLayer) window.getSelection()?.removeAllRanges()
    }

    function handleMouseUp() {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) { return }

      const text = sel.toString().trim()
      if (!text || text.length < 3) { sel.removeAllRanges(); return }

      // Anchor must be inside a PDF text layer — rejects selections that started outside
      const anchorInLayer = pageRefs.current.some(ref => {
        const layer = ref?.querySelector('.textLayer')
        return layer?.contains(sel.anchorNode)
      })
      if (!anchorInLayer) { sel.removeAllRanges(); return }

      const range = sel.getRangeAt(0)

      // BUG FIX: validate that both ends of the range are TEXT_NODEs.
      // If either is an Element node (e.g. the span itself), charOffsetInSpan
      // returns -1 and offsets silently default to "entire span", causing over-capture.
      if (
        range.startContainer.nodeType !== Node.TEXT_NODE ||
        range.endContainer.nodeType   !== Node.TEXT_NODE
      ) { sel.removeAllRanges(); return }

      let page = 1
      pageRefs.current.forEach((ref, i) => {
        if (ref?.contains(sel.anchorNode)) page = i + 1
      })

      const pageRef = pageRefs.current[page - 1]
      if (!pageRef) { sel.removeAllRanges(); return }

      // Exclude .markedContent wrapper spans — they contain other spans and their
      // .contains() check would match any child text node, making them incorrectly
      // grab firstIdx/lastIdx and capturing far more text than the user selected.
      const allSpans = Array.from(
        pageRef.querySelectorAll('.textLayer span:not(.markedContent)')
      ) as HTMLSpanElement[]

      // Find the span indices that contain the selection's start and end nodes.
      // The browser's hit-testing already determined these correctly — trust them.
      let firstIdx = -1
      let lastIdx  = -1
      allSpans.forEach((spanEl, si) => {
        if (firstIdx === -1 && spanEl.contains(range.startContainer)) firstIdx = si
        if (spanEl.contains(range.endContainer)) lastIdx = si  // keep updating → gets last
      })
      if (firstIdx === -1 || lastIdx === -1) { sel.removeAllRanges(); return }

      const spans: SpanEntry[] = []
      for (let si = firstIdx; si <= lastIdx; si++) {
        const spanEl = allSpans[si]
        const raw = spanEl.textContent ?? ''
        const t   = raw.trim()
        if (!t) continue

        let start: number | undefined
        let end:   number | undefined

        if (spanEl.contains(range.startContainer)) {
          const off = charOffsetInSpan(spanEl, range.startContainer, range.startOffset)
          // BUG FIX: off === -1 means the container wasn't found — skip this span entirely
          // rather than silently defaulting to "highlight from beginning".
          if (off === -1) { sel.removeAllRanges(); return }
          // off > 0 means selection starts partway through — store it.
          // off === 0 means selection starts at the beginning — leave start undefined
          // (undefined is equivalent to 0 in customTextRenderer and avoids a no-op mark tag).
          if (off > 0) start = off
        }

        if (spanEl.contains(range.endContainer)) {
          const off = charOffsetInSpan(spanEl, range.endContainer, range.endOffset)
          // BUG FIX: off === -1 means not found — bail.
          if (off === -1) { sel.removeAllRanges(); return }
          // off < t.length means selection ends partway through — store it.
          // off === t.length means selection ends at the end — leave end undefined.
          if (off < t.length) end = off
        }

        spans.push({ text: t, start, end })
      }

      sel.removeAllRanges()
      if (spans.length === 0) return
      onHighlight?.(text, page, spans)
    }

    el.addEventListener('mousedown', handleMouseDown)
    el.addEventListener('mouseup',   handleMouseUp)
    return () => {
      el.removeEventListener('mousedown', handleMouseDown)
      el.removeEventListener('mouseup',   handleMouseUp)
    }
  }, [onHighlight])

  // ─── Span lookup map ──────────────────────────────────────────────────────────
  // Key: exact trimmed span text. No norm() — prevents false-positive matches
  // across different spans that happen to normalize identically.
  const spanMaps = useMemo(() => {
    const maps: Record<number, Map<string, SpanEntry>> = {}
    highlights.forEach(h => {
      if (!maps[h.page]) maps[h.page] = new Map()
      ;(h.spans ?? []).forEach(entry => {
        // BUG FIX: handle legacy highlights where spans were stored as plain strings
        const e: SpanEntry = typeof entry === 'string'
          ? { text: entry as string }
          : entry as SpanEntry
        if (e.text?.trim()) maps[h.page].set(e.text.trim(), e)
      })
    })
    return maps
  }, [highlights])

  // ─── Custom text renderer ─────────────────────────────────────────────────────
  const customTextRenderer = useCallback(
    ({ str, pageIndex }: { str: string; pageIndex: number }) => {
      if (!str.trim()) return str
      const map   = spanMaps[pageIndex + 1]
      if (!map) return str
      const entry = map.get(str.trim())
      if (!entry) return str

      const { start, end } = entry

      // Full span highlight — no offsets stored
      if (start === undefined && end === undefined) {
        return `<mark ${MARK}>${esc(str)}</mark>`
      }

      const s = Math.max(0, start ?? 0)
      const e = Math.min(str.length, end ?? str.length)

      // BUG FIX: if offsets are invalid (s >= e), do NOT fall back to full-span highlight.
      // Returning str (unhighlighted) is correct — it exposes the capture bug rather than
      // masking it with a spurious full-span highlight that confuses users.
      if (s >= e) return str

      const before = str.slice(0, s)
      const hl     = str.slice(s, e)
      const after  = str.slice(e)

      // If the highlighted portion is only whitespace, nothing visible to show
      if (!hl.trim()) return str

      return `${esc(before)}<mark ${MARK}>${esc(hl)}</mark>${esc(after)}`
    },
    [spanMaps]
  )

  return (
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
  )
}
