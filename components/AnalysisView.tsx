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

      {result.items?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '20px' }}>
          {result.items.map((item, i) => <Row key={i} value={item} onJump={onJump} />)}
        </div>
      )}

      {result.quotes?.length > 0 && (
        <Field label="Quotes">
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

      {result.keywords?.length > 0 && (
        <div style={{ paddingTop: '16px', marginTop: '4px', borderTop: '1px solid #1a1a1a' }}>
          <div style={{ fontSize: '10px', color: '#999', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>Keywords</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {result.keywords.map((k, i) => <Tag key={i}>{k}</Tag>)}
          </div>
        </div>
      )}

    </div>
  )
}
