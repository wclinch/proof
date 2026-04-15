// Simple in-memory sliding-window rate limiter.
// Works per-process — good enough for a single Render/Vercel instance.
// Resets on cold start (which is acceptable for this use case).

const store = new Map<string, number[]>()
let lastCleanup = Date.now()

/**
 * Returns true if the request is allowed, false if rate-limited.
 * @param key      Usually the caller's IP address
 * @param limit    Max requests allowed in the window
 * @param windowMs Window size in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()

  // Prune the entire map every 5 minutes to prevent unbounded growth
  if (now - lastCleanup > 300_000) {
    lastCleanup = now
    for (const [k, times] of store) {
      if (!times.some(t => now - t < 300_000)) store.delete(k)
    }
  }

  const hits = (store.get(key) ?? []).filter(t => now - t < windowMs)
  if (hits.length >= limit) return false
  hits.push(now)
  store.set(key, hits)
  return true
}
