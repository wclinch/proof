'use client'
import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import SourceItem from './SourceItem'

export default function SourcePanel({ width }: { width: number }) {
  const { sources, uploadFiles, isAnalyzing, isUploadingFile, addUrl } = useApp()
  const [urlInput, setUrlInput]       = useState('')
  const [dragOver, setDragOver]       = useState(false)
  const [filterInput, setFilterInput] = useState('')
  const [filter, setFilter]           = useState('')
  const fileRef   = useRef<HTMLInputElement>(null)
  const urlRef    = useRef<HTMLInputElement>(null)
  const filterRef = useRef<HTMLInputElement>(null)
  const formRef   = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setFilter(filterInput), 150)
    return () => clearTimeout(t)
  }, [filterInput])

  // Reset form border when analysis finishes
  useEffect(() => {
    if (!isAnalyzing && formRef.current) {
      formRef.current.style.borderColor = '#1a1a1a'
    }
  }, [isAnalyzing])

  const shell: React.CSSProperties = {
    margin: '10px 10px 0',
    padding: '11px 14px',
    background: '#0d0d0d',
    border: '1px solid #1a1a1a',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    transition: 'border-color 0.15s',
  }

  const actionBtn: React.CSSProperties = {
    flexShrink: 0,
    marginLeft: 'auto',
    background: 'none',
    border: '1px solid #1a1a1a',
    borderRadius: '3px',
    padding: '3px 9px',
    color: '#444',
    fontSize: '12px',
    fontFamily: 'inherit',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.15s, color 0.15s',
  }

  return (
    <div style={{ width, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Row 1: PDF drop zone ── */}
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
          ...shell,
          background: dragOver ? '#141414' : '#0d0d0d',
          borderColor: dragOver ? '#333' : '#1a1a1a',
          cursor: isAnalyzing ? 'default' : 'pointer',
        }}
      >
        <span style={{ fontSize: '12px', color: '#444', letterSpacing: '0.05em', flex: 1 }}>
          {dragOver ? 'Drop to add' : 'Drop PDFs or click ↑'}
        </span>
        <button
          onClick={e => { e.stopPropagation(); if (!isAnalyzing) fileRef.current?.click() }}
          disabled={isAnalyzing}
          style={{ ...actionBtn, color: isUploadingFile ? '#2a2a2a' : '#444', cursor: isUploadingFile ? 'default' : 'pointer' }}
          onMouseEnter={e => { if (!isUploadingFile) { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#777' } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = isUploadingFile ? '#2a2a2a' : '#444' }}
        >↑</button>
      </div>
      <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.length) { uploadFiles(e.target.files); e.target.value = '' } }}
      />

      {/* ── Row 2: URL input ── */}
      <form
        ref={formRef}
        onSubmit={e => {
          e.preventDefault()
          const v = urlInput.trim()
          if (!v || isAnalyzing) return
          addUrl(v)
          setUrlInput('')
          if (formRef.current) formRef.current.style.borderColor = '#1a1a1a'
          urlRef.current?.blur()
        }}
        style={{ ...shell, cursor: 'text' }}
        onClick={() => urlRef.current?.focus()}
        onFocus={() => { if (formRef.current) formRef.current.style.borderColor = '#333' }}
        onBlur={e => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            if (formRef.current) formRef.current.style.borderColor = '#1a1a1a'
          }
        }}
      >
        <input
          ref={urlRef}
          type="text"
          className="sp-input"
          placeholder="Paste a link..."
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          disabled={isAnalyzing}
          style={{
            flex: 1, minWidth: 0,
            background: 'transparent',
            border: 'none', outline: 'none',
            fontSize: '12px', fontFamily: 'inherit',
            letterSpacing: '0.05em',
            color: '#444',
            opacity: isAnalyzing ? 0.5 : 1,
          }}
        />
        <button
          type="submit"
          disabled={isAnalyzing || !urlInput.trim()}
          style={{
            ...actionBtn,
            opacity: urlInput.trim() && !isAnalyzing ? 1 : 0.3,
            cursor: urlInput.trim() && !isAnalyzing ? 'pointer' : 'default',
          }}
          onMouseEnter={e => { if (urlInput.trim() && !isAnalyzing) { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#777' } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#444' }}
        >→</button>
      </form>

      {/* ── Source list ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, marginTop: '4px' }}>
        {sources.length > 0 && (
          <div
            style={{ ...shell, cursor: 'text', padding: '9px 14px' }}
            onClick={() => filterRef.current?.focus()}
          >
            <input
              ref={filterRef}
              className="sp-input"
              value={filterInput}
              onChange={e => setFilterInput(e.target.value)}
              placeholder="Filter..."
              style={{
                flex: 1,
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: '12px', fontFamily: 'inherit',
                letterSpacing: '0.05em', color: '#444',
              }}
            />
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sources.length === 0
            ? <div style={{ padding: '10px 14px', fontSize: '12px', color: '#444', letterSpacing: '0.05em' }}>No documents yet.</div>
            : (() => {
                const q = filter.trim().toLowerCase()
                const visible = q
                  ? sources.filter(s => (s.label || s.result?.title || s.raw).toLowerCase().includes(q))
                  : sources
                return visible.length === 0
                  ? <div style={{ padding: '20px 14px', fontSize: '12px', color: '#444', letterSpacing: '0.05em' }}>No match.</div>
                  : visible.map(src => <SourceItem key={src.id} src={src} />)
              })()
          }
        </div>
      </div>
    </div>
  )
}
