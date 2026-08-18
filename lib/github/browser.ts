"use client";

import { GITHUB_USERNAME } from "@/data/profile";
import { buildStats } from "./aggregate";
import { normalizeProfile } from "./normalize";
import { toPortfolioProjects, REPOS_PATH } from "./repositories";
import type {
  GitHubProfile,
  GitHubStats,
  PortfolioProject,
  RawGitHubRepo,
  RawGitHubUser,
} from "./types";

/**
 * Browser-side GitHub reads.
 *
 * On a Node host this work happened server-side behind `/api/github/*`, which
 * hid the token and put one shared cache in front of GitHub. GitHub Pages has
 * no server, so the fetch moves to the visitor's browser. GitHub's REST API
 * sends `Access-Control-Allow-Origin: *` for public, unauthenticated reads,
 * which is what makes this possible at all.
 *
 * Two consequences worth being explicit about:
 *
 *   1. No token, ever. A token in client code is a published token. That caps
 *      us at GitHub's unauthenticated limit — but that limit is per visitor IP,
 *      not per site, so it is a far better fit here than it would be on a
 *      server. Two requests per refresh keeps any single visitor nowhere near
 *      the 60/hour ceiling.
 *
 *   2. Failure is normal and must be silent. A rate-limited or offline visitor
 *      keeps the data baked into the HTML at build time; the UI reports that
 *      state honestly rather than blanking.
 */

const API_ROOT = "https://api.github.com";

export interface LiveSnapshot {
  profile: GitHubProfile;
  projects: PortfolioProject[];
  stats: GitHubStats;
  /** When this snapshot was actually read from GitHub. */
  fetchedAt: string;
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_ROOT}${path}`, {
    signal,
    headers: { Accept: "application/vnd.github+json" },
    // The browser cache would happily serve a stale copy and defeat the point.
    cache: "no-store",
  });

  if (!response.ok) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    if ((response.status === 403 || response.status === 429) && remaining === "0") {
      throw new Error("GitHub rate limit reached for this network");
    }
    throw new Error(`GitHub responded ${response.status}`);
  }

  return (await response.json()) as T;
}

/**
 * Re-reads the profile and repository list and re-derives everything from them.
 *
 * Exactly two requests. Commit activity is deliberately not refreshed here —
 * it costs one request per repository, which would put a visitor who leaves the
 * tab open into rate-limit territory for content that changes far more slowly
 * than the repo list. The scheduled rebuild keeps that section current instead.
 */
export async function fetchLiveSnapshot(
  signal?: AbortSignal,
): Promise<LiveSnapshot> {
  const [rawProfile, rawRepos] = await Promise.all([
    get<RawGitHubUser>(`/users/${GITHUB_USERNAME}`, signal),
    get<RawGitHubRepo[]>(REPOS_PATH, signal),
  ]);

  if (!Array.isArray(rawRepos)) {
    throw new Error("GitHub returned an unexpected repositories payload");
  }

  const profile = normalizeProfile(rawProfile);
  // Same normalisation, filtering and ranking the build used — one code path.
  const projects = toPortfolioProjects(rawRepos);

  return {
    profile,
    projects,
    stats: buildStats(
      profile.publicRepos,
      profile.followers,
      profile.memberSince,
      projects,
    ),
    fetchedAt: new Date().toISOString(),
  };
}
