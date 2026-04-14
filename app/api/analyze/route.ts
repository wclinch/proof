import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callGroq, parseGroqResponse, formatGroqError } from '@/lib/groq'
import { extractPdfText } from '@/lib/pdf'

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

  const stripped = bodyMatch
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')

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
    .replace(/(\n[ \t]*){3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/^ /gm, '')
    .trim()

  const flat    = fullText.replace(/\n+/g, ' ')
  const content = [
    title       && `Title: ${title}`,
    publisher   && `Site: ${publisher}`,
    description && `Description: ${description}`,
    `Content: ${flat.slice(0, 28000)}`,
  ].filter(Boolean).join('\n')

  return { content, fullText, title, publisher }
}

export async function POST(req: NextRequest) {
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

    const inputType = (/^10\.\d{4,}\//.test(url) || url.includes('doi.org/') || /\b10\.\d{4,}\//.test(url)) ? 'doi' : 'url'
    supabase.from('sources').insert({
      title:       (analysis as Record<string, unknown>).title ?? title,
      publisher:   (analysis as Record<string, unknown>).journal ?? publisher ?? null,
      type:        (analysis as Record<string, unknown>).type ?? null,
      year:        (analysis as Record<string, unknown>).year ?? null,
      doi:         (analysis as Record<string, unknown>).doi ?? null,
      input_type:  inputType,
      session_id:  session_id ?? null,
    }).then(({ error }) => { if (error) console.error('[supabase]', error.message) })

    return NextResponse.json({ analysis, content: fullText })
  } catch (e) {
    return NextResponse.json({ error: formatGroqError(e) }, { status: 500 })
  }
}
