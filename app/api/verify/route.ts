import { NextResponse } from 'next/server'

// Fact-level logging removed — no content is stored server-side.
export async function POST() {
  return NextResponse.json({ ok: true })
}
