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
    .from('sources')
    .select('id, title, url, topic, citation_count, author, published_date')
    .eq('status', 'approved')
    .order('topic', { ascending: true })

  if (error) return NextResponse.json({ ok: false, message: error.message })
  return NextResponse.json({ ok: true, data })
}
