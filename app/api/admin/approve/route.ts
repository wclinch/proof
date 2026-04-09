import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { pass, id, url, title, topic, userId } = await req.json()

  if (pass !== process.env.ADMIN_PASS) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Insert source — fall back to select if URL already exists
  let sourceId: string | null = null
  const { data: inserted, error: insertError } = await supabase
    .from('sources')
    .insert({ title, url, topic, citation_count: 0, status: 'approved' })
    .select('id')
    .single()

  if (insertError) {
    const { data: existing } = await supabase
      .from('sources').select('id').eq('url', url).maybeSingle()
    sourceId = existing?.id ?? null
  } else {
    sourceId = inserted.id
  }

  // Auto-save to suggester's account
  if (userId && sourceId) {
    await supabase.from('saved_sources')
      .insert({ user_id: userId, source_id: sourceId })
      .then(() => {}) // ignore duplicate errors
  }

  // Mark suggestion approved
  await supabase.from('topic_requests').update({ status: 'approved' }).eq('id', id)

  return NextResponse.json({ ok: true })
}
