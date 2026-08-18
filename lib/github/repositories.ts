import { cached, TTL, type CacheResult } from "@/lib/cache/store";
import { GITHUB_USERNAME } from "@/data/profile";
import { featuredOrder, isHidden } from "@/data/featured";
import { githubFetch } from "./client";
import { normalizeRepo } from "./normalize";
import type { PortfolioProject, RawGitHubRepo } from "./types";

export const REPOS_CACHE_KEY = "github:repos";
export const REPOS_TAG = "github-repos";

/** GitHub's hard maximum for this endpoint. */
const PER_PAGE = 100;

/**
 * Every public, first-party repository, normalised and ranked.
 *
 * Exclusions, in order:
 *   - forks           (not this developer's work)
 *   - private         (defensive; the unauthenticated endpoint never returns them)
 *   - disabled repos  (GitHub has switched them off)
 *   - data/featured.ts `hiddenRepos`
 *
 * Docs: https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user
 */
export function getRepositories(): Promise<CacheResult<PortfolioProject[]>> {
  return cached(REPOS_CACHE_KEY, TTL.repos, async () => {
    const raw = await githubFetch<RawGitHubRepo[]>(
      `/users/${GITHUB_USERNAME}/repos?per_page=${PER_PAGE}&sort=pushed&direction=desc&type=owner`,
      { revalidate: 300, tags: [REPOS_TAG] },
    );

    if (!Array.isArray(raw)) {
      throw new Error("GitHub returned an unexpected repositories payload");
    }

    return raw
      .filter(
        (repo) =>
          !repo.fork &&
          !repo.private &&
          !repo.disabled &&
          !isHidden(repo.name),
      )
      .map(normalizeRepo)
      .sort((a, b) => b.weight - a.weight);
  });
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
