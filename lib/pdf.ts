const BASE = 'https://api.cloud.llamaindex.ai/api/parsing'

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const key = process.env.LLAMA_CLOUD_API_KEY
  if (!key) throw new Error('LLAMA_CLOUD_API_KEY not configured')

  // 1. Upload the PDF
  const form = new FormData()
  form.append('file', new File([new Uint8Array(buffer)], 'document.pdf', { type: 'application/pdf' }))

  const uploadRes = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  })
  if (!uploadRes.ok) {
    const msg = await uploadRes.text().catch(() => uploadRes.statusText)
    throw new Error(`LlamaParse upload failed (${uploadRes.status}): ${msg}`)
  }
  const { id: jobId } = await uploadRes.json() as { id: string }

  // 2. Poll until done (max 3 minutes)
  const deadline = Date.now() + 180_000
  let delay = 2000
  let done = false
  while (Date.now() < deadline) {
    await sleep(delay)
    delay = Math.min(delay * 1.4, 8000) // back off up to 8s intervals

    const statusRes = await fetch(`${BASE}/job/${jobId}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!statusRes.ok) continue
    const { status } = await statusRes.json() as { status: string }

    if (status === 'SUCCESS') { done = true; break }
    if (status === 'ERROR') throw new Error('LlamaParse could not process this document.')
  }

  if (!done) throw new Error('LlamaParse timed out — document may be too large.')

  // 3. Fetch markdown result
  const resultRes = await fetch(`${BASE}/job/${jobId}/result/markdown`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  if (!resultRes.ok) throw new Error(`LlamaParse result fetch failed (${resultRes.status})`)
  const { markdown } = await resultRes.json() as { markdown: string }

  return markdown ?? ''
}
