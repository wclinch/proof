'use client'
import { useRef, useEffect } from 'react'

const pre: React.CSSProperties = {
  fontSize: '13px',
  color: '#666',
  lineHeight: 1.75,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  margin: 0,
  padding: 0,
  fontFamily: 'inherit',
}

const TRUNCATION_THRESHOLD = 19000

export default function SourceTextView({ text, highlight }: { text: string; highlight: string | null }) {
  // Collapse runs of blank lines (including lines with only whitespace) down to one blank line
  text = text.replace(/(\n[ \t]*){3,}/g, '\n\n')
  const truncated = text.length >= TRUNCATION_THRESHOLD
  const markRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (markRef.current) {
      markRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlight])

  const truncNote = truncated ? (
    <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #1a1a1a', fontSize: '11px', color: '#333', letterSpacing: '0.04em' }}>
      Source text truncated at ~20k characters. Full text was sent for analysis.
    </div>
  ) : null

  if (!highlight) return <><pre style={pre}>{text}</pre>{truncNote}</>


  // Normalize all whitespace to single space for matching — handles cases where
  // Groq extracted from the flattened (newlines→space) version of the content
  const normText   = text.replace(/\s+/g, ' ')
  const normNeedle = highlight.replace(/\s+/g, ' ').slice(0, 400).trim().toLowerCase()
  const normIdx    = normText.toLowerCase().indexOf(normNeedle)
  if (normIdx === -1) return <pre style={pre}>{text}</pre>

  // Map normalized index back to position in original text
  let origStart = 0, normPos = 0
  while (normPos < normIdx && origStart < text.length) {
    if (/\s/.test(text[origStart])) {
      while (origStart < text.length && /\s/.test(text[origStart])) origStart++
      normPos++
    } else { origStart++; normPos++ }
  }

  // Walk forward matching needle chars, treating any whitespace run as one space
  let origEnd = origStart, needlePos = 0
  const nn = normNeedle
  while (needlePos < nn.length && origEnd < text.length) {
    if (/\s/.test(nn[needlePos]) && /\s/.test(text[origEnd])) {
      needlePos++
      while (origEnd < text.length && /\s/.test(text[origEnd])) origEnd++
    } else if (nn[needlePos].toLowerCase() === text[origEnd].toLowerCase()) {
      needlePos++; origEnd++
    } else { break }
  }

  const before = text.slice(0, origStart)
  const match  = text.slice(origStart, origEnd)
  const after  = text.slice(origEnd)

  return (
    <>
      <pre style={pre}>
        {before}
        <span
          ref={markRef}
          style={{
            background: '#1e3020',
            color: '#aaa',
            borderRadius: '2px',
            padding: '1px 2px',
            outline: '1px solid #2a4a30',
          }}
        >
          {match}
        </span>
        {after}
      </pre>
      {truncNote}
    </>
  )
}
