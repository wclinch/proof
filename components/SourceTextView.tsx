'use client'
import { useRef, useEffect } from 'react'

const TRUNCATION_THRESHOLD = 120_000

// ─── Types ──────────────────────────────────────────────────────────────────

type TextBlock  = { kind: 'text';  text: string }
type TableBlock = { kind: 'table'; rows: string[][] }
type Block = TextBlock | TableBlock

// ─── Text cleaning (leaves table pipe syntax intact) ────────────────────────

function cleanText(raw: string): string {
  return raw
    .replace(/[\u21B5\u00B6\u204B\u2029]/g, ' ')
    .replace(/^(Title|URL Source|Markdown Content):[^\n]*/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[\[\d+\]\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^[•·]\s*/gm, '- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─── Block parser: detects markdown table blocks ─────────────────────────────

function parseBlocks(text: string): Block[] {
  const lines  = text.split('\n')
  const result: Block[] = []
  let i = 0

  while (i < lines.length) {
    const trimmed = lines[i].trim()

    // Table block: consecutive lines starting (and ending) with |
    if (/^\|.+\|/.test(trimmed)) {
      const tableLines: string[] = []
      while (i < lines.length && /^\|/.test(lines[i].trim())) {
        tableLines.push(lines[i].trim())
        i++
      }
      // Skip separator rows (e.g. |---|:---|)
      const rows = tableLines
        .filter(l => !/^\|[\s\-:|]+\|$/.test(l))
        .map(l => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim()))
        .filter(row => row.some(c => c.length > 0))
      if (rows.length > 0) result.push({ kind: 'table', rows })
      continue
    }

    if (trimmed) {
      if (trimmed.length > 200) {
        const sentences = trimmed.split(/(?<=\.\s)/)
        for (const s of sentences) { const t = s.trim(); if (t) result.push({ kind: 'text', text: t }) }
      } else {
        result.push({ kind: 'text', text: trimmed })
      }
    }
    i++
  }
  return result
}

// ─── Junk filter (applied only to text blocks) ───────────────────────────────

const JUNK_PATTERNS = [
  /cookie/i, /javascript.*disabled/i, /enable.*javascript/i,
  /sign in to continue/i, /log in to continue/i, /access denied/i, /please enable/i,
]

function filterJunk(blocks: Block[]): Block[] {
  return blocks.filter(b =>
    b.kind === 'table' || !JUNK_PATTERNS.some(p => p.test(b.text))
  )
}

// ─── Highlight helpers ───────────────────────────────────────────────────────

function extendToSentence(_block: string, _start: number, end: number): number { return end }

// ─── Component ───────────────────────────────────────────────────────────────

export default function SourceTextView({ text, highlight }: { text: string; highlight: string | null }) {
  const cleaned   = cleanText(text)
  const truncated = cleaned.length >= TRUNCATION_THRESHOLD
  const markRef   = useRef<HTMLElement>(null)

  useEffect(() => {
    if (markRef.current) markRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlight])

  const allBlocks = filterJunk(parseBlocks(truncated ? cleaned.slice(0, TRUNCATION_THRESHOLD) : cleaned))

  // Normalise text blocks for matching
  const blocks = allBlocks.map(b =>
    b.kind === 'text' ? { ...b, text: b.text.replace(/\s+/g, ' ').trim() } : b
  )

  // ── Highlight search (text blocks only) ────────────────────────────────────
  let matchBlock = -1
  let matchStart = -1
  let matchEnd   = -1

  if (highlight) {
    const textBlocks  = blocks.map((b, i) => ({ i, text: b.kind === 'text' ? b.text : '' }))
    const joined      = textBlocks.map(b => b.text).join(' ')
    const fullNeedle  = highlight.replace(/\s+/g, ' ').trim().toLowerCase()
    const candidates  = [
      fullNeedle.slice(0, 400), fullNeedle.slice(0, 200),
      fullNeedle.slice(0, 120), fullNeedle.slice(0, 60),
      fullNeedle.slice(0, 30),
    ].filter((s, i, a) => s.length >= 15 && a.indexOf(s) === i)

    outer:
    for (const needle of candidates) {
      for (const { i: bi, text } of textBlocks) {
        const idx = text.toLowerCase().indexOf(needle)
        if (idx !== -1) {
          matchBlock = bi; matchStart = idx
          matchEnd = extendToSentence(text, idx, idx + needle.length)
          break outer
        }
      }
      const joinedIdx = joined.toLowerCase().indexOf(needle)
      if (joinedIdx !== -1) {
        let offset = 0
        for (const { i: bi, text } of textBlocks) {
          const end = offset + text.length
          if (joinedIdx >= offset && joinedIdx <= end) {
            matchBlock = bi
            matchStart = Math.max(0, joinedIdx - offset)
            matchEnd = extendToSentence(text, matchStart, Math.min(text.length, matchStart + needle.length))
            break outer
          }
          offset += text.length + 1
        }
      }
    }

    if (matchBlock === -1) {
      const needleTokens = fullNeedle.split(/\s+/)
      if (needleTokens.length >= 4) {
        outer2:
        for (let wSize = Math.min(8, needleTokens.length); wSize >= 4; wSize--) {
          for (let si = 0; si <= needleTokens.length - wSize; si++) {
            const phrase = needleTokens.slice(si, si + wSize).join(' ')
            if (phrase.length < 20) continue
            for (const { i: bi, text } of textBlocks) {
              const idx = text.toLowerCase().indexOf(phrase)
              if (idx !== -1) {
                matchBlock = bi; matchStart = idx
                matchEnd = extendToSentence(text, idx, idx + phrase.length)
                break outer2
              }
            }
          }
        }
      }
    }

    if (matchBlock === -1) {
      const nums = fullNeedle.match(/\d[\d,.]*%?/g) ?? []
      if (nums.length >= 2) {
        let best = 0
        for (const { i: bi, text } of textBlocks) {
          const hits = nums.filter(n => text.toLowerCase().includes(n)).length
          if (hits > best) { best = hits; matchBlock = bi }
        }
        if (best < 2) matchBlock = -1
        if (matchBlock !== -1) { matchStart = 0; matchEnd = 0 }
      }
    }

    if (matchBlock === -1) {
      const stopWords = new Set(['the','a','an','and','or','for','of','to','in','is','are','was','with','by','at','on','as','it','its','this','that','from','not','does','do','have','has','been','between','into','account'])
      const needleWords = fullNeedle.split(/\s+/).filter(w => w.length > 4 && !stopWords.has(w))
      if (needleWords.length >= 3) {
        let bestScore = 0
        for (const { i: bi, text } of textBlocks) {
          const hits  = needleWords.filter(w => text.toLowerCase().includes(w)).length
          const score = hits / needleWords.length
          if (score > bestScore) { bestScore = score; matchBlock = bi }
        }
        if (bestScore < 0.35) matchBlock = -1
        if (matchBlock !== -1 && blocks[matchBlock].kind === 'text' && (blocks[matchBlock] as TextBlock).text.length > 300) matchBlock = -1
        if (matchBlock !== -1) { matchStart = 0; matchEnd = 0 }
      }
    }
  }

  // ── Styles ─────────────────────────────────────────────────────────────────

  const blockStyle: React.CSSProperties = {
    fontSize: '13px', color: '#999', lineHeight: 1.8,
    margin: 0, padding: '0 0 16px 0', fontFamily: 'inherit',
  }
  const highlightStyle: React.CSSProperties = {
    background: '#1a2e1e', color: '#aaa', borderRadius: '2px',
    padding: '1px 2px', outline: '1px solid #2a4a2e',
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {blocks.map((block, bi) => {

        // ── Table block ──────────────────────────────────────────────────────
        if (block.kind === 'table') {
          const [header, ...body] = block.rows
          return (
            <div key={bi} style={{ overflowX: 'auto', marginBottom: '20px' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px', fontFamily: 'inherit' }}>
                {header && (
                  <thead>
                    <tr>
                      {header.map((cell, ci) => (
                        <th key={ci} style={{
                          padding: '6px 12px', textAlign: 'left',
                          color: '#888', fontWeight: 500, letterSpacing: '0.04em',
                          borderBottom: '1px solid #222', whiteSpace: 'nowrap',
                        }}>
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {body.map((row, ri) => (
                    <tr key={ri} style={{ borderBottom: '1px solid #161616' }}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{
                          padding: '5px 12px', color: '#777',
                          verticalAlign: 'top', lineHeight: 1.5,
                        }}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        // ── Text block ───────────────────────────────────────────────────────
        const { text } = block

        if (bi !== matchBlock) return <p key={bi} style={blockStyle}>{text}</p>

        if (matchStart === 0 && matchEnd === 0) {
          return (
            <p key={bi} style={blockStyle}>
              <mark ref={markRef as React.RefObject<HTMLElement>} style={highlightStyle}>{text}</mark>
            </p>
          )
        }

        return (
          <p key={bi} style={blockStyle}>
            {text.slice(0, matchStart)}
            <mark ref={markRef as React.RefObject<HTMLElement>} style={highlightStyle}>
              {text.slice(matchStart, matchEnd)}
            </mark>
            {text.slice(matchEnd)}
          </p>
        )
      })}

      {highlight && matchBlock === -1 && (
        <div style={{ fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', paddingTop: '4px' }}>
          excerpt not found in source text.
        </div>
      )}

      {truncated && (
        <div style={{ marginTop: '4px', paddingTop: '12px', borderTop: '1px solid #1a1a1a', fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          source text truncated at ~120k characters.
        </div>
      )}
    </div>
  )
}
