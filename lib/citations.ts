import type { QueuedSource, Project } from './types'

// ─── Author utilities ─────────────────────────────────────────────────────────
// Groq sometimes outputs "Last, First" and sometimes "First Last" — handle both.

function isLastFirst(name: string): boolean {
  return name.includes(',')
}

/** Extract surname regardless of format. */
function getLastName(full: string): string {
  if (isLastFirst(full)) return full.split(',')[0].trim()
  const parts = full.trim().split(/\s+/)
  return parts[parts.length - 1]
}

/** Ensure "Last, First" format (for MLA/Chicago first-author slot). */
function toLastFirst(full: string): string {
  if (isLastFirst(full)) return full
  const parts = full.trim().split(/\s+/)
  if (parts.length === 1) return full
  const last = parts[parts.length - 1]
  const rest = parts.slice(0, -1).join(' ')
  return `${last}, ${rest}`
}

/** Ensure "First Last" format (for non-first authors in MLA/Chicago). */
function toFirstLast(full: string): string {
  if (!isLastFirst(full)) return full
  const parts = full.split(',').map(s => s.trim())
  return parts.length >= 2 ? `${parts[1]} ${parts[0]}` : full
}

/** Convert "Alan Palomba Richardson" or "Richardson, Alan Palomba" → "A. P." */
function getInitials(full: string): string {
  const firstName = isLastFirst(full)
    ? full.split(',').slice(1).join('').trim()
    : full.trim().split(/\s+/).slice(0, -1).join(' ')
  return firstName
    .split(/\s+/)
    .filter(Boolean)
    .map(w => `${w[0].toUpperCase()}.`)
    .join(' ')
}

// ─── MLA ─────────────────────────────────────────────────────────────────────

export function formatMlaWorksCited(src: QueuedSource): string {
  const r = src.result
  if (!r) return src.label ?? src.raw

  const authors = r.authors ?? []
  const year    = r.year ?? 'n.d.'
  const title   = r.title ?? 'Untitled'
  const journal = r.journal
  const doi     = r.doi
  const type    = r.type

  let authorBlock = ''
  if (authors.length === 1) {
    authorBlock = `${toLastFirst(authors[0])}.`
  } else if (authors.length === 2) {
    authorBlock = `${toLastFirst(authors[0])}, and ${toFirstLast(authors[1])}.`
  } else if (authors.length > 2) {
    authorBlock = `${toLastFirst(authors[0])}, et al.`
  }

  let body: string
  if (type === 'journal-article') {
    body = `"${title}."${journal ? ` *${journal}*,` : ''} ${year}.`
  } else {
    body = `*${title}*. ${year}.`
  }

  let out = [authorBlock, body].filter(Boolean).join(' ')
  if (doi) out += ` https://doi.org/${doi}`
  return out.trim()
}

export function formatMlaIntext(src: QueuedSource): string {
  const r = src.result
  if (!r) return src.label ?? src.raw
  const authors = r.authors ?? []
  if (authors.length === 0) return `(*${(r.title ?? 'Unknown').split(' ').slice(0, 4).join(' ')}...*)`
  if (authors.length === 1) return `(${getLastName(authors[0])})`
  if (authors.length === 2) return `(${getLastName(authors[0])} and ${getLastName(authors[1])})`
  return `(${getLastName(authors[0])} et al.)`
}

// ─── APA ─────────────────────────────────────────────────────────────────────

export function formatApaReferences(src: QueuedSource): string {
  const r = src.result
  if (!r) return src.label ?? src.raw

  const authors = r.authors ?? []
  const year    = r.year ?? 'n.d.'
  const title   = r.title ?? 'Untitled'
  const journal = r.journal
  const doi     = r.doi
  const type    = r.type

  let authorBlock = ''
  if (authors.length === 1) {
    authorBlock = `${toLastFirst(authors[0])}, ${getInitials(authors[0])}`
  } else if (authors.length === 2) {
    authorBlock = `${toLastFirst(authors[0])}, ${getInitials(authors[0])}, & ${toLastFirst(authors[1])}, ${getInitials(authors[1])}`
  } else if (authors.length > 2) {
    authorBlock = `${toLastFirst(authors[0])}, ${getInitials(authors[0])}, et al.`
  }

  let body: string
  // APA: journal article titles are plain, journal names italicised
  // Standalone works (books, reports): title italicised, sentence case
  if (type === 'journal-article') {
    const lcTitle = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase()
    body = `${lcTitle}.${journal ? ` *${journal}*.` : ''}`
  } else {
    const lcTitle = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase()
    body = `*${lcTitle}*.`
  }

  let out = authorBlock
    ? `${authorBlock} (${year}). ${body}`
    : `(${year}). ${body}`
  if (doi) out += ` https://doi.org/${doi}`
  return out.trim()
}

export function formatApaIntext(src: QueuedSource): string {
  const r = src.result
  if (!r) return src.label ?? src.raw
  const authors = r.authors ?? []
  const year    = r.year ?? 'n.d.'
  if (authors.length === 0) return `(*${(r.title ?? 'Unknown').split(' ').slice(0, 4).join(' ')}...*, ${year})`
  if (authors.length === 1) return `(${getLastName(authors[0])}, ${year})`
  if (authors.length === 2) return `(${getLastName(authors[0])} & ${getLastName(authors[1])}, ${year})`
  return `(${getLastName(authors[0])} et al., ${year})`
}

// ─── Chicago (author-date) ────────────────────────────────────────────────────

export function formatChicagoBibliography(src: QueuedSource): string {
  const r = src.result
  if (!r) return src.label ?? src.raw

  const authors = r.authors ?? []
  const year    = r.year ?? 'n.d.'
  const title   = r.title ?? 'Untitled'
  const journal = r.journal
  const doi     = r.doi
  const type    = r.type

  let authorBlock = ''
  if (authors.length === 1) {
    authorBlock = `${toLastFirst(authors[0])}.`
  } else if (authors.length === 2) {
    authorBlock = `${toLastFirst(authors[0])}, and ${toFirstLast(authors[1])}.`
  } else if (authors.length > 2) {
    authorBlock = `${toLastFirst(authors[0])}, et al.`
  }

  let body: string
  if (type === 'journal-article') {
    body = `"${title}."${journal ? ` *${journal}*,` : ''} (${year}).`
  } else {
    body = `*${title}*. ${year}.`
  }

  let out = [authorBlock, body].filter(Boolean).join(' ')
  if (doi) out += ` https://doi.org/${doi}`
  return out.trim()
}

export function formatChicagoIntext(src: QueuedSource): string {
  const r = src.result
  if (!r) return src.label ?? src.raw
  const authors = r.authors ?? []
  const year    = r.year ?? 'n.d.'
  if (authors.length === 0) return `(*${(r.title ?? 'Unknown').split(' ').slice(0, 4).join(' ')}...* ${year})`
  if (authors.length === 1) return `(${getLastName(authors[0])} ${year})`
  if (authors.length === 2) return `(${getLastName(authors[0])} and ${getLastName(authors[1])} ${year})`
  return `(${getLastName(authors[0])} et al. ${year})`
}

// ─── Style-aware exports ──────────────────────────────────────────────────────

export type CitationStyle = Project['citationStyle']

export function formatEntry(src: QueuedSource, style: CitationStyle): string {
  if (style === 'apa')     return formatApaReferences(src)
  if (style === 'chicago') return formatChicagoBibliography(src)
  return formatMlaWorksCited(src)
}

export function formatIntext(src: QueuedSource, style: CitationStyle): string {
  if (style === 'apa')     return formatApaIntext(src)
  if (style === 'chicago') return formatChicagoIntext(src)
  return formatMlaIntext(src)
}

export function formatFullBibliography(sources: QueuedSource[], style: CitationStyle): string {
  return sources.map(s => formatEntry(s, style)).join('\n\n')
}

export const STYLE_LABELS: Record<CitationStyle, string> = {
  mla:     'MLA',
  apa:     'APA',
  chicago: 'Chicago',
}
