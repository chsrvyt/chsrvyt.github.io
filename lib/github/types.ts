/**
 * Type contracts for the GitHub integration.
 *
 * `Raw*` types mirror the GitHub REST payloads exactly (partially — only the
 * fields we consume). Everything else is the normalised shape the UI sees.
 * No React component should ever touch a `Raw*` type.
 */

/* ===========================================================================
   RAW GITHUB REST SHAPES
   Docs: https://docs.github.com/en/rest
   =========================================================================== */

export interface RawGitHubUser {
  login: string;
  id: number;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface RawGitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
  homepage: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  forks_count: number;
  open_issues_count: number;
  archived: boolean;
  disabled: boolean;
  visibility: string;
  topics?: string[];
  license: { key: string; name: string; spdx_id: string } | null;
  default_branch: string;
}

/* ===========================================================================
   NORMALISED PORTFOLIO SHAPES
   =========================================================================== */

export interface GitHubProfile {
  login: string;
  name: string | null;
  avatarUrl: string;
  profileUrl: string;
  bio: string | null;
  location: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  /** ISO string — account creation date. */
  memberSince: string;
}

export type ProjectCategory =
  | "ai"
  | "cybersecurity"
  | "fullstack"
  | "web"
  | "systems"
  | "academic"
  | "experiments";

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  ai: "AI",
  cybersecurity: "Cybersecurity",
  fullstack: "Full Stack",
  web: "Web",
  systems: "Systems",
  academic: "Academic",
  experiments: "Experiments",
};

/**
 * Derived purely from `pushed_at` and `archived` — never hand-set.
 * See `deriveStatus` in normalize.ts for the exact thresholds.
 */
export type RepositoryStatus =
  | "active"
  | "recently-updated"
  | "stable"
  | "archived";

export interface PortfolioProject {
  id: number;
  /** URL-safe identifier, derived from the repository name. */
  slug: string;
  /** Raw repository name as it exists on GitHub. */
  repo: string;
  /** "owner/repo". */
  fullName: string;
  /**
   * GitHub's own social preview card for this repository. It re-renders when
   * the repo's name, description or language changes, so it stays in sync
   * without anyone uploading a screenshot.
   */
  previewImage: string;
  /** Display title — local override, else the repo name. */
  title: string;
  /** GitHub description, else the local fallback, else null. Never invented. */
  summary: string | null;
  /** True when `summary` came from data/featured.ts rather than GitHub. */
  summaryIsLocal: boolean;
  url: string;
  homepage: string | null;
  primaryLanguage: string | null;
  /** Language names only; byte counts are fetched separately and sparingly. */
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  createdAt: string;
  updatedAt: string;
  pushedAt: string | null;
  archived: boolean;
  status: RepositoryStatus;
  categories: ProjectCategory[];
  /** Present only for entries listed in data/featured.ts. */
  tier: "flagship" | "highlight" | null;
  accent: string | null;
  /** Sort weight — higher surfaces first. */
  weight: number;
}

export interface GitHubCommit {
  sha: string;
  shortSha: string;
  message: string;
  /** github.com URL for this exact commit. */
  url: string;
}

export interface GitHubActivity {
  id: string;
  type: "push" | "create" | "pull_request" | "issue" | "release" | "fork";
  repo: string;
  repoUrl: string;
  /** Human-facing headline, taken verbatim from GitHub where one exists. */
  title: string;
  /** Populated for push events. */
  commits: GitHubCommit[];
  /** Deep link to the commit / PR / release this event describes. */
  url: string;
  createdAt: string;
}

export interface GitHubLanguage {
  name: string;
  /** Number of repositories where this is the primary language. */
  repoCount: number;
  /** Share of classified repositories, 0–1. */
  share: number;
}

export interface GitHubStats {
  publicRepos: number;
  /** Repos surfaced by the portfolio (forks and hidden entries excluded). */
  portfolioRepos: number;
  totalStars: number;
  totalForks: number;
  followers: number;
  languages: GitHubLanguage[];
  /** ISO timestamp of the most recent push across all repositories. */
  lastPushAt: string | null;
  /** Repository name that produced `lastPushAt`. */
  lastPushRepo: string | null;
  memberSince: string;
}

export interface PortfolioTechnology {
  name: string;
  /** True when the name was observed in GitHub data rather than declared. */
  inferred: boolean;
  /** Repositories that evidenced this technology. */
  evidence: string[];
}

export interface TechnologyGroup {
  id: string;
  label: string;
  items: PortfolioTechnology[];
}

/* ===========================================================================
   TRANSPORT ENVELOPE
   Every internal API route returns this shape so the UI can always tell
   whether it is looking at live data, cached data, or nothing at all.
   =========================================================================== */

export type DataSource = "live" | "cache";

export interface SyncMeta {
  source: DataSource;
  /** ISO timestamp of the moment this data was actually fetched from GitHub. */
  syncedAt: string;
  /** True when GitHub could not be reached and cached data is being served. */
  degraded: boolean;
  /** Present only when degraded — the reason GitHub was unreachable. */
  reason?: string;
}

export interface ApiEnvelope<T> {
  data: T;
  meta: SyncMeta;
}
