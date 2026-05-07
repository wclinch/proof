import type { DocContent, Block, Sentence } from './types'
import { splitSentences } from './sentences'

// ── Text block builder (unchanged) ───────────────────────────────────────────

function textToBlocks(text: string): Block[] {
  const rawBlocks = text
    .split(/\n{2,}/)
    .map(b => b.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(b => b.length > 15)

  const blocks: Block[] = []
  let globalIdx = 0
  for (const raw of rawBlocks) {
    const rawSents = splitSentences(raw)
    if (!rawSents.length) continue
    blocks.push({ sentences: rawSents.map(rs => ({ i: globalIdx++, text: rs.text })) })
  }
  return blocks
}

// ── Low-level types ───────────────────────────────────────────────────────────

type Item = { str: string; transform: number[] }

// A visual text line: all items within 2pt of the same y baseline, sorted left→right.
interface Line {
  y:      number   // baseline y
  xStart: number   // x of leftmost item (used for indentation detection)
  text:   string   // concatenated item strings
}

// ── Phase 1: items → lines ────────────────────────────────────────────────────
// Group adjacent items onto the same visual line (within 2pt y-distance).

function itemsToLines(items: Item[]): Line[] {
  if (!items.length) return []

  // Sort top-to-bottom (higher y = higher on page in PDF coords), left-to-right within a line
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
// Use histogram mode of line-to-line y-gaps (ignores same-line and extreme jumps).

function modalLineSpacing(allPageLines: Line[][]): number {
  const bins = new Map<number, number>()
  for (const lines of allPageLines) {
    for (let i = 1; i < lines.length; i++) {
      const g = Math.abs(lines[i].y - lines[i - 1].y)
      if (g > 2 && g < 80) {
        const bin = Math.round(g / 2) * 2   // 2pt bins
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
// Merge consecutive lines into paragraphs. Two signals can create a paragraph break:
//   A. Hard break  — y-gap between lines > paraThreshold (explicit blank space in layout)
//   B. Soft break  — next line starts noticeably more-indented than the previous line's
//                    start AND the accumulated paragraph already ends with terminal
//                    punctuation (we are at a real sentence boundary).
//
// Mid-sentence line wraps never trigger a break because they cannot satisfy B
// (no terminal punctuation at the cut point) and are well within threshold for A.

const SENT_END_RE = /[.!?]["'”']?\s*$/

function linesToParagraphs(lines: Line[], paraThreshold: number): string[] {
  if (!lines.length) return []

  const out: string[] = []
  let para      = lines[0].text
  let prevXStart = lines[0].xStart

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const gap  = Math.abs(line.y - lines[i - 1].y)
    const prev = para.trimEnd()

    // A. Hard gap
    const hardBreak = gap > paraThreshold

    // B. Indented line-start after a completed sentence
    //    xStart significantly further right than where the previous line began.
    //    Guard: accumulated paragraph must end with terminal punctuation (.!?)
    //    so we never split inside a sentence.
    const softBreak = !prev.endsWith('-')
      && line.xStart > prevXStart + 10
      && SENT_END_RE.test(prev)

    if (hardBreak || softBreak) {
      if (prev.length > 15) out.push(prev)
      para = line.text
    } else if (prev.endsWith('-')) {
      // Hyphenated line-wrap: join without the hyphen
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

  // ── Fetch all pages ──────────────────────────────────────────────────────────
  const allPageItems: Item[][] = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p)
    const content = await page.getTextContent()
    allPageItems.push((content.items as Item[]).filter(i => i.str))
  }

  // ── Build lines, compute global line spacing ─────────────────────────────────
  const allPageLines = allPageItems.map(itemsToLines)
  const lineSpacing  = modalLineSpacing(allPageLines)
  const paraThreshold = lineSpacing * 1.8   // gap must be ≥ 1.8× line step to be a paragraph break

  // ── Build per-page text segments ─────────────────────────────────────────────
  const pageSegments: string[] = []

  for (let pi = 0; pi < allPageLines.length; pi++) {
    const lines = allPageLines[pi]
    if (!lines.length) { pageSegments.push(''); continue }

    // Filter header/footer artifacts:
    //   • Any line that is isolated (nearest neighbour gap > paraThreshold) AND is short
    //     AND is on a body page (pi > 0) — catches running headers and most footers.
    //   • Standalone page numbers (pure digits/Roman numerals) anywhere.
    const filtered = lines.filter((line, idx) => {
      const prevGap  = idx > 0               ? Math.abs(line.y - lines[idx - 1].y) : Infinity
      const nextGap  = idx < lines.length - 1 ? Math.abs(line.y - lines[idx + 1].y) : Infinity
      const isolated = Math.min(prevGap, nextGap) > paraThreshold
      const short    = line.text.trim().length < 80

      if (pi > 0 && isolated && short) return false                         // running header / footer
      if (isolated && /^\s*[\divxlcdm]{1,5}\s*$/i.test(line.text)) return false  // page number
      return true
    })

    if (!filtered.length) { pageSegments.push(''); continue }

    const paragraphs = linesToParagraphs(filtered, paraThreshold)

    // Post-filter: drop leading/trailing paragraphs on body pages that look like
    // leftover headers/footers (short, no terminal punctuation).
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

  // ── Join pages, recording each page's start offset in fullText ──────────────
  // We track character positions BEFORE adding each segment so we can later
  // map page boundaries to sentence indices via character proportion.
  const pageCharStarts: number[] = []
  let fullText = ''
  for (const seg of pageSegments) {
    const s = seg.trim()
    pageCharStarts.push(fullText.length)   // char offset where this page starts
    if (!s) continue
    fullText = fullText ? fullText.trimEnd() + ' ' + s : s
  }

  const blocks = textToBlocks(fullText)
  const totalSents = blocks.reduce((n, b) => n + b.sentences.length, 0)
  const totalChars = fullText.length

  // Convert each page's char offset to an approximate sentence index.
  // Assumes sentences are roughly uniform in length — good enough for dividers.
  const pageBreaks = pageCharStarts.map(charPos =>
    totalChars > 0
      ? Math.min(totalSents - 1, Math.floor((charPos / totalChars) * totalSents))
      : 0
  )

  return { blocks, pageBreaks }
}
