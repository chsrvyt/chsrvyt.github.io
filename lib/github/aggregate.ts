import { featuredOrder } from "@/data/featured";
import type {
  GitHubLanguage,
  GitHubStats,
  PortfolioProject,
} from "./types";

/**
 * Pure aggregation and selection over already-normalised projects.
 *
 * Deliberately dependency-free: no fetching, no caching, no `node:` imports.
 * Both the build-time server path and the browser path in
 * `lib/github/browser.ts` call these, so they must not drag the server-only
 * GitHub client into the client bundle.
 */

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

/** Flagship + highlight entries, in the order data/featured.ts declares. */
export function selectFeatured(projects: PortfolioProject[]): PortfolioProject[] {
  return projects
    .filter((project) => project.tier !== null)
    .sort((a, b) => featuredOrder(a.repo) - featuredOrder(b.repo));
}

/** Flagship entries only — the sticky case-study scroll. */
export function selectFlagship(projects: PortfolioProject[]): PortfolioProject[] {
  return projects
    .filter((project) => project.tier === "flagship")
    .sort((a, b) => featuredOrder(a.repo) - featuredOrder(b.repo));
}

export function findBySlug(
  projects: PortfolioProject[],
  slug: string,
): PortfolioProject | undefined {
  return projects.find((project) => project.slug === slug);
}

/**
 * The repository with the most recent push — the honest answer to
 * "what is he building right now".
 */
export function selectCurrentFocus(
  projects: PortfolioProject[],
): PortfolioProject | null {
  const withPush = projects.filter((project) => project.pushedAt !== null);
  if (withPush.length === 0) return null;
  return withPush.reduce((latest, project) =>
    Date.parse(project.pushedAt!) > Date.parse(latest.pushedAt!) ? project : latest,
  );
}
