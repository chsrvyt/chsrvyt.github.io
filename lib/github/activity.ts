import { cached, TTL, type CacheResult } from "@/lib/cache/store";
import { GITHUB_USERNAME } from "@/data/profile";
import { githubFetch, GitHubError } from "./client";
import { getRepositories } from "./repositories";
import type { GitHubActivity, GitHubCommit } from "./types";

export const ACTIVITY_CACHE_KEY = "github:activity";
export const ACTIVITY_TAG = "github-activity";

/**
 * How many recently-pushed repositories to read commits from. Each one costs a
 * GitHub request, so this is the main lever on the rate-limit budget:
 * 5 repos ÷ a 10-minute TTL ≈ 30 requests/hour, which fits inside the
 * unauthenticated 60/hour ceiling alongside the repo and profile calls.
 * Set GITHUB_TOKEN and the ceiling becomes 5,000/hour.
 */
const ACTIVITY_REPO_COUNT = 5;
const COMMITS_PER_REPO = 4;
const MAX_ENTRIES = 6;

interface RawCommitListItem {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string } | null;
    committer: { name: string; email: string; date: string } | null;
  };
  author: { login: string } | null;
}

/**
 * Recent development activity, read from each repository's commit list.
 *
 * NOT from `/users/{user}/events/public`, which is the obvious choice and the
 * wrong one: GitHub has trimmed PushEvent payloads down to
 * `{repository_id, push_id, ref, head, before}` for this account — no `commits`
 * array and no `size`. An events-based timeline can therefore show *that* a
 * push happened but not what was in it, which is precisely the interesting
 * part. The events feed also only retains ~90 days.
 *
 * Reading `/repos/{owner}/{repo}/commits` for the handful of most recently
 * pushed repositories gives real commit subjects, real timestamps and a real
 * permalink per commit, at a predictable request cost.
 *
 * Docs: https://docs.github.com/en/rest/commits/commits#list-commits
 */
export function getActivity(): Promise<CacheResult<GitHubActivity[]>> {
  return cached(ACTIVITY_CACHE_KEY, TTL.activity, async () => {
    const repos = await getRepositories();

    const candidates = repos.value
      .filter((project) => !project.archived && project.pushedAt !== null)
      .sort((a, b) => Date.parse(b.pushedAt!) - Date.parse(a.pushedAt!))
      .slice(0, ACTIVITY_REPO_COUNT);

    if (candidates.length === 0) return [];

    const settled = await Promise.allSettled(
      candidates.map(async (project) => {
        const commits = await githubFetch<RawCommitListItem[]>(
          `/repos/${GITHUB_USERNAME}/${encodeURIComponent(project.repo)}/commits?per_page=${COMMITS_PER_REPO}`,
          { revalidate: 300, tags: [ACTIVITY_TAG] },
        );
        return { project, commits };
      }),
    );

    const entries: GitHubActivity[] = [];

    for (const result of settled) {
      // A single unreachable or empty repository must not blank the timeline.
      if (result.status === "rejected") {
        const error = result.reason;
        // 409 = empty repository, which is an ordinary state, not a failure.
        if (!(error instanceof GitHubError && error.status === 409)) {
          console.warn("[activity] commit fetch failed:", error);
        }
        continue;
      }

      const { project, commits } = result.value;
      if (!Array.isArray(commits) || commits.length === 0) continue;

      const normalized: GitHubCommit[] = commits
        .filter((item) => {
          if (!item?.sha || !item.commit) return false;
          // Contributions by other people in his repos aren't his activity.
          return item.author?.login
            ? item.author.login.toLowerCase() === GITHUB_USERNAME.toLowerCase()
            : true;
        })
        .map((item) => ({
          sha: item.sha,
          shortSha: item.sha.slice(0, 7),
          message: item.commit.message.split("\n")[0]?.trim() || "(no message)",
          url: item.html_url,
        }));

      if (normalized.length === 0) continue;

      const head = commits[0]!;
      const timestamp =
        head.commit.author?.date ??
        head.commit.committer?.date ??
        project.pushedAt!;

      entries.push({
        id: `${project.repo}:${head.sha}`,
        type: "push",
        repo: project.repo,
        repoUrl: project.url,
        title: normalized[0]!.message,
        commits: normalized,
        url: normalized[0]!.url,
        createdAt: timestamp,
      });
    }

    return entries
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, MAX_ENTRIES);
  });
}
