import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * GitHub webhook signature verification.
 *
 * GitHub signs the raw request body with the shared secret and sends
 * `X-Hub-Signature-256: sha256=<hex>`. We recompute it and compare in constant
 * time — a naive `===` on the hex string leaks the correct prefix length
 * through timing and makes forging a signature tractable.
 *
 * Docs: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
 */

export type VerificationResult =
  | { ok: true }
  | { ok: false; reason: string; status: 400 | 401 | 500 };

/** Bodies larger than this are rejected before any HMAC work is done. */
export const MAX_WEBHOOK_BYTES = 1_000_000;

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): VerificationResult {
  const secret = process.env.GITHUB_WEBHOOK_SECRET?.trim();

  // Fail closed. An unconfigured secret must never mean "accept everything".
  if (!secret) {
    return {
      ok: false,
      reason: "Webhook secret is not configured on this deployment",
      status: 500,
    };
  }

  if (!signatureHeader) {
    return { ok: false, reason: "Missing X-Hub-Signature-256", status: 401 };
  }

  if (!signatureHeader.startsWith("sha256=")) {
    return { ok: false, reason: "Unsupported signature scheme", status: 400 };
  }

  const expected = `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;

  const received = Buffer.from(signatureHeader, "utf8");
  const computed = Buffer.from(expected, "utf8");

  // timingSafeEqual throws on length mismatch, which is itself an inequality.
  if (received.length !== computed.length) {
    return { ok: false, reason: "Signature mismatch", status: 401 };
  }

  if (!timingSafeEqual(received, computed)) {
    return { ok: false, reason: "Signature mismatch", status: 401 };
  }

  return { ok: true };
}

/** Events that should invalidate portfolio data. Everything else is ignored. */
export const HANDLED_EVENTS = new Set([
  "push",
  "create",
  "delete",
  "repository",
  "release",
  "public",
  "ping",
]);
