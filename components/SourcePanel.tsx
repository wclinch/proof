'use client'
import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import SourceItem from './SourceItem'

export default function SourcePanel({ width }: { width: number }) {
  const { sources, uploadFiles, isAnalyzing, isUploadingFile } = useApp()
  const [dragOver, setDragOver]       = useState(false)
  const [filterInput, setFilterInput] = useState('')
  const [filter, setFilter]           = useState('')
  const [dupMsg, setDupMsg]           = useState(false)
  const fileRef   = useRef<HTMLInputElement>(null)
  const filterRef = useRef<HTMLInputElement>(null)
  const dupTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleUpload(files: FileList | File[]) {
    const list = Array.from(files).filter(f =>
      f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    )
    const hasDup = list.some(f => sources.some(s => s.label === f.name))
    if (hasDup) {
      setDupMsg(true)
      if (dupTimer.current) clearTimeout(dupTimer.current)
      dupTimer.current = setTimeout(() => setDupMsg(false), 3000)
    }
    uploadFiles(files)
  }

  useEffect(() => {
    const t = setTimeout(() => setFilter(filterInput), 150)
    return () => clearTimeout(t)
  }, [filterInput])

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
    color: '#777',
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
          if (pdfs.length) handleUpload(pdfs)
        }}
        onClick={() => !isAnalyzing && fileRef.current?.click()}
        style={{
          ...shell,
          background: dragOver ? '#141414' : '#0d0d0d',
          borderColor: dragOver ? '#333' : '#1a1a1a',
          cursor: isAnalyzing ? 'default' : 'pointer',
        }}
      >
        <span style={{ fontSize: '11px', color: '#777', letterSpacing: '0.08em', textTransform: 'uppercase', flex: 1 }}>
          {dragOver ? 'drop to add' : 'drop PDF or click to upload'}
        </span>
      </div>
      <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.length) { handleUpload(e.target.files); e.target.value = '' } }}
      />
      {dupMsg && (
        <div style={{ margin: '6px 10px 0', fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 2px' }}>
          pdf already added.
        </div>
      )}

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
              placeholder="filter..."
              style={{
                flex: 1,
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: '12px', fontFamily: 'inherit',
                letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#555',
              }}
            />
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', marginTop: '4px' }}>
          {sources.length === 0
            ? <div style={{ padding: '10px 14px', fontSize: '11px', color: '#777', letterSpacing: '0.08em', textTransform: 'uppercase' }}>no documents yet.</div>
            : (() => {
                const q = filter.trim().toLowerCase()
                const visible = q
                  ? sources.filter(s => (s.label || s.result?.title || s.raw).toLowerCase().includes(q))
                  : sources
                return visible.length === 0
                  ? <div style={{ padding: '20px 14px', fontSize: '11px', color: '#777', letterSpacing: '0.08em', textTransform: 'uppercase' }}>no match.</div>
                  : visible.map(src => <SourceItem key={src.id} src={src} />)
              })()
          }
        </div>
      </div>
    </div>
  )
}
