'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import { getFile } from '@/lib/idb'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

const norm = (s: string) =>
  s.replace(/[,|·•–—\-]/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim()

function clearHighlights(layer: Element) {
  layer.querySelectorAll('span[data-proof-hl]').forEach(el => {
    el.removeAttribute('data-proof-hl')
    const s = el.getAttribute('style') ?? ''
    el.setAttribute('style', s.replace(/;?background:[^;]+;?border-radius:[^;]+/g, ''))
  })
}

function highlightSpans(layer: Element, needle: string) {
  clearHighlights(layer)

  const words = [...new Set(norm(needle).split(/\s+/).filter(w => w.length >= 3))]
  if (!words.length) return

  const spans     = Array.from(layer.querySelectorAll('span'))
  const normTexts = spans.map(s => norm(s.textContent ?? ''))
  const scores    = normTexts.map(t => words.filter(w => t.includes(w)).length)
  const maxScore  = Math.max(...scores)
  if (maxScore < 1) return

  const bestIdx = scores.indexOf(maxScore)
  const hit     = new Set<number>()
  hit.add(bestIdx)

  // Extend backward through adjacent scoring spans
  let first = bestIdx
  while (first - 1 >= 0 && scores[first - 1] > 0) { first--; hit.add(first) }

  // Extend forward: keyword hits only (no continuation heuristic — caused over-highlighting)
  let last = bestIdx
  while (last + 1 < spans.length && scores[last + 1] > 0) { last++; hit.add(last) }

  hit.forEach(i => {
    const span = spans[i]
    if (!span) return
    const cur = span.getAttribute('style') ?? ''
    span.setAttribute('style', cur + ';background:rgba(30,90,40,0.55);border-radius:2px;')
    span.setAttribute('data-proof-hl', '1')
  })
}

export default function PdfViewer({ srcId, highlight }: { srcId: string; highlight: string | null }) {
  const [file,     setFile]     = useState<File | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [missing,  setMissing]  = useState(false)
  const [width,    setWidth]    = useState(600)

  // Per-page joined text — used only to identify which page the highlight is on
  const pageTexts = useRef<string[]>([])

  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs     = useRef<(HTMLDivElement | null)[]>([])

  // What we want to highlight right now
  const pendingHL = useRef<{ pageIdx: number; needle: string } | null>(null)

  useEffect(() => {
    setFile(null); setMissing(false); setNumPages(0)
    pageTexts.current = []
    pendingHL.current = null
    getFile(srcId).then(f => { if (f) setFile(f); else setMissing(true) })
  }, [srcId])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w) setWidth(Math.floor(w) - 40)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  async function onDocumentLoad(pdf: pdfjs.PDFDocumentProxy) {
    setNumPages(pdf.numPages)
    const texts = await Promise.all(
      Array.from({ length: pdf.numPages }, async (_, i) => {
        const page    = await pdf.getPage(i + 1)
        const content = await page.getTextContent()
        return (content.items as { str: string }[]).map(it => it.str).join(' ')
      })
    )
    pageTexts.current = texts

    // If we already have a highlight queued, find the page now
    if (highlight) scheduleHighlight(highlight, texts)
  }

  function scheduleHighlight(needle: string, texts: string[]) {
    const normNeedle = norm(needle)
    const normTexts  = texts.map(norm)

    // Try progressively shorter prefix slices first
    const slices = [100, 60, 40, 20]
      .map(n => normNeedle.slice(0, n))
      .filter((s, i, a) => s.length >= 8 && a.indexOf(s) === i)

    let idx = -1
    for (const s of slices) {
      idx = normTexts.findIndex(t => t.includes(s))
      if (idx !== -1) break
    }

    // Fallback: sliding window of words
    if (idx === -1) {
      const ws = normNeedle.split(/\s+/)
      outer:
      for (let w = Math.min(6, ws.length); w >= 3; w--) {
        for (let i = 0; i <= ws.length - w; i++) {
          const phrase = ws.slice(i, i + w).join(' ')
          if (phrase.length < 8) continue
          const found = normTexts.findIndex(t => t.includes(phrase))
          if (found !== -1) { idx = found; break outer }
        }
      }
    }

    // Fallback: keyword vote
    if (idx === -1) {
      const kws = normNeedle.split(/\s+/).filter(w => w.length > 4)
      if (kws.length >= 2) {
        let best = 0
        normTexts.forEach((t, i) => {
          const hits = kws.filter(w => t.includes(w)).length
          if (hits > best) { best = hits; idx = i }
        })
        if (best < 2) idx = -1
      }
    }

    if (idx === -1) return

    // Scroll to the page
    pageRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    // Try to highlight immediately if text layer is already rendered
    const pageEl = pageRefs.current[idx]
    const layer  = pageEl?.querySelector('.textLayer')
    if (layer && layer.querySelectorAll('span').length > 0) {
      highlightSpans(layer, needle)
    } else {
      pendingHL.current = { pageIdx: idx, needle }
    }
  }

  // Re-run when highlight changes (e.g. user clicks a different item)
  useEffect(() => {
    pendingHL.current = null

    if (!highlight) {
      // Clear all highlights
      containerRef.current?.querySelectorAll('span[data-proof-hl]').forEach(el => {
        el.removeAttribute('data-proof-hl')
        const s = el.getAttribute('style') ?? ''
        el.setAttribute('style', s.replace(/;?background:[^;]+;?border-radius:[^;]+/g, ''))
      })
      return
    }

    if (pageTexts.current.length) {
      scheduleHighlight(highlight, pageTexts.current)
    }
    // If pageTexts not ready yet, onDocumentLoad will call scheduleHighlight
  }, [highlight]) // eslint-disable-line react-hooks/exhaustive-deps

  const onTextLayerRendered = useCallback((pageIdx: number) => {
    const p = pendingHL.current
    if (!p || p.pageIdx !== pageIdx) return
    const layer = pageRefs.current[pageIdx]?.querySelector('.textLayer')
    if (layer) {
      pendingHL.current = null
      highlightSpans(layer, p.needle)
    }
  }, [])

  const setPageRef = useCallback((el: HTMLDivElement | null, i: number) => {
    pageRefs.current[i] = el
  }, [])

  if (missing) return (
    <div style={{ padding: '24px', fontSize: '11px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      file not found — re-upload to view.
    </div>
  )
  if (!file) return (
    <div style={{ padding: '24px', fontSize: '11px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      loading...
    </div>
  )

  return (
    <div ref={containerRef} style={{ width: '100%', padding: '20px 0' }}>
      <Document
        file={file}
        onLoadSuccess={onDocumentLoad}
        loading={<div style={{ padding: '24px', fontSize: '11px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>rendering...</div>}
        error={<div style={{ padding: '24px', fontSize: '11px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>could not render pdf.</div>}
      >
        {Array.from({ length: numPages }, (_, i) => (
          <div key={i} ref={el => setPageRef(el, i)} style={{ marginBottom: '12px' }}>
            <Page
              pageNumber={i + 1}
              width={width}
              renderTextLayer
              renderAnnotationLayer={false}
              onRenderTextLayerSuccess={() => onTextLayerRendered(i)}
            />
          </div>
        ))}
      </Document>
    </div>
  )
}
