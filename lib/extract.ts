import type { DocContent, Block, Sentence } from './types'
import { splitSentences } from './sentences'

// ── Text block builder ────────────────────────────────────────────────────────
// Splits fullText by blank lines, tracking the START CHARACTER POSITION of each
// block within fullText. This lets us binary-search pageCharStarts to assign an
// accurate PDF page number to every sentence without coordinate approximations.

function textToBlocks(text: string, pageCharStarts?: number[]): Block[] {
  const blocks: Block[] = []
  let globalIdx = 0

  // Walk the text, splitting on two-or-more newlines and recording each
  // block's exact start offset within `text`.
  const sep = /\n{2,}/g
  let lastEnd = 0
  const raw: Array<{ content: string; start: number }> = []
  let m: RegExpExecArray | null
  while ((m = sep.exec(text)) !== null) {
    raw.push({ content: text.slice(lastEnd, m.index), start: lastEnd })
    lastEnd = m.index + m[0].length
  }
  raw.push({ content: text.slice(lastEnd), start: lastEnd })

  for (const { content, start: blockStart } of raw) {
    const normalized = content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
    if (normalized.length <= 15) continue

    const rawSents = splitSentences(normalized)
    if (!rawSents.length) continue

    const sentences: Sentence[] = rawSents.map(rs => {
      // Absolute char position of this sentence in fullText
      const absPos = blockStart + rs.start
      let page: number | undefined
      if (pageCharStarts) {
        page = 1
        for (let p = 1; p < pageCharStarts.length; p++) {
          if (pageCharStarts[p] <= absPos) page = p + 1
          else break
        }
      }
      return { i: globalIdx++, text: rs.text, page }
    })

    blocks.push({ sentences })
  }

  // Merge cross-block sentence fragments that span page boundaries.
  // If block[i]'s last sentence has no terminal punctuation and block[i+1]'s
  // first sentence starts lowercase, they're halves of one sentence — join them.
  for (let i = blocks.length - 2; i >= 0; i--) {
    const curr = blocks[i]
    const next = blocks[i + 1]
    if (!curr.sentences.length || !next.sentences.length) continue
    const last  = curr.sentences[curr.sentences.length - 1]
    const first = next.sentences[0]
    if (!SENT_END_RE.test(last.text) && /^[a-z"'"“‘]/.test(first.text)) {
      last.text = last.text.trimEnd() + ' ' + first.text.trimStart()
      next.sentences.shift()
      if (!next.sentences.length) blocks.splice(i + 1, 1)
    }
  }

  return blocks
}

// ── Low-level types ───────────────────────────────────────────────────────────

type Item = { str: string; transform: number[] }

interface Line {
  y:      number
  xStart: number
  text:   string
}

// ── Phase 1: items → lines ────────────────────────────────────────────────────

function itemsToLines(items: Item[]): Line[] {
  if (!items.length) return []
  const sorted = [...items].sort((a, b) => {
    const dy = b.transform[5] - a.transform[5]
    return Math.abs(dy) > 2 ? dy : a.transform[4] - b.transform[4]
  })
  const lines: Line[] = []
  for (const item of sorted) {
    const last = lines[lines.length - 1]
    if (last && Math.abs(item.transform[5] - last.y) <= 2) {
      last.text += item.str
    } else {
      lines.push({ y: item.transform[5], xStart: item.transform[4], text: item.str })
    }
  }
  return lines
}

// ── Phase 2: compute document-wide line spacing ───────────────────────────────

function modalLineSpacing(allPageLines: Line[][]): number {
  const bins = new Map<number, number>()
  for (const lines of allPageLines) {
    for (let i = 1; i < lines.length; i++) {
      const g = Math.abs(lines[i].y - lines[i - 1].y)
      if (g > 2 && g < 80) {
        const bin = Math.round(g / 2) * 2
        bins.set(bin, (bins.get(bin) ?? 0) + 1)
      }
    }
  }
  if (!bins.size) return 14
  let mode = 14, best = 0
  for (const [bin, n] of bins) if (n > best) { best = n; mode = bin }
  return mode
}

// ── Phase 3: lines → paragraphs ───────────────────────────────────────────────

const SENT_END_RE = /[.!?]["'"']?\s*$/

function linesToParagraphs(lines: Line[], paraThreshold: number): string[] {
  if (!lines.length) return []

  const out: string[] = []
  let para      = lines[0].text
  let prevXStart = lines[0].xStart

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const gap  = Math.abs(line.y - lines[i - 1].y)
    const prev = para.trimEnd()

    const hardBreak = gap > paraThreshold
    const softBreak = !prev.endsWith('-')
      && line.xStart > prevXStart + 10
      && SENT_END_RE.test(prev)

    if (hardBreak || softBreak) {
      if (prev.length > 15) out.push(prev)
      para = line.text
    } else if (prev.endsWith('-')) {
      para = prev.slice(0, -1) + line.text.trimStart()
    } else {
      para = prev + ' ' + line.text.trimStart()
    }

    prevXStart = line.xStart
  }

  const last = para.trim()
  if (last.length > 15) out.push(last)
  return out
}

// ── Main extraction ───────────────────────────────────────────────────────────

export async function extractContent(file: File): Promise<DocContent> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  // Pass 1: fetch items
  const allPageItems: Item[][] = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p)
    const content = await page.getTextContent()
    allPageItems.push((content.items as Item[]).filter(i => i.str))
  }

  // Build lines, compute global line spacing
  const allPageLines = allPageItems.map(itemsToLines)
  const lineSpacing  = modalLineSpacing(allPageLines)
  const paraThreshold = lineSpacing * 1.8

  // Pass 2: per-page text segments
  const pageSegments: string[] = []

  for (let pi = 0; pi < allPageLines.length; pi++) {
    const lines = allPageLines[pi]
    if (!lines.length) { pageSegments.push(''); continue }

    const filtered = lines.filter((line, idx) => {
      const prevGap  = idx > 0               ? Math.abs(line.y - lines[idx - 1].y) : Infinity
      const nextGap  = idx < lines.length - 1 ? Math.abs(line.y - lines[idx + 1].y) : Infinity
      const isolated = Math.min(prevGap, nextGap) > paraThreshold
      const short    = line.text.trim().length < 80

      if (pi > 0 && isolated && short) return false
      if (isolated && /^\s*[\divxlcdm]{1,5}\s*$/i.test(line.text)) return false
      // Strip a standalone page number at the very top of body pages even when
      // it's not isolated (close to the first text line, causing it to merge).
      if (pi > 0 && idx <= 1 && /^\s*\d{1,4}\s*$/.test(line.text)) return false
      return true
    })

    if (!filtered.length) { pageSegments.push(''); continue }

    const paragraphs = linesToParagraphs(filtered, paraThreshold)

    if (pi > 0) {
      while (paragraphs.length > 1) {
        const first = paragraphs[0].trim()
        if (first.length < 80 && !SENT_END_RE.test(first)) paragraphs.shift()
        else break
      }
      while (paragraphs.length > 1) {
        const last = paragraphs[paragraphs.length - 1].trim()
        if (last.length < 40 && !SENT_END_RE.test(last)) paragraphs.pop()
        else break
      }
    }

    pageSegments.push(paragraphs.join('\n\n'))
  }

  // Join pages, recording each page's start offset in fullText.
  // Strip leading page-number artifacts from each segment ("2 How Individual..."
  // → "How Individual...") before joining so they don't land mid-sentence.
  const pageCharStarts: number[] = []
  let fullText = ''

  for (const seg of pageSegments) {
    let s = seg.trim()
    if (!s) {
      pageCharStarts.push(fullText.length)
      continue
    }
    // Strip a standalone page number at the very start of the segment
    // (e.g. "2 How Individual..." → "How Individual...").
    // Only when followed by an uppercase letter to avoid stripping "3 items...".
    s = s.replace(/^\d{1,3} (?=[a-zA-Z])/, '')

    pageCharStarts.push(fullText.length)
    fullText = fullText ? fullText.trimEnd() + '\n\n' + s : s
  }

  // Build blocks with accurate per-sentence page numbers derived from
  // character positions — no approximation needed.
  const blocks = textToBlocks(fullText, pageCharStarts)

  // pageBreaks kept for backward compat (ClipCard etc. may check it)
  const totalSents = blocks.reduce((n, b) => n + b.sentences.length, 0)
  const pageBreaks = pageCharStarts.map(c =>
    fullText.length > 0 ? Math.min(totalSents - 1, Math.floor((c / fullText.length) * totalSents)) : 0
  )

  return { blocks, pageBreaks }
}
