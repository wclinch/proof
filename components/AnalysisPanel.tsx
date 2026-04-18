'use client'
import dynamic from 'next/dynamic'
import { useApp } from '@/context/AppContext'
import AnalysisView from './AnalysisView'
import type { AnalysisResult } from '@/lib/types'
import { capture } from '@/lib/posthog'

const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false })

function formatBreakdown(result: AnalysisResult, fmt: 'txt' | 'md'): string {
  const li = (v: string) => fmt === 'md' ? `- ${v}` : `• ${v}`
  const lines: string[] = []
  lines.push(fmt === 'md' ? `# ${result.title ?? 'Untitled'}` : result.title ?? 'Untitled')
  if (result.authors?.length) lines.push(result.authors.join(', '))
  const meta = [result.year, result.journal].filter(Boolean).join(' · ')
  if (meta) lines.push(meta)
  lines.push('')
  if (result.items?.length)    { lines.push(...result.items.map(li), '') }
  if (result.quotes?.length)   { lines.push(fmt === 'md' ? '## Quotes' : 'Quotes', ...result.quotes.map(q => li(`"${q}"`)), '') }
  if (result.keywords?.length) { lines.push(fmt === 'md' ? '## Topics' : 'Topics', result.keywords.join(', '), '') }
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

function TabBtn({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', padding: '0 0 1px', cursor: 'pointer', outline: 'none',
        fontSize: '12px', letterSpacing: '0.07em', textTransform: 'uppercase' as const,
        fontFamily: 'inherit',
        color: active ? '#ccc' : '#444',
        borderBottom: `1px solid ${active ? '#444' : 'transparent'}`,
        transition: 'color 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#777' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#444' }}
    >
      {label}
    </button>
  )
}

function ExportBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none',
        fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' as const,
        fontFamily: 'inherit', color: '#444',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = '#777')}
      onMouseLeave={e => (e.currentTarget.style.color = '#444')}
    >
      {label}
    </button>
  )
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
        display: 'flex', alignItems: 'center',
        gap: '20px',
      }}>
        {isDone && (
          <>
            <TabBtn label="Breakdown" active={centerView === 'analysis'} onClick={() => setCenterView('analysis')} />
            <TabBtn label="Source"    active={centerView === 'source'}   onClick={() => setCenterView('source')} />

            <div style={{ flex: 1 }} />

            {centerView === 'analysis' && (
              <>
                <ExportBtn label=".txt" onClick={() => handleExport('txt')} />
                <ExportBtn label=".md"  onClick={() => handleExport('md')} />
              </>
            )}
          </>
        )}
      </div>

      {/* Body */}
      <div style={{
        flex: 1, minHeight: 0,
        overflowY: 'auto',
        padding: isDone && centerView === 'source' ? '0' : '24px',
        display: 'flex', flexDirection: 'column',
      }}>
        {!selectedSource && (
          <div style={{ fontSize: '11px', color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
            select a source.
          </div>
        )}

        {selectedSource?.status === 'queued' && (
          <div style={{ fontSize: '11px', color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
            queued.
          </div>
        )}

        {selectedSource?.status === 'loading' && (
          <div style={{ fontSize: '11px', color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
            analyzing...
          </div>
        )}

        {selectedSource?.status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.06em' }}>
              {selectedSource.error}
            </div>
            <button
              onClick={() => retrySource(selectedSource.id)}
              style={{
                alignSelf: 'flex-start',
                background: 'none', border: '1px solid #1e1e1e', borderRadius: '3px',
                padding: '6px 12px', cursor: 'pointer', outline: 'none',
                fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                fontFamily: 'inherit', color: '#555',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#999'; e.currentTarget.style.borderColor = '#333' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#1e1e1e' }}
            >
              ↺ retry
            </button>
          </div>
        )}

        {isDone && selectedSource.result && (
          centerView === 'source' ? (
            <PdfViewer srcId={selectedSource.id} highlight={highlightText} />
          ) : (
            <AnalysisView result={selectedSource.result} onJump={jumpToSource} />
          )
        )}
      </div>
    </div>
  )
}
