import { getRepositories, toEnvelope } from "@/lib/github";
import type { PortfolioProject, ProjectCategory } from "@/lib/github/types";
import { CATEGORY_LABELS } from "@/lib/github/types";
import { guardRead, handleRouteError, ok } from "@/lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_LABELS));
const VALID_TIERS = new Set(["flagship", "highlight"]);
const MAX_QUERY_LENGTH = 64;
const MAX_LIMIT = 100;

/**
 * GET /api/github/repos
 *
 * Query parameters (all optional, all validated against a whitelist — an
 * unrecognised value is dropped, never echoed back and never interpolated):
 *
 *   category  one of the ProjectCategory ids
 *   tier      "flagship" | "highlight"
 *   q         free-text match on name / summary / topics / language
 *   limit     1–100
 *
 * The UI filters client-side against the full list; these parameters exist so
 * the endpoint is independently useful and so filtering is enforced somewhere
 * other than the browser.
 */
export async function GET(request: Request) {
  const limited = guardRead(request);
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    const result = await getRepositories();

    const category = readEnum(url.searchParams.get("category"), VALID_CATEGORIES);
    const tier = readEnum(url.searchParams.get("tier"), VALID_TIERS);
    const query = readQuery(url.searchParams.get("q"));
    const limit = readLimit(url.searchParams.get("limit"));

    let projects: PortfolioProject[] = result.value;

    if (category) {
      projects = projects.filter((project) =>
        project.categories.includes(category as ProjectCategory),
      );
    }
    if (tier) {
      projects = projects.filter((project) => project.tier === tier);
    }
    if (query) {
      projects = projects.filter((project) => matches(project, query));
    }
    if (limit !== null) {
      projects = projects.slice(0, limit);
    }

    return ok(toEnvelope({ ...result, value: projects }), {
      sMaxAge: 300,
      swr: 900,
    });
  } catch (error) {
    return handleRouteError("github/repos", error);
  }
}

function readEnum(raw: string | null, allowed: Set<string>): string | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  return allowed.has(value) ? value : null;
}

function readQuery(raw: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim().slice(0, MAX_QUERY_LENGTH).toLowerCase();
  return value.length > 0 ? value : null;
}

function readLimit(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 1) return null;
  return Math.min(value, MAX_LIMIT);
}

/** Route modules may only export handlers and config — keep this local. */
function matches(project: PortfolioProject, query: string): boolean {
  const haystack = [
    project.repo,
    project.title,
    project.summary ?? "",
    project.primaryLanguage ?? "",
    project.topics.join(" "),
    project.categories.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}
