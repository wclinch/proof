export type CitationMeta = {
  title: string
  authors: string[]       // ["Last, First"] format
  year: string | null
  month: string | null
  day: string | null
  journal: string | null
  publisher: string | null
  volume: string | null
  issue: string | null
  pages: string | null
  doi: string | null
  url: string
  siteName: string | null
  type: 'journal-article' | 'book' | 'book-chapter' | 'website' | 'other'
}

// ─── Author helpers ───────────────────────────────────────────────────────────

function lastName(a: string) { return a.split(', ')[0] ?? a }
function firstName(a: string) { return a.split(', ')[1] ?? '' }

function initials(a: string) {
  return firstName(a).split(/\s+/).filter(Boolean).map(p => p[0] + '.').join(' ') || null
}

function invert(a: string) {
  const [last, first] = a.split(', ')
  return first ? `${first} ${last}` : last
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function em(s: string): string {
  return `<em>${esc(s)}</em>`
}

// ─── MLA 9th ──────────────────────────────────────────────────────────────────

function mlaAuthors(authors: string[]): string {
  if (!authors.length) return ''
  if (authors.length === 1) return authors[0]
  if (authors.length === 2) return `${authors[0]}, and ${invert(authors[1])}`
  return `${authors[0]}, et al.`
}

const MONTHS_SHORT = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']
const MONTHS_LONG  = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function shortMonth(m: string) { return MONTHS_SHORT[parseInt(m, 10) - 1] ?? m }
function longMonth(m: string)  { return MONTHS_LONG[parseInt(m, 10) - 1] ?? m }

export function formatMLA(m: CitationMeta): string {
  const author = mlaAuthors(m.authors)
  const byline = author ? author + '. ' : ''
  const title  = `"${m.title}."`
  const year   = m.year ?? 'n.d.'

  if ((m.type === 'journal-article') && m.journal) {
    const parts: string[] = [byline + title, m.journal + ',']
    if (m.volume) parts.push(`vol. ${m.volume},`)
    if (m.issue)  parts.push(`no. ${m.issue},`)
    parts.push(year + ',')
    if (m.pages) parts.push(`pp. ${m.pages}.`)
    parts.push(m.doi ? `doi:${m.doi}.` : m.url + '.')
    return parts.join(' ')
  }

  if (m.type === 'website') {
    const site = m.siteName ? m.siteName + ', ' : ''
    let date = ''
    if (m.year) {
      date = m.day && m.month
        ? `${parseInt(m.day)} ${shortMonth(m.month)} ${m.year}, `
        : year + ', '
    }
    return `${byline}${title} ${site}${date}${m.url}.`
  }

  // book / other
  const pub = m.publisher ? m.publisher + ', ' : ''
  const doi = m.doi ? ` doi:${m.doi}.` : ''
  return `${byline}${m.title}. ${pub}${year}.${doi}`
}

// ─── APA 7th ─────────────────────────────────────────────────────────────────

function apaAuthors(authors: string[]): string {
  if (!authors.length) return ''
  const fmt = (a: string) => { const ini = initials(a); return ini ? `${lastName(a)}, ${ini}` : lastName(a) }
  if (authors.length === 1) return fmt(authors[0])
  if (authors.length === 2) return `${fmt(authors[0])}, & ${fmt(authors[1])}`
  if (authors.length <= 20) {
    const all = authors.map(fmt)
    const last = all.pop()!
    return `${all.join(', ')}, & ${last}`
  }
  return authors.slice(0, 19).map(fmt).join(', ') + ', ... ' + fmt(authors[authors.length - 1])
}

export function formatAPA(m: CitationMeta): string {
  const author = apaAuthors(m.authors)
  const byline = author ? author + '. ' : ''
  const year   = m.year
    ? (m.month
        ? `(${m.year}, ${longMonth(m.month)}${m.day ? ' ' + parseInt(m.day) : ''}).`
        : `(${m.year}).`)
    : '(n.d.).'

  if (m.type === 'journal-article' && m.journal) {
    const vi = m.volume ? (m.issue ? `${m.volume}(${m.issue})` : m.volume) : ''
    const doi = m.doi ? `https://doi.org/${m.doi}` : m.url
    return [
      byline + year,
      m.title + '.',
      m.journal + (vi ? `, ${vi}` : '') + (m.pages ? `, ${m.pages}` : '') + '.',
      doi,
    ].join(' ')
  }

  if (m.type === 'website') {
    const site = m.siteName ? m.siteName + '. ' : ''
    return `${byline}${year} ${m.title}. ${site}${m.url}`
  }

  const pub = m.publisher ? m.publisher + '. ' : ''
  const doi = m.doi ? `https://doi.org/${m.doi}` : m.url
  return `${byline}${year} ${m.title}. ${pub}${doi}`
}

// ─── Chicago 17th ────────────────────────────────────────────────────────────

function chicagoAuthors(authors: string[]): string {
  if (!authors.length) return ''
  if (authors.length === 1) return authors[0]
  if (authors.length === 2) return `${authors[0]}, and ${invert(authors[1])}`
  if (authors.length === 3) return `${authors[0]}, ${invert(authors[1])}, and ${invert(authors[2])}`
  return `${authors[0]}, et al.`
}

export function formatChicago(m: CitationMeta): string {
  const author = chicagoAuthors(m.authors)
  const byline = author ? author + '. ' : ''
  const title  = `"${m.title}."`
  const year   = m.year ?? 'n.d.'

  if (m.type === 'journal-article' && m.journal) {
    const vi = m.volume ? (m.issue ? `${m.volume}, no. ${m.issue}` : m.volume) : ''
    const doi = m.doi ? ` https://doi.org/${m.doi}.` : m.url ? ` ${m.url}.` : ''
    const pages = m.pages ? `: ${m.pages}.` : '.'
    return `${byline}${title} ${m.journal}${vi ? ' ' + vi : ''} (${year})${pages}${doi}`
  }

  if (m.type === 'website') {
    const site = m.siteName ? m.siteName + '. ' : ''
    let date = ''
    if (m.year) {
      date = m.month
        ? `${longMonth(m.month)}${m.day ? ' ' + parseInt(m.day) + ',' : ','} ${m.year}. `
        : year + '. '
    }
    return `${byline}${title} ${site}${date}${m.url}.`
  }

  const pub = m.publisher ? m.publisher + ', ' : ''
  const doi = m.doi ? ` https://doi.org/${m.doi}.` : ''
  return `${byline}${m.title}. ${pub}${year}.${doi}`
}

// ─── In-text citations ────────────────────────────────────────────────────────

function shortTitle(m: CitationMeta): string {
  const words = m.title.split(' ').slice(0, 4).join(' ')
  return `"${words}${m.title.split(' ').length > 4 ? '...' : ''}"`
}

export function inTextMLA(m: CitationMeta): string {
  const last = m.authors[0] ? lastName(m.authors[0]) : null
  return last ? `(${last})` : `(${shortTitle(m)})`
}

export function inTextAPA(m: CitationMeta): string {
  const year = m.year ?? 'n.d.'
  if (!m.authors.length) return `(${shortTitle(m)}, ${year})`
  const last = lastName(m.authors[0])
  if (m.authors.length === 2) return `(${last} & ${lastName(m.authors[1])}, ${year})`
  if (m.authors.length > 2) return `(${last} et al., ${year})`
  return `(${last}, ${year})`
}

export function inTextChicago(m: CitationMeta): string {
  const year = m.year ?? 'n.d.'
  const last = m.authors[0] ? lastName(m.authors[0]) : null
  return last ? `(${last} ${year})` : `(${shortTitle(m)} ${year})`
}

// ─── HTML formatters (for rich-text clipboard copy) ───────────────────────────

export function formatMLAHtml(m: CitationMeta): string {
  const author = mlaAuthors(m.authors)
  const byline = author ? esc(author) + '. ' : ''
  const title  = `"${esc(m.title)}."`
  const year   = m.year ?? 'n.d.'

  if (m.type === 'journal-article' && m.journal) {
    const parts: string[] = [byline + title, em(m.journal) + ',']
    if (m.volume) parts.push(`vol. ${esc(m.volume)},`)
    if (m.issue)  parts.push(`no. ${esc(m.issue)},`)
    parts.push(esc(year) + ',')
    if (m.pages) parts.push(`pp. ${esc(m.pages)}.`)
    parts.push(m.doi ? `doi:${esc(m.doi)}.` : esc(m.url) + '.')
    return parts.join(' ')
  }

  if (m.type === 'website') {
    const site = m.siteName ? em(m.siteName) + ', ' : ''
    let date = ''
    if (m.year) {
      date = m.day && m.month
        ? `${parseInt(m.day)} ${shortMonth(m.month)} ${esc(m.year)}, `
        : esc(year) + ', '
    }
    return `${byline}${title} ${site}${date}${esc(m.url)}.`
  }

  const pub = m.publisher ? esc(m.publisher) + ', ' : ''
  const doi = m.doi ? ` doi:${esc(m.doi)}.` : ''
  return `${byline}${em(m.title)} ${pub}${esc(year)}.${doi}`
}

export function formatAPAHtml(m: CitationMeta): string {
  const author = apaAuthors(m.authors)
  const byline = author ? esc(author) + '. ' : ''
  const year   = m.year
    ? (m.month
        ? `(${m.year}, ${longMonth(m.month)}${m.day ? ' ' + parseInt(m.day) : ''}).`
        : `(${m.year}).`)
    : '(n.d.).'

  if (m.type === 'journal-article' && m.journal) {
    const volPart = m.volume
      ? (m.issue ? `, <em>${esc(m.volume)}</em>(${esc(m.issue)})` : `, <em>${esc(m.volume)}</em>`)
      : ''
    const journalFull = em(m.journal) + volPart + (m.pages ? `, ${esc(m.pages)}` : '') + '.'
    const doi = m.doi ? `https://doi.org/${esc(m.doi)}` : esc(m.url)
    return [byline + esc(year), esc(m.title) + '.', journalFull, doi].join(' ')
  }

  if (m.type === 'website') {
    const site = m.siteName ? esc(m.siteName) + '. ' : ''
    return `${byline}${esc(year)} ${em(m.title)}. ${site}${esc(m.url)}`
  }

  const pub = m.publisher ? esc(m.publisher) + '. ' : ''
  const doi = m.doi ? `https://doi.org/${esc(m.doi)}` : esc(m.url)
  return `${byline}${esc(year)} ${em(m.title)}. ${pub}${doi}`
}

export function formatChicagoHtml(m: CitationMeta): string {
  const author = chicagoAuthors(m.authors)
  const byline = author ? esc(author) + '. ' : ''
  const title  = `"${esc(m.title)}."`
  const year   = m.year ?? 'n.d.'

  if (m.type === 'journal-article' && m.journal) {
    const vi = m.volume ? (m.issue ? `${m.volume}, no. ${m.issue}` : m.volume) : ''
    const doi = m.doi ? ` https://doi.org/${esc(m.doi)}.` : m.url ? ` ${esc(m.url)}.` : ''
    const pages = m.pages ? `: ${esc(m.pages)}.` : '.'
    return `${byline}${title} ${em(m.journal)}${vi ? ' ' + esc(vi) : ''} (${esc(year)})${pages}${doi}`
  }

  if (m.type === 'website') {
    const site = m.siteName ? em(m.siteName) + '. ' : ''
    let date = ''
    if (m.year) {
      date = m.month
        ? `${longMonth(m.month)}${m.day ? ' ' + parseInt(m.day) + ',' : ','} ${esc(m.year)}. `
        : esc(year) + '. '
    }
    return `${byline}${title} ${site}${date}${esc(m.url)}.`
  }

  const pub = m.publisher ? esc(m.publisher) + ', ' : ''
  const doi = m.doi ? ` https://doi.org/${esc(m.doi)}.` : ''
  return `${byline}${title} ${pub}${esc(year)}.${doi}`
}
