import { NextRequest, NextResponse } from 'next/server'
import { callGroq, parseGroqResponse, formatGroqError } from '@/lib/groq'
import { checkRateLimit } from '@/lib/rateLimit'
import { logTopics } from '@/lib/logTopics'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(ip, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests — slow down a bit.' }, { status: 429 })
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
  }

  const body = await req.json().catch(() => null)
  const url: string | undefined = body?.url
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
  }

  // Validate URL
  let parsed: URL
  try {
    parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.json({ error: 'Only http/https URLs are supported' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Fetch via Jina Reader
  let fullText: string
  try {
    const jinaRes = await fetch(`https://r.jina.ai/${parsed.href}`, {
      headers: { 'Accept': 'text/plain' },
    })
    if (!jinaRes.ok) {
      return NextResponse.json({ error: `Could not fetch page (${jinaRes.status})` }, { status: 422 })
    }
    fullText = (await jinaRes.text())
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  } catch {
    return NextResponse.json({ error: 'Failed to fetch URL — check the link and try again' }, { status: 422 })
  }

  if (!fullText.length) {
    return NextResponse.json({ error: 'Page appears to be empty or unreadable' }, { status: 422 })
  }

  try {
    const content  = fullText.replace(/\n+/g, ' ').slice(0, 28000)
    const raw      = await callGroq(process.env.GROQ_API_KEY, content, url)
    const analysis = parseGroqResponse(raw)
    logTopics(analysis)
    return NextResponse.json({ analysis, content: fullText })
  } catch (e) {
    return NextResponse.json({ error: formatGroqError(e) }, { status: 500 })
  }
}
