export const PROMPT = `You are a precise academic data extraction engine. Return ONLY a valid JSON object — no markdown, no code fences, no commentary.

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
  return JSON.parse(json)
}

export function formatGroqError(e: unknown): string {
  const msg = e instanceof Error ? e.message : ''
  if (msg.includes('QUOTA_EXCEEDED'))  return 'Rate limit hit — try again in a moment.'
  if (msg.includes('GROQ_UNAUTHORIZED')) return 'Invalid Groq API key — check .env.local.'
  if (msg.startsWith('Groq error'))    return msg.replace('Groq error ', 'Groq ')
  return 'Analysis failed. Try again.'
}
