// Pure sentence utilities — no DOM dependency.

const ABBREVS = new Set([
  'dr','mr','mrs','ms','prof','sr','jr','vs','etc','al','et','cf',
  'pp','vol','fig','no','ca','dept','approx','gov','lt','col','sgt',
  'jan','feb','mar','apr','jun','jul','aug','sep','oct','nov','dec',
  'st','ave','blvd','rd','inc','corp','co',
  'para','sec','ch','pt','ed','rev','ser','suppl','repr','trans',
])

// closing punctuation that can follow . ! ?
const CLOSING_RE = /[)"'"'»]/
// chars that can legally open a new sentence
const SENT_START_RE = /[A-Z0-9"'"'(]/

export interface RawSentence {
  start: number
  end: number
  text: string
}

export function splitSentences(text: string): RawSentence[] {
  const masked = new Uint8Array(text.length)

  const abbrevRe = /\b([A-Za-z]{1,8})\./g
  let m: RegExpExecArray | null
  while ((m = abbrevRe.exec(text)) !== null) {
    if (ABBREVS.has(m[1].toLowerCase())) masked[m.index + m[1].length] = 1
  }
  const initRe = /\b[A-Z]\./g
  while ((m = initRe.exec(text)) !== null) masked[m.index + 1] = 1
  const decRe = /\d\.\d/g
  while ((m = decRe.exec(text)) !== null) masked[m.index + 1] = 1
  const parenRe = /\(\w+\.\s*\d/g
  while ((m = parenRe.exec(text)) !== null) {
    const dotPos = text.indexOf('.', m.index)
    if (dotPos !== -1 && dotPos < m.index + m[0].length) masked[dotPos] = 1
  }

  const results: RawSentence[] = []
  let sentStart = 0

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if ((ch === '.' || ch === '!' || ch === '?') && !masked[i]) {
      let j = i + 1
      while (j < text.length && CLOSING_RE.test(text[j])) j++
      const atEnd    = j >= text.length
      const nextIsWS = text[j] === ' ' || text[j] === '\n'
      const afterWS  = nextIsWS && j + 1 < text.length ? text[j + 1] : ''
      const isBreak  = atEnd || (nextIsWS && (j + 1 >= text.length || SENT_START_RE.test(afterWS)))
      if (isBreak) {
        const s = text.slice(sentStart, j).trim()
        if (s.length > 5) results.push({ start: sentStart, end: j, text: s })
        sentStart = j
        while (sentStart < text.length && (text[sentStart] === ' ' || text[sentStart] === '\n')) sentStart++
      }
    }
  }
  const tail = text.slice(sentStart).trim()
  if (tail.length > 5) results.push({ start: sentStart, end: text.length, text: tail })
  return results
}

// Returns [s, e] inclusive indices into the flat sentence array.
// Boundary rule: clicked=0 → [0,1]; clicked=last → [last-1, last]; middle → [i-1, i+1].
export function getSentenceWindow(total: number, clicked: number): { s: number; e: number } {
  if (total <= 1) return { s: 0, e: total - 1 }
  if (total === 2) return { s: 0, e: 1 }
  if (clicked === 0)        return { s: 0, e: 1 }
  if (clicked >= total - 1) return { s: total - 2, e: total - 1 }
  return { s: clicked - 1, e: clicked + 1 }
}
