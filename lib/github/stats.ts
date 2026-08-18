import { cached, TTL, type CacheResult } from "@/lib/cache/store";
import { getProfile } from "./profile";
import { getRepositories } from "./repositories";
import type { GitHubLanguage, GitHubStats, PortfolioProject } from "./types";

export const STATS_CACHE_KEY = "github:stats";

/**
 * Aggregates over the repositories the portfolio actually surfaces.
 *
 * Every number here is a sum of values GitHub returned. Nothing is estimated,
 * rounded up, or carried over from a previous run.
 */
export function getStats(): Promise<CacheResult<GitHubStats>> {
  return cached(STATS_CACHE_KEY, TTL.stats, async () => {
    const [profile, repos] = await Promise.all([getProfile(), getRepositories()]);
    return buildStats(profile.value.publicRepos, profile.value.followers, profile.value.memberSince, repos.value);
  });
}

export function buildStats(
  publicRepos: number,
  followers: number,
  memberSince: string,
  projects: PortfolioProject[],
): GitHubStats {
  const counts = new Map<string, number>();
  let totalStars = 0;
  let totalForks = 0;
  let lastPushAt: string | null = null;
  let lastPushRepo: string | null = null;

  for (const project of projects) {
    totalStars += project.stars;
    totalForks += project.forks;

    if (project.primaryLanguage) {
      counts.set(
        project.primaryLanguage,
        (counts.get(project.primaryLanguage) ?? 0) + 1,
      );
    }

    if (
      project.pushedAt &&
      (lastPushAt === null || Date.parse(project.pushedAt) > Date.parse(lastPushAt))
    ) {
      lastPushAt = project.pushedAt;
      lastPushRepo = project.repo;
    }
  }

  const classified = Array.from(counts.values()).reduce((a, b) => a + b, 0);

  const languages: GitHubLanguage[] = Array.from(counts.entries())
    .map(([name, repoCount]) => ({
      name,
      repoCount,
      share: classified === 0 ? 0 : repoCount / classified,
    }))
    .sort((a, b) => b.repoCount - a.repoCount || a.name.localeCompare(b.name));

  return {
    publicRepos,
    portfolioRepos: projects.length,
    totalStars,
    totalForks,
    followers,
    languages,
    lastPushAt,
    lastPushRepo,
    memberSince,
  };
}
