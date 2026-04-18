'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import { getFile } from '@/lib/idb'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

const norm = (s: string) =>
  s.replace(/[,|·•–—\-]/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim()

function clearHighlights(root: Element) {
  root.querySelectorAll('span[data-proof-hl]').forEach(el => {
    el.removeAttribute('data-proof-hl')
    const s = el.getAttribute('style') ?? ''
    el.setAttribute('style', s.replace(/;?background:[^;]+;?border-radius:[^;]+/g, ''))
  })
}

function applyDim(span: HTMLElement) {
  const s = span.getAttribute('style') ?? ''
  span.setAttribute('style', s + ';background:rgba(30,90,40,0.3);border-radius:2px;')
  span.setAttribute('data-proof-hl', '1')
}

function applyBright(span: HTMLElement) {
  const s = span.getAttribute('style') ?? ''
  span.setAttribute('style', s + ';background:rgba(30,90,40,0.65);border-radius:2px;')
  span.setAttribute('data-proof-hl', '1')
}

function getMatchingSpans(layer: Element, words: string[]): HTMLElement[] {
  const spans = Array.from(layer.querySelectorAll('span')) as HTMLElement[]
  return spans.filter(s => {
    const t = norm(s.textContent ?? '')
    return words.some(w => t.includes(w))
  })
}

export default function PdfViewer({ srcId, searchTerm }: { srcId: string; searchTerm: string | null }) {
  const [file,        setFile]        = useState<File | null>(null)
  const [numPages,    setNumPages]    = useState(0)
  const [missing,     setMissing]     = useState(false)
  const [width,       setWidth]       = useState(600)
  const [matchCount,  setMatchCount]  = useState(0)
  const [currentMatch, setCurrentMatch] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs     = useRef<(HTMLDivElement | null)[]>([])
  const matchEls     = useRef<HTMLElement[]>([])
  const searchWords  = useRef<string[]>([])

  useEffect(() => {
    setFile(null); setMissing(false); setNumPages(0)
    setMatchCount(0); setCurrentMatch(0)
    matchEls.current = []
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

  // Run search across all rendered layers
  const runSearch = useCallback((term: string | null) => {
    // Clear everywhere
    pageRefs.current.forEach(el => el && clearHighlights(el))
    matchEls.current = []
    setMatchCount(0)
    setCurrentMatch(0)

    if (!term?.trim()) { searchWords.current = []; return }

    const words = [...new Set(norm(term).split(/\s+/).filter(w => w.length >= 2))]
    searchWords.current = words
    if (!words.length) return

    const matches: HTMLElement[] = []
    pageRefs.current.forEach(pageEl => {
      if (!pageEl) return
      const layer = pageEl.querySelector('.textLayer')
      if (!layer) return
      getMatchingSpans(layer, words).forEach(s => { applyDim(s); matches.push(s) })
    })

    matchEls.current = matches
    setMatchCount(matches.length)
    if (matches.length > 0) focusIdx(matches, 0)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function focusIdx(matches: HTMLElement[], idx: number) {
    // Reset all to dim
    matches.forEach(s => {
      const cur = s.getAttribute('style') ?? ''
      s.setAttribute('style', cur.replace(/;?background:[^;]+/g, '') + ';background:rgba(30,90,40,0.3);border-radius:2px;')
    })
    const el = matches[idx]
    if (!el) return
    // Make current bright
    const cur = el.getAttribute('style') ?? ''
    el.setAttribute('style', cur.replace(/;?background:[^;]+/g, '') + ';background:rgba(30,90,40,0.7);border-radius:2px;')
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setCurrentMatch(idx)
  }

  function navMatch(dir: 1 | -1) {
    const matches = matchEls.current
    if (!matches.length) return
    const next = (currentMatch + dir + matches.length) % matches.length
    focusIdx(matches, next)
  }

  useEffect(() => { runSearch(searchTerm) }, [searchTerm, runSearch])

  // When a text layer renders, apply search to it
  const onTextLayerRendered = useCallback((pageIdx: number) => {
    const words = searchWords.current
    if (!words.length) return
    const pageEl = pageRefs.current[pageIdx]
    const layer  = pageEl?.querySelector('.textLayer')
    if (!layer) return

    const newSpans = getMatchingSpans(layer, words)
    if (!newSpans.length) return

    // Insert into matchEls in document order (after all previous pages)
    const pagesBeforeCount = matchEls.current.filter(el => {
      const pg = pageRefs.current.findIndex(p => p && p.contains(el))
      return pg < pageIdx
    }).length

    newSpans.forEach((s, i) => {
      applyDim(s)
      matchEls.current.splice(pagesBeforeCount + i, 0, s)
    })

    setMatchCount(matchEls.current.length)
  }, [])

  async function onDocumentLoad(pdf: pdfjs.PDFDocumentProxy) {
    setNumPages(pdf.numPages)
  }

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Match navigation bar */}
      {matchCount > 0 && (
        <div style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '7px 16px',
          borderBottom: '1px solid #1a1a1a',
          background: '#080808',
        }}>
          <span style={{ fontSize: '11px', color: '#555', letterSpacing: '0.06em' }}>
            {currentMatch + 1} of {matchCount}
          </span>
          <button
            onClick={() => navMatch(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: '13px', padding: '0 2px', outline: 'none', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.color = '#aaa'}
            onMouseLeave={e => e.currentTarget.style.color = '#555'}
          >↑</button>
          <button
            onClick={() => navMatch(1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: '13px', padding: '0 2px', outline: 'none', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.color = '#aaa'}
            onMouseLeave={e => e.currentTarget.style.color = '#555'}
          >↓</button>
        </div>
      )}

      {/* PDF */}
      <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 0' }}>
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
    </div>
  )
}
