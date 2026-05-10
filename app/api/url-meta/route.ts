import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return Response.json({ title: null }, { status: 400 })
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      signal: AbortSignal.timeout(6000),
    })
    const html = await res.text()
    const ogTitle   = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    const htmlTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
    const raw = (ogTitle ?? htmlTitle ?? '').trim().slice(0, 120)
    const GENERIC = /^(login|log in|sign in|sign up|register|home|homepage|welcome|index|untitled|error|not found|403|404|500|access denied|redirecting|blocked|forbidden|just a moment|attention required|security check|enable javascript|are you a human|ddos protection|checking your browser)$/i
    const title = raw && !GENERIC.test(raw) ? raw : null
    return Response.json({ title })
  } catch {
    return Response.json({ title: null })
  }
}
