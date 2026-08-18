/**
 * Fixed-window, in-memory rate limiter for the internal API routes.
 *
 * Scope: one process. On a multi-instance deployment each instance enforces
 * its own window, so the effective global limit is `limit × instances`. That is
 * fine for what this defends against — a single client hammering
 * `/api/github/*` and burning the upstream GitHub quota. It is explicitly not
 * an abuse-prevention system; that belongs at the edge (Vercel WAF, Cloudflare).
 */

interface Window {
  count: number;
  /** Epoch ms when this window expires. */
  resetAt: number;
}

const windows = new Map<string, Window>();

/** Prevents unbounded growth from spoofed X-Forwarded-For values. */
const MAX_TRACKED_KEYS = 5_000;

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitVerdict {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets — sent as `Retry-After` on a 429. */
  retryAfter: number;
}

export function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): RateLimitVerdict {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    if (windows.size >= MAX_TRACKED_KEYS) evictExpired(now);
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, limit, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);

  return {
    allowed: existing.count <= limit,
    limit,
    remaining,
    retryAfter: Math.ceil((existing.resetAt - now) / 1000),
  };
}

function evictExpired(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
  // Still full of live windows — drop the oldest to bound memory.
  if (windows.size >= MAX_TRACKED_KEYS) {
    const oldest = Array.from(windows.entries())
      .sort((a, b) => a[1].resetAt - b[1].resetAt)
      .slice(0, Math.floor(MAX_TRACKED_KEYS / 4));
    for (const [key] of oldest) windows.delete(key);
  }
}

/**
 * Best-effort client identity.
 *
 * `x-forwarded-for` is client-controlled in principle; on Vercel/Cloudflare the
 * platform overwrites it, so the leftmost entry is trustworthy there. Treated
 * as a bucketing hint, never as authentication.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "anonymous";
}
