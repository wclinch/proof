import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rateLimit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function tally(items: (string | null)[]): { label: string; count: number }[] {
  const counts: Record<string, number> = {}
  for (const item of items) {
    if (item?.trim()) counts[item.trim()] = (counts[item.trim()] ?? 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(`admin:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const password = req.headers.get('x-admin-password')
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const since = req.nextUrl.searchParams.get('since')
  let query = supabase
    .from('verified_facts')
    .select('created_at, session_id, source_name, fact_text')
    .order('created_at', { ascending: false })

  if (since) query = query.gte('created_at', new Date(Number(since)).toISOString())

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'No data' }, { status: 500 })

  const total        = data.length
  const bySource     = tally(data.map(r => r.source_name)).slice(0, 50)
  const bySessions   = Object.keys(
    data.reduce((acc, r) => { if (r.session_id) acc[r.session_id] = true; return acc }, {} as Record<string, true>)
  ).length

  // Top verified facts (exact text, most re-verified across sessions)
  const factCounts: Record<string, number> = {}
  for (const r of data) {
    if (r.fact_text) factCounts[r.fact_text] = (factCounts[r.fact_text] ?? 0) + 1
  }
  const topFacts = Object.entries(factCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([label, count]) => ({ label, count }))

  // Daily volume
  const dailyCounts: Record<string, number> = {}
  for (const row of data) {
    if (!row.created_at) continue
    const day = row.created_at.slice(0, 10)
    dailyCounts[day] = (dailyCounts[day] ?? 0) + 1
  }
  const daily = Object.entries(dailyCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }))

  return NextResponse.json({ total, bySessions, bySource, topFacts, daily })
}
