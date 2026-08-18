import type { CacheResult } from "@/lib/cache/store";
import { getActivity } from "./activity";
import { getProfile } from "./profile";
import { getRepositories, selectCurrentFocus, selectFeatured, selectFlagship } from "./repositories";
import { buildStats } from "./stats";
import { buildTechnologyGroups } from "./technologies";
import type {
  ApiEnvelope,
  GitHubActivity,
  GitHubProfile,
  GitHubStats,
  PortfolioProject,
  SyncMeta,
  TechnologyGroup,
} from "./types";

export * from "./types";
export { getProfile } from "./profile";
export { getActivity } from "./activity";
export {
  getRepositories,
  selectFeatured,
  selectFlagship,
  selectCurrentFocus,
  findBySlug,
} from "./repositories";
export { getStats } from "./stats";
export { buildTechnologyGroups } from "./technologies";
export { STATUS_LABELS, deriveStatus, daysSince } from "./normalize";

/** Wraps a cache result in the envelope every internal API route returns. */
export function toEnvelope<T>(result: CacheResult<T>): ApiEnvelope<T> {
  return {
    data: result.value,
    meta: buildMeta(result),
  };
}

export function buildMeta(result: {
  fetchedAt: number;
  degraded: boolean;
  reason?: string;
}): SyncMeta {
  return {
    source: result.degraded ? "cache" : "live",
    syncedAt: new Date(result.fetchedAt).toISOString(),
    degraded: result.degraded,
    ...(result.degraded && result.reason ? { reason: result.reason } : {}),
  };
}

export interface PortfolioData {
  profile: GitHubProfile | null;
  projects: PortfolioProject[];
  featured: PortfolioProject[];
  flagship: PortfolioProject[];
  currentFocus: PortfolioProject | null;
  activity: GitHubActivity[];
  stats: GitHubStats | null;
  technologies: TechnologyGroup[];
  meta: SyncMeta;
}

/**
 * Single entry point for server components.
 *
 * The three upstream calls are independent and settled independently: GitHub
 * failing on one resource must not blank the whole page. When a resource has
 * neither live data nor a cached fallback it degrades to empty, `meta.degraded`
 * flips to true, and the UI states plainly that it is showing cached or partial
 * data. The page never throws because GitHub is unavailable.
 */
export async function loadPortfolioData(): Promise<PortfolioData> {
  const [profileResult, reposResult, activityResult] = await Promise.allSettled([
    getProfile(),
    getRepositories(),
    getActivity(),
  ]);

  const failures: string[] = [];
  let oldestFetch = Date.now();
  let degraded = false;

  function unwrap<T>(
    settled: PromiseSettledResult<CacheResult<T>>,
    label: string,
    fallback: T,
  ): T {
    if (settled.status === "rejected") {
      failures.push(
        `${label}: ${settled.reason instanceof Error ? settled.reason.message : "unavailable"}`,
      );
      degraded = true;
      return fallback;
    }
    if (settled.value.degraded) {
      degraded = true;
      if (settled.value.reason) failures.push(`${label}: ${settled.value.reason}`);
    }
    oldestFetch = Math.min(oldestFetch, settled.value.fetchedAt);
    return settled.value.value;
  }

  const profile = unwrap<GitHubProfile | null>(
    profileResult as PromiseSettledResult<CacheResult<GitHubProfile | null>>,
    "profile",
    null,
  );
  const projects = unwrap(reposResult, "repositories", [] as PortfolioProject[]);
  const activity = unwrap(activityResult, "activity", [] as GitHubActivity[]);

  const stats =
    projects.length > 0 || profile
      ? buildStats(
          profile?.publicRepos ?? projects.length,
          profile?.followers ?? 0,
          profile?.memberSince ?? new Date().toISOString(),
          projects,
        )
      : null;

  return {
    profile,
    projects,
    featured: selectFeatured(projects),
    flagship: selectFlagship(projects),
    currentFocus: selectCurrentFocus(projects),
    activity,
    stats,
    technologies: buildTechnologyGroups(projects),
    meta: {
      source: degraded ? "cache" : "live",
      syncedAt: new Date(oldestFetch).toISOString(),
      degraded,
      ...(degraded && failures.length > 0 ? { reason: failures.join("; ") } : {}),
    },
  };
}
