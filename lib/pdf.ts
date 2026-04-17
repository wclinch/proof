import * as PDFJS from 'pdfjs-dist/legacy/build/pdf.mjs'
import { resolve } from 'path'
import { pathToFileURL } from 'url'

// Point to the bundled worker file — required in Node.js (pdfjs-dist v5)
PDFJS.GlobalWorkerOptions.workerSrc = pathToFileURL(
  resolve('./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')
).href

interface TextItem {
  str: string
  x: number
  y: number
  width: number
  height: number
  fontName: string
}

interface Line {
  y: number
  height: number
  items: TextItem[]
  text: string
  x0: number   // leftmost x of the line
  x1: number   // rightmost x of the line
}

// Group raw text items into visual lines by y-proximity
function groupIntoLines(items: TextItem[]): Line[] {
  if (!items.length) return []

  // Sort top-to-bottom, left-to-right
  const sorted = [...items].sort((a, b) => {
    const dy = b.y - a.y  // PDF y is bottom-up
    if (Math.abs(dy) > 2) return dy
    return a.x - b.x
  })

  const lines: Line[] = []
  let current: TextItem[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = current[current.length - 1]
    const item = sorted[i]
    // Same line if y difference is less than half the font height
    const yTol = Math.max(prev.height, item.height) * 0.5
    if (Math.abs(item.y - prev.y) <= yTol) {
      current.push(item)
    } else {
      lines.push(buildLine(current))
      current = [item]
    }
  }
  if (current.length) lines.push(buildLine(current))

  return lines
}

function buildLine(items: TextItem[]): Line {
  const sorted = [...items].sort((a, b) => a.x - b.x)
  const parts: string[] = []

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i]
    if (i > 0) {
      const prev = sorted[i - 1]
      const gap = item.x - (prev.x + prev.width)
      // Insert space if gap is meaningful (> ~0.3 char widths)
      const charWidth = prev.width / (prev.str.length || 1)
      if (gap > charWidth * 0.3) parts.push(' ')
    }
    parts.push(item.str)
  }

  const text = parts.join('').replace(/\s+/g, ' ').trim()
  const xs = sorted.map(it => it.x)
  const x1s = sorted.map(it => it.x + it.width)
  const ys = sorted.map(it => it.y)
  const heights = sorted.map(it => it.height)

  return {
    y: Math.max(...ys),
    height: Math.max(...heights),
    items: sorted,
    text,
    x0: Math.min(...xs),
    x1: Math.max(...x1s),
  }
}

// Detect if the page has a two-column layout
function detectColumnSplit(lines: Line[], pageWidth: number): number | null {
  if (!lines.length || pageWidth === 0) return null

  const mid = pageWidth / 2
  const margin = pageWidth * 0.08

  // Count lines that start in left column vs right column
  let leftOnly = 0
  let rightOnly = 0
  let spanning = 0

  for (const line of lines) {
    if (!line.text) continue
    const startsLeft  = line.x0 < mid - margin
    const startsRight = line.x0 > mid - margin
    const endsLeft    = line.x1 < mid + margin
    const endsRight   = line.x1 > mid + margin

    if (startsLeft && endsLeft)   leftOnly++
    else if (startsRight)          rightOnly++
    else if (startsLeft && endsRight) spanning++
  }

  const total = leftOnly + rightOnly + spanning
  if (total === 0) return null

  // Two-column if most lines are either left-only or right-only, few spanning
  const columnLines = leftOnly + rightOnly
  if (columnLines / total > 0.55 && leftOnly > 2 && rightOnly > 2) {
    return mid
  }

  return null
}

// Convert lines to paragraph-structured text
function linesToText(lines: Line[], columnSplit: number | null): string {
  if (!lines.length) return ''

  let orderedLines: Line[]

  if (columnSplit !== null) {
    // Two-column: separate left and right, process left first then right
    const leftLines  = lines.filter(l => l.x0 < columnSplit && l.x1 <= columnSplit + 20)
    const rightLines = lines.filter(l => l.x0 >= columnSplit - 20)
    const spanning   = lines.filter(l => l.x0 < columnSplit - 20 && l.x1 > columnSplit + 20)

    // Spanning lines (headers, titles) appear in y-order across both columns
    const allWithType = [
      ...spanning.map(l  => ({ ...l, col: 0 as 0 | 1 | 2 })),
      ...leftLines.map(l  => ({ ...l, col: 1 as 0 | 1 | 2 })),
      ...rightLines.map(l => ({ ...l, col: 2 as 0 | 1 | 2 })),
    ]

    // Group into sections by spanning lines, then left col, then right col
    orderedLines = [
      ...spanning,
      ...leftLines,
      ...rightLines,
    ]
    // Re-sort: spanning by y desc, then left col by y desc, then right col by y desc
    orderedLines = [
      ...spanning.sort((a, b) => b.y - a.y),
      ...leftLines.sort((a, b) => b.y - a.y),
      ...rightLines.sort((a, b) => b.y - a.y),
    ]
  } else {
    orderedLines = [...lines].sort((a, b) => b.y - a.y)
  }

  // Filter empty lines
  const nonEmpty = orderedLines.filter(l => l.text.length > 0)
  if (!nonEmpty.length) return ''

  // Compute median line height for paragraph gap detection
  const heights = nonEmpty.map(l => l.height).sort((a, b) => a - b)
  const medianHeight = heights[Math.floor(heights.length / 2)] || 12

  // Compute y-gaps between consecutive lines
  const paragraphs: string[] = []
  let currentPara: string[] = [nonEmpty[0].text]

  for (let i = 1; i < nonEmpty.length; i++) {
    const prev = nonEmpty[i - 1]
    const curr = nonEmpty[i]

    // Gap in y (PDF y is bottom-up, so prev.y > curr.y for lines going down the page)
    const gap = prev.y - curr.y - prev.height

    // Paragraph break: gap larger than ~0.5× median line height
    const isParagraphBreak = gap > medianHeight * 0.5

    if (isParagraphBreak) {
      paragraphs.push(joinLines(currentPara))
      currentPara = [curr.text]
    } else {
      currentPara.push(curr.text)
    }
  }
  paragraphs.push(joinLines(currentPara))

  return paragraphs.filter(Boolean).join('\n\n')
}

// Join lines within a paragraph, handling hyphenation
function joinLines(lines: string[]): string {
  if (!lines.length) return ''
  let result = lines[0]
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    if (result.endsWith('-')) {
      // Hyphenated word — rejoin without space
      result = result.slice(0, -1) + line
    } else {
      result = result + ' ' + line
    }
  }
  return result.replace(/\s+/g, ' ').trim()
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = new Uint8Array(buffer)
  const doc  = await PDFJS.getDocument({ data, useSystemFonts: true }).promise

  const pageTexts: string[] = []

  for (let p = 1; p <= doc.numPages; p++) {
    const page     = await doc.getPage(p)
    const viewport = page.getViewport({ scale: 1 })
    const content  = await page.getTextContent({ includeMarkedContent: false })

    const items: TextItem[] = []
    for (const item of content.items) {
      if (!('str' in item)) continue
      if (!item.str.trim()) continue

      // Transform matrix: [scaleX, skewY, skewX, scaleY, tx, ty]
      const tx = item.transform
      items.push({
        str:      item.str,
        x:        tx[4],
        y:        tx[5],
        width:    item.width,
        height:   item.height || Math.abs(tx[3]),
        fontName: item.fontName ?? '',
      })
    }

    if (!items.length) continue

    const lines       = groupIntoLines(items)
    const columnSplit = detectColumnSplit(lines, viewport.width)
    const text        = linesToText(lines, columnSplit)
    if (text) pageTexts.push(text)
  }

  return pageTexts
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
