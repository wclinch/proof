export const PROMPT = `You are a key term extractor. Return ONLY a valid JSON object — no markdown, no code fences, no commentary.

{
  "title": "Use the document's actual title if present. Otherwise write a brief description (e.g. 'Software Engineering Resume', 'Q3 2024 Earnings Report', 'Firefighter Union Contract'). Never use a bare person name alone as the title.",
  "keywords": ["specific searchable phrase", "another term", ...]
}

Rules for keywords:
- Extract 12–18 terms total
- Return them in the order they appear in the document (beginning to end) — this is critical
- Each term should be 1–4 words, specific enough to be meaningful on its own
- Terms should appear verbatim or near-verbatim in the document
- Spread coverage across the FULL document — beginning, middle, and end equally
- Avoid generic terms like "introduction", "conclusion", "section", "article"
- null for missing title, [] for no keywords`

export async function callGroq(key: string, content: string, source: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model:       'llama-3.1-8b-instant',
      temperature: 0.2,
      max_tokens:  1200,
      messages: [
        { role: 'system', content: PROMPT },
        { role: 'user',   content: `Source: ${source}\n\nSource content:\n${content}` },
      ],
    }),
  })

  if (res.status === 429) {
    const body = await res.json().catch(() => ({}))
    const msg  = (body as { error?: { message?: string } })?.error?.message ?? ''
    const raw  = msg.match(/try again in (\S+)/i)?.[1]?.replace(/[.,]+$/, '') ?? ''
    const wait = raw.replace(/(\d+)\.?\d*(s)/, '$1$2')
    throw new Error(`QUOTA_EXCEEDED${wait ? `:${wait}` : ''}`)
  }
  if (res.status === 401) throw new Error('GROQ_UNAUTHORIZED')
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = (body as { error?: { message?: string } })?.error?.message ?? JSON.stringify(body).slice(0, 120)
    throw new Error(`Groq error ${res.status}: ${detail}`)
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('Empty response from Groq')
  return text
}

export function parseGroqResponse(raw: string): unknown {
  const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  try {
    return JSON.parse(json)
  } catch {
    throw new Error('Model returned invalid JSON — try again.')
  }
}

export function formatGroqError(e: unknown): string {
  const msg = e instanceof Error ? e.message : ''
  if (msg.includes('QUOTA_EXCEEDED')) {
    const wait = msg.split('QUOTA_EXCEEDED:')[1]?.trim()
    return wait ? `Rate limit hit — try again in ${wait}.` : 'Rate limit hit — try again in a moment.'
  }
  if (msg.includes('GROQ_UNAUTHORIZED')) return 'Invalid Groq API key — check .env.local.'
  if (msg.startsWith('Groq error'))    return msg.replace('Groq error ', 'Groq ')
  return 'Analysis failed. Try again.'
}
