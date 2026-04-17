'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import { getFile } from '@/lib/idb'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

// Highlight matching text spans inside a rendered text layer
function highlightInLayer(layer: Element, needle: string) {
  // Clear previous highlights
  layer.querySelectorAll('span[data-proof-hl]').forEach(el => {
    const parent = el.parentNode
    if (parent) {
      el.childNodes.forEach(n => parent.insertBefore(n, el))
      parent.removeChild(el)
    }
  })

  if (!needle) return

  const tokens = needle.toLowerCase().split(/\s+/).filter(t => t.length > 3)
  if (!tokens.length) return

  layer.querySelectorAll('span').forEach(span => {
    if (span.hasAttribute('data-proof-hl')) return
    const text = span.textContent?.toLowerCase() ?? ''
    if (tokens.some(tok => text.includes(tok))) {
      span.setAttribute('style', (span.getAttribute('style') ?? '') +
        ';background:rgba(30,90,40,0.55);border-radius:2px;')
      span.setAttribute('data-proof-hl', '1')
    }
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

    const needle  = highlight.replace(/\s+/g, ' ').trim().toLowerCase()
    const needleShort = needle.slice(0, 80)

    // Try progressively shorter slices
    const candidates = [
      needle.slice(0, 120),
      needle.slice(0, 60),
      needle.slice(0, 30),
    ].filter((s, i, a) => s.length >= 10 && a.indexOf(s) === i)

    let idx = -1
    for (const c of candidates) {
      idx = pageTexts.findIndex(t => t.toLowerCase().includes(c))
      if (idx !== -1) break
    }

    // Fallback: page with most keyword overlaps
    if (idx === -1) {
      const words = needleShort.split(/\s+/).filter(w => w.length > 4)
      if (words.length) {
        let best = 0
        pageTexts.forEach((t, i) => {
          const hits = words.filter(w => t.toLowerCase().includes(w)).length
          if (hits > best) { best = hits; idx = i }
        })
        if (best < 2) idx = -1
      }
    }

    if (idx === -1) return

    const pageEl = pageRefs.current[idx]
    pageEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    // Highlight in text layer — wait for scroll + layer paint
    setTimeout(() => {
      const layer = pageEl?.querySelector('.react-pdf__Page__textContent')
      if (layer) highlightInLayer(layer, needle)
    }, 500)
  }, [highlight, pageTexts])

  // Clear highlights when highlight is null
  useEffect(() => {
    if (highlight) return
    containerRef.current?.querySelectorAll('span[data-proof-hl]').forEach(el => {
      el.removeAttribute('style')
      el.removeAttribute('data-proof-hl')
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
