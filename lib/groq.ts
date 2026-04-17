export const PROMPT = `You are a precise data extraction engine. Return ONLY a valid JSON object — no markdown, no code fences, no commentary.

Extract verbatim where possible. Never invent or paraphrase data not present in the text. Never output placeholder strings like "not mentioned", "not provided", "no data" — if data is absent, use null or [].

{
  "title": "exact title of the document, or null",
  "authors": ["Last, First — only if explicitly credited"],
  "year": "year as string, or null",
  "journal": "journal or publication name, or null",
  "items": ["Everything worth knowing from this document — dates, numbers, credentials, roles, findings, events, claims, context — in the order they appear. Each item must be a complete, self-contained statement. Combine related details into one item rather than splitting them (e.g. 'Oak Ridge High School, 2021–2025, GPA 3.5' not three separate items). Concise, no subject name prefix. Up to 20."],
  "quotes": ["Direct quotes worth citing — exact text with punctuation — up to 6, or []"],
  "keywords": ["Broad subject-area terms only. No proper nouns. Think discipline-level categories: 'contract law', 'cardiovascular disease', 'machine learning'. 5 to 10 terms."]
}

Rules: null for absent strings, [] for absent arrays.`

export async function callGroq(key: string, content: string, source: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens:  4096,
      messages: [
        { role: 'system', content: PROMPT },
        { role: 'user',   content: `Source: ${source}\n\nSource content:\n${content}` },
      ],
    }),
  })

  if (res.status === 429) throw new Error('QUOTA_EXCEEDED')
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
  if (msg.includes('QUOTA_EXCEEDED'))  return 'Rate limit hit — try again in a moment.'
  if (msg.includes('GROQ_UNAUTHORIZED')) return 'Invalid Groq API key — check .env.local.'
  if (msg.startsWith('Groq error'))    return msg.replace('Groq error ', 'Groq ')
  return 'Analysis failed. Try again.'
}
