'use client'
import { useRef, useEffect } from 'react'

const TRUNCATION_THRESHOLD = 19000

// Strip residual markdown that may exist in sources fetched before server-side stripping
function cleanText(raw: string): string {
  return raw
    .replace(/^(Title|URL Source|Markdown Content):[^\n]*/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')          // strip images before links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^[•·]\s*/gm, '- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Split into blocks: blank-line-separated paragraphs
function parseBlocks(text: string): string[] {
  return text.split(/\n\n+/).map(b => b.trim()).filter(Boolean)
}

export default function SourceTextView({ text, highlight }: { text: string; highlight: string | null }) {
  const cleaned   = cleanText(text)
  const truncated = cleaned.length >= TRUNCATION_THRESHOLD
  const markRef   = useRef<HTMLElement>(null)

  useEffect(() => {
    if (markRef.current) {
      markRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlight])

  const blocks = parseBlocks(truncated ? cleaned.slice(0, TRUNCATION_THRESHOLD) : cleaned)

  // Find which block + char range contains the highlight.
  // The model receives newline-collapsed text, so a finding may span block
  // boundaries in the original. We search the joined text first, then map
  // back to the block that contains the match start.
  let matchBlock  = -1
  let matchStart  = -1
  let matchEnd    = -1

  if (highlight) {
    const joined = blocks.map(b => b.replace(/\s+/g, ' ')).join(' ')

    // Try progressively shorter slices of the needle (model may append extra context)
    const fullNeedle = highlight.replace(/\s+/g, ' ').trim().toLowerCase()
    const candidates = [
      fullNeedle.slice(0, 400),
      fullNeedle.slice(0, 200),
      fullNeedle.slice(0, 120),
    ].filter((s, i, a) => s.length > 20 && a.indexOf(s) === i)

    outer:
    for (const needle of candidates) {
      // Try per-block first (fast path, avoids cross-block ambiguity)
      for (let bi = 0; bi < blocks.length; bi++) {
        const norm = blocks[bi].replace(/\s+/g, ' ')
        const idx  = norm.toLowerCase().indexOf(needle)
        if (idx !== -1) {
          matchBlock = bi; matchStart = idx; matchEnd = idx + needle.length
          break outer
        }
      }

      // Fallback: search joined text and map back to block
      const joinedIdx = joined.toLowerCase().indexOf(needle)
      if (joinedIdx !== -1) {
        let offset = 0
        for (let bi = 0; bi < blocks.length; bi++) {
          const norm = blocks[bi].replace(/\s+/g, ' ')
          if (joinedIdx >= offset && joinedIdx < offset + norm.length + 1) {
            matchBlock = bi
            matchStart = Math.max(0, joinedIdx - offset)
            matchEnd   = Math.min(norm.length, matchStart + needle.length)
            break outer
          }
          offset += norm.length + 1
        }
      }
    }
  }

  const blockStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#999',
    lineHeight: 1.8,
    margin: 0,
    padding: '0 0 16px 0',
    fontFamily: 'inherit',
  }

  const highlightStyle: React.CSSProperties = {
    background: '#1a2e1e',
    color: '#aaa',
    borderRadius: '2px',
    padding: '1px 2px',
    outline: '1px solid #2a4a2e',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {blocks.map((block, bi) => {
        if (bi !== matchBlock) {
          return <p key={bi} style={blockStyle}>{block}</p>
        }

        // Render the matched block with the highlighted span inside
        const before = block.slice(0, matchStart)
        const match  = block.slice(matchStart, matchEnd)
        const after  = block.slice(matchEnd)

        return (
          <p key={bi} style={blockStyle}>
            {before}
            <mark ref={markRef as React.RefObject<HTMLElement>} style={highlightStyle}>
              {match}
            </mark>
            {after}
          </p>
        )
      })}

      {highlight && matchBlock === -1 && (
        <div style={{ fontSize: '11px', color: '#666', letterSpacing: '0.04em', paddingTop: '4px' }}>
          Excerpt not found in source text.
        </div>
      )}

      {truncated && (
        <div style={{ marginTop: '4px', paddingTop: '12px', borderTop: '1px solid #1a1a1a', fontSize: '11px', color: '#666', letterSpacing: '0.04em' }}>
          Source text truncated at ~20k characters. Full text was sent for analysis.
        </div>
      )}
    </div>
  )
}
