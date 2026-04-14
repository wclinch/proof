import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRequire } from 'module'
const _req = createRequire(process.cwd() + '/x.js')
// eslint-disable-next-line no-eval
const pdfParse = eval('_req')('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const PROMPT = `You are a precise academic data extraction engine. Return ONLY a valid JSON object — no markdown, no code fences, no commentary.

Extract verbatim where possible. Never invent, guess, or paraphrase data not present in the text. Never output placeholder strings like "not mentioned", "not provided", "no data", etc. — if data is absent, use null or [].

{
  "title": "exact title",
  "authors": ["Last, First"],
  "year": "publication year as string, or null",
  "journal": "journal or publication name, or null",
  "doi": "DOI string if present, or null",
  "type": "journal-article | book | book-chapter | report | preprint | website | other",
  "abstract": "full abstract verbatim, or null",
  "sample_n": "sample size as stated e.g. 'n = 1,151', or null",
  "sample_desc": "who was studied — population, demographics, setting — verbatim, or null",
  "methodology": "research design, instruments, measures, analytic approach — verbatim, or null",
  "stats": ["Actual numerical results only: means, SDs, percentages, p-values, effect sizes, CIs, correlations, regression coefficients, ORs — verbatim. Do NOT include sample size here. Leave [] if no numerical results are present."],
  "findings": ["Key results from the results section — verbatim or near-verbatim — up to 8. Leave [] if results section is not in the provided text."],
  "conclusions": ["What the authors conclude or recommend — verbatim or near-verbatim — up to 5"],
  "quotes": ["Direct quotes worth citing — exact text with punctuation — up to 4, or []"],
  "limitations": ["Limitations the authors acknowledge — verbatim — up to 5, or []"],
  "concepts": ["Named theories, frameworks, constructs, models — up to 8"],
  "keywords": ["Key terms — 5 to 12"]
}

Rules: null for absent strings, [] for absent arrays. Never repeat the sample size in the stats array.`

async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)
  return data.text
    .replace(/\r\n/g, '\n')
    .replace(/([a-z])-\n([a-z])/g, '$1$2')   // rejoin hyphenated line-breaks
    .replace(/([^\n])\n([^\n])/g, '$1 $2')    // collapse visual line-wraps to spaces
    .replace(/\n{2,}/g, '\n\n')               // normalise paragraph breaks
    .replace(/[ \t]+/g, ' ')
    .trim()
}

async function fetchContent(url: string): Promise<{ content: string; fullText: string; title: string | null; publisher: string | null }> {
  const isPdf = /\.pdf(\?.*)?$/i.test(url)
  if (isPdf) {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) throw new Error(`Failed to fetch PDF (${res.status})`)
    const buffer = Buffer.from(await res.arrayBuffer())
    const fullText = await extractPdfText(buffer)
    const title = url.split('/').pop()?.replace('.pdf', '') ?? null
    const content = `Title: ${title ?? 'Unknown'}\n\nContent: ${fullText.slice(0, 28000)}`
    return { content, fullText, title, publisher: null }
  }

  const isDoi = /^10\.\d{4,}\//.test(url) || url.includes('doi.org/')
  if (isDoi) {
    const doi = url.replace(/^https?:\/\/doi\.org\//, '')
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { 'User-Agent': 'Proof/2.0 (mailto:proof_official@protonmail.com)' },
    })
    if (!res.ok) throw new Error('DOI not found')
    const data = await res.json()
    const msg = data.message
    const title = msg.title?.[0] ?? null
    const publisher = msg.publisher ?? msg['container-title']?.[0] ?? null
    const abstract = msg.abstract?.replace(/<[^>]+>/g, ' ') ?? ''
    const authors = (msg.author ?? [])
      .map((a: { family?: string; given?: string }) => [a.family, a.given].filter(Boolean).join(', '))
      .join('; ')
    const content = [
      title && `Title: ${title}`,
      authors && `Authors: ${authors}`,
      msg.issued?.['date-parts']?.[0]?.[0] && `Year: ${msg.issued['date-parts'][0][0]}`,
      publisher && `Publisher/Journal: ${publisher}`,
      abstract && `Abstract: ${abstract}`,
    ].filter(Boolean).join('\n')
    return { content, fullText: content, title, publisher }
  }

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1',
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) {
    if (res.status === 403 || res.status === 401)
      throw new Error('This site blocks external access. Try the DOI instead if available.')
    if (res.status === 404)
      throw new Error('Page not found (404).')
    throw new Error(`Failed to fetch page (${res.status})`)
  }
  const html = await res.text()

  const getMeta = (name: string) =>
    html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1] ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, 'i'))?.[1] ?? null

  const title       = getMeta('og:title') ?? getMeta('twitter:title') ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null
  const publisher   = getMeta('og:site_name') ?? null
  const description = getMeta('og:description') ?? getMeta('description') ?? null

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html

  // Strip boilerplate blocks before extracting text
  const stripped = bodyMatch
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')

  // Prefer semantic content blocks — article > main > body
  const contentBlock =
    stripped.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ??
    stripped.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ??
    stripped.match(/role=["']main["'][^>]*>([\s\S]*?)<\//i)?.[1] ??
    stripped

  const fullText = contentBlock
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&[a-z#\d]+;/gi, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/^ /gm, '')
    .trim()

  const flat = fullText.replace(/\n+/g, ' ')
  const content = [
    title       && `Title: ${title}`,
    publisher   && `Site: ${publisher}`,
    description && `Description: ${description}`,
    `Content: ${flat.slice(0, 28000)}`,
  ].filter(Boolean).join('\n')

  return { content, fullText, title, publisher }
}

async function callGroq(key: string, content: string, url: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      temperature: 0.2,
      messages: [
        { role: 'system', content: PROMPT },
        { role: 'user',   content: `Source URL: ${url}\n\nSource content:\n${content}` },
      ],
    }),
  })

  if (res.status === 429) throw new Error('QUOTA_EXCEEDED')
  if (res.status === 401) throw new Error('GROQ_UNAUTHORIZED')
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = body?.error?.message ?? JSON.stringify(body).slice(0, 120)
    throw new Error(`Groq error ${res.status}: ${detail}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('Empty response from Groq')
  return text
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
  }

  const { url, session_id, draft_title } = await req.json() as { url: string; session_id?: string; draft_title?: string }
  if (!url?.trim()) {
    return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
  }

  let content: string
  let fullText: string
  let title: string | null = null
  let publisher: string | null = null

  try {
    ;({ content, fullText, title, publisher } = await fetchContent(url.trim()))
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to fetch source' }, { status: 422 })
  }

  try {
    const raw      = await callGroq(process.env.GROQ_API_KEY, content, url)
    const json     = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const analysis = JSON.parse(json)

    // Log to Supabase (best-effort)
    const isDoi = /^10\.\d{4,}\//.test(url) || url.includes('doi.org/')
    const inputType = isDoi ? 'doi' : 'url'
    supabase.from('sources').insert({
      title:       analysis.title ?? title,
      publisher:   analysis.journal ?? publisher ?? null,
      type:        analysis.type ?? null,
      year:        analysis.year ?? null,
      doi:         analysis.doi ?? null,
      input_type:  inputType,
      draft_title: draft_title ?? null,
      session_id:  session_id ?? null,
    }).then(({ error }) => { if (error) console.error('[supabase]', error.message) })

    return NextResponse.json({ analysis, content: fullText })
  } catch (e) {
    const msg   = e instanceof Error ? e.message : ''
    const clean = msg.includes('QUOTA_EXCEEDED')
      ? 'Rate limit hit — try again in a moment.'
      : msg.includes('GROQ_UNAUTHORIZED')
      ? 'Invalid Groq API key — check .env.local.'
      : msg.startsWith('Groq error')
      ? msg.replace('Groq error ', 'Groq ')
      : 'Analysis failed. Try again.'
    return NextResponse.json({ error: clean }, { status: 500 })
  }
}
