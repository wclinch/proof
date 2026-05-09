'use client'
import { useState, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import { useApp } from '@/context/AppContext'
import { getFile } from '@/lib/idb'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

interface Props {
  pdfOnly?: boolean
  onExpandScreenshot?: () => void
}

export default function ReaderPanel({ pdfOnly = false, onExpandScreenshot }: Props) {
  const { selectedSource, selectedImageSource, setSelectedId, setSelectedImageId } = useApp()
  const [screenshotFull, setScreenshotFull] = useState(false)
  const [pdfFull, setPdfFull] = useState(false)
  const [wrongDrop, setWrongDrop] = useState<'screenshot' | 'pdf' | null>(null)
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function flashWrong(zone: 'screenshot' | 'pdf') {
    setWrongDrop(zone)
    if (wrongTimer.current) clearTimeout(wrongTimer.current)
    wrongTimer.current = setTimeout(() => setWrongDrop(null), 2900)
  }

  function handlePdfDrop(e: React.DragEvent) {
    e.preventDefault()
    const srcId   = e.dataTransfer.getData('application/x-proof-source-id')
    const srcType = e.dataTransfer.getData('application/x-proof-source-type')
    if (!srcId) return
    if (srcType === 'pdf') setSelectedId(srcId)
    else flashWrong('pdf')
  }

  function handleImageDrop(e: React.DragEvent) {
    e.preventDefault()
    const srcId   = e.dataTransfer.getData('application/x-proof-source-id')
    const srcType = e.dataTransfer.getData('application/x-proof-source-type')
    if (!srcId) return
    if (srcType === 'image') setSelectedImageId(srcId)
    else flashWrong('screenshot')
  }

  function allowDrop(e: React.DragEvent) {
    if (e.dataTransfer.types.includes('application/x-proof-source-id')) e.preventDefault()
  }

  // In pdfOnly mode (expanded layout from page.tsx) just show PDF
  if (pdfOnly) {
    return (
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onDragOver={allowDrop} onDrop={handlePdfDrop}>
        <PdfViewer source={selectedSource} />
      </div>
    )
  }

  const showScreenshot = !pdfFull
  const showPdf        = !screenshotFull

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Screenshot zone */}
      {showScreenshot && (
        <div
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          onDragOver={allowDrop}
          onDrop={handleImageDrop}
        >
          <Header
            label="Reference"
            onExpand={() => { setScreenshotFull(true); setPdfFull(false) }}
            onExpandExternal={onExpandScreenshot}
            isFullscreen={screenshotFull}
            onCollapse={() => setScreenshotFull(false)}
            onClose={selectedImageSource ? () => setSelectedImageId(null) : undefined}
          />
          <ImageViewer
            source={selectedImageSource}
            wrongMsg={wrongDrop === 'screenshot' ? 'That\'s a PDF — drop it below' : undefined}
          />
        </div>
      )}

      {showScreenshot && showPdf && (
        <div style={{ height: '1px', flexShrink: 0, background: '#1a1a1a' }} />
      )}

      {/* PDF zone */}
      {showPdf && (
        <div
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          onDragOver={allowDrop}
          onDrop={handlePdfDrop}
        >
          <Header
            label="Pdf"
            onExpand={() => { setPdfFull(true); setScreenshotFull(false) }}
            isFullscreen={pdfFull}
            onCollapse={() => setPdfFull(false)}
            onClose={selectedSource ? () => setSelectedId(null) : undefined}
          />
          <PdfViewer
            source={selectedSource}
            wrongMsg={wrongDrop === 'pdf' ? 'That\'s a reference — drop it above' : undefined}
          />
        </div>
      )}

    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({
  label, onExpand, onExpandExternal, isFullscreen, onCollapse, onClose,
}: {
  label: string
  onExpand: () => void
  onExpandExternal?: () => void
  isFullscreen: boolean
  onCollapse: () => void
  onClose?: () => void
}) {
  return (
    <div style={{
      height: '28px', flexShrink: 0,
      display: 'flex', alignItems: 'center',
      padding: '0 8px 0 14px',
      borderBottom: '1px solid #1a1a1a',
      gap: '4px',
    }}>
      <span style={{ flex: 1, fontSize: '10px', color: '#555', letterSpacing: '0.04em', userSelect: 'none' }}>
        {label}
      </span>
      {onClose && <IconBtn onClick={onClose} title="Close"><CloseIcon /></IconBtn>}
      {isFullscreen
        ? <IconBtn onClick={onCollapse} title="Restore"><CollapseIcon /></IconBtn>
        : <IconBtn onClick={onExpandExternal ?? onExpand} title="Fullscreen"><ExpandIcon /></IconBtn>
      }
    </div>
  )
}

// ─── Image viewer ─────────────────────────────────────────────────────────────

function ImageViewer({ source, wrongMsg }: { source: ReturnType<typeof useApp>['selectedImageSource']; wrongMsg?: string }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const prevUrl = useRef<string | null>(null)

  useEffect(() => {
    if (!source || source.fileType !== 'image' || source.status !== 'done') {
      setImgUrl(null); return
    }
    let cancelled = false
    getFile(source.id).then(file => {
      if (cancelled) return
      if (prevUrl.current) { URL.revokeObjectURL(prevUrl.current); prevUrl.current = null }
      if (!file) { setImgUrl(null); return }
      const url = URL.createObjectURL(file)
      prevUrl.current = url
      setImgUrl(url)
    })
    return () => { cancelled = true }
  }, [source?.id, source?.status])

  useEffect(() => () => {
    if (prevUrl.current) URL.revokeObjectURL(prevUrl.current)
  }, [])

  return (
    <div style={{ flex: 1, background: '#080808', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {!source && <Empty label={wrongMsg ?? 'Drop a reference here'} sub={wrongMsg ? undefined : 'Images, diagrams, or reference material. Click a reference in the left panel or drag it here.'} />}
      {source && source.status !== 'done' && <Msg>Loading...</Msg>}
      {source && source.status === 'done' && !imgUrl && <Msg>Could not load image.</Msg>}
      {source && source.status === 'done' && imgUrl && (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <img src={imgUrl} alt={source.label ?? source.raw}
            draggable={false}
            onDragStart={e => e.preventDefault()}
            style={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none' }} />
        </div>
      )}
    </div>
  )
}

// ─── PDF viewer ───────────────────────────────────────────────────────────────

function PdfViewer({ source, wrongMsg }: { source: ReturnType<typeof useApp>['selectedSource']; wrongMsg?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(640)
  const [fileUrl, setFileUrl]   = useState<string | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [loadError, setLoadError] = useState(false)
  const prevUrl = useRef<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w) setContainerWidth(Math.floor(w))
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!source || source.status !== 'done') {
      setFileUrl(null); setNumPages(0); return
    }
    let cancelled = false
    getFile(source.id).then(file => {
      if (cancelled) return
      if (prevUrl.current) { URL.revokeObjectURL(prevUrl.current); prevUrl.current = null }
      if (!file) { setFileUrl(null); return }
      const url = URL.createObjectURL(file)
      prevUrl.current = url
      setFileUrl(url)
      setNumPages(0)
      setLoadError(false)
    })
    return () => { cancelled = true }
  }, [source?.id, source?.status])

  useEffect(() => () => {
    if (prevUrl.current) URL.revokeObjectURL(prevUrl.current)
  }, [])

  return (
    <div ref={containerRef} style={{ flex: 1, overflow: 'auto', background: '#080808', display: 'flex', flexDirection: 'column' }}>
      {!source                               && <Empty label={wrongMsg ?? 'Drop a PDF here'} sub={wrongMsg ? undefined : 'Your draft on the right stays tied to this document. Click a PDF in the left panel or drag it here.'} />}
      {source?.status === 'queued'           && <Msg>Waiting...</Msg>}
      {source?.status === 'extracting'       && <Msg>Reading document...</Msg>}
      {source?.status === 'done' && !fileUrl && <Msg>Loading...</Msg>}
      {source?.status === 'error'            && <Msg>{source.error ?? 'Could not load document.'}</Msg>}
      {source?.status === 'done' && loadError && <Msg>Could not read this PDF.</Msg>}

      {source?.status === 'done' && fileUrl && !loadError && (
        <div style={{ padding: '16px 0 0' }}>
          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages }) => { setNumPages(numPages); setLoadError(false) }}
            onLoadError={() => setLoadError(true)}
            loading={<Msg>Loading...</Msg>}
            error={null}
          >
            {Array.from({ length: numPages }, (_, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <Page pageNumber={i + 1} width={containerWidth} renderTextLayer renderAnnotationLayer={false} />
              </div>
            ))}
          </Document>
        </div>
      )}
    </div>
  )
}

// ─── Icon button ──────────────────────────────────────────────────────────────

function IconBtn({ onClick, title, children }: {
  onClick: () => void; title: string; children: React.ReactNode
}) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '4px', lineHeight: 0,
        color: hov ? '#999' : '#555',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '2px', flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

function ExpandIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4V1H4" /><path d="M7 1H10V4" />
      <path d="M10 7V10H7" /><path d="M4 10H1V7" />
    </svg>
  )
}

function CollapseIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 1V4H1" /><path d="M10 4H7V1" />
      <path d="M7 10V7H10" /><path d="M1 7H4V10" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M1 1L8 8M8 1L1 8" />
    </svg>
  )
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Msg({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      flex: 1, minHeight: '40px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '11px', color: '#444', letterSpacing: '0.02em',
    }}>
      {children}
    </div>
  )
}

function Empty({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{
      flex: 1, margin: '12px', borderRadius: '4px',
      border: '1px dashed #1e1e1e',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '8px',
    }}>
      <span style={{ fontSize: '13px', color: '#444', letterSpacing: '0.02em' }}>{label}</span>
      {sub && <span style={{ fontSize: '11px', color: '#2e2e2e', letterSpacing: '0.02em', textAlign: 'center', maxWidth: '220px', lineHeight: 1.6 }}>{sub}</span>}
    </div>
  )
}

