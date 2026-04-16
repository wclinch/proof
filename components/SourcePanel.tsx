'use client'
import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import SourceItem from './SourceItem'

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

  // Shared token values for the left panel
  const DIM   = '#2a2a2a'   // all placeholder / label text
  const HOVER = '#555'      // hover text
  const BG    = '#0d0d0d'   // all input / zone backgrounds
  const BORD  = '#1a1a1a'   // all borders at rest
  const BORD_FOCUS = '#333' // border on focus / drag

  const rowBtn: React.CSSProperties = {
    flexShrink: 0,
    background: 'none', border: `1px solid ${BORD}`, borderRadius: '3px',
    padding: '4px 10px', color: DIM, fontSize: '12px',
    cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
    letterSpacing: '0.06em', transition: 'border-color 0.15s, color 0.15s',
  }

  return (
    <div style={{
      width, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          const allowed = Array.from(e.dataTransfer.files).filter(f =>
            f.type === 'application/pdf' || f.name.endsWith('.pdf')
          )
          if (allowed.length) uploadFiles(allowed as unknown as FileList)
        }}
        onClick={() => !isAnalyzing && fileRef.current?.click()}
        style={{
          margin: '10px 10px 0', padding: '12px 14px',
          background: dragOver ? '#111' : BG,
          border: `1px dashed ${dragOver ? BORD_FOCUS : BORD}`,
          borderRadius: '4px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: isAnalyzing ? 'default' : 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '12px', color: dragOver ? HOVER : DIM, letterSpacing: '0.06em' }}>
          {isAnalyzing ? 'Analyzing...' : dragOver ? 'Drop to add' : 'Drop PDFs or click ↑'}
        </span>
        <button
          onClick={e => { e.stopPropagation(); if (!isAnalyzing) fileRef.current?.click() }}
          disabled={isAnalyzing}
          style={{ ...rowBtn, color: isAnalyzing ? '#1e1e1e' : DIM, cursor: isAnalyzing ? 'default' : 'pointer' }}
          onMouseEnter={e => { if (!isAnalyzing) { e.currentTarget.style.borderColor = BORD_FOCUS; e.currentTarget.style.color = HOVER } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = BORD; e.currentTarget.style.color = isAnalyzing ? '#1e1e1e' : DIM }}
        >
          ↑
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        multiple
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files?.length) {
            uploadFiles(e.target.files)
            e.target.value = ''
          }
        }}
      />

      {/* URL input — container styled like the drop zone so browser can't fight it */}
      <form
        onSubmit={e => {
          e.preventDefault()
          const trimmed = urlInput.trim()
          if (!trimmed || isAnalyzing) return
          addUrl(trimmed)
          setUrlInput('')
        }}
        style={{
          margin: '6px 10px 0', padding: '12px 14px',
          background: BG, border: `1px dashed ${BORD}`,
          borderRadius: '4px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
          transition: 'border-color 0.15s',
        }}
        onFocusCapture={e => (e.currentTarget.style.borderColor = BORD_FOCUS)}
        onBlurCapture={e => (e.currentTarget.style.borderColor = BORD)}
      >
        <input
          type="text"
          placeholder="Paste a link..."
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          disabled={isAnalyzing}
          style={{
            flex: 1, minWidth: 0,
            background: 'transparent', border: 'none', outline: 'none',
            fontSize: '12px', color: DIM, fontFamily: 'inherit',
            letterSpacing: '0.06em',
            opacity: isAnalyzing ? 0.4 : 1,
          }}
        />
        <button
          type="submit"
          disabled={isAnalyzing || !urlInput.trim()}
          style={{ ...rowBtn, border: 'none', padding: '0', opacity: isAnalyzing || !urlInput.trim() ? 0.3 : 1, cursor: isAnalyzing || !urlInput.trim() ? 'default' : 'pointer' }}
          onMouseEnter={e => { if (!isAnalyzing && urlInput.trim()) e.currentTarget.style.color = HOVER }}
          onMouseLeave={e => { e.currentTarget.style.color = DIM }}
        >
          →
        </button>
      </form>

      {/* Source list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, marginTop: '10px' }}>
        {sources.length > 0 && (
          <div
            style={{
              margin: '0 10px 8px', padding: '7px 14px',
              background: BG, border: `1px dashed ${BORD}`,
              borderRadius: '4px', flexShrink: 0,
              transition: 'border-color 0.15s',
            }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = BORD_FOCUS)}
            onBlurCapture={e => (e.currentTarget.style.borderColor = BORD)}
          >
            <input
              value={filterInput}
              onChange={e => setFilterInput(e.target.value)}
              placeholder="Filter..."
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                fontSize: '12px', color: DIM, fontFamily: 'inherit',
                letterSpacing: '0.06em',
              }}
            />
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sources.length === 0 ? (
            <div style={{ padding: '8px 14px', fontSize: '12px', color: DIM, letterSpacing: '0.06em' }}>
              No documents yet.
            </div>
          ) : (() => {
            const q = filter.trim().toLowerCase()
            const visible = q
              ? sources.filter(s =>
                  (s.label || s.result?.title || s.raw).toLowerCase().includes(q)
                )
              : sources
            return visible.length === 0
              ? <div style={{ padding: '20px 14px', fontSize: '12px', color: DIM, letterSpacing: '0.06em' }}>No match.</div>
              : visible.map(src => <SourceItem key={src.id} src={src} />)
          })()}
        </div>
      </div>
    </div>
  )
}
