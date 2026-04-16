import { NextRequest, NextResponse } from 'next/server'
import { callGroq, parseGroqResponse, formatGroqError } from '@/lib/groq'
import { extractPdfText } from '@/lib/pdf'
import { checkRateLimit } from '@/lib/rateLimit'
import { logTopics } from '@/lib/logTopics'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(ip, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many uploads — slow down a bit.' }, { status: 429 })
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
  }

  const formData = await req.formData()
  const file     = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const name   = file.name
  const buffer = Buffer.from(await file.arrayBuffer())

  let fullText: string
  try {
    const raw = await extractPdfText(buffer)
    fullText = raw
      .split('\n')
      .filter(line => !/^\s*\d{1,4}\s*$/.test(line))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  } catch {
    return NextResponse.json({ error: 'Failed to read file' }, { status: 422 })
  }

  if (!fullText.length) {
    return NextResponse.json({ error: 'File appears to be empty or unreadable' }, { status: 422 })
  }

  try {
    const content  = fullText.replace(/\n+/g, ' ').slice(0, 28000)
    const raw      = await callGroq(process.env.GROQ_API_KEY, content, name)
    const analysis = parseGroqResponse(raw)
    logTopics(analysis)
    return NextResponse.json({ analysis, content: fullText })
  } catch (e) {
    return NextResponse.json({ error: formatGroqError(e) }, { status: 500 })
  }
}
