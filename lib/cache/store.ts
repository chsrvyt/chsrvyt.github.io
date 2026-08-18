/**
 * Process-local TTL cache with stale-on-failure semantics.
 *
 * Why not rely solely on Next's `fetch` cache: we need to keep serving the
 * *last good* payload when GitHub is down or rate-limiting us, and we need to
 * know exactly when that payload was fetched so the UI can display an honest
 * "last sync" timestamp instead of a fabricated "online" state.
 *
 * Scope note: this lives in module memory, so on a serverless platform each
 * warm instance keeps its own copy and a cold start begins empty. That is
 * acceptable — a cold start simply falls through to a live GitHub fetch. It is
 * a latency/rate-limit optimisation plus a failure cushion, not a database.
 */

export interface CacheResult<T> {
  value: T;
  /** Epoch ms of the GitHub fetch that produced `value`. */
  fetchedAt: number;
  /** True when `value` is past its TTL and GitHub could not be re-reached. */
  degraded: boolean;
  reason?: string;
}

interface Entry<T> {
  value: T;
  fetchedAt: number;
}

const store = new Map<string, Entry<unknown>>();

/** De-duplicates concurrent loads of the same key (single-flight). */
const inflight = new Map<string, Promise<unknown>>();

export const TTL = {
  /** Profile changes rarely. */
  profile: 15 * 60_000,
  /** Repository metadata — the main project feed. */
  repos: 5 * 60_000,
  /**
   * Commit lists. Longer than the others on purpose: this key fans out to one
   * request per tracked repository, so its TTL sets the rate-limit budget.
   */
  activity: 10 * 60_000,
  /** Derived from repos, so it tracks the same window. */
  stats: 5 * 60_000,
} as const;

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<CacheResult<T>> {
  const now = Date.now();
  const entry = store.get(key) as Entry<T> | undefined;

  // Fresh enough — no network at all.
  if (entry && now - entry.fetchedAt < ttlMs) {
    return { value: entry.value, fetchedAt: entry.fetchedAt, degraded: false };
  }

  // Collapse a stampede into a single upstream request.
  const existing = inflight.get(key) as Promise<T> | undefined;
  const promise =
    existing ??
    (() => {
      const p = loader().finally(() => inflight.delete(key));
      inflight.set(key, p);
      return p;
    })();

  try {
    const value = await promise;
    const fetchedAt = Date.now();
    store.set(key, { value, fetchedAt });
    return { value, fetchedAt, degraded: false };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";

    // Serve the last good payload rather than an error page. The caller
    // surfaces `degraded` so the UI can say so out loud.
    if (entry) {
      return {
        value: entry.value,
        fetchedAt: entry.fetchedAt,
        degraded: true,
        reason,
      };
    }

    // Nothing cached and nothing fetched — the caller must handle this.
    throw error;
  }
}

/** Reads a cached value without triggering a load. */
export function peek<T>(key: string): Entry<T> | undefined {
  return store.get(key) as Entry<T> | undefined;
}

/**
 * Drops cache entries. Called by the webhook after a verified push so the next
 * request re-reads GitHub instead of waiting out the TTL.
 */
export function invalidate(prefix?: string): number {
  if (!prefix) {
    const size = store.size;
    store.clear();
    return size;
  }
  let removed = 0;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      removed += 1;
    }
  }
  return removed;
}

/** Diagnostic snapshot — never exposed on a public route. */
export function inspect() {
  return Array.from(store.entries()).map(([key, entry]) => ({
    key,
    ageMs: Date.now() - entry.fetchedAt,
  }));
}
