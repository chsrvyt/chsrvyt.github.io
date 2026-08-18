"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Section } from "@/components/ui/Section";
import { useGsap } from "@/lib/animations/context";
import { restageGrid, revealProjectGrid } from "@/lib/animations/projects";
import { FILTERS } from "@/lib/github/categorize";
import type { ApiEnvelope, PortfolioProject, ProjectCategory } from "@/lib/github/types";
import { cn } from "@/lib/utils/cn";

type Sort = "recent" | "stars" | "name";

const SORTS: Array<{ id: Sort; label: string }> = [
  { id: "recent", label: "Recently updated" },
  { id: "stars", label: "Stars" },
  { id: "name", label: "Name" },
];

/**
 * Searchable, filterable index of every public repository.
 *
 * Seeded with server-rendered data so the list is present in the HTML (good
 * for SEO and for the first paint), then refreshed from the internal API on an
 * interval. Filtering runs client-side against the full set — it is at most a
 * few dozen records, so a round-trip per keystroke would be strictly worse.
 */
export function ProjectExplorer({
  initialProjects,
}: {
  initialProjects: PortfolioProject[];
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [category, setCategory] = useState<ProjectCategory | "all">("all");
  const [language, setLanguage] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [query, setQuery] = useState("");

  const gridRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Keep the list current without a page reload. The route is cached upstream,
  // so this is cheap and never hits GitHub directly.
  useEffect(() => {
    const controller = new AbortController();

    const refresh = async () => {
      try {
        const response = await fetch("/api/github/repos", {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;
        const payload = (await response.json()) as ApiEnvelope<PortfolioProject[]>;
        if (Array.isArray(payload.data) && payload.data.length > 0) {
          setProjects(payload.data);
        }
      } catch {
        // Offline or aborted — the server-rendered list stays on screen.
      }
    };

    const id = window.setInterval(refresh, 5 * 60_000);
    return () => {
      controller.abort();
      window.clearInterval(id);
    };
  }, []);

  const languages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const project of projects) {
      if (project.primaryLanguage) {
        counts.set(
          project.primaryLanguage,
          (counts.get(project.primaryLanguage) ?? 0) + 1,
        );
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [projects]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = projects.filter((project) => {
      if (category !== "all" && !project.categories.includes(category)) return false;
      if (language !== "all" && project.primaryLanguage !== language) return false;
      if (!needle) return true;

      return [
        project.repo,
        project.title,
        project.summary ?? "",
        project.primaryLanguage ?? "",
        project.topics.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });

    const sorted = [...filtered];
    if (sort === "recent") {
      sorted.sort(
        (a, b) => Date.parse(b.pushedAt ?? "0") - Date.parse(a.pushedAt ?? "0"),
      );
    } else if (sort === "stars") {
      sorted.sort((a, b) => b.stars - a.stars || b.weight - a.weight);
    } else {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    }
    return sorted;
  }, [projects, category, language, sort, query]);

  useGsap(
    ({ reduced }) => {
      revealProjectGrid(gridRef.current, { reduced });
    },
    [],
    gridRef,
  );

  // Re-stage on filter change only — not on mount, where the scroll reveal
  // above already owns the entrance.
  useGsap(
    ({ reduced }) => {
      if (firstRender.current) {
        firstRender.current = false;
        return;
      }
      restageGrid(gridRef.current, { reduced });
    },
    [category, language, sort, query],
    gridRef,
  );

  return (
    <Section
      id="projects"
      index="02"
      eyebrow="Project explorer"
      title="Everything that's public."
      intro={
        <>
          Pulled live from the GitHub REST API and classified automatically.
          New repositories appear here without anyone editing this page.
        </>
      }
    >
      {/* ---------------- controls ---------------- */}
      <div data-anim="up" className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <label htmlFor="project-search" className="sr-only">
              Search projects
            </label>
            <input
              id="project-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search repositories…"
              autoComplete="off"
              className="w-full border border-chalk/10 bg-abyss/60 px-4 py-3 font-mono text-sm text-chalk placeholder:text-dim focus:border-signal/50 focus:outline-none focus-visible:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label
                htmlFor="project-language"
                className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-dim"
              >
                Language
              </label>
              <select
                id="project-language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="border border-chalk/10 bg-abyss/60 px-3 py-2 font-mono text-[0.7rem] text-bone focus:border-signal/50 focus:outline-none"
              >
                <option value="all">All</option>
                {languages.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="project-sort"
                className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-dim"
              >
                Sort
              </label>
              <select
                id="project-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                className="border border-chalk/10 bg-abyss/60 px-3 py-2 font-mono text-[0.7rem] text-bone focus:border-signal/50 focus:outline-none"
              >
                {SORTS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Category chips — a radio group, since exactly one is ever active */}
        <div
          role="radiogroup"
          aria-label="Filter by category"
          className="flex flex-wrap gap-2"
        >
          {FILTERS.map((filter) => {
            const selected = category === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setCategory(filter.id)}
                className={cn(
                  "border px-3.5 py-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] transition-colors",
                  selected
                    ? "border-signal/60 bg-signal/10 text-signal-bright"
                    : "border-chalk/10 text-mute hover:border-chalk/25 hover:text-bone",
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <p
          aria-live="polite"
          className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-dim"
        >
          {visible.length} of {projects.length} repositories
        </p>
      </div>

      {/* ---------------- grid ---------------- */}
      {visible.length > 0 ? (
        <div
          ref={gridRef}
          className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
        >
          {visible.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <p className="mt-12 text-lede text-mute">
          Nothing matches those filters.
        </p>
      )}
    </Section>
  );
}
