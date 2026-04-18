'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import { getFile } from '@/lib/idb'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

const norm = (s: string) =>
  s.replace(/[,|·•–—\-]/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim()

// Per-page data: joined text for page search + individual items for span indexing
interface PageData { text: string; items: string[] }

function applyHighlight(layer: Element, targetIndices: Set<number>) {
  // Clear previous
  layer.querySelectorAll('span[data-proof-hl]').forEach(el => {
    el.removeAttribute('data-proof-hl')
    const s = el.getAttribute('style') ?? ''
    el.setAttribute('style', s.replace(/;?background:[^;]+;?border-radius:[^;]+/g, ''))
  })

  if (!targetIndices.size) return

  // spans[i] corresponds to the i-th non-empty text item from getTextContent()
  const spans = Array.from(layer.querySelectorAll('span'))
  targetIndices.forEach(i => {
    const span = spans[i]
    if (!span) return
    span.setAttribute('style', (span.getAttribute('style') ?? '') +
      ';background:rgba(30,90,40,0.55);border-radius:2px;')
    span.setAttribute('data-proof-hl', '1')
  })
}

function findTargetIndices(pageData: PageData, needle: string): Set<number> {
  const words = [...new Set(norm(needle).split(/\s+/).filter(w => w.length >= 3))]
  if (!words.length) return new Set()

  // Score each item by keyword overlap
  const normItems = pageData.items.map(norm)
  const scores    = normItems.map(t => words.filter(w => t.includes(w)).length)
  const maxScore  = Math.max(...scores)
  if (maxScore < 1) return new Set()

  const hit = new Set<number>()

  // Find best-scoring item
  const bestIdx = scores.indexOf(maxScore)
  hit.add(bestIdx)

  // Extend backward: include adjacent items with hits
  let first = bestIdx
  while (first - 1 >= 0 && scores[first - 1] > 0) { first--; hit.add(first) }

  // Extend forward: include items with hits OR wrapped continuation lines
  const CONTS = new Set(['for','and','the','a','an','of','in','to','with','by','at','from','or','nor','but','as'])
  let last = bestIdx
  while (last + 1 < pageData.items.length) {
    const curText  = pageData.items[last].trim()
    const nextText = pageData.items[last + 1].trim()
    if (!nextText) { last++; continue }
    const lastWord = curText.split(/\s+/).pop()?.toLowerCase().replace(/\W/g, '') ?? ''
    const isCont   = CONTS.has(lastWord)
                  || (/^[a-z]/.test(nextText) && !/[.!?]$/.test(curText))
    if (isCont) { hit.add(last + 1); last++ } else break
  }

  return hit
}

export default function PdfViewer({ srcId, highlight }: { srcId: string; highlight: string | null }) {
  const [file,      setFile]      = useState<File | null>(null)
  const [numPages,  setNumPages]  = useState(0)
  const [pageData,  setPageData]  = useState<PageData[]>([])
  const [missing,   setMissing]   = useState(false)
  const [width,     setWidth]     = useState(600)
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs     = useRef<(HTMLDivElement | null)[]>([])
  // Pending highlight: indices to apply once the text layer is ready
  const pending = useRef<{ pageIdx: number; indices: Set<number> } | null>(null)

  useEffect(() => {
    setFile(null); setMissing(false); setNumPages(0); setPageData([])
    pending.current = null
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
    const data = await Promise.all(
      Array.from({ length: pdf.numPages }, async (_, i) => {
        const page    = await pdf.getPage(i + 1)
        const content = await page.getTextContent()
        const items   = (content.items as { str: string }[])
          .map(item => item.str)
          .filter(s => s.trim().length > 0) // match what PDF.js renders as spans
        return { text: items.join(' '), items }
      })
    )
    setPageData(data)
  }

  // Find page + target span indices when highlight or pageData changes
  useEffect(() => {
    pending.current = null
    if (!highlight || !pageData.length) return

    const needle   = norm(highlight)
    const pageLows = pageData.map(d => norm(d.text))

    // Find which page
    const slices = [100, 60, 40, 20].map(n => needle.slice(0, n)).filter((s, i, a) => s.length >= 8 && a.indexOf(s) === i)
    let idx = -1
    for (const s of slices) {
      idx = pageLows.findIndex(t => t.includes(s))
      if (idx !== -1) break
    }
    if (idx === -1) {
      const words = needle.split(/\s+/)
      outer:
      for (let w = Math.min(6, words.length); w >= 3; w--) {
        for (let i = 0; i <= words.length - w; i++) {
          const phrase = words.slice(i, i + w).join(' ')
          if (phrase.length < 8) continue
          const found = pageLows.findIndex(t => t.includes(phrase))
          if (found !== -1) { idx = found; break outer }
        }
      }
    }
    if (idx === -1) {
      const kws = needle.split(/\s+/).filter(w => w.length > 4)
      if (kws.length >= 2) {
        let best = 0
        pageLows.forEach((t, i) => {
          const hits = kws.filter(w => t.includes(w)).length
          if (hits > best) { best = hits; idx = i }
        })
        if (best < 2) idx = -1
      }
    }
    if (idx === -1) return

    // Find which item indices to highlight
    const indices = findTargetIndices(pageData[idx], highlight)
    if (!indices.size) return

    // Scroll to page
    const pageEl = pageRefs.current[idx]
    pageEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    // Try to apply immediately; if layer not ready yet, store as pending
    const layer = pageEl?.querySelector('.textLayer')
    const spans = layer?.querySelectorAll('span')
    if (layer && spans && spans.length > 0) {
      applyHighlight(layer, indices)
    } else {
      pending.current = { pageIdx: idx, indices }
    }
  }, [highlight, pageData])

  // Called when a page's text layer finishes rendering
  const onTextLayer = useCallback((pageIdx: number) => {
    const p = pending.current
    if (!p || p.pageIdx !== pageIdx) return
    const pageEl = pageRefs.current[pageIdx]
    const layer  = pageEl?.querySelector('.textLayer')
    if (layer) {
      pending.current = null
      applyHighlight(layer, p.indices)
    }
  }, [])

  // Clear highlights when returning to breakdown
  useEffect(() => {
    if (highlight) return
    pending.current = null
    containerRef.current?.querySelectorAll('span[data-proof-hl]').forEach(el => {
      el.removeAttribute('data-proof-hl')
      const s = el.getAttribute('style') ?? ''
      el.setAttribute('style', s.replace(/;?background:[^;]+;?border-radius:[^;]+/g, ''))
    })
  }, [highlight])

  const setPageRef = useCallback((el: HTMLDivElement | null, i: number) => {
    pageRefs.current[i] = el
  }, [])

  if (missing) return (
    <div style={{ padding: '32px 0', fontSize: '11px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      file not found — re-upload to view.
    </div>
  )
  if (!file) return (
    <div style={{ padding: '32px 0', fontSize: '11px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      loading...
    </div>
  )

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <Document
        file={file}
        onLoadSuccess={onDocumentLoad}
        loading={<div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '20px 0' }}>rendering...</div>}
        error={<div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '20px 0' }}>could not render pdf.</div>}
      >
        {Array.from({ length: numPages }, (_, i) => (
          <div key={i} ref={el => setPageRef(el, i)} style={{ marginBottom: '12px' }}>
            <Page
              pageNumber={i + 1}
              width={width}
              renderTextLayer
              renderAnnotationLayer={false}
              onRenderTextLayerSuccess={() => onTextLayer(i)}
            />
          </div>
        ))}
      </Document>
    </div>
  )
}
