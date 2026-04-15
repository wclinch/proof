import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { checkRateLimit } from '@/lib/rateLimit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(ip, 60, 60_000)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  const { session_id, source_name, fact_text } = await req.json() as {
    session_id?: string
    source_name?: string
    fact_text?: string
  }

  if (!fact_text?.trim()) {
    return NextResponse.json({ error: 'Missing fact_text' }, { status: 400 })
  }

  const hash = createHash('sha256')
    .update(`${source_name ?? ''}:${fact_text.trim()}`)
    .digest('hex')

  // Fire-and-forget — conflict on duplicate hash is expected and fine
  supabase.from('verified_facts').insert({
    hash,
    session_id: session_id ?? null,
    source_name: source_name ?? null,
    fact_text: fact_text.trim(),
  }).then(({ error }) => {
    if (error && !error.message.includes('duplicate')) {
      console.error('[verify]', error.message)
    }
  })

  return NextResponse.json({ ok: true })
}
