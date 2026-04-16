'use client'
import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import SourceItem from './SourceItem'

// Design tokens — shared across every row in the left panel
const BG         = '#0d0d0d'
const BORD       = '#1a1a1a'
const BORD_FOCUS = '#333'
const TEXT       = '#444'   // hint text + placeholder (matched via .sp-input::placeholder in globals.css)
const TEXT_HOVER = '#888'

// The same visual shell used for every row
const rowShell: React.CSSProperties = {
  margin: '10px 10px 0',
  padding: '11px 14px',
  background: BG,
  border: `1px dashed ${BORD}`,
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  flexShrink: 0,
  transition: 'border-color 0.15s',
}

export default function SourcePanel({ width }: { width: number }) {
  const { sources, uploadFiles, isAnalyzing, addUrl } = useApp()
  const [urlInput, setUrlInput] = useState('')
  const [dragOver, setDragOver]       = useState(false)
  const [filterInput, setFilterInput] = useState('')
  const [filter, setFilter]           = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setFilter(filterInput), 150)
    return () => clearTimeout(t)
  }, [filterInput])

  return (
    <div style={{ width, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Row 1 — PDF drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault(); setDragOver(false)
          const pdfs = Array.from(e.dataTransfer.files).filter(f =>
            f.type === 'application/pdf' || f.name.endsWith('.pdf'))
          if (pdfs.length) uploadFiles(pdfs as unknown as FileList)
        }}
        onClick={() => !isAnalyzing && fileRef.current?.click()}
        style={{
          ...rowShell,
          background: dragOver ? '#111' : BG,
          borderColor: dragOver ? BORD_FOCUS : BORD,
          cursor: isAnalyzing ? 'default' : 'pointer',
        }}
      >
        <span style={{ flex: 1, fontSize: '12px', color: dragOver ? TEXT_HOVER : TEXT, letterSpacing: '0.06em' }}>
          {isAnalyzing ? 'Analyzing...' : dragOver ? 'Drop to add' : 'Drop PDFs or click'}
        </span>
        <button
          onClick={e => { e.stopPropagation(); if (!isAnalyzing) fileRef.current?.click() }}
          disabled={isAnalyzing}
          style={{
            flexShrink: 0, background: 'none', border: `1px solid ${BORD}`,
            borderRadius: '3px', padding: '3px 8px',
            color: isAnalyzing ? BORD : TEXT, fontSize: '12px',
            cursor: isAnalyzing ? 'default' : 'pointer',
            fontFamily: 'inherit', outline: 'none',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { if (!isAnalyzing) { e.currentTarget.style.borderColor = BORD_FOCUS; e.currentTarget.style.color = TEXT_HOVER } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = BORD; e.currentTarget.style.color = isAnalyzing ? BORD : TEXT }}
        >
          ↑
        </button>
      </div>

      <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.length) { uploadFiles(e.target.files); e.target.value = '' } }}
      />

      {/* Row 2 — URL input (same shell, transparent input inside) */}
      <form
        onSubmit={e => {
          e.preventDefault()
          const v = urlInput.trim()
          if (!v || isAnalyzing) return
          addUrl(v); setUrlInput('')
        }}
        style={{ ...rowShell }}
        onFocusCapture={e => (e.currentTarget.style.borderColor = BORD_FOCUS)}
        onBlurCapture={e => (e.currentTarget.style.borderColor = BORD)}
      >
        <input
          type="text"
          className="sp-input"
          placeholder="Paste a link..."
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          disabled={isAnalyzing}
          style={{
            flex: 1, minWidth: 0,
            background: 'transparent', border: 'none', outline: 'none',
            fontSize: '12px', color: TEXT, fontFamily: 'inherit',
            letterSpacing: '0.06em',
            opacity: isAnalyzing ? 0.5 : 1,
          }}
        />
        <button
          type="submit"
          disabled={isAnalyzing || !urlInput.trim()}
          style={{
            flexShrink: 0, background: 'none', border: 'none',
            padding: 0, color: urlInput.trim() ? TEXT : BORD,
            fontSize: '12px', cursor: urlInput.trim() && !isAnalyzing ? 'pointer' : 'default',
            fontFamily: 'inherit', outline: 'none',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { if (urlInput.trim() && !isAnalyzing) e.currentTarget.style.color = TEXT_HOVER }}
          onMouseLeave={e => { e.currentTarget.style.color = urlInput.trim() ? TEXT : BORD }}
        >
          →
        </button>
      </form>

      {/* Source list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {sources.length > 0 && (
          <div
            style={{ ...rowShell, padding: '9px 14px' }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = BORD_FOCUS)}
            onBlurCapture={e => (e.currentTarget.style.borderColor = BORD)}
          >
            <input
              className="sp-input"
              value={filterInput}
              onChange={e => setFilterInput(e.target.value)}
              placeholder="Filter..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: '12px', color: TEXT, fontFamily: 'inherit',
                letterSpacing: '0.06em',
              }}
            />
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sources.length === 0
            ? <div style={{ padding: '10px 14px', fontSize: '12px', color: TEXT, letterSpacing: '0.06em' }}>No documents yet.</div>
            : (() => {
                const q = filter.trim().toLowerCase()
                const visible = q
                  ? sources.filter(s => (s.label || s.result?.title || s.raw).toLowerCase().includes(q))
                  : sources
                return visible.length === 0
                  ? <div style={{ padding: '20px 14px', fontSize: '12px', color: TEXT, letterSpacing: '0.06em' }}>No match.</div>
                  : visible.map(src => <SourceItem key={src.id} src={src} />)
              })()
          }
        </div>
      </div>
    </div>
  )
}
