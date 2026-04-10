import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  let body: { logId?: unknown; format?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({}, { status: 400 })
  }

  const { logId, format } = body
  if (
    typeof logId !== 'string' || !logId ||
    typeof format !== 'string' || !['MLA', 'APA', 'Chicago'].includes(format)
  ) {
    return NextResponse.json({}, { status: 400 })
  }

  await supabase
    .from('citations_log')
    .update({ format_copied: format })
    .eq('id', logId)

  return NextResponse.json({})
}
