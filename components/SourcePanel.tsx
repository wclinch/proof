'use client'
import { useState, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import SourceItem from './SourceItem'

export default function SourcePanel({ width }: { width: number }) {
  const { sources, analyzeSources, uploadFiles, isAnalyzing } = useApp()
  const [inputText, setInputText] = useState('')
  const [dragOver, setDragOver]   = useState(false)
  const [filter, setFilter]       = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleAnalyze() {
    if (!inputText.trim()) return
    analyzeSources(inputText)
    setInputText('')
  }

  return (
    <div style={{
      width, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Input area */}
      <div
        style={{ padding: '16px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files)
        }}
      >
        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handleAnalyze()
            }
          }}
          placeholder={'Paste URLs or DOIs\none per line or comma-separated'}
          style={{
            width: '100%', height: '88px', boxSizing: 'border-box',
            background: dragOver ? '#141414' : '#0f0f0f',
            border: `1px solid ${dragOver ? '#333' : '#1a1a1a'}`,
            borderRadius: '4px', color: '#ccc', fontSize: '13px',
            padding: '10px 12px', resize: 'none', outline: 'none',
            fontFamily: 'inherit', lineHeight: 1.6,
            transition: 'border-color 0.15s, background 0.15s',
          }}
        />
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <button
            onClick={handleAnalyze}
            disabled={!inputText.trim() || isAnalyzing}
            style={{
              flex: 1, padding: '9px',
              background: '#0f0f0f', border: '1px solid #1a1a1a',
              borderRadius: '4px',
              color: isAnalyzing ? '#444' : inputText.trim() ? '#bbb' : '#333',
              fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase',
              fontFamily: 'inherit',
              cursor: inputText.trim() && !isAnalyzing ? 'pointer' : 'default',
              transition: 'border-color 0.15s, color 0.15s', outline: 'none',
            }}
            onMouseEnter={e => {
              if (inputText.trim() && !isAnalyzing) {
                e.currentTarget.style.borderColor = '#444'
                e.currentTarget.style.color = '#e8e8e8'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#1a1a1a'
              e.currentTarget.style.color = isAnalyzing ? '#444' : inputText.trim() ? '#bbb' : '#333'
            }}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze ⌘↵'}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            title="Upload PDF or TXT"
            style={{
              padding: '9px 12px', background: '#0f0f0f',
              border: '1px solid #1a1a1a', borderRadius: '4px',
              color: '#555', fontSize: '14px', lineHeight: 1,
              cursor: 'pointer', outline: 'none',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = '#aaa' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#555' }}
          >
            ↑
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt"
          multiple
          style={{ display: 'none' }}
          onChange={e => {
            if (e.target.files?.length) {
              uploadFiles(e.target.files)
              e.target.value = ''
            }
          }}
        />
      </div>

      {/* Source list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {sources.length > 0 && (
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter..."
              style={{
                width: '100%', background: '#0d0d0d', border: '1px solid #1e1e1e',
                borderRadius: '3px', outline: 'none', padding: '5px 8px',
                fontSize: '11px', color: '#777', fontFamily: 'inherit',
                letterSpacing: '0.04em',
              }}
            />
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sources.length === 0 ? (
            <div style={{ padding: '20px 16px', fontSize: '13px', color: '#333', letterSpacing: '0.04em' }}>
              No sources yet.
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
