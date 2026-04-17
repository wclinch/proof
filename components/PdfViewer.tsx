'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import { getFile } from '@/lib/idb'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

const norm = (s: string) =>
  s.replace(/[,|·•–—]/g, ' ').replace(/\s+/g, ' ').toLowerCase()

// Highlight the spans in the text layer that correspond to the needle match
function highlightInLayer(layer: Element, needle: string) {
  // Clear previous highlights
  layer.querySelectorAll('span[data-proof-hl]').forEach(el => {
    el.removeAttribute('data-proof-hl')
    const s = el.getAttribute('style') ?? ''
    el.setAttribute('style', s.replace(/;?background:[^;]+;?border-radius:[^;]+/g, ''))
  })

  if (!needle) return

  const spans = Array.from(layer.querySelectorAll('span'))
  if (!spans.length) return

  // Build normalized full text + a char→spanIndex map so positions always align
  const charToSpan: number[] = []
  let normFull = ''
  spans.forEach((span, si) => {
    const t = norm(span.textContent ?? '') + ' '
    for (let i = 0; i < t.length; i++) charToSpan.push(si)
    normFull += t
  })

  const normNeedle = norm(needle)

  // Try progressively shorter slices
  const slices = [80, 50, 25, 12]
    .map(n => normNeedle.slice(0, n))
    .filter((s, i, a) => s.length >= 8 && a.indexOf(s) === i)

  let matchStart = -1, matchEnd = -1
  for (const slice of slices) {
    const idx = normFull.indexOf(slice)
    if (idx !== -1) { matchStart = idx; matchEnd = idx + slice.length; break }
  }

  // Fallback: sliding 3–5 word window
  if (matchStart === -1) {
    const words = normNeedle.trim().split(/\s+/)
    outer:
    for (let w = Math.min(5, words.length); w >= 3; w--) {
      for (let i = 0; i <= words.length - w; i++) {
        const phrase = words.slice(i, i + w).join(' ')
        if (phrase.length < 10) continue
        const idx = normFull.indexOf(phrase)
        if (idx !== -1) { matchStart = idx; matchEnd = idx + phrase.length; break outer }
      }
    }
  }

  if (matchStart === -1) return

  // Find which spans own characters in [matchStart, matchEnd)
  const hit = new Set<number>()
  for (let i = matchStart; i < matchEnd && i < charToSpan.length; i++) hit.add(charToSpan[i])

  hit.forEach(si => {
    spans[si].setAttribute('style', (spans[si].getAttribute('style') ?? '') +
      ';background:rgba(30,90,40,0.55);border-radius:2px;')
    spans[si].setAttribute('data-proof-hl', '1')
  })
}

export default function PdfViewer({ srcId, highlight }: { srcId: string; highlight: string | null }) {
  const [file,      setFile]      = useState<File | null>(null)
  const [numPages,  setNumPages]  = useState(0)
  const [pageTexts, setPageTexts] = useState<string[]>([])
  const [missing,   setMissing]   = useState(false)
  const [width,     setWidth]     = useState(600)
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs     = useRef<(HTMLDivElement | null)[]>([])

  // Load file from IndexedDB
  useEffect(() => {
    setFile(null); setMissing(false); setNumPages(0); setPageTexts([])
    getFile(srcId).then(f => { if (f) setFile(f); else setMissing(true) })
  }, [srcId])

  // Measure container width
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

  // Extract per-page text after document loads
  async function onDocumentLoad(pdf: pdfjs.PDFDocumentProxy) {
    setNumPages(pdf.numPages)
    const texts = await Promise.all(
      Array.from({ length: pdf.numPages }, async (_, i) => {
        const page    = await pdf.getPage(i + 1)
        const content = await page.getTextContent()
        return (content.items as { str: string }[]).map(item => item.str).join(' ')
      })
    )
    setPageTexts(texts)
  }

  // Jump to the right page and highlight matching spans in the text layer
  useEffect(() => {
    if (!highlight || !pageTexts.length) return

    const needle     = norm(highlight)
    const pageLows   = pageTexts.map(t => norm(t))

    // Page search: progressively shorter needle slices
    const slices = [100, 60, 40, 20].map(n => needle.slice(0, n)).filter((s, i, a) => s.length >= 10 && a.indexOf(s) === i)
    let idx = -1
    for (const s of slices) {
      idx = pageLows.findIndex(t => t.includes(s))
      if (idx !== -1) break
    }

    // Fallback: sliding 4-word window
    if (idx === -1) {
      const words = needle.split(/\s+/)
      outer:
      for (let w = Math.min(6, words.length); w >= 3; w--) {
        for (let i = 0; i <= words.length - w; i++) {
          const phrase = words.slice(i, i + w).join(' ')
          if (phrase.length < 10) continue
          const found = pageLows.findIndex(t => t.includes(phrase))
          if (found !== -1) { idx = found; break outer }
        }
      }
    }

    // Fallback: page with most keyword hits
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

    const pageEl = pageRefs.current[idx]
    pageEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    // Highlight in text layer after scroll + paint
    setTimeout(() => {
      const layer = pageEl?.querySelector('.react-pdf__Page__textContent')
      if (layer) highlightInLayer(layer, needle)
    }, 500)
  }, [highlight, pageTexts])

  // Clear highlights when returning to breakdown
  useEffect(() => {
    if (highlight) return
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
        loading={
          <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '20px 0' }}>
            rendering...
          </div>
        }
        error={
          <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '20px 0' }}>
            could not render pdf.
          </div>
        }
      >
        {Array.from({ length: numPages }, (_, i) => (
          <div key={i} ref={el => setPageRef(el, i)} style={{ marginBottom: '12px' }}>
            <Page
              pageNumber={i + 1}
              width={width}
              renderTextLayer
              renderAnnotationLayer={false}
            />
          </div>
        ))}
      </Document>
    </div>
  )
}
