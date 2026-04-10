import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import dns from 'dns/promises'
import type { CitationMeta } from '@/lib/cite'

export const runtime = 'nodejs'

// Supabase client reused across requests
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── DOI detection ────────────────────────────────────────────────────────────

function extractDOI(input: string): string | null {
  // Strip query params and fragments before matching
  const cleaned = input.split('?')[0].split('#')[0]
  const doiOrg = cleaned.match(/doi\.org\/(10\.\d{4,}\/[^\s]+)/i)
  if (doiOrg) return doiOrg[1]
  const raw = cleaned.match(/(10\.\d{4,}\/[^\s]+)/)
  if (raw) return raw[1]
  return null
}

// ─── CrossRef ─────────────────────────────────────────────────────────────────

async function fetchDOI(doi: string): Promise<CitationMeta> {
  const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
    headers: { 'User-Agent': 'Proof/1.0 (mailto:proof_official@protonmail.com)' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`CrossRef ${res.status}`)
  const { message: w } = await res.json()

  const authors = (w.author || []).map((a: { family?: string; given?: string }) =>
    a.family && a.given ? `${a.family}, ${a.given}` : a.family ?? a.given ?? ''
  ).filter(Boolean)

  const dateParts = w.published?.['date-parts']?.[0] ?? w['published-print']?.['date-parts']?.[0] ?? []
  const year  = dateParts[0] ? String(dateParts[0]) : null
  const month = dateParts[1] ? String(dateParts[1]).padStart(2, '0') : null
  const day   = dateParts[2] ? String(dateParts[2]).padStart(2, '0') : null

  const rawType = w.type ?? 'other'
  const type: CitationMeta['type'] =
    rawType === 'journal-article' ? 'journal-article' :
    rawType === 'book' ? 'book' :
    rawType === 'book-chapter' ? 'book-chapter' : 'other'

  return {
    title: w.title?.[0] ?? 'Untitled',
    authors,
    year,
    month,
    day,
    journal: w['container-title']?.[0] ?? null,
    publisher: w.publisher ?? null,
    volume: w.volume ?? null,
    issue: w.issue ?? null,
    pages: w.page ?? null,
    doi,
    url: w.URL ?? `https://doi.org/${doi}`,
    siteName: null,
    type,
  }
}

// ─── URL metadata ─────────────────────────────────────────────────────────────

function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (!['http:', 'https:'].includes(u.protocol)) return false
    const h = u.hostname
    // Block loopback, private, link-local, and reserved ranges
    if (/^127\./.test(h)) return false
    if (h === 'localhost' || h === '::1') return false
    if (/^169\.254\./.test(h)) return false
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return false
    return true
  } catch { return false }
}

function getMeta(html: string, ...attrs: string[]): string | null {
  for (const attr of attrs) {
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${attr}["'][^>]+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${attr}["']`, 'i'),
    ]
    for (const re of patterns) {
      const m = html.match(re)
      if (m?.[1]) return m[1].trim()
    }
  }
  return null
}

function getTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m?.[1]?.trim() ?? null
}

async function fetchURL(url: string): Promise<CitationMeta> {
  if (!isSafeUrl(url)) throw new Error('Invalid URL')

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Proof/1.0)' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Fetch ${res.status}`)
  const html = await res.text()

  const title =
    getMeta(html, 'og:title', 'twitter:title', 'citation_title') ??
    getTitle(html) ?? 'Untitled'

  const siteName = getMeta(html, 'og:site_name') ?? new URL(url).hostname.replace(/^www\./, '')

  const authorRaw = getMeta(html, 'author', 'article:author', 'citation_author') ?? null
  const authors = authorRaw
    ? authorRaw.split(/;/).map(a => a.trim()).filter(Boolean).map(a => {
        const parts = a.split(/\s+/)
        return parts.length >= 2 ? `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}` : a
      })
    : []

  const dateRaw = getMeta(html, 'article:published_time', 'citation_publication_date', 'date', 'DC.date') ?? null
  let year: string | null = null
  let month: string | null = null
  let day: string | null = null
  if (dateRaw) {
    const parts = dateRaw.split(/[-T]/)
    year  = parts[0]?.match(/^\d{4}$/) ? parts[0] : null
    const rawMonth = parseInt(parts[1] ?? '', 10)
    month = rawMonth >= 1 && rawMonth <= 12 ? String(rawMonth).padStart(2, '0') : null
    const rawDay = parseInt(parts[2]?.slice(0, 2) ?? '', 10)
    day   = rawDay >= 1 && rawDay <= 31 ? String(rawDay).padStart(2, '0') : null
  }

  const journal   = getMeta(html, 'citation_journal_title') ?? null
  const volume    = getMeta(html, 'citation_volume') ?? null
  const issue     = getMeta(html, 'citation_issue') ?? null
  const firstPage = getMeta(html, 'citation_firstpage')
  const lastPage  = getMeta(html, 'citation_lastpage')
  const pages = firstPage ? (lastPage ? `${firstPage}–${lastPage}` : firstPage) : null

  return {
    title,
    authors,
    year,
    month,
    day,
    journal,
    publisher: null,
    volume,
    issue,
    pages,
    doi: null,
    url,
    siteName,
    type: journal ? 'journal-article' : 'website',
  }
}

// ─── Institution from IP ──────────────────────────────────────────────────────

async function getInstitutionDomain(ip: string): Promise<string | null> {
  try {
    const hostnames = await dns.reverse(ip)
    for (const h of hostnames) {
      for (const suffix of ['.edu', '.gov', '.ac.uk', '.edu.au']) {
        if (h.endsWith(suffix)) {
          const parts = h.split('.')
          return suffix === '.ac.uk' || suffix === '.edu.au'
            ? parts.slice(-3).join('.')
            : parts.slice(-2).join('.')
        }
      }
    }
  } catch { /* not an institutional IP */ }
  return null
}

// ─── Geo ──────────────────────────────────────────────────────────────────────

async function fetchGeo(ip: string): Promise<{ country: string | null; region: string | null }> {
  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      headers: { 'User-Agent': 'Proof/1.0 (mailto:proof_official@protonmail.com)' },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return { country: null, region: null }
    const data = await res.json()
    return {
      country: typeof data.country_name === 'string' ? data.country_name : null,
      region: typeof data.region === 'string' ? data.region : null,
    }
  } catch { return { country: null, region: null } }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { input?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { input } = body
  if (!input || typeof input !== 'string' || !input.trim()) {
    return NextResponse.json({ error: 'No input provided.' }, { status: 400 })
  }

  const trimmed = input.trim().slice(0, 2000)
  const doi = extractDOI(trimmed)

  let meta: CitationMeta
  let inputType: 'doi' | 'url'
  try {
    if (doi) {
      meta = await fetchDOI(doi)
      inputType = 'doi'
    } else {
      const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
      meta = await fetchURL(url)
      inputType = 'url'
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to fetch metadata.'
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? ''
  const userAgent = req.headers.get('user-agent') ?? null
  const geo = rawIp ? await fetchGeo(rawIp) : { country: null, region: null }

  const { data: logRow, error: logError } = await supabase
    .from('citations_log')
    .insert({
      input: trimmed,
      input_type: inputType,
      title: meta.title,
      institution_domain: null,
      country: geo.country,
      region: geo.region,
      user_agent: userAgent,
    })
    .select('id')
    .single()

  if (logError) console.error('cite log error:', logError.message)

  return NextResponse.json({ meta, logId: logRow?.id ?? null })
}
