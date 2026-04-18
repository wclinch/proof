'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { capture } from '@/lib/posthog'

const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false })

function SectionRow({ number, title, onClick }: { number: string; title: string; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'baseline', gap: '12px',
        padding: '8px 8px',
        cursor: 'pointer',
        borderBottom: '1px solid #0f0f0f',
        background: hov ? '#0d0d0d' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      <span style={{ fontSize: '11px', color: '#333', width: '24px', flexShrink: 0, textAlign: 'right' as const }}>
        {number}
      </span>
      <span style={{ fontSize: '13px', color: hov ? '#ccc' : '#888', transition: 'color 0.1s', flex: 1 }}>
        {title}
      </span>
      <span style={{ fontSize: '11px', color: hov ? '#555' : '#1e1e1e', transition: 'color 0.1s' }}>↗</span>
    </div>
  )
}

function Chip({ label, onClick }: { label: string; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? '#161616' : '#0d0d0d',
        border: `1px solid ${hov ? '#2a2a2a' : '#1c1c1c'}`,
        borderRadius: '3px',
        padding: '4px 10px',
        cursor: 'pointer',
        outline: 'none',
        fontSize: '12px',
        color: hov ? '#aaa' : '#666',
        fontFamily: 'inherit',
        letterSpacing: '0.03em',
        transition: 'background 0.1s, color 0.1s, border-color 0.1s',
      }}
    >
      {label}
    </button>
  )
}

export default function AnalysisPanel() {
  const { selectedSource, centerView, setCenterView, searchTerm, jumpToSource, retrySource } = useApp()
  const [query, setQuery] = useState('')

  function handleSearch(term: string) {
    const t = term.trim()
    if (!t) return
    capture('src_clicked')
    jumpToSource(t)
    setQuery(t)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    handleSearch(query)
  }

  const isDone = selectedSource?.status === 'done'

  return (
    <div style={{
      flex: 1, minWidth: 40,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '0 20px', height: '40px', flexShrink: 0,
        borderBottom: '1px solid #1a1a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px',
      }}>
        {isDone && (
          <>
            <button
              onClick={() => setCenterView('analysis')}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none',
                fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
                fontFamily: 'inherit', color: centerView === 'analysis' ? '#bbb' : '#777',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { if (centerView !== 'analysis') e.currentTarget.style.color = '#aaa' }}
              onMouseLeave={e => { if (centerView !== 'analysis') e.currentTarget.style.color = '#777' }}
            >
              Find
            </button>
            <button
              onClick={() => setCenterView('source')}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none',
                fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
                fontFamily: 'inherit', color: centerView === 'source' ? '#bbb' : '#777',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { if (centerView !== 'source') e.currentTarget.style.color = '#aaa' }}
              onMouseLeave={e => { if (centerView !== 'source') e.currentTarget.style.color = '#777' }}
            >
              Source
            </button>
          </>
        )}
      </div>

      {/* Body */}
      <div style={{
        flex: 1, minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex', flexDirection: 'column',
        ...(isDone && centerView === 'source' ? {} : { padding: '20px 24px' }),
      }}>

        {!selectedSource && (
          <div style={{ fontSize: '11px', color: '#777', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            select a source.
          </div>
        )}

        {selectedSource?.status === 'queued' && (
          <div style={{ fontSize: '11px', color: '#777', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            queued.
          </div>
        )}

        {selectedSource?.status === 'loading' && (
          <div style={{ fontSize: '11px', color: '#777', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            analyzing...
          </div>
        )}

        {selectedSource?.status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {selectedSource.error}
            </div>
            <button
              onClick={() => retrySource(selectedSource.id)}
              style={{
                alignSelf: 'flex-start',
                background: 'none', border: '1px solid #222', borderRadius: '3px',
                padding: '5px 10px', cursor: 'pointer', outline: 'none',
                fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
                fontFamily: 'inherit', color: '#666',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.borderColor = '#333' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = '#222' }}
            >
              ↺ retry
            </button>
          </div>
        )}

        {isDone && centerView === 'source' && (
          <PdfViewer srcId={selectedSource.id} searchTerm={searchTerm} />
        )}

        {isDone && centerView === 'analysis' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Document header */}
            <div style={{ paddingBottom: '20px', borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#ccc', lineHeight: 1.35, marginBottom: '8px' }}>
                {selectedSource.result?.title ?? 'Untitled'}
              </div>
              {(selectedSource.result?.parties?.length ?? 0) > 0 && (
                <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.7, marginBottom: '2px' }}>
                  {selectedSource.result?.parties?.join(' · ')}
                </div>
              )}
              {selectedSource.result?.date && (
                <div style={{ fontSize: '12px', color: '#555' }}>
                  {selectedSource.result.date}
                </div>
              )}
            </div>

            {/* Search bar */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="search this document..."
                style={{
                  flex: 1,
                  background: '#0d0d0d',
                  border: '1px solid #1e1e1e',
                  borderRadius: '3px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#bbb',
                  fontFamily: 'inherit',
                  outline: 'none',
                  letterSpacing: '0.03em',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#333'}
                onBlur={e => e.currentTarget.style.borderColor = '#1e1e1e'}
              />
              <button
                type="submit"
                style={{
                  background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '3px',
                  padding: '8px 14px', fontSize: '11px', color: '#666', cursor: 'pointer',
                  fontFamily: 'inherit', letterSpacing: '0.06em', textTransform: 'uppercase' as const, outline: 'none',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.borderColor = '#333' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = '#1e1e1e' }}
              >
                find
              </button>
            </form>

            {/* Section navigation */}
            {(selectedSource.result?.sections?.length ?? 0) > 0 && (
              <div>
                <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: '8px' }}>
                  Sections
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {selectedSource.result?.sections?.map((sec, i) => (
                    <SectionRow
                      key={i}
                      number={sec.number}
                      title={sec.title}
                      onClick={() => handleSearch(sec.title)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Keyword chips fallback (for docs without sections) */}
            {(!(selectedSource.result?.sections?.length) && (selectedSource.result?.keywords?.length ?? 0) > 0) && (
              <div>
                <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: '8px' }}>
                  Suggested
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedSource.result?.keywords?.map((kw, i) => (
                    <Chip key={i} label={kw} onClick={() => handleSearch(kw)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
