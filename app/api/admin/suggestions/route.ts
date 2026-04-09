import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { pass } = await req.json()

  if (pass !== process.env.ADMIN_PASS) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('topic_requests')
    .select('id, url, suggested_title, query, note, suggestion_count, user_id, created_at')
    .eq('status', 'pending')
    .order('suggestion_count', { ascending: false })

  if (error) return NextResponse.json({ ok: false, message: error.message })
  return NextResponse.json({ ok: true, data })
}
