import type { ProjectCategory } from "@/lib/github/types";

/**
 * LOCAL OVERRIDE LAYER
 *
 * GitHub remains the source of truth for descriptions, languages, stars,
 * timestamps and URLs. This file only supplies things the API cannot know:
 *
 *   - which repositories are flagship vs. supporting
 *   - a human display name where the repo slug is unflattering
 *   - a category the heuristic classifier would otherwise miss
 *   - an accent colour for the sticky showcase
 *
 * `repo` values are matched case-insensitively against real repository names.
 * An entry that matches nothing is silently ignored — it never renders a card,
 * so a renamed or deleted repository degrades to "absent", never to a ghost.
 */

export type FeaturedTier = "flagship" | "highlight";

export interface FeaturedEntry {
  /** Exact repository name on github.com/chsrvyt */
  repo: string;
  tier: FeaturedTier;
  /** Display title. Falls back to the repo name when omitted. */
  displayName?: string;
  /**
   * Optional one-line summary, used ONLY when the repository has no
   * description on GitHub. Keep it factual — no metrics, no user counts.
   */
  fallbackSummary?: string;
  /** Overrides the heuristic classifier. */
  categories?: ProjectCategory[];
  /** Hex accent used by the sticky showcase transition. */
  accent?: string;
}

export const featured: FeaturedEntry[] = [
  {
    repo: "SNOW-X-BETA",
    tier: "flagship",
    displayName: "SNOW-X",
    categories: ["ai", "fullstack"],
    accent: "#22d3ee",
  },
  {
    repo: "Theuntoldprojectbysrv",
    tier: "flagship",
    displayName: "THE UNTOLD PROJECT",
    categories: ["fullstack", "web"],
    accent: "#10b981",
  },
  {
    repo: "THE-UNCAUGHT-EXCEPTIONS",
    tier: "flagship",
    displayName: "THE UNCAUGHT EXCEPTIONS",
    fallbackSummary: "AI-assisted farm intelligence platform.",
    categories: ["ai", "fullstack"],
    accent: "#84cc16",
  },
  {
    repo: "phishingdetector",
    tier: "highlight",
    displayName: "PHISHING DETECTOR",
    categories: ["cybersecurity", "ai"],
    accent: "#f59e0b",
  },
  {
    repo: "CARBONFOOTPRINT",
    tier: "highlight",
    displayName: "CARBON FOOTPRINT",
    categories: ["ai", "web"],
    accent: "#34d399",
  },
];

/**
 * Repositories excluded from the public explorer entirely.
 * Forks are dropped automatically; this is for first-party noise.
 */
export const hiddenRepos: string[] = ["Chsrvyt"];

const featuredByRepo = new Map(
  featured.map((entry, index) => [entry.repo.toLowerCase(), { entry, index }]),
);

export function getFeatured(repoName: string): FeaturedEntry | undefined {
  return featuredByRepo.get(repoName.toLowerCase())?.entry;
}

/**
 * Position in the `featured` array above.
 *
 * The showcase presents flagship projects in *this* order, not in the
 * engagement order the generic weight produces — which project leads a
 * case-study sequence is an editorial decision, not a function of star count.
 * Returns `Number.MAX_SAFE_INTEGER` for anything unlisted so it sorts last.
 */
export function featuredOrder(repoName: string): number {
  return (
    featuredByRepo.get(repoName.toLowerCase())?.index ?? Number.MAX_SAFE_INTEGER
  );
}

export function isHidden(repoName: string): boolean {
  return hiddenRepos.some((r) => r.toLowerCase() === repoName.toLowerCase());
}
