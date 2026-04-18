export const PROMPT = `You are a document structure extractor. Return ONLY a valid JSON object — no markdown, no code fences, no commentary.

{
  "title": "The document's actual title. If none, write a brief description (e.g. 'Q3 2024 Earnings Report', 'Firefighter Union Contract 2023'). Never use a bare person name as the title.",
  "parties": ["Organization or person A", "Organization or person B"],
  "date": "Effective date, date range, or publication year as a string — or null",
  "sections": [
    { "number": "1", "title": "Preamble" },
    { "number": "2", "title": "Recognition" }
  ],
  "keywords": ["specific term", "another phrase"]
}

Rules:
- sections: Extract ALL section, article, or chapter titles in document order. Use the table of contents if present. number = the section number as a string (e.g. "14A"), title = the section name only (no number prefix). If the document has no clear sections (e.g. a resume or letter), leave sections as [] and put 8–12 specific searchable terms in keywords instead.
- keywords: Only used when sections is empty. Specific phrases that appear verbatim in the document — not generic topic labels like "contract law".
- parties: The organizations or individuals who are parties to this document. Empty array if none.
- null for absent strings, [] for absent arrays.`

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
