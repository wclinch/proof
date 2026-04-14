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

async function callGroq(key: string, content: string, name: string): Promise<string> {
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
        { role: 'user',   content: `Source file: ${name}\n\nSource content:\n${content}` },
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

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const name       = file.name
  const session_id  = formData.get('session_id') as string | null
  const draft_title = (formData.get('draft_title') as string | null) || null
  const buffer = Buffer.from(await file.arrayBuffer())

  let fullText: string
  try {
    if (name.toLowerCase().endsWith('.pdf')) {
      const data = await pdfParse(buffer)
      fullText = data.text
        .replace(/\r\n/g, '\n')
        .replace(/([a-z])-\n([a-z])/g, '$1$2')   // rejoin hyphenated line-breaks
        .replace(/([^\n])\n([^\n])/g, '$1 $2')    // collapse visual line-wraps to spaces
        .replace(/\n{2,}/g, '\n\n')               // normalise paragraph breaks
        .replace(/[ \t]+/g, ' ')
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
    const content = fullText.replace(/\n+/g, ' ').slice(0, 28000)
    const raw      = await callGroq(process.env.GROQ_API_KEY, content, name)
    const json     = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const analysis = JSON.parse(json)

    supabase.from('sources').insert({
      title:       analysis.title ?? name,
      publisher:   analysis.journal ?? null,
      type:        analysis.type ?? null,
      year:        analysis.year ?? null,
      doi:         analysis.doi ?? null,
      input_type:  'file',
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
