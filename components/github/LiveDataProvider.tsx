"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchLiveSnapshot } from "@/lib/github/browser";
import { selectCurrentFocus, selectFlagship } from "@/lib/github/aggregate";
import type {
  GitHubStats,
  PortfolioProject,
  SyncMeta,
} from "@/lib/github/types";

/**
 * Single owner of "what GitHub currently says".
 *
 * Seeded with the data baked in at build time, so the very first paint — and
 * anything a crawler sees — is real content, not a spinner. Shortly after
 * hydration it re-reads GitHub once and then on a slow interval, so a repo
 * created since the last rebuild still appears.
 *
 * Every consumer reads from here rather than fetching for itself. That is the
 * whole point: three components polling independently would triple the request
 * cost against a per-visitor rate limit, and could show three different
 * answers at once.
 */

interface LiveData {
  projects: PortfolioProject[];
  flagship: PortfolioProject[];
  currentFocus: PortfolioProject | null;
  stats: GitHubStats | null;
  meta: SyncMeta;
}

const LiveDataContext = createContext<LiveData | null>(null);

export function useLiveData(): LiveData {
  const value = useContext(LiveDataContext);
  if (!value) {
    throw new Error("useLiveData must be used inside <LiveDataProvider>");
  }
  return value;
}

/** Wait for the intro to settle before competing for the main thread. */
const FIRST_REFRESH_DELAY_MS = 1_800;

/** 4 refreshes/hour × 2 requests = 8, against a 60/hour per-IP ceiling. */
const REFRESH_INTERVAL_MS = 15 * 60_000;

export function LiveDataProvider({
  initialProjects,
  initialStats,
  builtAt,
  children,
}: {
  initialProjects: PortfolioProject[];
  initialStats: GitHubStats | null;
  /** ISO timestamp of the build that produced `initialProjects`. */
  builtAt: string;
  children: React.ReactNode;
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [stats, setStats] = useState(initialStats);
  const [meta, setMeta] = useState<SyncMeta>({
    source: "build",
    syncedAt: builtAt,
    degraded: false,
  });

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const refresh = async () => {
      try {
        const snapshot = await fetchLiveSnapshot(controller.signal);
        if (cancelled) return;

        setProjects(snapshot.projects);
        setStats(snapshot.stats);
        setMeta({
          source: "live",
          syncedAt: snapshot.fetchedAt,
          degraded: false,
        });
      } catch (error) {
        if (cancelled || (error as Error)?.name === "AbortError") return;

        /*
         * Rate-limited, offline, or GitHub is down. The build-time data on
         * screen is still real data — it is just older than we would like — so
         * keep it and say so. `syncedAt` intentionally stays at the build
         * timestamp: claiming a sync that did not happen is the one thing this
         * component must never do.
         */
        setMeta({
          source: "cache",
          syncedAt: builtAt,
          degraded: true,
          reason: (error as Error)?.message ?? "GitHub unreachable",
        });
      }
    };

    const initial = window.setTimeout(refresh, FIRST_REFRESH_DELAY_MS);
    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [builtAt]);

  const value = useMemo<LiveData>(
    () => ({
      projects,
      flagship: selectFlagship(projects),
      currentFocus: selectCurrentFocus(projects),
      stats,
      meta,
    }),
    [projects, stats, meta],
  );

  return (
    <LiveDataContext.Provider value={value}>{children}</LiveDataContext.Provider>
  );
}
