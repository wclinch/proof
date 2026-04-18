export const PROMPT = `You are a precise data extraction engine. Return ONLY a valid JSON object — no markdown, no code fences, no commentary.

Extract verbatim where possible. Never invent or paraphrase data not present in the text. Never output placeholder strings like "not mentioned", "not provided", "no data" — if data is absent, use null or [].

{
  "title": "a short descriptive title — use the actual title if one exists, otherwise generate a brief description of what the document is (e.g. 'Resume', 'Q3 Financial Report', 'Climate Study 2023'). No bare person names as the title.",
  "authors": ["Last, First — only if explicitly credited"],
  "year": "year as string, or null",
  "journal": "journal or publication name, or null",
  "items": ["Specific, self-contained facts a professional could cite or act on — dates, figures, credentials, roles, findings, claims, obligations, outcomes. Every item must carry real information on its own. Never output a bare label or category name alone (e.g. not 'Distance Running' — instead: 'Distance Running, former competitive athlete, 4:27 mile'). Combine a label with its detail into one item. No subject name prefix. Up to 20."],
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
