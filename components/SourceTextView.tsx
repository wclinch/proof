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

// Extend a match range to the end of the sentence (next '. ', '.' EOL, or block end)
function extendToSentence(block: string, start: number, end: number): number {
  const sentenceEnd = block.indexOf('.', end)
  if (sentenceEnd === -1 || sentenceEnd - start > 600) return Math.min(block.length, end + 20)
  return sentenceEnd + 1
}

// Split into blocks: blank-line-separated paragraphs
function parseBlocks(text: string): string[] {
  return text.split(/\n\n+/).map(b => b.trim()).filter(Boolean)
}

const NAV_STOP_WORDS = new Set(['the','a','an','and','or','for','of','to','in','is','are','was','with','by','at','on','as','it','its','this','that','from','be','been','can','will','our','your','we','us'])


const JUNK_PATTERNS = [
  /cookie/i,
  /javascript.*disabled/i,
  /enable.*javascript/i,
  /sign in to continue/i,
  /log in to continue/i,
  /access denied/i,
  /please enable/i,
]

// Strip nav/UI blocks from the first 20 blocks
function filterNavBlocks(blocks: string[]): string[] {
  return blocks.filter((b, i) => {
    if (JUNK_PATTERNS.some(p => p.test(b))) return false  // always strip junk
    if (i >= 20) return true
    if (/[.?!]/.test(b) && b.length > 40) return true  // real sentence → keep

    const words = b.split(/\s+/).filter(Boolean)
    if (words.length > 50) return true  // too long to be nav

    // First 5 blocks: aggressively strip short UI chrome.
    // Exception: blocks with a 4-digit year (likely a document title) or commas (real content).
    if (i < 5 && words.length >= 2 && words.length <= 9 && !b.includes(',') && !/\b(19|20)\d{2}\b/.test(b)) {
      return false
    }

    // Blocks 5–20: repeated meaningful word check
    const meaningful = words
      .map(w => w.toLowerCase().replace(/[^a-z]/g, ''))
      .filter(w => w.length > 3 && !NAV_STOP_WORDS.has(w))
    const counts = new Map<string, number>()
    for (const w of meaningful) counts.set(w, (counts.get(w) ?? 0) + 1)
    const repeated = [...counts.entries()].filter(([, c]) => c >= 2)
    return !(repeated.length >= 2 || repeated.some(([, c]) => c >= 3))
  })
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

  const rawBlocks  = filterNavBlocks(parseBlocks(truncated ? cleaned.slice(0, TRUNCATION_THRESHOLD) : cleaned))
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
          Excerpt not found in source text.
        </div>
      )}

      {truncated && (
        <div style={{ marginTop: '4px', paddingTop: '12px', borderTop: '1px solid #1a1a1a', fontSize: '11px', color: '#666', letterSpacing: '0.04em' }}>
          Source text truncated at ~20k characters.
        </div>
      )}
    </div>
  )
}
