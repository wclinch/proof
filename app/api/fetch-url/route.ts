import { NextRequest, NextResponse } from 'next/server'
import { callGroq, parseGroqResponse, formatGroqError } from '@/lib/groq'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(ip, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests — slow down a bit.' }, { status: 429 })
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
  }

  const { url } = await req.json() as { url?: string }
  if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

  if (!process.env.FIRECRAWL_API_KEY) {
    return NextResponse.json({ error: 'FIRECRAWL_API_KEY not configured' }, { status: 500 })
  }

  let fullText: string
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({ url, formats: ['markdown'] }),
    })
    if (!res.ok) throw new Error(`Firecrawl returned ${res.status}`)
    const data = await res.json() as { success: boolean; data?: { markdown?: string } }
    if (!data.success || !data.data?.markdown) throw new Error('No content returned')
    fullText = data.data.markdown.trim()
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    return NextResponse.json({ error: `Could not fetch URL — ${msg || 'check the address and try again.'}` }, { status: 422 })
  }

  if (!fullText.length) {
    return NextResponse.json({ error: 'Page appears to be empty or inaccessible.' }, { status: 422 })
  }

  try {
    const content  = fullText.slice(0, 30000)
    const raw      = await callGroq(process.env.GROQ_API_KEY, content, url)
    const analysis = parseGroqResponse(raw)
    return NextResponse.json({ analysis, content: fullText })
  } catch (e) {
    return NextResponse.json({ error: formatGroqError(e) }, { status: 500 })
  }
}
