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

  if (!keywords.length) return

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  sb.from('topics')
    .insert({ keywords })
    .then(({ error }) => { if (error) console.error('[topics]', error.message) })
}
