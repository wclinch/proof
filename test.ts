import { strict as assert } from 'node:assert'
import { describe, it } from 'node:test'
import {
  formatMLA, formatAPA, formatChicago,
  formatMLAHtml, formatAPAHtml, formatChicagoHtml,
  inTextMLA, inTextAPA, inTextChicago,
} from './lib/cite.ts'
import type { CitationMeta } from './lib/cite.ts'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const journal: CitationMeta = {
  title: 'Deep Learning for Citation Analysis',
  authors: ['Smith, John', 'Doe, Jane', 'Lee, Alice'],
  year: '2022',
  month: '03',
  day: '15',
  journal: 'Nature Machine Intelligence',
  publisher: null,
  volume: '4',
  issue: '2',
  pages: '112–120',
  doi: '10.1038/s42256-022-00451-1',
  url: 'https://doi.org/10.1038/s42256-022-00451-1',
  siteName: null,
  type: 'journal-article',
}

const website: CitationMeta = {
  title: 'How to Write a Research Paper',
  authors: ['Brown, Alice'],
  year: '2023',
  month: '07',
  day: '04',
  journal: null,
  publisher: null,
  volume: null,
  issue: null,
  pages: null,
  doi: null,
  url: 'https://example.com/research-paper',
  siteName: 'Example Site',
  type: 'website',
}

const book: CitationMeta = {
  title: 'The Art of Research',
  authors: ['Garcia, Maria', 'Kim, David'],
  year: '2019',
  month: null,
  day: null,
  journal: null,
  publisher: 'Oxford University Press',
  volume: null,
  issue: null,
  pages: null,
  doi: '10.1093/art/research',
  url: 'https://doi.org/10.1093/art/research',
  siteName: null,
  type: 'book',
}

const noAuthor: CitationMeta = {
  title: 'Anonymous Report on Climate Change',
  authors: [],
  year: '2021',
  month: null,
  day: null,
  journal: null,
  publisher: null,
  volume: null,
  issue: null,
  pages: null,
  doi: null,
  url: 'https://example.com/report',
  siteName: 'Climate Org',
  type: 'website',
}

const noYear: CitationMeta = {
  title: 'Undated Article',
  authors: ['Wilson, Tom'],
  year: null,
  month: null,
  day: null,
  journal: 'Journal of Examples',
  publisher: null,
  volume: '1',
  issue: '1',
  pages: '1–5',
  doi: null,
  url: 'https://example.com/undated',
  siteName: null,
  type: 'journal-article',
}

const oneAuthor: CitationMeta = {
  ...journal,
  authors: ['Smith, John'],
}

const twoAuthors: CitationMeta = {
  ...journal,
  authors: ['Smith, John', 'Doe, Jane'],
}

const bookChapter: CitationMeta = {
  title: 'Neural Networks in Practice',
  authors: ['Patel, Raj'],
  year: '2021',
  month: null,
  day: null,
  journal: 'Handbook of Machine Learning',
  publisher: 'MIT Press',
  volume: null,
  issue: null,
  pages: '45–78',
  doi: '10.7551/ml/chapter3',
  url: 'https://doi.org/10.7551/ml/chapter3',
  siteName: null,
  type: 'book-chapter',
}

const noFirstName: CitationMeta = {
  ...journal,
  authors: ['Aristotle'],
}

// ─── MLA ─────────────────────────────────────────────────────────────────────

describe('formatMLA', () => {
  it('journal article — 3 authors uses et al.', () => {
    const result = formatMLA(journal)
    assert.ok(result.startsWith('Smith, John, et al.'), `got: ${result}`)
    assert.ok(result.includes('Nature Machine Intelligence'))
    assert.ok(result.includes('vol. 4'))
    assert.ok(result.includes('no. 2'))
    assert.ok(result.includes('pp. 112–120'))
    assert.ok(result.includes('doi:10.1038/s42256-022-00451-1'))
  })

  it('journal article — 1 author', () => {
    const result = formatMLA(oneAuthor)
    assert.ok(result.startsWith('Smith, John.'), `got: ${result}`)
  })

  it('journal article — 2 authors', () => {
    const result = formatMLA(twoAuthors)
    assert.ok(result.includes('Smith, John, and Jane Doe'), `got: ${result}`)
  })

  it('website — includes site name and full date', () => {
    const result = formatMLA(website)
    assert.ok(result.includes('Brown, Alice'))
    assert.ok(result.includes('Example Site'))
    assert.ok(result.includes('4 July 2023'))
    assert.ok(result.includes('https://example.com/research-paper'))
  })

  it('book — includes publisher and DOI', () => {
    const result = formatMLA(book)
    assert.ok(result.includes('Oxford University Press'))
    assert.ok(result.includes('doi:10.1093/art/research'))
  })

  it('no author — byline is empty', () => {
    const result = formatMLA(noAuthor)
    assert.ok(result.startsWith('"Anonymous Report'), `got: ${result}`)
  })

  it('no year — falls back to n.d.', () => {
    const result = formatMLA(noYear)
    assert.ok(result.includes('n.d.'), `got: ${result}`)
  })

  it('does not contain undefined or null', () => {
    for (const fixture of [journal, website, book, noAuthor, noYear]) {
      const result = formatMLA(fixture)
      assert.ok(!result.includes('undefined'), `undefined in: ${result}`)
      assert.ok(!result.includes('null'), `null in: ${result}`)
      assert.ok(!result.includes('NaN'), `NaN in: ${result}`)
    }
  })
})

// ─── APA ─────────────────────────────────────────────────────────────────────

describe('formatAPA', () => {
  it('journal article — 3 authors all listed', () => {
    const result = formatAPA(journal)
    assert.ok(result.includes('Smith, J., Doe, J., & Lee, A.'), `got: ${result}`)
    assert.ok(result.includes('(2022, March 15).'), `got: ${result}`) // month+day present
    assert.ok(result.includes('Nature Machine Intelligence'))
    assert.ok(result.includes('4(2)'))
    assert.ok(result.includes('https://doi.org/10.1038/s42256-022-00451-1'))
  })

  it('journal article — 1 author', () => {
    const result = formatAPA(oneAuthor)
    assert.ok(result.includes('Smith, J.'), `got: ${result}`)
  })

  it('journal article — 2 authors', () => {
    const result = formatAPA(twoAuthors)
    assert.ok(result.includes('Smith, J., & Doe, J.'), `got: ${result}`)
  })

  it('website — includes site name', () => {
    const result = formatAPA(website)
    assert.ok(result.includes('Brown, A.'))
    assert.ok(result.includes('(2023, July 4).'))
    assert.ok(result.includes('Example Site'))
  })

  it('book — includes publisher and DOI', () => {
    const result = formatAPA(book)
    assert.ok(result.includes('Oxford University Press'))
    assert.ok(result.includes('https://doi.org/10.1093/art/research'))
  })

  it('no author — starts with title', () => {
    const result = formatAPA(noAuthor)
    assert.ok(result.startsWith('(2021).'), `got: ${result}`)
  })

  it('no year — falls back to n.d.', () => {
    const result = formatAPA(noYear)
    assert.ok(result.includes('(n.d.).'), `got: ${result}`)
  })

  it('does not contain undefined or null', () => {
    for (const fixture of [journal, website, book, noAuthor, noYear]) {
      const result = formatAPA(fixture)
      assert.ok(!result.includes('undefined'), `undefined in: ${result}`)
      assert.ok(!result.includes('null'), `null in: ${result}`)
      assert.ok(!result.includes('NaN'), `NaN in: ${result}`)
    }
  })
})

// ─── Chicago ─────────────────────────────────────────────────────────────────

describe('formatChicago', () => {
  it('journal article — 3 authors all listed (et al. only at 4+)', () => {
    const result = formatChicago(journal)
    assert.ok(result.includes('Smith, John, Jane Doe, and Alice Lee'), `got: ${result}`)
    assert.ok(result.includes('Nature Machine Intelligence'))
    assert.ok(result.includes('(2022)'))
    assert.ok(result.includes('https://doi.org/10.1038/s42256-022-00451-1'))
  })

  it('journal article — 4 authors uses et al.', () => {
    const fourAuthors = { ...journal, authors: ['Smith, John', 'Doe, Jane', 'Lee, Alice', 'Park, Bob'] }
    const result = formatChicago(fourAuthors)
    assert.ok(result.includes('Smith, John, et al.'), `got: ${result}`)
  })

  it('journal article — 2 authors', () => {
    const result = formatChicago(twoAuthors)
    assert.ok(result.includes('Smith, John, and Jane Doe'), `got: ${result}`)
  })

  it('website — includes site name and date', () => {
    const result = formatChicago(website)
    assert.ok(result.includes('Brown, Alice'))
    assert.ok(result.includes('Example Site'))
    assert.ok(result.includes('July 4, 2023'))
  })

  it('book — includes publisher and DOI', () => {
    const result = formatChicago(book)
    assert.ok(result.includes('Oxford University Press'))
    assert.ok(result.includes('https://doi.org/10.1093/art/research'))
  })

  it('no year — falls back to n.d.', () => {
    const result = formatChicago(noYear)
    assert.ok(result.includes('n.d.'), `got: ${result}`)
  })

  it('does not contain undefined or null', () => {
    for (const fixture of [journal, website, book, noAuthor, noYear]) {
      const result = formatChicago(fixture)
      assert.ok(!result.includes('undefined'), `undefined in: ${result}`)
      assert.ok(!result.includes('null'), `null in: ${result}`)
      assert.ok(!result.includes('NaN'), `NaN in: ${result}`)
    }
  })
})

// ─── In-text ─────────────────────────────────────────────────────────────────

describe('inTextMLA', () => {
  it('uses last name only', () => assert.equal(inTextMLA(journal), '(Smith)'))
  it('no author — uses short title', () => assert.equal(inTextMLA(noAuthor), '("Anonymous Report on Climate...")'))
})

describe('inTextAPA', () => {
  it('1 author', () => assert.equal(inTextAPA(oneAuthor), '(Smith, 2022)'))
  it('2 authors', () => assert.equal(inTextAPA(twoAuthors), '(Smith & Doe, 2022)'))
  it('3+ authors — et al.', () => assert.equal(inTextAPA(journal), '(Smith et al., 2022)'))
  it('no author — uses short title', () => assert.equal(inTextAPA(noAuthor), '("Anonymous Report on Climate...", 2021)'))
  it('no year — n.d.', () => assert.equal(inTextAPA(noYear), '(Wilson, n.d.)'))
})

describe('inTextChicago', () => {
  it('uses last name and year', () => assert.equal(inTextChicago(journal), '(Smith 2022)'))
  it('no author — uses short title', () => assert.equal(inTextChicago(noAuthor), '("Anonymous Report on Climate..." 2021)'))
  it('no year — n.d.', () => assert.equal(inTextChicago(noYear), '(Wilson n.d.)'))
})

// ─── HTML formatters — no raw HTML tags in plain output ───────────────────────

describe('HTML formatters produce valid HTML strings', () => {
  it('MLA HTML contains em tags for journal', () => {
    const result = formatMLAHtml(journal)
    assert.ok(result.includes('<em>'), `no em tag in: ${result}`)
    assert.ok(!result.includes('undefined'), `got: ${result}`)
  })

  it('APA HTML contains em tags for journal', () => {
    const result = formatAPAHtml(journal)
    assert.ok(result.includes('<em>'), `no em tag in: ${result}`)
  })

  it('Chicago HTML contains em tags for journal', () => {
    const result = formatChicagoHtml(journal)
    assert.ok(result.includes('<em>'), `no em tag in: ${result}`)
  })

  it('HTML formatters escape special chars in title', () => {
    const xss: CitationMeta = { ...journal, title: 'Study of <script>alert(1)</script> & "quotes"' }
    const result = formatMLAHtml(xss)
    assert.ok(!result.includes('<script>'), `unescaped in: ${result}`)
    assert.ok(result.includes('&lt;script&gt;'), `not escaped in: ${result}`)
    assert.ok(result.includes('&amp;'), `& not escaped in: ${result}`)
  })

  it('MLA HTML book-chapter has em tag for book title', () => {
    const result = formatMLAHtml(bookChapter)
    assert.ok(result.includes('<em>Handbook of Machine Learning</em>'), `got: ${result}`)
    assert.ok(result.includes('"Neural Networks in Practice."'), `got: ${result}`)
  })

  it('APA HTML book-chapter has em tag for book title', () => {
    const result = formatAPAHtml(bookChapter)
    assert.ok(result.includes('<em>Handbook of Machine Learning</em>'), `got: ${result}`)
  })

  it('Chicago HTML book-chapter has em tag for book title', () => {
    const result = formatChicagoHtml(bookChapter)
    assert.ok(result.includes('<em>Handbook of Machine Learning</em>'), `got: ${result}`)
    assert.ok(result.includes('"Neural Networks in Practice."'), `got: ${result}`)
  })
})

// ─── Book chapter plain text ──────────────────────────────────────────────────

describe('book-chapter formatting', () => {
  it('MLA — chapter in quotes, book plain, pages, doi', () => {
    const result = formatMLA(bookChapter)
    assert.ok(result.includes('"Neural Networks in Practice."'), `got: ${result}`)
    assert.ok(result.includes('Handbook of Machine Learning'), `got: ${result}`)
    assert.ok(result.includes('pp. 45–78'), `got: ${result}`)
    assert.ok(result.includes('doi:10.7551/ml/chapter3'), `got: ${result}`)
    assert.ok(!result.includes('undefined'), `got: ${result}`)
  })

  it('APA — chapter plain, In book italicized (plain text has no italics), pages, doi', () => {
    const result = formatAPA(bookChapter)
    assert.ok(result.includes('Neural Networks in Practice'), `got: ${result}`)
    assert.ok(result.includes('In Handbook of Machine Learning'), `got: ${result}`)
    assert.ok(result.includes('pp. 45–78'), `got: ${result}`)
    assert.ok(result.includes('https://doi.org/10.7551/ml/chapter3'), `got: ${result}`)
    assert.ok(!result.includes('undefined'), `got: ${result}`)
  })

  it('Chicago — chapter in quotes, In book, pages, doi', () => {
    const result = formatChicago(bookChapter)
    assert.ok(result.includes('"Neural Networks in Practice."'), `got: ${result}`)
    assert.ok(result.includes('In Handbook of Machine Learning'), `got: ${result}`)
    assert.ok(result.includes('45–78'), `got: ${result}`)
    assert.ok(result.includes('https://doi.org/10.7551/ml/chapter3'), `got: ${result}`)
    assert.ok(!result.includes('undefined'), `got: ${result}`)
  })
})

// ─── APA author edge cases ────────────────────────────────────────────────────

describe('APA author with no first name', () => {
  it('no trailing comma when initials are empty', () => {
    const result = formatAPA(noFirstName)
    assert.ok(!result.includes('Aristotle,'), `trailing comma in: ${result}`)
    assert.ok(result.includes('Aristotle'), `got: ${result}`)
  })
})
