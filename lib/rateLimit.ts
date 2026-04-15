// Simple in-memory sliding-window rate limiter.
// Works per-process — good enough for a single Render/Vercel instance.
// Resets on cold start (which is acceptable for this use case).

const store = new Map<string, number[]>()

/**
 * Returns true if the request is allowed, false if rate-limited.
 * @param key      Usually the caller's IP address
 * @param limit    Max requests allowed in the window
 * @param windowMs Window size in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const hits = (store.get(key) ?? []).filter(t => now - t < windowMs)
  if (hits.length >= limit) return false
  hits.push(now)
  store.set(key, hits)
  return true
}
