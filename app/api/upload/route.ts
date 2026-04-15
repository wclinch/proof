import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callGroq, parseGroqResponse, formatGroqError } from '@/lib/groq'
import { extractPdfText } from '@/lib/pdf'
import { checkRateLimit } from '@/lib/rateLimit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(ip, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many uploads — slow down a bit.' }, { status: 429 })
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
  }

  const formData    = await req.formData()
  const file        = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const name        = file.name
  const session_id  = formData.get('session_id') as string | null
  const buffer      = Buffer.from(await file.arrayBuffer())

  let fullText: string
  try {
    if (name.toLowerCase().endsWith('.pdf')) {
      const raw = await extractPdfText(buffer)
      // Strip bare page-number lines (lone integers) left by pdf-parse
      fullText = raw
        .split('\n')
        .filter(line => !/^\s*\d{1,4}\s*$/.test(line))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    } else {
      fullText = buffer.toString('utf-8').replace(/\s+/g, ' ').trim()
    }
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

    const a = analysis as Record<string, unknown>
    supabase.from('sources').insert({
      title:      a.title ?? name,
      publisher:  a.journal ?? null,
      type:       a.type ?? null,
      year:       a.year ?? null,
      doi:        a.doi ?? null,
      input_type: 'file',
      session_id: session_id ?? null,
      keywords:   Array.isArray(a.keywords) ? a.keywords : null,
      concepts:   Array.isArray(a.concepts) ? a.concepts : null,
    }).then(({ error }) => { if (error) console.error('[supabase]', error.message) })

    return NextResponse.json({ analysis, content: fullText })
  } catch (e) {
    return NextResponse.json({ error: formatGroqError(e) }, { status: 500 })
  }
}
