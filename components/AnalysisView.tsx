'use client'
import { useState } from 'react'
import type { AnalysisResult } from '@/lib/types'
import { capture } from '@/lib/posthog'

function FactRow({ text, index, onJump }: { text: string; index: number; onJump: (t: string) => void }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={() => { capture('src_clicked'); onJump(text) }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '14px',
        padding: '13px 10px',
        cursor: 'pointer',
        borderBottom: '1px solid #111',
        background: hov ? '#0d0d0d' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      <span style={{
        fontSize: '11px', color: '#333', width: '18px', flexShrink: 0,
        paddingTop: '3px', textAlign: 'right' as const,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {index + 1}
      </span>
      <span style={{ fontSize: '13px', color: hov ? '#ccc' : '#aaa', lineHeight: 1.75, flex: 1, transition: 'color 0.1s' }}>
        {text}
      </span>
      <span style={{ fontSize: '12px', color: hov ? '#777' : '#252525', flexShrink: 0, paddingTop: '3px', transition: 'color 0.1s' }}>
        ↗
      </span>
    </div>
  )
}

function QuoteRow({ text, onJump }: { text: string; onJump: (t: string) => void }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={() => { capture('src_clicked'); onJump(text) }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '12px 10px 12px 16px',
        borderLeft: `2px solid ${hov ? '#333' : '#1e1e1e'}`,
        marginBottom: '8px',
        cursor: 'pointer',
        display: 'flex', alignItems: 'flex-start', gap: '12px',
        background: hov ? '#0a0a0a' : 'transparent',
        transition: 'background 0.1s, border-color 0.1s',
      }}
    >
      <span style={{
        fontSize: '13px', color: hov ? '#999' : '#777',
        lineHeight: 1.75, fontStyle: 'italic', flex: 1,
        transition: 'color 0.1s',
      }}>
        &ldquo;{text}&rdquo;
      </span>
      <span style={{ fontSize: '12px', color: hov ? '#777' : '#252525', flexShrink: 0, paddingTop: '3px', transition: 'color 0.1s' }}>
        ↗
      </span>
    </div>
  )
}

export default function AnalysisView({
  result,
  onJump,
}: {
  result: AnalysisResult
  onJump: (text: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* Document header */}
      <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ fontSize: '15px', fontWeight: 500, color: '#ccc', lineHeight: 1.35, marginBottom: '8px' }}>
          {result.title ?? 'Untitled'}
        </div>
        {result.authors?.length > 0 && (
          <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.6, marginBottom: '2px' }}>
            {result.authors.join(', ')}
          </div>
        )}
        {(result.year || result.journal) && (
          <div style={{ fontSize: '12px', color: '#555' }}>
            {[result.year, result.journal].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>

      {/* Key facts */}
      {result.items?.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{
            fontSize: '10px', color: '#444', letterSpacing: '0.12em',
            textTransform: 'uppercase' as const, marginBottom: '4px', padding: '0 10px',
          }}>
            Key Facts
          </div>
          {result.items.map((item, i) => (
            <FactRow key={i} text={item} index={i} onJump={onJump} />
          ))}
        </div>
      )}

      {/* Quotes */}
      {result.quotes?.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{
            fontSize: '10px', color: '#444', letterSpacing: '0.12em',
            textTransform: 'uppercase' as const, marginBottom: '12px',
          }}>
            Quotes
          </div>
          {result.quotes.map((q, i) => (
            <QuoteRow key={i} text={q} onJump={onJump} />
          ))}
        </div>
      )}

      {/* Topics */}
      {result.keywords?.length > 0 && (
        <div style={{ borderTop: '1px solid #111', paddingTop: '16px' }}>
          <div style={{
            fontSize: '10px', color: '#444', letterSpacing: '0.12em',
            textTransform: 'uppercase' as const, marginBottom: '10px',
          }}>
            Topics
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {result.keywords.map((k, i) => (
              <span key={i} style={{
                fontSize: '11px', color: '#555',
                background: '#0d0d0d', border: '1px solid #1c1c1c',
                borderRadius: '2px', padding: '3px 8px',
                letterSpacing: '0.04em',
              }}>
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
