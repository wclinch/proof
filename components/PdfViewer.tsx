'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { getFile } from '@/lib/idb'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export default function PdfViewer({ srcId, highlight }: { srcId: string; highlight: string | null }) {
  const [file,       setFile]       = useState<File | null>(null)
  const [numPages,   setNumPages]   = useState(0)
  const [pageTexts,  setPageTexts]  = useState<string[]>([])
  const [missing,    setMissing]    = useState(false)
  const [width,      setWidth]      = useState(600)
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs     = useRef<(HTMLDivElement | null)[]>([])

  // Load file from IndexedDB
  useEffect(() => {
    setFile(null); setMissing(false); setNumPages(0); setPageTexts([])
    getFile(srcId).then(f => { if (f) setFile(f); else setMissing(true) })
  }, [srcId])

  // Measure container width for responsive page sizing
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

  // Extract text from all pages after document loads
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

  // Jump to the page containing the highlight needle
  useEffect(() => {
    if (!highlight || !pageTexts.length) return
    const needle = highlight.toLowerCase().slice(0, 80)
    const idx    = pageTexts.findIndex(t => t.toLowerCase().includes(needle))
    if (idx !== -1) {
      pageRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [highlight, pageTexts])

  const setPageRef = useCallback((el: HTMLDivElement | null, i: number) => {
    pageRefs.current[i] = el
  }, [])

  if (missing) {
    return (
      <div style={{ padding: '32px 0', fontSize: '11px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        file not found — re-upload to view.
      </div>
    )
  }

  if (!file) {
    return (
      <div style={{ padding: '32px 0', fontSize: '11px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        loading...
      </div>
    )
  }

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
          <div
            key={i}
            ref={el => setPageRef(el, i)}
            style={{ marginBottom: '12px' }}
          >
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
