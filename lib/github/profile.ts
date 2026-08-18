import { cached, TTL, type CacheResult } from "@/lib/cache/store";
import { GITHUB_USERNAME } from "@/data/profile";
import { githubFetch } from "./client";
import { normalizeProfile } from "./normalize";
import type { GitHubProfile, RawGitHubUser } from "./types";

export const PROFILE_CACHE_KEY = "github:profile";
export const PROFILE_TAG = "github-profile";

/**
 * Public profile for the configured account.
 * Docs: https://docs.github.com/en/rest/users/users#get-a-user
 */
export function getProfile(): Promise<CacheResult<GitHubProfile>> {
  return cached(PROFILE_CACHE_KEY, TTL.profile, async () => {
    const raw = await githubFetch<RawGitHubUser>(
      `/users/${GITHUB_USERNAME}`,
      { revalidate: 900, tags: [PROFILE_TAG] },
    );
    return normalizeProfile(raw);
  });
}
