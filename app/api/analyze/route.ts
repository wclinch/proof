import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callGroq, parseGroqResponse, formatGroqError } from '@/lib/groq'
import { extractPdfText } from '@/lib/pdf'
import { checkRateLimit } from '@/lib/rateLimit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function fetchContent(url: string): Promise<{ content: string; fullText: string; title: string | null; publisher: string | null }> {
  const isPdf = /\.pdf(\?.*)?$/i.test(url)
  if (isPdf) {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) throw new Error(`Failed to fetch PDF (${res.status})`)
    const buffer   = Buffer.from(await res.arrayBuffer())
    const fullText = await extractPdfText(buffer)
    const title    = url.split('/').pop()?.replace('.pdf', '') ?? null
    const content  = `Title: ${title ?? 'Unknown'}\n\nContent: ${fullText.slice(0, 28000)}`
    return { content, fullText, title, publisher: null }
  }

  // Match explicit DOIs and DOIs embedded in journal URLs (e.g. frontiersin.org/articles/10.3389/...)
  const embeddedDoi = url.match(/\b(10\.\d{4,}\/[^\s"'<>?#&]+)/)?.[1]
  const isDoi = /^10\.\d{4,}\//.test(url) || url.includes('doi.org/') || !!embeddedDoi
  if (isDoi) {
    const doi = embeddedDoi ?? url.replace(/^https?:\/\/doi\.org\//, '')
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { 'User-Agent': 'Proof/2.0 (mailto:proof_official@protonmail.com)' },
    })
    if (!res.ok) throw new Error('DOI not found')
    const data  = await res.json() as { message: Record<string, unknown> }
    const msg   = data.message
    const title = (msg.title as string[])?.[0] ?? null
    const publisher = (msg.publisher as string) ?? (msg['container-title'] as string[])?.[0] ?? null
    const abstract  = ((msg.abstract as string) ?? '').replace(/<[^>]+>/g, ' ')
    const authors   = ((msg.author as Array<{ family?: string; given?: string }>) ?? [])
      .map(a => [a.family, a.given].filter(Boolean).join(', '))
      .join('; ')
    const issued = msg.issued as { 'date-parts'?: number[][] } | undefined
    const content = [
      title     && `Title: ${title}`,
      authors   && `Authors: ${authors}`,
      issued?.['date-parts']?.[0]?.[0] && `Year: ${issued['date-parts'][0][0]}`,
      publisher && `Publisher/Journal: ${publisher}`,
      abstract  && `Abstract: ${abstract}`,
    ].filter(Boolean).join('\n')
    return { content, fullText: content, title, publisher }
  }

  // Use Jina Reader for clean markdown extraction
  const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
    headers: {
      'Accept': 'text/plain',
      'X-Return-Format': 'markdown',
      'X-Remove-Selector': 'nav, header, footer, aside, .nav, .sidebar, .menu, .advertisement',
      'User-Agent': 'Proof/2.0 (mailto:proof_official@protonmail.com)',
    },
    signal: AbortSignal.timeout(25000),
  })
  if (!jinaRes.ok) {
    if (jinaRes.status === 422 || jinaRes.status === 403)
      throw new Error('This site could not be read. Try the DOI instead if available.')
    if (jinaRes.status === 404)
      throw new Error('Page not found (404).')
    throw new Error(`Failed to fetch page (${jinaRes.status})`)
  }

  const raw = await jinaRes.text()

  // Extract Jina metadata
  const title     = raw.match(/^Title:\s*(.+)$/m)?.[1]?.trim() ?? null
  const sourceUrl = raw.match(/^URL Source:\s*(.+)$/m)?.[1]?.trim() ?? null
  const publisher = sourceUrl ? (() => { try { return new URL(sourceUrl).hostname.replace(/^www\./, '') } catch { return null } })() : null

  // Isolate markdown body
  const mdStart  = raw.indexOf('Markdown Content:')
  const markdown = mdStart !== -1 ? raw.slice(mdStart + 'Markdown Content:'.length) : raw

  // Remove boilerplate and noise from markdown
  const cleaned = markdown
    .replace(/An official website[\s\S]*?Share sensitive information only on official, secure websites\./i, '')
    .replace(/\[Skip to[^\]]*\]\([^)]*\)/gi, '')
    .replace(/\[\]\([^)]*\)/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\.(pdf|doc|docx|xls|xlsx|csv|zip)[^)]*\)/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // Plain text for source view — strip all markdown syntax and noise
  const fullText = cleaned
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[\s*\]\([^)]+\)/g, '')              // empty links (images, icons)
    .replace(/\[([^\]]+)\]\([^)]+\.(jpg|jpeg|png|gif|webp|svg|ico|pdf|doc|docx|xls|csv|zip)[^)]*\)/gi, '') // file/image links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')       // remaining links → text only
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .split('\n')
    .filter(line => line.trim() === '' || line.trim().length >= 20)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // Send cleaned markdown to Groq (tables/headings help extraction)
  const content = [
    title     && `Title: ${title}`,
    publisher && `Site: ${publisher}`,
    `Content: ${cleaned.replace(/\n+/g, ' ').slice(0, 28000)}`,
  ].filter(Boolean).join('\n')

  return { content, fullText, title, publisher }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(ip, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests — slow down a bit.' }, { status: 429 })
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
  }

  const { url, session_id } = await req.json() as { url: string; session_id?: string }
  if (!url?.trim()) {
    return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
  }

  let content: string, fullText: string, title: string | null = null, publisher: string | null = null
  try {
    ;({ content, fullText, title, publisher } = await fetchContent(url.trim()))
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to fetch source' }, { status: 422 })
  }

  try {
    const raw      = await callGroq(process.env.GROQ_API_KEY, content, url)
    const analysis = parseGroqResponse(raw)

    const a = analysis as Record<string, unknown>
    const inputType = (/^10\.\d{4,}\//.test(url) || url.includes('doi.org/') || /\b10\.\d{4,}\//.test(url)) ? 'doi' : 'url'
    supabase.from('sources').insert({
      title:       a.title ?? title,
      publisher:   a.journal ?? publisher ?? null,
      type:        a.type ?? null,
      year:        a.year ?? null,
      doi:         a.doi ?? null,
      input_type:  inputType,
      session_id:  session_id ?? null,
      keywords:    Array.isArray(a.keywords)    ? a.keywords    : null,
      concepts:    Array.isArray(a.concepts)    ? a.concepts    : null,
      authors:     Array.isArray(a.authors)     ? a.authors     : null,
      findings:    Array.isArray(a.findings)    ? a.findings    : null,
      stats:       Array.isArray(a.stats)       ? a.stats       : null,
      conclusions: Array.isArray(a.conclusions) ? a.conclusions : null,
      abstract:    typeof a.abstract    === 'string' ? a.abstract    : null,
      methodology: typeof a.methodology === 'string' ? a.methodology : null,
      sample_n:    typeof a.sample_n    === 'string' ? a.sample_n    : null,
      sample_desc: typeof a.sample_desc === 'string' ? a.sample_desc : null,
    }).then(({ error }) => { if (error) console.error('[supabase]', error.message) })

    return NextResponse.json({ analysis, content: fullText })
  } catch (e) {
    return NextResponse.json({ error: formatGroqError(e) }, { status: 500 })
  }
}
