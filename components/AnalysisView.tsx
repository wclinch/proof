'use client'
import type { AnalysisResult } from '@/lib/types'
import JumpBtn from './ui/JumpBtn'
import Row     from './ui/Row'
import Field   from './ui/Field'
import Tag     from './ui/Tag'

export default function AnalysisView({
  result,
  onJump,
}: {
  result: AnalysisResult
  onJump: (text: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

      {/* Header — only render if there's something to show */}
      {(result.title || result.authors?.length > 0 || result.year || result.journal) && (
        <div style={{ paddingBottom: '18px', borderBottom: '1px solid #1a1a1a', marginBottom: '20px' }}>
          {result.title && (
            <div style={{ fontSize: '15px', fontWeight: 500, color: '#bbb', lineHeight: 1.4, marginBottom: '6px' }}>
              {result.title}
            </div>
          )}
          {result.authors?.length > 0 && (
            <div style={{ fontSize: '12px', color: '#999', lineHeight: 1.7 }}>
              {result.authors.join(', ')}
            </div>
          )}
          {(result.year || result.journal) && (
            <div style={{ fontSize: '12px', color: '#777', marginTop: '3px' }}>
              {[result.year, result.journal].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      )}

      {result.facts?.length > 0 && (
        <Field label="Facts">
          {result.facts.map((f, i) => <Row key={i} value={f} onJump={onJump} />)}
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

      {result.claims?.length > 0 && (
        <Field label="Claims">
          {result.claims.map((c, i) => <Row key={i} value={c} onJump={onJump} />)}
        </Field>
      )}

      {result.quotes?.length > 0 && (
        <Field label="Direct Quotes">
          {result.quotes.map((q, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
              <div style={{
                fontSize: '13px', color: '#999', lineHeight: 1.7,
                padding: '8px 12px', borderLeft: '2px solid #333',
                fontStyle: 'italic', flex: 1,
              }}>
                &ldquo;{q}&rdquo;
              </div>
              <JumpBtn onClick={() => onJump(q)} />
            </div>
          ))}
        </Field>
      )}

      {result.conclusions?.length > 0 && (
        <Field label="Key Points">
          {result.conclusions.map((c, i) => <Row key={i} value={c} onJump={onJump} />)}
        </Field>
      )}

      {result.recommendations?.length > 0 && (
        <Field label="Recommendations">
          {result.recommendations.map((r, i) => <Row key={i} value={r} onJump={onJump} />)}
        </Field>
      )}

      {result.methodology && (
        <Field label="Methodology">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <p style={{ fontSize: '13px', color: '#999', lineHeight: 1.75, margin: 0, flex: 1 }}>
              {result.methodology}
            </p>
            <JumpBtn onClick={() => onJump(result.methodology!)} />
          </div>
        </Field>
      )}

      {(result.sample_n || result.sample_desc) && (
        <Field label="Sample">
          {result.sample_n    && <Row value={result.sample_n}   onJump={onJump} />}
          {result.sample_desc && <Row value={result.sample_desc} onJump={onJump} />}
        </Field>
      )}

      {result.abstract && (
        <Field label="Abstract">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <p style={{ fontSize: '13px', color: '#999', lineHeight: 1.75, margin: 0, flex: 1 }}>
              {result.abstract}
            </p>
            <JumpBtn onClick={() => onJump(result.abstract!)} />
          </div>
        </Field>
      )}

      {result.limitations?.length > 0 && (
        <Field label="Limitations">
          {result.limitations.map((l, i) => <Row key={i} value={l} onJump={onJump} />)}
        </Field>
      )}

      {(result.concepts?.length > 0 || result.keywords?.length > 0) && (
        <div style={{ paddingTop: '16px', marginTop: '4px', borderTop: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {result.concepts?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '10px', color: '#999', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Concepts</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {result.concepts.map((c, i) => <Tag key={i}>{c}</Tag>)}
              </div>
            </div>
          )}
          {result.keywords?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '10px', color: '#999', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Keywords</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {result.keywords.map((k, i) => <Tag key={i}>{k}</Tag>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
