import { cached, TTL, type CacheResult } from "@/lib/cache/store";
import { getProfile } from "./profile";
import { getRepositories } from "./repositories";
import { buildStats } from "./aggregate";
import type { GitHubStats } from "./types";

export const STATS_CACHE_KEY = "github:stats";

/**
 * Aggregates over the repositories the portfolio actually surfaces.
 * Build-time path only; `buildStats` itself lives in ./aggregate so the
 * browser can reuse it without importing the server client.
 */
export function getStats(): Promise<CacheResult<GitHubStats>> {
  return cached(STATS_CACHE_KEY, TTL.stats, async () => {
    const [profile, repos] = await Promise.all([getProfile(), getRepositories()]);
    return buildStats(
      profile.value.publicRepos,
      profile.value.followers,
      profile.value.memberSince,
      repos.value,
    );
  });
}

export { buildStats } from "./aggregate";
