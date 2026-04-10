import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { pass, id } = await req.json()

  if (pass !== process.env.ADMIN_PASS) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.from('topic_requests').update({ status: 'dismissed' }).eq('id', id)

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
