import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function tally(items: (string | null)[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) {
    if (item) counts[item] = (counts[item] ?? 0) + 1
  }
  return counts
}

function tallyArrays(rows: (string[] | null)[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const arr of rows) {
    if (!arr) continue
    for (const item of arr) {
      const k = item.trim().toLowerCase()
      if (k) counts[k] = (counts[k] ?? 0) + 1
    }
  }
  return counts
}

function topN(counts: Record<string, number>, n: number): { label: string; count: number }[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }))
}

export async function GET(req: NextRequest) {
  const password = req.headers.get('x-admin-password')
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all rows we need (lightweight columns only)
  const { data, error } = await supabase
    .from('sources')
    .select('type, input_type, year, keywords, concepts, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'No data' }, { status: 500 })

  const total      = data.length
  const byType     = topN(tally(data.map(r => r.type)), 20)
  const byInput    = topN(tally(data.map(r => r.input_type)), 10)
  const byYear     = topN(tally(data.map(r => r.year ? String(r.year) : null)), 30)
  const topKeywords = topN(tallyArrays(data.map(r => r.keywords)), 30)
  const topConcepts = topN(tallyArrays(data.map(r => r.concepts)), 30)

  // Daily volume — last 30 days
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const dailyCounts: Record<string, number> = {}
  for (const row of data) {
    if (!row.created_at) continue
    const ts = new Date(row.created_at).getTime()
    if (ts < cutoff) continue
    const day = row.created_at.slice(0, 10) // YYYY-MM-DD
    dailyCounts[day] = (dailyCounts[day] ?? 0) + 1
  }
  const daily = Object.entries(dailyCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }))

  // Last 7 days total
  const week = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recentCount = data.filter(r => r.created_at && new Date(r.created_at).getTime() >= week).length

  return NextResponse.json({
    total,
    recentCount,
    byType,
    byInput,
    byYear,
    topKeywords,
    topConcepts,
    daily,
  })
}
