import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { pass } = await req.json()
  if (pass !== process.env.ADMIN_PASS) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}
