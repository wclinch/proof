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

  const inputBase: React.CSSProperties = {
    width: '100%',
    background: '#0d0d0d',
    // Override Chrome's dark-mode input background tinting
    WebkitBoxShadow: '0 0 0 1000px #0d0d0d inset',
    border: '1px solid #1e1e1e',
    borderRadius: '4px',
    outline: 'none',
    fontSize: '12px',
    color: '#888',
    fontFamily: 'inherit',
    letterSpacing: '0.05em',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ width, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Drop zone */}
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
          margin: '10px 10px 6px', padding: '12px 14px',
          background: dragOver ? '#141414' : '#0d0d0d',
          border: `1px dashed ${dragOver ? '#333' : '#1e1e1e'}`,
          borderRadius: '4px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: isAnalyzing ? 'default' : 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '12px', color: dragOver ? '#666' : '#444', letterSpacing: '0.05em' }}>
          {isAnalyzing ? 'Analyzing...' : dragOver ? 'Drop to add' : 'Drop PDFs or click ↑'}
        </span>
        <button
          onClick={e => { e.stopPropagation(); if (!isAnalyzing) fileRef.current?.click() }}
          disabled={isAnalyzing}
          style={{
            background: 'none', border: '1px solid #1e1e1e', borderRadius: '3px',
            padding: '3px 9px', color: isAnalyzing ? '#222' : '#444',
            fontSize: '12px', cursor: isAnalyzing ? 'default' : 'pointer',
            fontFamily: 'inherit', outline: 'none',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { if (!isAnalyzing) { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = '#888' } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.color = isAnalyzing ? '#222' : '#444' }}
        >
          ↑
        </button>
      </div>

      <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.length) { uploadFiles(e.target.files); e.target.value = '' } }}
      />

      {/* URL input */}
      <form
        onSubmit={e => {
          e.preventDefault()
          const v = urlInput.trim()
          if (!v || isAnalyzing) return
          addUrl(v); setUrlInput('')
        }}
        style={{ margin: '0 10px 8px', display: 'flex', gap: '6px', flexShrink: 0 }}
      >
        <input
          type="text"
          className="sp-input"
          placeholder="Paste a link..."
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          disabled={isAnalyzing}
          style={{
            ...inputBase,
            flex: 1, minWidth: 0, width: 'auto',
            padding: '11px 14px',
            opacity: isAnalyzing ? 0.5 : 1,
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#333')}
          onBlur={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
        />
        <button
          type="submit"
          disabled={isAnalyzing || !urlInput.trim()}
          style={{
            flexShrink: 0, background: '#0d0d0d', border: '1px solid #1e1e1e',
            borderRadius: '4px', padding: '0 12px',
            color: urlInput.trim() && !isAnalyzing ? '#444' : '#222',
            fontSize: '12px', cursor: urlInput.trim() && !isAnalyzing ? 'pointer' : 'default',
            fontFamily: 'inherit', outline: 'none',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { if (urlInput.trim() && !isAnalyzing) { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = '#888' } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.color = urlInput.trim() && !isAnalyzing ? '#444' : '#222' }}
        >
          →
        </button>
      </form>

      {/* Source list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {sources.length > 0 && (
          <div style={{ padding: '0 10px 8px', flexShrink: 0 }}>
            <input
              className="sp-input"
              value={filterInput}
              onChange={e => setFilterInput(e.target.value)}
              placeholder="Filter..."
              style={{ ...inputBase, padding: '7px 10px' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#333')}
              onBlur={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
            />
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sources.length === 0
            ? <div style={{ padding: '8px 14px', fontSize: '12px', color: '#333', letterSpacing: '0.05em' }}>No documents yet.</div>
            : (() => {
                const q = filter.trim().toLowerCase()
                const visible = q
                  ? sources.filter(s => (s.label || s.result?.title || s.raw).toLowerCase().includes(q))
                  : sources
                return visible.length === 0
                  ? <div style={{ padding: '20px 14px', fontSize: '12px', color: '#333', letterSpacing: '0.05em' }}>No match.</div>
                  : visible.map(src => <SourceItem key={src.id} src={src} />)
              })()
          }
        </div>
      </div>
    </div>
  )
}
