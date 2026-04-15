'use client'
import { useApp } from '@/context/AppContext'
import AnalysisView  from './AnalysisView'
import SourceTextView from './SourceTextView'
import type { AnalysisResult } from '@/lib/types'

function formatBreakdown(result: AnalysisResult, fmt: 'txt' | 'md'): string {
  const h = (label: string) => fmt === 'md' ? `## ${label}\n` : `${label}\n${'─'.repeat(label.length)}\n`
  const li = (v: string) => fmt === 'md' ? `- ${v}` : `• ${v}`
  const lines: string[] = []

  lines.push(fmt === 'md' ? `# ${result.title ?? 'Untitled'}` : result.title ?? 'Untitled')
  if (result.authors?.length) lines.push(result.authors.join(', '))
  const meta = [result.year, result.journal, result.type].filter(Boolean).join(' · ')
  if (meta) lines.push(meta)
  lines.push('')

  if (result.abstract) {
    lines.push(h('Abstract'), result.abstract, '')
  }
  if (result.sample_n || result.sample_desc) {
    lines.push(h('Sample'))
    if (result.sample_n)   lines.push(li(result.sample_n))
    if (result.sample_desc) lines.push(li(result.sample_desc))
    lines.push('')
  }
  if (result.methodology) {
    lines.push(h('Methodology'), result.methodology, '')
  }
  if (result.stats?.length) {
    lines.push(h('Statistics'), ...result.stats.map(li), '')
  }
  if (result.findings?.length) {
    lines.push(h('Findings'), ...result.findings.map(li), '')
  }
  if (result.conclusions?.length) {
    lines.push(h('Conclusions'), ...result.conclusions.map(li), '')
  }
  if (result.quotes?.length) {
    lines.push(h('Direct Quotes'), ...result.quotes.map(q => li(`"${q}"`)), '')
  }
  if (result.limitations?.length) {
    lines.push(h('Limitations'), ...result.limitations.map(li), '')
  }
  if (result.concepts?.length) {
    lines.push(h('Concepts & Frameworks'), result.concepts.join(', '), '')
  }
  if (result.keywords?.length) {
    lines.push(h('Keywords'), result.keywords.join(', '), '')
  }
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
                fontFamily: 'inherit', color: '#2a2a2a',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#555')}
              onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
            >
              .txt
            </button>
            <button
              onClick={() => handleExport('md')}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none',
                fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
                fontFamily: 'inherit', color: '#2a2a2a',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#555')}
              onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
            >
              .md
            </button>
            <div style={{ width: '1px', height: '14px', background: '#1a1a1a' }} />
            <button
              onClick={() => setCenterView('analysis')}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none',
                fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
                fontFamily: 'inherit', color: centerView === 'analysis' ? '#aaa' : '#333',
              }}
            >
              Breakdown
            </button>
            <button
              onClick={() => setCenterView('source')}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none',
                fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
                fontFamily: 'inherit', color: centerView === 'source' ? '#aaa' : '#333',
              }}
            >
              Source
            </button>
          </>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {!selectedSource && (
          <div style={{ fontSize: '13px', color: '#333', letterSpacing: '0.04em' }}>
            Select a source.
          </div>
        )}
        {selectedSource?.status === 'queued' && (
          <div style={{ fontSize: '13px', color: '#333', letterSpacing: '0.04em' }}>
            Queued.
          </div>
        )}
        {selectedSource?.status === 'loading' && (
          <div style={{ fontSize: '13px', color: '#444', letterSpacing: '0.04em' }}>
            Analyzing...
          </div>
        )}
        {selectedSource?.status === 'error' && (
          <div style={{ fontSize: '13px', color: '#733', letterSpacing: '0.04em' }}>
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
