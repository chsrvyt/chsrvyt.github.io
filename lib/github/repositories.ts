import { cached, TTL, type CacheResult } from "@/lib/cache/store";
import { GITHUB_USERNAME } from "@/data/profile";
import { isHidden } from "@/data/featured";
import { githubFetch } from "./client";
import { normalizeRepo } from "./normalize";
import type { PortfolioProject, RawGitHubRepo } from "./types";

export const REPOS_CACHE_KEY = "github:repos";
export const REPOS_TAG = "github-repos";

/** GitHub's hard maximum for this endpoint. */
const PER_PAGE = 100;

/** Shared by the build-time fetch and the browser fetch, so both agree. */
export const REPOS_PATH = `/users/${GITHUB_USERNAME}/repos?per_page=${PER_PAGE}&sort=pushed&direction=desc&type=owner`;

/**
 * Filtering rules, applied identically at build time and in the browser.
 *
 * Exclusions, in order:
 *   - forks           (not this developer's work)
 *   - private         (defensive; the unauthenticated endpoint never returns them)
 *   - disabled repos  (GitHub has switched them off)
 *   - data/featured.ts `hiddenRepos`
 */
export function toPortfolioProjects(raw: RawGitHubRepo[]): PortfolioProject[] {
  return raw
    .filter(
      (repo) => !repo.fork && !repo.private && !repo.disabled && !isHidden(repo.name),
    )
    .map(normalizeRepo)
    .sort((a, b) => b.weight - a.weight);
}

/**
 * Every public, first-party repository, normalised and ranked.
 * Build-time path only — the browser uses lib/github/browser.ts.
 *
 * Docs: https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user
 */
export function getRepositories(): Promise<CacheResult<PortfolioProject[]>> {
  return cached(REPOS_CACHE_KEY, TTL.repos, async () => {
    const raw = await githubFetch<RawGitHubRepo[]>(REPOS_PATH, {
      revalidate: 300,
      tags: [REPOS_TAG],
    });

    if (!Array.isArray(raw)) {
      throw new Error("GitHub returned an unexpected repositories payload");
    }

    return toPortfolioProjects(raw);
  });
}

export {
  selectFeatured,
  selectFlagship,
  selectCurrentFocus,
  findBySlug,
} from "./aggregate";
