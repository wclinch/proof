import { createClient } from '@supabase/supabase-js'

/**
 * Fire-and-forget: log broad topic keywords from an analysis result.
 * No user data, no content, no source names — purely aggregate subject trends.
 */
export function logTopics(analysis: unknown) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return

  const a = analysis as Record<string, unknown>
  const keywords = Array.isArray(a.keywords)
    ? (a.keywords as unknown[]).filter((k): k is string => typeof k === 'string')
    : []
  const concepts = Array.isArray(a.concepts)
    ? (a.concepts as unknown[]).filter((c): c is string => typeof c === 'string')
    : []
  const doc_type = typeof a.type === 'string' ? a.type : null
  const year     = typeof a.year === 'string' ? a.year : null

  if (!keywords.length && !concepts.length) return

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  sb.from('topics')
    .insert({ keywords, concepts, doc_type, year })
    .then(({ error }) => { if (error) console.error('[topics]', error.message) })
}
