import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

function tallyArrays(rows: (string[] | null)[]): { label: string; count: number }[] {
  const counts: Record<string, number> = {}
  for (const arr of rows) {
    if (!arr) continue
    for (const item of arr) {
      const k = item.trim().toLowerCase()
      if (k) counts[k] = (counts[k] ?? 0) + 1
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))
}

export async function GET(req: NextRequest) {
  const password = req.headers.get('x-admin-password')
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const since = req.nextUrl.searchParams.get('since')
  let query = supabase
    .from('sources')
    .select('type, input_type, year, publisher, keywords, concepts, created_at')
    .order('created_at', { ascending: false })

  if (since) query = query.gte('created_at', new Date(Number(since)).toISOString())

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'No data' }, { status: 500 })

  const total      = data.length
  const byType      = tally(data.map(r => r.type))
  const byInput     = tally(data.map(r => r.input_type))
  const byYear      = tally(data.map(r => r.year ? String(r.year) : null))
  const byPublisher = tally(data.map(r => r.publisher)).slice(0, 50)
  const topKeywords = tallyArrays(data.map(r => r.keywords)).slice(0, 50)
  const topConcepts = tallyArrays(data.map(r => r.concepts)).slice(0, 50)

  // Daily volume — last 30 days relative to the since window
  const dailyCounts: Record<string, number> = {}
  for (const row of data) {
    if (!row.created_at) continue
    const day = row.created_at.slice(0, 10)
    dailyCounts[day] = (dailyCounts[day] ?? 0) + 1
  }
  const daily = Object.entries(dailyCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }))

  return NextResponse.json({ total, byType, byInput, byYear, byPublisher, topKeywords, topConcepts, daily })
}
