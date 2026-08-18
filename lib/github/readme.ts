import { cached, type CacheResult } from "@/lib/cache/store";
import { GITHUB_USERNAME } from "@/data/profile";
import { githubFetch, GitHubError } from "./client";

/** Guards against a pathological README blowing out the page. */
const MAX_README_BYTES = 120_000;

interface RawReadme {
  /** base64 when `encoding` is "base64". */
  content: string;
  encoding: string;
  size: number;
  html_url: string;
}

export interface Readme {
  text: string;
  url: string;
  truncated: boolean;
}

/**
 * The repository's README, decoded to text.
 *
 * Returns `null` when the repository has no README — a 404 here is an
 * expected, ordinary answer, not an error worth degrading the page for.
 *
 * Docs: https://docs.github.com/en/rest/repos/contents#get-a-repository-readme
 */
export function getReadme(repo: string): Promise<CacheResult<Readme | null>> {
  return cached(`github:readme:${repo.toLowerCase()}`, 10 * 60_000, async () => {
    try {
      const raw = await githubFetch<RawReadme>(
        `/repos/${GITHUB_USERNAME}/${encodeURIComponent(repo)}/readme`,
        { revalidate: 600, tags: [`github-readme-${repo.toLowerCase()}`] },
      );

      if (raw.encoding !== "base64" || typeof raw.content !== "string") {
        return null;
      }

      const decoded = Buffer.from(raw.content, "base64").toString("utf8");
      const truncated = decoded.length > MAX_README_BYTES;

      return {
        text: truncated ? decoded.slice(0, MAX_README_BYTES) : decoded,
        url: raw.html_url,
        truncated,
      };
    } catch (error) {
      if (error instanceof GitHubError && error.status === 404) return null;
      throw error;
    }
  });
}
