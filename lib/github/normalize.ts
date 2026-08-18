import { getFeatured } from "@/data/featured";
import { categorize } from "./categorize";
import type {
  GitHubProfile,
  PortfolioProject,
  RawGitHubRepo,
  RawGitHubUser,
  RepositoryStatus,
} from "./types";

/**
 * Raw GitHub payloads → portfolio shapes.
 *
 * Every value here traces back to a field GitHub actually returned, or to the
 * local override file. Nothing is synthesised. Where GitHub has no data (an
 * empty description, a repo with no language) the normalised value is `null`
 * and the UI is responsible for rendering that absence honestly.
 */

const DAY_MS = 86_400_000;

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return (Date.now() - then) / DAY_MS;
}

/**
 * Status is derived from `pushed_at`, never declared.
 *
 *   archived flag        → ARCHIVED
 *   pushed  ≤ 14 days    → ACTIVE
 *   pushed  ≤ 60 days    → RECENTLY UPDATED
 *   otherwise            → STABLE
 */
export function deriveStatus(
  pushedAt: string | null,
  archived: boolean,
): RepositoryStatus {
  if (archived) return "archived";
  const age = daysSince(pushedAt);
  if (age === null) return "stable";
  if (age <= 14) return "active";
  if (age <= 60) return "recently-updated";
  return "stable";
}

export const STATUS_LABELS: Record<RepositoryStatus, string> = {
  active: "Active",
  "recently-updated": "Recently updated",
  stable: "Stable",
  archived: "Archived",
};

/**
 * Sort weight. Featured tier dominates, then evidence of real work:
 * a deployed URL, a written description, stars, and recency.
 */
function computeWeight(
  repo: RawGitHubRepo,
  tier: "flagship" | "highlight" | null,
): number {
  let weight = 0;
  if (tier === "flagship") weight += 10_000;
  if (tier === "highlight") weight += 5_000;
  if (repo.homepage) weight += 120;
  if (repo.description) weight += 60;
  if (repo.topics?.length) weight += 40;
  weight += repo.stargazers_count * 25;
  weight += repo.forks_count * 10;

  const age = daysSince(repo.pushed_at);
  if (age !== null) {
    // Decays to zero at roughly one year; keeps dormant work from leading.
    weight += Math.max(0, 200 - age * 0.55);
  }
  if (repo.archived) weight -= 500;
  return Math.round(weight);
}

export function normalizeProfile(raw: RawGitHubUser): GitHubProfile {
  return {
    login: raw.login,
    name: raw.name,
    avatarUrl: raw.avatar_url,
    profileUrl: raw.html_url,
    bio: raw.bio?.trim() || null,
    location: raw.location,
    publicRepos: raw.public_repos,
    followers: raw.followers,
    following: raw.following,
    memberSince: raw.created_at,
  };
}

export function normalizeRepo(raw: RawGitHubRepo): PortfolioProject {
  const override = getFeatured(raw.name);
  const topics = raw.topics ?? [];

  const githubSummary = raw.description?.trim() || null;
  const summary = githubSummary ?? override?.fallbackSummary ?? null;

  const categories =
    override?.categories ??
    categorize({
      name: raw.name,
      description: githubSummary,
      topics,
      language: raw.language,
      homepage: raw.homepage,
      stars: raw.stargazers_count,
      isFork: raw.fork,
    });

  const tier = override?.tier ?? null;

  return {
    id: raw.id,
    slug: slugify(raw.name),
    repo: raw.name,
    fullName: raw.full_name,
    previewImage: `https://opengraph.githubassets.com/1/${raw.full_name}`,
    title: override?.displayName ?? raw.name,
    summary,
    summaryIsLocal: githubSummary === null && summary !== null,
    url: raw.html_url,
    homepage: normalizeHomepage(raw.homepage),
    primaryLanguage: raw.language,
    topics,
    stars: raw.stargazers_count,
    forks: raw.forks_count,
    openIssues: raw.open_issues_count,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    pushedAt: raw.pushed_at,
    archived: raw.archived,
    status: deriveStatus(raw.pushed_at, raw.archived),
    categories,
    tier,
    accent: override?.accent ?? null,
    weight: computeWeight(raw, tier),
  };
}

/** Rejects anything that isn't a plain http(s) URL — no `javascript:` links. */
function normalizeHomepage(homepage: string | null): string | null {
  if (!homepage) return null;
  const trimmed = homepage.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
