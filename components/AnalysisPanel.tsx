'use client'
import dynamic from 'next/dynamic'
import { useApp } from '@/context/AppContext'
import AnalysisView from './AnalysisView'
import type { AnalysisResult } from '@/lib/types'
import { capture } from '@/lib/posthog'

const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false })

function formatBreakdown(result: AnalysisResult, fmt: 'txt' | 'md'): string {
  const h  = (label: string) => fmt === 'md' ? `## ${label}\n` : `${label}\n${'─'.repeat(label.length)}\n`
  const li = (v: string)     => fmt === 'md' ? `- ${v}` : `• ${v}`
  const lines: string[] = []

  lines.push(fmt === 'md' ? `# ${result.title ?? 'Untitled'}` : result.title ?? 'Untitled')
  if (result.authors?.length) lines.push(result.authors.join(', '))
  const meta = [result.year, result.journal].filter(Boolean).join(' · ')
  if (meta) lines.push(meta)
  lines.push('')

  if (result.items?.length)      { lines.push(...result.items.map(li), '') }
  if (result.quotes?.length)     { lines.push(h('Quotes'),     ...result.quotes.map(q => li(`"${q}"`)), '') }
  if (result.keywords?.length)   { lines.push(h('Keywords'),   result.keywords.join(', '),   '') }

  return lines.join('\n').trimEnd()
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  const a    = document.createElement('a')
  a.href     = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function AnalysisPanel() {
  const { selectedSource, centerView, setCenterView, highlightText, jumpToSource, retrySource } = useApp()

  function handleExport(fmt: 'txt' | 'md') {
    if (!selectedSource?.result) return
    const slug    = (selectedSource.result.title ?? 'breakdown').replace(/\s+/g, '-').toLowerCase().slice(0, 60)
    const content = formatBreakdown(selectedSource.result, fmt)
    downloadText(content, `${slug}.${fmt}`)
    capture('breakdown_exported', { format: fmt })
  }

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
        {selectedSource?.status === 'done' && (
          <>
            <button
              onClick={() => handleExport('txt')}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none',
                fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
                fontFamily: 'inherit', color: '#777',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
              onMouseLeave={e => (e.currentTarget.style.color = '#777')}
            >
              .txt
            </button>
            <button
              onClick={() => handleExport('md')}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none',
                fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
                fontFamily: 'inherit', color: '#777',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
              onMouseLeave={e => (e.currentTarget.style.color = '#777')}
            >
              .md
            </button>
            <div style={{ width: '1px', height: '14px', background: '#1a1a1a' }} />
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
              Breakdown
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
        padding: '20px 24px',
        display: 'flex', flexDirection: 'column',
      }}>
        {!selectedSource && (
          <div style={{ fontSize: '11px', color: '#777', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
            select a source.
          </div>
        )}
        {selectedSource?.status === 'queued' && (
          <div style={{ fontSize: '11px', color: '#777', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
            queued.
          </div>
        )}
        {selectedSource?.status === 'loading' && (
          <div style={{ fontSize: '11px', color: '#777', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
            analyzing...
          </div>
        )}
        {selectedSource?.status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
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
        {selectedSource?.status === 'done' && selectedSource.result && (
          centerView === 'source' ? (
            <PdfViewer srcId={selectedSource.id} highlight={highlightText} />
          ) : (
            <AnalysisView
              result={selectedSource.result}
              onJump={jumpToSource}
            />
          )
        )}
      </div>
    </div>
  )
}
