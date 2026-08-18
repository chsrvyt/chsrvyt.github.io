/**
 * Server-only GitHub REST client.
 *
 * Everything that touches api.github.com goes through here so that auth,
 * timeouts, retries, rate-limit accounting and error typing exist in exactly
 * one place. No React component imports this module.
 */

const API_ROOT = "https://api.github.com";
const API_VERSION = "2022-11-28";
const USER_AGENT = "srv-portfolio (+https://github.com/chsrvyt)";
const DEFAULT_TIMEOUT_MS = 8_000;

/** Hard ceiling — a portfolio never legitimately needs more than this. */
const MAX_RETRIES = 1;

export class GitHubError extends Error {
  readonly status: number;
  readonly rateLimit: RateLimitSnapshot | null;

  constructor(
    message: string,
    status: number,
    rateLimit: RateLimitSnapshot | null = null,
  ) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
    this.rateLimit = rateLimit;
  }
}

export class GitHubRateLimitError extends GitHubError {
  constructor(rateLimit: RateLimitSnapshot | null) {
    const resetsAt = rateLimit?.reset
      ? new Date(rateLimit.reset * 1000).toISOString()
      : "unknown";
    super(`GitHub rate limit exhausted (resets ${resetsAt})`, 429, rateLimit);
    this.name = "GitHubRateLimitError";
  }
}

export interface RateLimitSnapshot {
  limit: number;
  remaining: number;
  /** Unix seconds. */
  reset: number;
  /** True when requests are authenticated (5,000/hr vs 60/hr). */
  authenticated: boolean;
}

let lastRateLimit: RateLimitSnapshot | null = null;

/** Most recent rate-limit headers seen. Used for operational logging only. */
export function getRateLimitSnapshot(): RateLimitSnapshot | null {
  return lastRateLimit;
}

function assertServer(): void {
  if (typeof window !== "undefined") {
    throw new Error(
      "lib/github/client is server-only — it would leak GITHUB_TOKEN into the client bundle.",
    );
  }
}

function readRateLimit(headers: Headers, authenticated: boolean): void {
  const limit = Number(headers.get("x-ratelimit-limit"));
  const remaining = Number(headers.get("x-ratelimit-remaining"));
  const reset = Number(headers.get("x-ratelimit-reset"));
  if (Number.isFinite(limit) && Number.isFinite(remaining)) {
    lastRateLimit = { limit, remaining, reset, authenticated };
  }
}

export interface GitHubRequestOptions {
  /** Seconds Next should treat the underlying fetch as fresh. */
  revalidate?: number;
  timeoutMs?: number;
  /** Cache tag so a webhook can revalidate this exact resource. */
  tags?: string[];
}

/**
 * Performs a single authenticated-if-possible GET against the GitHub REST API.
 *
 * @throws {GitHubRateLimitError} when the quota is exhausted
 * @throws {GitHubError} for any other non-2xx response or transport failure
 */
export async function githubFetch<T>(
  path: string,
  options: GitHubRequestOptions = {},
): Promise<T> {
  assertServer();

  const token = process.env.GITHUB_TOKEN?.trim();
  const authenticated = Boolean(token);

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": API_VERSION,
    "User-Agent": USER_AGENT,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = path.startsWith("http") ? path : `${API_ROOT}${path}`;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
        next: {
          revalidate: options.revalidate ?? 300,
          ...(options.tags ? { tags: options.tags } : {}),
        },
      });

      readRateLimit(response.headers, authenticated);

      if (response.ok) {
        return (await response.json()) as T;
      }

      // Quota exhaustion is reported as 403 (classic) or 429 (secondary limit).
      const remaining = Number(response.headers.get("x-ratelimit-remaining"));
      if (
        (response.status === 403 || response.status === 429) &&
        remaining === 0
      ) {
        throw new GitHubRateLimitError(lastRateLimit);
      }

      // 4xx other than quota is a permanent condition — retrying is pointless.
      if (response.status >= 400 && response.status < 500) {
        throw new GitHubError(
          `GitHub responded ${response.status} for ${path}`,
          response.status,
          lastRateLimit,
        );
      }

      // 5xx — fall through to the retry.
      lastError = new GitHubError(
        `GitHub responded ${response.status} for ${path}`,
        response.status,
        lastRateLimit,
      );
    } catch (error) {
      // Never retry a rate-limit or a deliberate 4xx.
      if (
        error instanceof GitHubRateLimitError ||
        (error instanceof GitHubError && error.status < 500)
      ) {
        throw error;
      }
      lastError = error;
    }

    if (attempt < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  if (lastError instanceof GitHubError) throw lastError;
  const message =
    lastError instanceof Error ? lastError.message : "Unknown transport error";
  throw new GitHubError(`GitHub request failed for ${path}: ${message}`, 0);
}
