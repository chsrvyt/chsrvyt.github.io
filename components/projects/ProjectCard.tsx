"use client";

import { useRef } from "react";
import { RepoGlyph } from "@/components/projects/RepoGlyph";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { useGsap } from "@/lib/animations/context";
import { attachProjectCardHover } from "@/lib/animations/projects";
import { STATUS_LABELS } from "@/lib/github/normalize";
import { CATEGORY_LABELS, type PortfolioProject } from "@/lib/github/types";
import { compactNumber } from "@/lib/utils/format";

/**
 * Repository card.
 *
 * Uses the stretched-link pattern: the card itself is a plain <article>, the
 * title is the only anchor covering it, and the "Live" link sits above with a
 * higher stacking context. Nesting one <a> inside another is invalid HTML and
 * breaks keyboard navigation, so the whole surface is clickable without it.
 */
export function ProjectCard({ project }: { project: PortfolioProject }) {
  const cardRef = useRef<HTMLElement>(null);

  useGsap(
    ({ reduced }) => attachProjectCardHover(cardRef.current, { reduced }),
    [project.id],
    cardRef,
  );

  const statusTone =
    project.status === "active"
      ? "text-signal"
      : project.status === "archived"
        ? "text-faint"
        : "text-mute";

  return (
    <article
      ref={cardRef}
      data-grid-card
      className="group relative isolate flex flex-col border border-chalk/8 bg-abyss/40 transition-colors"
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* -------- media -------- */}
      <div className="relative aspect-[2/1] overflow-hidden border-b border-chalk/8 bg-ink">
        {/* Drawn locally rather than fetched — see RepoGlyph for why. */}
        <div data-card-media className="h-full w-full will-change-transform">
          <RepoGlyph
            repo={project.repo}
            language={project.primaryLanguage}
            accent={project.accent}
            className="h-full w-full"
          />
        </div>
        {/* Masked preview veil — wipes open on hover */}
        <div
          data-card-veil
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0"
          style={{
            background:
              "linear-gradient(160deg, rgba(16,185,129,0.14) 0%, transparent 65%)",
            clipPath: "inset(0% 0% 100% 0%)",
          }}
        />
        <span
          data-card-arrow
          aria-hidden="true"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center border border-chalk/15 bg-void/70 opacity-0"
        >
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M2.5 9.5 9.5 2.5M4 2.5h5.5V8" strokeLinecap="square" />
          </svg>
        </span>
      </div>

      {/* -------- body -------- */}
      <div data-card-meta className="flex flex-1 flex-col p-5 will-change-transform">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-base font-medium uppercase tracking-wide text-chalk">
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="after:absolute after:inset-0 after:content-['']"
            >
              {project.title}
              <span className="sr-only"> — open repository on GitHub (new tab)</span>
            </a>
          </h3>
          <span
            className={`shrink-0 font-mono text-[0.58rem] uppercase tracking-[0.14em] ${statusTone}`}
          >
            {STATUS_LABELS[project.status]}
          </span>
        </div>

        <ul className="mt-2.5 flex flex-wrap gap-x-2.5 gap-y-1">
          {project.categories.map((category) => (
            <li
              key={category}
              className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-signal/80"
            >
              {CATEGORY_LABELS[category]}
            </li>
          ))}
        </ul>

        <p className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-mute">
          {project.summary ?? "No description provided on GitHub."}
        </p>

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-chalk/8 pt-4">
          <div className="flex items-center gap-4 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-dim">
            {project.primaryLanguage ? <span>{project.primaryLanguage}</span> : null}
            {project.stars > 0 ? (
              <span>
                <span aria-hidden="true">★ </span>
                {compactNumber(project.stars)}
                <span className="sr-only"> stars</span>
              </span>
            ) : null}
          </div>

          <RelativeTime
            iso={project.pushedAt}
            className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-dim"
          />
        </div>

        {project.homepage ? (
          /* Sits above the stretched link so it stays independently clickable. */
          <a
            href={project.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 mt-4 inline-flex w-fit items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-signal transition-colors hover:text-signal-bright"
          >
            Live demo
            <span aria-hidden="true">↗</span>
            <span className="sr-only"> for {project.title} (opens in a new tab)</span>
          </a>
        ) : null}
      </div>
    </article>
  );
}
