'use client'
import { useRef, useEffect } from 'react'

const TRUNCATION_THRESHOLD = 20000

// Strip residual markdown that may exist in sources fetched before server-side stripping
function cleanText(raw: string): string {
  return raw
    .replace(/[\u21B5\u00B6\u204B\u2029]/g, ' ') // strip paragraph markers
    .replace(/^(Title|URL Source|Markdown Content):[^\n]*/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')          // strip images before links
    .replace(/\[\[\d+\]\]\([^)]*\)/g, '')          // strip [[n]](url) footnotes
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^[•·]\s*/gm, '- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Clamp match end to the exact needle boundary — no spillover into adjacent text
function extendToSentence(_block: string, _start: number, end: number): number {
  return end
}

// Split into blocks: newlines first, then sentence-split any block over 200 chars
function parseBlocks(text: string): string[] {
  const lines = text.split(/\n+/).map(b => b.trim()).filter(Boolean)
  const result: string[] = []
  for (const line of lines) {
    if (line.length <= 200) { result.push(line); continue }
    // Split long lines at sentence boundaries
    const sentences = line.split(/(?<=\.\s)/)
    for (const s of sentences) {
      const t = s.trim()
      if (t) result.push(t)
    }
  }
  return result
}

const JUNK_PATTERNS = [
  /cookie/i,
  /javascript.*disabled/i,
  /enable.*javascript/i,
  /sign in to continue/i,
  /log in to continue/i,
  /access denied/i,
  /please enable/i,
]

function filterJunk(blocks: string[]): string[] {
  return blocks.filter(b => !JUNK_PATTERNS.some(p => p.test(b)))
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

  const rawBlocks  = filterJunk(parseBlocks(truncated ? cleaned.slice(0, TRUNCATION_THRESHOLD) : cleaned))
  // Normalize whitespace once per block — matching AND rendering use this same string
  // so that matchStart/matchEnd indices are always valid slice positions.
  const blocks = rawBlocks.map(b => b.replace(/\s+/g, ' ').trim())

  // Find which block + char range contains the highlight.
  // The model receives newline-collapsed text, so a finding may span block
  // boundaries in the original. We search the joined text and per-block.
  let matchBlock  = -1
  let matchStart  = -1
  let matchEnd    = -1

  if (highlight) {
    const joined = blocks.join(' ')

    // Try progressively shorter slices of the needle
    const fullNeedle = highlight.replace(/\s+/g, ' ').trim().toLowerCase()
    const candidates = [
      fullNeedle.slice(0, 400),
      fullNeedle.slice(0, 200),
      fullNeedle.slice(0, 120),
      fullNeedle.slice(0, 60),
      fullNeedle.slice(0, 30),
    ].filter((s, i, a) => s.length >= 15 && a.indexOf(s) === i)

    outer:
    for (const needle of candidates) {
      // Per-block search (fast path)
      for (let bi = 0; bi < blocks.length; bi++) {
        const idx = blocks[bi].toLowerCase().indexOf(needle)
        if (idx !== -1) {
          matchBlock = bi; matchStart = idx
          matchEnd = extendToSentence(blocks[bi], idx, idx + needle.length)
          break outer
        }
      }

      // Fallback: search joined text and map back to block
      const joinedIdx = joined.toLowerCase().indexOf(needle)
      if (joinedIdx !== -1) {
        let offset = 0
        for (let bi = 0; bi < blocks.length; bi++) {
          const end = offset + blocks[bi].length
          if (joinedIdx >= offset && joinedIdx <= end) {
            matchBlock = bi
            matchStart = Math.max(0, joinedIdx - offset)
            const rawEnd = Math.min(blocks[bi].length, matchStart + needle.length)
            matchEnd = extendToSentence(blocks[bi], matchStart, rawEnd)
            break outer
          }
          offset += blocks[bi].length + 1 // +1 for the space separator
        }
      }
    }

    // Phrase anchor — try sliding windows of 4–8 words from the needle verbatim
    if (matchBlock === -1) {
      const needleTokens = fullNeedle.split(/\s+/)
      if (needleTokens.length >= 4) {
        outer2:
        for (let wSize = Math.min(8, needleTokens.length); wSize >= 4; wSize--) {
          for (let si = 0; si <= needleTokens.length - wSize; si++) {
            const phrase = needleTokens.slice(si, si + wSize).join(' ')
            if (phrase.length < 20) continue
            for (let bi = 0; bi < blocks.length; bi++) {
              const idx = blocks[bi].toLowerCase().indexOf(phrase)
              if (idx !== -1) {
                matchBlock = bi; matchStart = idx
                matchEnd = extendToSentence(blocks[bi], idx, idx + phrase.length)
                break outer2
              }
            }
          }
        }
      }
    }

    // Numeric anchor — find the block containing the most numbers/percentages from the needle
    if (matchBlock === -1) {
      const nums = fullNeedle.match(/\d[\d,.]*%?/g) ?? []
      if (nums.length >= 2) {
        let best = 0
        for (let bi = 0; bi < blocks.length; bi++) {
          const b = blocks[bi].toLowerCase()
          const hits = nums.filter(n => b.includes(n)).length
          if (hits > best) { best = hits; matchBlock = bi }
        }
        if (best < 2) matchBlock = -1
        if (matchBlock !== -1) { matchStart = 0; matchEnd = 0 }
      }
    }

    // Word-overlap anchor — for text with no numbers (findings, limitations, claims).
    // Find the block that shares the most meaningful words with the needle.
    if (matchBlock === -1) {
      const stopWords = new Set(['the','a','an','and','or','for','of','to','in','is','are','was','with','by','at','on','as','it','its','this','that','from','not','does','do','have','has','been','between','into','account'])
      const needleWords = fullNeedle.split(/\s+/).filter(w => w.length > 4 && !stopWords.has(w))
      if (needleWords.length >= 3) {
        let bestScore = 0
        for (let bi = 0; bi < blocks.length; bi++) {
          const b = blocks[bi].toLowerCase()
          const hits = needleWords.filter(w => b.includes(w)).length
          const score = hits / needleWords.length
          if (score > bestScore) { bestScore = score; matchBlock = bi }
        }
        if (bestScore < 0.35) matchBlock = -1  // less than 35% overlap, skip
        // Don't highlight the whole block if it's too long to be meaningful
        if (matchBlock !== -1 && blocks[matchBlock].length > 300) matchBlock = -1
        if (matchBlock !== -1) { matchStart = 0; matchEnd = 0 }
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

        // Anchor fallback: matchStart===matchEnd===0, highlight whole block green
        if (matchStart === 0 && matchEnd === 0) {
          return (
            <p key={bi} style={blockStyle}>
              <mark ref={markRef as React.RefObject<HTMLElement>} style={highlightStyle}>
                {block}
              </mark>
            </p>
          )
        }

        // Render the matched block — block is already whitespace-normalized
        // so matchStart/matchEnd indices are valid
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
          excerpt not found in source text.
        </div>
      )}

      {truncated && (
        <div style={{ marginTop: '4px', paddingTop: '12px', borderTop: '1px solid #1a1a1a', fontSize: '11px', color: '#666', letterSpacing: '0.04em' }}>
          source text truncated at ~20k characters.
        </div>
      )}
    </div>
  )
}
