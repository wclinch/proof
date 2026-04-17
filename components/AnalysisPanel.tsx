'use client'
import { useApp } from '@/context/AppContext'
import AnalysisView  from './AnalysisView'
import SourceTextView from './SourceTextView'
import type { AnalysisResult } from '@/lib/types'

function formatBreakdown(result: AnalysisResult, fmt: 'txt' | 'md'): string {
  const h  = (label: string) => fmt === 'md' ? `## ${label}\n` : `${label}\n${'─'.repeat(label.length)}\n`
  const li = (v: string)     => fmt === 'md' ? `- ${v}` : `• ${v}`
  const lines: string[] = []

  lines.push(fmt === 'md' ? `# ${result.title ?? 'Untitled'}` : result.title ?? 'Untitled')
  if (result.authors?.length) lines.push(result.authors.join(', '))
  const meta = [result.year, result.journal].filter(Boolean).join(' · ')
  if (meta) lines.push(meta)
  lines.push('')

  if (result.facts?.length)      { lines.push(h('Facts'),      ...result.facts.map(li),      '') }
  if (result.supporting?.length) { lines.push(h('Supporting'), ...result.supporting.map(li), '') }
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
  const { selectedSource, centerView, setCenterView, highlightText, jumpToSource } = useApp()

  function handleExport(fmt: 'txt' | 'md') {
    if (!selectedSource?.result) return
    const slug    = (selectedSource.result.title ?? 'breakdown').replace(/\s+/g, '-').toLowerCase().slice(0, 60)
    const content = formatBreakdown(selectedSource.result, fmt)
    downloadText(content, `${slug}.${fmt}`)
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {!selectedSource && (
          <div style={{ fontSize: '13px', color: '#777', letterSpacing: '0.04em' }}>
            Select a source.
          </div>
        )}
        {selectedSource?.status === 'queued' && (
          <div style={{ fontSize: '13px', color: '#777', letterSpacing: '0.04em' }}>
            Queued.
          </div>
        )}
        {selectedSource?.status === 'loading' && (
          <div style={{ fontSize: '13px', color: '#777', letterSpacing: '0.04em' }}>
            Analyzing...
          </div>
        )}
        {selectedSource?.status === 'error' && (
          <div style={{ fontSize: '13px', color: '#555', letterSpacing: '0.04em' }}>
            {selectedSource.error}
          </div>
        )}
        {selectedSource?.status === 'done' && selectedSource.result && (
          centerView === 'source' ? (
            <SourceTextView
              text={selectedSource.rawText ?? 'No source text available.'}
              highlight={highlightText}
            />
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
