'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import { getFile } from '@/lib/idb'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

const norm = (s: string) =>
  s.replace(/[,|·•–—\-]/g, ' ').replace(/\s+/g, ' ').toLowerCase()

const CONTS = new Set(['for','and','the','a','an','of','in','to','with','by','at','from','or','nor','but','as','that','which'])

function highlightInLayer(layer: Element, needle: string) {
  layer.querySelectorAll('span[data-proof-hl]').forEach(el => {
    el.removeAttribute('data-proof-hl')
    const s = el.getAttribute('style') ?? ''
    el.setAttribute('style', s.replace(/;?background:[^;]+;?border-radius:[^;]+/g, ''))
  })

  if (!needle) return

  const spans = Array.from(layer.querySelectorAll('span'))
  if (!spans.length) return

  const words = [...new Set(norm(needle).split(/\s+/).filter(w => w.length >= 3))]
  if (!words.length) return

  const normSpans = spans.map(s => norm(s.textContent ?? ''))
  const scores    = normSpans.map(t => words.filter(w => t.includes(w)).length)
  const maxScore  = Math.max(...scores)
  if (maxScore < 1) return

  const bestIdx = scores.indexOf(maxScore)
  const hit = new Set<number>([bestIdx])

  let first = bestIdx
  while (first - 1 >= 0 && scores[first - 1] > 0) { first--; hit.add(first) }

  let last = bestIdx
  while (last + 1 < spans.length) {
    const curText  = spans[last].textContent?.trim() ?? ''
    const nextText = spans[last + 1].textContent?.trim() ?? ''
    if (!nextText) { last++; continue }
    const lastWord = curText.split(/\s+/).pop()?.toLowerCase().replace(/\W/g, '') ?? ''
    const isCont   = CONTS.has(lastWord)
                  || (/^[a-z]/.test(nextText) && !/[.!?]$/.test(curText))
    if (isCont) { hit.add(last + 1); last++ } else break
  }

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

  useEffect(() => {
    setFile(null); setMissing(false); setNumPages(0); setPageTexts([])
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
        return (content.items as { str: string }[]).map(item => item.str).join(' ')
      })
    )
    setPageTexts(texts)
  }

  useEffect(() => {
    if (!highlight || !pageTexts.length) return

    const needle   = norm(highlight)
    const pageLows = pageTexts.map(t => norm(t))

    const slices = [100, 60, 40, 20].map(n => needle.slice(0, n)).filter((s, i, a) => s.length >= 10 && a.indexOf(s) === i)
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
          if (phrase.length < 10) continue
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

    const pageEl = pageRefs.current[idx]
    pageEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    // Poll until text layer has spans (correct class name: .textLayer)
    let attempts = 0
    const tryHL = () => {
      const layer = pageEl?.querySelector('.textLayer')
      if (layer && layer.querySelectorAll('span').length > 0) {
        highlightInLayer(layer, needle)
      } else if (attempts++ < 15) {
        setTimeout(tryHL, 200)
      }
    }
    tryHL()
  }, [highlight, pageTexts])

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
