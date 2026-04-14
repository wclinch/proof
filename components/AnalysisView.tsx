'use client'
import type { AnalysisResult } from '@/lib/types'
import CopyBtn from './ui/CopyBtn'
import JumpBtn from './ui/JumpBtn'
import Row     from './ui/Row'
import Field   from './ui/Field'
import Tag     from './ui/Tag'

export default function AnalysisView({
  result,
  url,
  onJump,
}: {
  result: AnalysisResult
  url: string
  onJump: (text: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

      {/* Header */}
      <div style={{ paddingBottom: '18px', borderBottom: '1px solid #1a1a1a', marginBottom: '20px' }}>
        <div style={{ fontSize: '15px', fontWeight: 500, color: '#aaa', lineHeight: 1.4, marginBottom: '6px' }}>
          {result.title}
        </div>
        <div style={{ fontSize: '12px', color: '#555', lineHeight: 1.7 }}>
          {result.authors?.join(', ')}
        </div>
        <div style={{ fontSize: '12px', color: '#444', marginTop: '3px' }}>
          {[result.year, result.journal, result.type].filter(Boolean).join(' · ')}
          {result.doi && <span style={{ color: '#333' }}> · {result.doi}</span>}
        </div>
      </div>

      {result.abstract && (
        <Field label="Abstract">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.75, margin: 0, flex: 1 }}>
              {result.abstract}
            </p>
            <CopyBtn text={result.abstract} />
            <JumpBtn onClick={() => onJump(result.abstract!)} />
          </div>
        </Field>
      )}

      {(result.sample_n || result.sample_desc) && (
        <Field label="Sample">
          {result.sample_n   && <Row value={result.sample_n}   onJump={onJump} />}
          {result.sample_desc && <Row value={result.sample_desc} onJump={onJump} />}
        </Field>
      )}

      {result.methodology && (
        <Field label="Methodology">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.75, margin: 0, flex: 1 }}>
              {result.methodology}
            </p>
            <CopyBtn text={result.methodology} />
            <JumpBtn onClick={() => onJump(result.methodology!)} />
          </div>
        </Field>
      )}

      {result.stats?.length > 0 && (
        <Field label="Statistics">
          {result.stats.map((s, i) => <Row key={i} value={s} onJump={onJump} />)}
        </Field>
      )}

      {result.findings?.length > 0 && (
        <Field label="Findings">
          {result.findings.map((f, i) => <Row key={i} value={f} onJump={onJump} />)}
        </Field>
      )}

      {result.conclusions?.length > 0 && (
        <Field label="Conclusions">
          {result.conclusions.map((c, i) => <Row key={i} value={c} onJump={onJump} />)}
        </Field>
      )}

      {result.quotes?.length > 0 && (
        <Field label="Direct Quotes">
          {result.quotes.map((q, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
              <div style={{
                fontSize: '13px', color: '#666', lineHeight: 1.7,
                padding: '8px 12px', borderLeft: '2px solid #222',
                fontStyle: 'italic', flex: 1,
              }}>
                &ldquo;{q}&rdquo;
              </div>
              <CopyBtn text={q} />
              <JumpBtn onClick={() => onJump(q)} />
            </div>
          ))}
        </Field>
      )}

      {result.limitations?.length > 0 && (
        <Field label="Limitations">
          {result.limitations.map((l, i) => <Row key={i} value={l} onJump={onJump} />)}
        </Field>
      )}

      {result.concepts?.length > 0 && (
        <Field label="Concepts & Frameworks">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {result.concepts.map((c, i) => <Tag key={i}>{c}</Tag>)}
          </div>
        </Field>
      )}

      {result.keywords?.length > 0 && (
        <Field label="Keywords">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {result.keywords.map((k, i) => <Tag key={i}>{k}</Tag>)}
          </div>
        </Field>
      )}

      <div style={{ paddingTop: '16px', marginTop: '4px', borderTop: '1px solid #111' }}>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: '11px', color: '#2a2a2a', textDecoration: 'none', wordBreak: 'break-all' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#555')}
          onMouseLeave={e => (e.currentTarget.style.color = '#2a2a2a')}
        >
          {url}
        </a>
      </div>
    </div>
  )
}
