export const PROMPT = `You are a precise data extraction engine. Return ONLY a valid JSON object — no markdown, no code fences, no commentary.

Extract verbatim where possible. Never invent or paraphrase data not present in the text. Never output placeholder strings like "not mentioned", "not provided", "no data" — if data is absent, use null or [].

{
  "title": "exact title",
  "authors": ["Last, First"],
  "year": "publication year as string, or null",
  "journal": "journal or publication name, or null",
  "doi": "DOI string if present, or null",
  "type": "journal-article | book | book-chapter | report | preprint | website | video | other",
  "abstract": "full abstract verbatim, or null",
  "sample_n": "sample size as stated e.g. 'n = 1,151', or null",
  "sample_desc": "who was studied — population, demographics, setting — verbatim, or null",
  "methodology": "research design, instruments, measures, analytic approach — verbatim, or null",
  "stats": ["Every numerical result with full context — always include the label, subject, and unit alongside the number. Format as a complete phrase e.g. '42 firefighters died from cardiovascular events', '72% of participants reported...', 'p = 0.03 for the correlation between X and Y'. Never a bare number. Do NOT include sample size here. Extract ALL that are present."],
  "findings": ["Key results, outcomes, or factual assertions — verbatim or near-verbatim. Extract up to 15. Prioritize the most specific and substantive."],
  "claims": ["Specific factual or causal claims explicitly made — e.g. 'X causes Y', 'Z has been shown to...', 'Evidence suggests...'. Up to 8. Must be directly stated, not inferred."],
  "conclusions": ["Notable statements, positions, or takeaways explicitly stated in the document — verbatim or near-verbatim — up to 8. Do not interpret or infer."],
  "recommendations": ["Explicit recommendations, action items, or calls to action stated in the document — verbatim or near-verbatim — up to 6, or []"],
  "quotes": ["Direct quotes worth citing — exact text with punctuation — up to 6, or []"],
  "limitations": ["Limitations the authors acknowledge — verbatim — up to 6, or []"],
  "concepts": ["Named theories, frameworks, constructs, or models only — no proper nouns, no names of people, organizations, or cases — up to 8"],
  "keywords": ["Broad subject-area terms only. No proper nouns. Think discipline-level categories: 'contract law', 'cardiovascular disease', 'machine learning'. 5 to 12 terms."]
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
