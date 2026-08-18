"use client";

import { useRef } from "react";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { useGsap } from "@/lib/animations/context";
import { drawLine } from "@/lib/animations/scroll";
import type { GitHubActivity } from "@/lib/github/types";
import { truncate } from "@/lib/utils/format";

/**
 * Live engineering timeline built from real commit data.
 *
 * Every row is a repository with its most recent commits: the headline is the
 * actual commit subject and each link resolves to that exact commit on
 * github.com. Nothing is generated to fill space — an empty feed renders as an
 * empty feed.
 *
 * Motion: the rule draws itself as the section scrolls, nodes pop in sequence,
 * and each row's text follows. All of it is scrubbed off one ScrollTrigger.
 */
export function ActivityTimeline({ activity }: { activity: GitHubActivity[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGsap(
    ({ gsap, reduced, q, root }) => {
      const rule = q("[data-timeline-rule]")[0] ?? null;
      drawLine(rule, { reduced, trigger: root });

      if (reduced) return;

      const nodes = q("[data-timeline-node]");
      const rows = q("[data-timeline-row]");
      if (rows.length === 0) return;

      gsap.set(nodes, { scale: 0, opacity: 0 });

      gsap
        .timeline({
          scrollTrigger: { trigger: root, start: "top 76%", once: true },
        })
        .to(nodes, {
          scale: 1,
          opacity: 1,
          duration: 0.42,
          ease: "back.out(1.6)",
          stagger: 0.09,
        })
        .fromTo(
          rows,
          { opacity: 0, x: 18 },
          { opacity: 1, x: 0, duration: 0.6, ease: "expo.out", stagger: 0.09 },
          0.08,
        );
    },
    [activity.length],
    rootRef,
  );

  if (activity.length === 0) {
    return (
      <div className="hairline pt-6">
        <p className="text-mute">No recent commit activity is available.</p>
        <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-dim">
          Commits are read from the GitHub API on each refresh
        </p>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative pl-8">
      {/* Vertical rule — scaleY is scrubbed by drawLine() */}
      <span
        aria-hidden="true"
        data-timeline-rule
        className="absolute left-[3px] top-2 block h-[calc(100%-1rem)] w-px origin-top bg-gradient-to-b from-signal/60 via-chalk/12 to-transparent"
      />

      <ol className="flex flex-col">
        {activity.map((event) => (
          <li key={event.id} className="relative py-5">
            <span
              aria-hidden="true"
              data-timeline-node
              className="absolute -left-8 top-[1.6rem] block h-[7px] w-[7px] -translate-x-[2px] rounded-full bg-signal"
            />

            <div data-timeline-row className="group">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <a
                  href={event.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-wipe font-mono text-[0.68rem] uppercase tracking-[0.16em] text-chalk"
                >
                  {event.repo}
                </a>
                <RelativeTime
                  iso={event.createdAt}
                  className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-dim"
                />
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mute">
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-bone"
                >
                  {truncate(event.title, 110)}
                </a>
              </p>

              {/* Extra commits in the same push, revealed on hover/focus */}
              {event.commits.length > 1 ? (
                <ul className="mt-2 max-h-0 overflow-hidden opacity-0 transition-all duration-500 ease-out group-hover:max-h-40 group-hover:opacity-100 group-focus-within:max-h-40 group-focus-within:opacity-100">
                  {event.commits.slice(1, 4).map((commit) => (
                    <li key={commit.sha} className="py-0.5">
                      <a
                        href={commit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[0.62rem] text-dim transition-colors hover:text-signal"
                      >
                        <span className="mr-2 text-faint">{commit.shortSha}</span>
                        {truncate(commit.message, 68)}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
