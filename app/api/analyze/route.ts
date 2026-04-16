import { NextRequest, NextResponse } from 'next/server'
import { callGroq, parseGroqResponse, formatGroqError } from '@/lib/groq'
import { checkRateLimit } from '@/lib/rateLimit'
import { logTopics } from '@/lib/logTopics'

function extractVideoId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

async function getYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'Accept-Language': 'en-US,en;q=0.9', 'User-Agent': 'Mozilla/5.0' },
    })
    if (!pageRes.ok) return null
    const html = await pageRes.text()

    // Extract ytInitialPlayerResponse JSON by bracket counting
    const marker = 'ytInitialPlayerResponse = {'
    const startIdx = html.indexOf(marker)
    if (startIdx === -1) return null
    const jsonStart = html.indexOf('{', startIdx)
    let depth = 0, jsonEnd = jsonStart
    for (let i = jsonStart; i < html.length; i++) {
      if (html[i] === '{') depth++
      else if (html[i] === '}') { depth--; if (depth === 0) { jsonEnd = i; break } }
    }
    const playerResponse = JSON.parse(html.slice(jsonStart, jsonEnd + 1))
    const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks
    if (!tracks?.length) return null

    // Prefer English track
    const track = tracks.find((t: { languageCode: string }) => t.languageCode === 'en') ?? tracks[0]
    const captionUrl = `${track.baseUrl}&fmt=json3`

    const capRes = await fetch(captionUrl)
    if (!capRes.ok) return null
    const capData = await capRes.json()

    const text = (capData.events ?? [])
      .filter((e: { segs?: unknown[] }) => e.segs)
      .map((e: { segs: Array<{ utf8: string }> }) => e.segs.map(s => s.utf8).join(''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    return text || null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(ip, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests — slow down a bit.' }, { status: 429 })
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
  }

  const body = await req.json().catch(() => null)
  const url: string | undefined = body?.url
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
  }

  // Validate URL
  let parsed: URL
  try {
    parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.json({ error: 'Only http/https URLs are supported' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  let fullText: string

  // ── YouTube: extract transcript directly ─────────────────────────────────
  const videoId = extractVideoId(url)
  if (videoId) {
    const transcript = await getYouTubeTranscript(videoId)
    if (!transcript) {
      return NextResponse.json({ error: 'No transcript available for this video — captions may be disabled.' }, { status: 422 })
    }
    fullText = transcript
  } else {
    // ── Regular URL: fetch via Jina Reader ─────────────────────────────────
    try {
      async function jinaFetch() {
        return fetch(`https://r.jina.ai/${parsed.href}`, {
          headers: { 'Accept': 'text/plain' },
        })
      }
      let jinaRes = await jinaFetch()
      if (jinaRes.status === 503) {
        await new Promise(r => setTimeout(r, 1500))
        jinaRes = await jinaFetch()
      }
      if (!jinaRes.ok) {
        return NextResponse.json({ error: `Could not fetch page (${jinaRes.status})` }, { status: 422 })
      }
      const raw = await jinaRes.text()
      fullText = raw
        .replace(/^(Title|URL Source|Markdown Content):[^\n]*/gm, '')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')          // strip images before links
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^[•·]\s*/gm, '- ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    } catch {
      return NextResponse.json({ error: 'Failed to fetch URL — check the link and try again' }, { status: 422 })
    }
  }

  if (!fullText.length) {
    return NextResponse.json({ error: 'Page appears to be empty or unreadable' }, { status: 422 })
  }

  try {
    const content  = fullText.replace(/\n+/g, ' ').slice(0, 28000)
    const raw      = await callGroq(process.env.GROQ_API_KEY, content, url)
    const analysis = parseGroqResponse(raw)
    logTopics(analysis)
    return NextResponse.json({ analysis, content: fullText })
  } catch (e) {
    return NextResponse.json({ error: formatGroqError(e) }, { status: 500 })
  }
}
