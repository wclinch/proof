'use client'
import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import SourceItem from './SourceItem'

export default function SourcePanel({ width }: { width: number }) {
  const { sources, uploadFiles, isAnalyzing } = useApp()
  const [dragOver, setDragOver]       = useState(false)
  const [filterInput, setFilterInput] = useState('')
  const [filter, setFilter]           = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setFilter(filterInput), 150)
    return () => clearTimeout(t)
  }, [filterInput])

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
          margin: '10px 10px 6px', padding: '14px 14px',
          background: dragOver ? '#141414' : '#0d0d0d',
          border: `1px dashed ${dragOver ? '#2a2a2a' : '#1a1a1a'}`,
          borderRadius: '4px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: isAnalyzing ? 'default' : 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '12px', color: dragOver ? '#555' : '#2a2a2a', letterSpacing: '0.06em' }}>
          {isAnalyzing ? 'Analyzing...' : dragOver ? 'Drop to add' : 'Drop PDFs or click ↑'}
        </span>
        <button
          onClick={e => { e.stopPropagation(); if (!isAnalyzing) fileRef.current?.click() }}
          disabled={isAnalyzing}
          style={{
            background: 'none', border: '1px solid #1e1e1e', borderRadius: '3px',
            padding: '4px 10px', color: isAnalyzing ? '#2a2a2a' : '#444',
            fontSize: '12px', cursor: isAnalyzing ? 'default' : 'pointer',
            fontFamily: 'inherit', outline: 'none',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { if (!isAnalyzing) { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888' } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.color = isAnalyzing ? '#2a2a2a' : '#444' }}
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

      {/* Source list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {sources.length > 0 && (
          <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>
            <input
              value={filterInput}
              onChange={e => setFilterInput(e.target.value)}
              placeholder="Filter..."
              style={{
                width: '100%', background: '#0d0d0d', border: '1px solid #1e1e1e',
                borderRadius: '3px', outline: 'none', padding: '5px 8px',
                fontSize: '11px', color: '#777', fontFamily: 'inherit',
                letterSpacing: '0.04em', boxSizing: 'border-box',
              }}
            />
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sources.length === 0 ? (
            <div style={{ padding: '8px 16px', fontSize: '12px', color: '#222', letterSpacing: '0.04em' }}>
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
              ? <div style={{ padding: '20px 16px', fontSize: '12px', color: '#333', letterSpacing: '0.04em' }}>No match.</div>
              : visible.map(src => <SourceItem key={src.id} src={src} />)
          })()}
        </div>
      </div>
    </div>
  )
}
