import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rateLimit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = Array.isArray(val) ? val.join('; ') : String(val)
  return `"${str.replace(/"/g, '""')}"`
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(`admin:${ip}`, 10, 60_000)) {
    return new NextResponse('Too many requests', { status: 429 })
  }

  const password = req.headers.get('x-admin-password')
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const since = req.nextUrl.searchParams.get('since')
  let query = supabase
    .from('verified_facts')
    .select('created_at, hash, session_id, source_name, fact_text')
    .order('created_at', { ascending: false })

  if (since) query = query.gte('created_at', new Date(Number(since)).toISOString())

  const { data, error } = await query
  if (error) return new NextResponse(error.message, { status: 500 })
  if (!data)  return new NextResponse('No data', { status: 500 })

  const headers = ['created_at', 'hash', 'session_id', 'source_name', 'fact_text']
  const rows = data.map(r => headers.map(h => escapeCSV(r[h as keyof typeof r])).join(','))
  const csv  = [headers.join(','), ...rows].join('\n')

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="proof-verified-facts-${date}.csv"`,
    },
  })
}
