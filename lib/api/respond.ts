import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import type { ApiEnvelope, SyncMeta } from "@/lib/github/types";

/** Shared budget for the read-only GitHub proxy routes. */
const READ_LIMIT = { limit: 60, windowMs: 60_000 };

/**
 * Applies the rate limit for a read route.
 * @returns A 429 response when the caller is over budget, otherwise `null`.
 */
export function guardRead(request: Request): NextResponse | null {
  const verdict = rateLimit(`read:${clientKey(request.headers)}`, READ_LIMIT);
  if (verdict.allowed) return null;

  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "Retry-After": String(verdict.retryAfter),
        "X-RateLimit-Limit": String(verdict.limit),
        "X-RateLimit-Remaining": "0",
        "Cache-Control": "no-store",
      },
    },
  );
}

/**
 * Successful envelope response.
 *
 * Degraded payloads are marked `no-store` so a stale-because-GitHub-was-down
 * response never gets pinned in a CDN once GitHub recovers.
 */
export function ok<T>(
  envelope: ApiEnvelope<T>,
  { sMaxAge = 300, swr = 900 }: { sMaxAge?: number; swr?: number } = {},
): NextResponse {
  const cacheControl = envelope.meta.degraded
    ? "no-store"
    : `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`;

  return NextResponse.json(envelope, {
    status: 200,
    headers: {
      "Cache-Control": cacheControl,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

/**
 * Failure response.
 *
 * The message is a fixed, non-reflective string — upstream error text can
 * contain a token-bearing URL or internal hostname and never reaches the wire.
 */
export function fail(status: number, message: string): NextResponse {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/** Envelope for a route that has neither live nor cached data. */
export function emptyMeta(reason: string): SyncMeta {
  return {
    source: "cache",
    syncedAt: new Date(0).toISOString(),
    degraded: true,
    reason,
  };
}

/** Logs the real error server-side; returns a safe response for the client. */
export function handleRouteError(route: string, error: unknown): NextResponse {
  console.error(`[api] ${route} failed:`, error);
  return fail(503, "GitHub data is temporarily unavailable");
}
