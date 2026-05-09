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
    const ogTitle  = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    const htmlTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
    const title = (ogTitle ?? htmlTitle ?? '').trim().slice(0, 120) || null
    return Response.json({ title })
  } catch {
    return Response.json({ title: null })
  }
}
