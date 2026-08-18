import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { invalidate } from "@/lib/cache/store";
import { ACTIVITY_TAG } from "@/lib/github/activity";
import { PROFILE_TAG } from "@/lib/github/profile";
import { REPOS_TAG } from "@/lib/github/repositories";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import {
  HANDLED_EVENTS,
  MAX_WEBHOOK_BYTES,
  verifyWebhookSignature,
} from "@/lib/security/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/github/webhook
 *
 * Pipeline:
 *   PUSH → signature verification → event validation → cache invalidation
 *        → revalidation → updated portfolio
 *
 * Configure on GitHub with content type `application/json`, a strong secret in
 * GITHUB_WEBHOOK_SECRET, and the events: push, create, delete, repository,
 * release, public.
 *
 * Without this, data still refreshes — the TTL cache simply expires on its own
 * within a few minutes. The webhook makes the update immediate.
 */
export async function POST(request: Request) {
  // Unauthenticated endpoint: rate limit before doing any crypto work.
  const verdict = rateLimit(`webhook:${clientKey(request.headers)}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!verdict.allowed) {
    return json(429, { error: "Too many requests" }, {
      "Retry-After": String(verdict.retryAfter),
    });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_WEBHOOK_BYTES) {
    return json(413, { error: "Payload too large" });
  }

  const event = request.headers.get("x-github-event");
  const delivery = request.headers.get("x-github-delivery");

  if (!event || !delivery) {
    return json(400, { error: "Missing GitHub webhook headers" });
  }

  // The HMAC covers the exact bytes GitHub sent — parse only after verifying.
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return json(400, { error: "Unreadable body" });
  }

  if (rawBody.length > MAX_WEBHOOK_BYTES) {
    return json(413, { error: "Payload too large" });
  }

  const verification = verifyWebhookSignature(
    rawBody,
    request.headers.get("x-hub-signature-256"),
  );

  if (!verification.ok) {
    // Logged server-side only; the response body stays deliberately terse.
    console.warn(`[webhook] rejected delivery ${delivery}: ${verification.reason}`);
    return json(verification.status, { error: "Signature verification failed" });
  }

  if (!HANDLED_EVENTS.has(event)) {
    return json(202, { ok: true, event, action: "ignored" });
  }

  // GitHub's connectivity test — verified, but nothing to invalidate.
  if (event === "ping") {
    return json(200, { ok: true, event, action: "pong" });
  }

  // Confirm the payload really is JSON before trusting its shape.
  try {
    JSON.parse(rawBody);
  } catch {
    return json(400, { error: "Body is not valid JSON" });
  }

  const cleared = invalidate("github:");
  revalidateTag(REPOS_TAG);
  revalidateTag(ACTIVITY_TAG);
  revalidateTag(PROFILE_TAG);
  revalidatePath("/", "layout");

  console.info(
    `[webhook] delivery ${delivery} event=${event} → cleared ${cleared} cache entries`,
  );

  return json(200, { ok: true, event, action: "revalidated", cleared });
}

/** Any method other than POST is not a webhook delivery. */
export async function GET() {
  return json(405, { error: "Method not allowed" }, { Allow: "POST" });
}

function json(
  status: number,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}
