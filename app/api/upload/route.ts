import { NextRequest, NextResponse } from 'next/server'

function stripMarkdown(md: string): string {
  return md
    .split('\n')
    .map(line => {
      if (/^[-*_]{3,}\s*$/.test(line.trim())) return ''   // horizontal rules
      line = line.replace(/^#{1,6}\s+/, '')                // headings
      if (line.trim().startsWith('|')) {                   // table rows
        line = line.replace(/\|/g, ' ').trim()
      }
      line = line.replace(/^[\s]*[-*+]\s+/, '')            // list markers
      line = line.replace(/^>\s*/, '')                     // blockquotes
      line = line.replace(/\*\*([^*]+)\*\*/g, '$1')       // bold
      line = line.replace(/\*([^*]+)\*/g, '$1')            // italic *
      line = line.replace(/__([^_]+)__/g, '$1')            // bold __
      line = line.replace(/_([^_]+)_/g, '$1')              // italic _
      return line
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
import { callGroq, parseGroqResponse, formatGroqError } from '@/lib/groq'
import { extractPdfText } from '@/lib/pdf'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(ip, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many uploads — slow down a bit.' }, { status: 429 })
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
  }
  if (!process.env.LLAMA_CLOUD_API_KEY) {
    return NextResponse.json({ error: 'LLAMA_CLOUD_API_KEY not configured' }, { status: 500 })
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
    // Stay within Groq free-tier TPM budget: target ~2500 input tokens + 2000 output ≤ 6000 TPM.
    // ~10000 chars ≈ 2500 tokens. TOC is always near the top so first 10000 chars captures all sections.
    const stripped = stripMarkdown(fullText)
    const LIMIT    = 10000
    const content  = stripped.length <= LIMIT
      ? stripped
      : stripped.slice(0, LIMIT)
    const raw      = await callGroq(process.env.GROQ_API_KEY, content, name)
    const analysis = parseGroqResponse(raw)
    return NextResponse.json({ analysis, content: fullText })
  } catch (e) {
    return NextResponse.json({ error: formatGroqError(e) }, { status: 500 })
  }
}
