import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return Response.json({ embeddable: false })
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
    })
    const xfo = res.headers.get('x-frame-options')?.toUpperCase() ?? ''
    const csp = res.headers.get('content-security-policy') ?? ''
    const blockedByXfo = xfo === 'DENY' || xfo === 'SAMEORIGIN'
    const blockedByCsp = /frame-ancestors/.test(csp) && !/frame-ancestors\s+\*/.test(csp)
    return Response.json({ embeddable: !blockedByXfo && !blockedByCsp })
  } catch {
    // Network error or timeout — optimistically try the iframe
    return Response.json({ embeddable: true })
  }
}
