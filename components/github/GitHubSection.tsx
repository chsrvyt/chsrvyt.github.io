"use client";

import { useRef } from "react";
import { ActivityTimeline } from "@/components/github/ActivityTimeline";
import { GitHubStatus } from "@/components/github/GitHubStatus";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { Section } from "@/components/ui/Section";
import { useGsap } from "@/lib/animations/context";
import { countUp } from "@/lib/animations/scroll";
import { STATUS_LABELS } from "@/lib/github/normalize";
import type {
  GitHubActivity,
  GitHubStats,
  PortfolioProject,
  SyncMeta,
} from "@/lib/github/types";
import { formatYear } from "@/lib/utils/format";

/**
 * The live GitHub dashboard: counters, connection status, current focus and
 * the commit timeline.
 *
 * Composition note — the counters animate by writing `textContent` directly
 * from a GSAP tween rather than through React state. Sixty setState calls a
 * second to display a number would re-render this whole subtree for no reason.
 * The final value is also rendered server-side, so the number is correct in
 * the HTML before any JavaScript runs.
 */
export function GitHubSection({
  stats,
  activity,
  currentFocus,
  meta,
}: {
  stats: GitHubStats | null;
  activity: GitHubActivity[];
  currentFocus: PortfolioProject | null;
  meta: SyncMeta;
}) {
  const statsRef = useRef<HTMLDListElement>(null);

  useGsap(
    ({ reduced, q }) => {
      for (const el of q("[data-count]")) {
        countUp(el, Number(el.dataset.count ?? "0"), { reduced });
      }
    },
    [stats?.publicRepos, stats?.totalStars],
    statsRef,
  );

  return (
    <Section
      id="github"
      index="03"
      eyebrow="Live development activity"
      title="A profile that updates itself."
      intro={
        <>
          Repositories, commits and statistics are read from the GitHub REST API
          server-side, normalised, cached, and revalidated. Nothing on this page
          is hand-maintained.
        </>
      }
      align="wide"
    >
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        {/* ---------------- left: numbers, status, focus ---------------- */}
        <div className="flex flex-col gap-10">
          <dl
            ref={statsRef}
            className="grid grid-cols-2 gap-px border border-chalk/8 bg-chalk/8 sm:grid-cols-2"
          >
            <Stat
              label="Public repos"
              value={stats?.publicRepos ?? 0}
              suffix=""
            />
            <Stat label="Total stars" value={stats?.totalStars ?? 0} />
            <Stat label="Forks" value={stats?.totalForks ?? 0} />
            <Stat label="Followers" value={stats?.followers ?? 0} />
          </dl>

          <GitHubStatus initialMeta={meta} />

          {/* ---------------- currently building ---------------- */}
          <div data-anim="up" className="hairline pt-6">
            <h3 className="eyebrow mb-5 text-bone">Current focus</h3>

            {currentFocus ? (
              <div className="flex flex-col gap-4">
                <a
                  href={currentFocus.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-wipe w-fit text-title font-medium uppercase text-chalk"
                >
                  {currentFocus.title}
                </a>

                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FocusRow
                    label="Last activity"
                    value={<RelativeTime iso={currentFocus.pushedAt} />}
                  />
                  <FocusRow
                    label="Status"
                    /* Derived from pushed_at — see deriveStatus(). A repo that
                       has been quiet for months never reads as ACTIVE. */
                    value={STATUS_LABELS[currentFocus.status]}
                    accent={currentFocus.status === "active"}
                  />
                  <FocusRow
                    label="Language"
                    value={currentFocus.primaryLanguage ?? "—"}
                  />
                  <FocusRow label="Repository" value={currentFocus.fullName} />
                </dl>
              </div>
            ) : (
              <p className="text-mute">
                No repository activity is available from the API right now.
              </p>
            )}
          </div>

          {stats ? (
            <p
              data-anim="fade"
              className="font-mono text-[0.6rem] uppercase leading-relaxed tracking-[0.16em] text-dim"
            >
              On GitHub since {formatYear(stats.memberSince)} ·{" "}
              {stats.portfolioRepos} repositories surfaced here
            </p>
          ) : null}
        </div>

        {/* ---------------- right: activity ---------------- */}
        <div>
          <h3 className="eyebrow mb-8 text-bone">Latest activity</h3>
          <ActivityTimeline activity={activity} />
        </div>
      </div>
    </Section>
  );
}

function Stat({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div data-anim="scale" className="bg-void px-6 py-7">
      <dt className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-dim">
        {label}
      </dt>
      <dd className="mt-3 text-4xl font-medium tabular-nums text-chalk">
        {/* Server renders the real number; GSAP counts up to the same value. */}
        <span data-count={value}>{value}</span>
        {suffix}
      </dd>
    </div>
  );
}

function FocusRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div>
      <dt className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-dim">
        {label}
      </dt>
      <dd
        className={[
          "mt-1 font-mono text-[0.72rem]",
          accent ? "text-signal" : "text-bone",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}
