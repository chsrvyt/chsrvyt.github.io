import type { MetadataRoute } from "next";
import { getRepositories } from "@/lib/github";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sarveshchonde.dev";

export const revalidate = 3600;

/**
 * Home plus one entry per featured project.
 *
 * `lastModified` comes from each repository's real push timestamp, so a crawler
 * is told the truth about when the page's content actually changed.
 *
 * Only curated projects are listed: every public repo has a case-study route,
 * but submitting thirty thin pages of coursework would dilute the site rather
 * than help it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const home: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  try {
    const repos = await getRepositories();

    const projects = repos.value
      .filter((project) => project.tier !== null)
      .map((project) => ({
        url: `${siteUrl}/projects/${project.slug}`,
        lastModified: project.pushedAt ? new Date(project.pushedAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: project.tier === "flagship" ? 0.8 : 0.6,
      }));

    return [...home, ...projects];
  } catch {
    // A GitHub outage should not produce an empty or failed sitemap.
    return home;
  }
}
