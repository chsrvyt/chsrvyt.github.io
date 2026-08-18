"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useLiveData } from "@/components/github/LiveDataProvider";
import { PreviewImage } from "@/components/projects/PreviewImage";
import { ActionLink } from "@/components/ui/ActionLink";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { useGsap } from "@/lib/animations/context";
import { createStickyShowcase } from "@/lib/animations/projects";
import { CATEGORY_LABELS, type PortfolioProject } from "@/lib/github/types";
import { STATUS_LABELS } from "@/lib/github/normalize";
import { pad2 } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * Flagship projects as a sticky case-study scroll.
 *
 * The section is `panels × 100vh` tall; a `position: sticky` viewport holds
 * the composition still while the page scrolls past it, and GSAP scrubs the
 * crossfade between panels. That is why this reads as a presentation rather
 * than a carousel — the visitor's own scroll is the transport, and there are
 * no next/previous controls to click through.
 *
 * Every field shown is GitHub's: title, description, language, topics, stars,
 * push timestamp and links. `STACK`/`STATUS` are derived, never authored.
 */
export function StickyShowcase() {
  // Flagship set is derived from live data, so promoting a repo in
  // data/featured.ts and pushing it takes effect on the next refresh.
  const { flagship: projects } = useLiveData();
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useGsap(
    ({ reduced }) =>
      createStickyShowcase(sectionRef.current, {
        reduced,
        onChange: setActive,
      }),
    [projects.length],
    sectionRef,
  );

  if (projects.length === 0) {
    return (
      <section id="work" className="relative z-10 mx-auto max-w-7xl px-6 py-32 sm:px-10">
        <p className="eyebrow text-bone">Selected work</p>
        <p className="mt-6 max-w-xl text-lede text-mute">
          No flagship repositories are currently available from the GitHub API.
        </p>
      </section>
    );
  }

  const current = projects[active] ?? projects[0]!;
  const accent = current.accent ?? "#10b981";

  return (
    <section
      ref={sectionRef}
      id="work"
      data-showcase
      aria-label="Selected work"
      className="relative z-10"
      style={{ height: `${projects.length * 100}vh` }}
    >
      <div
        data-showcase-viewport
        className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden"
      >
        {/* Accent wash — transitions with the active project */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-[background] duration-700 ease-out"
          style={{
            background: `radial-gradient(900px 520px at 78% 42%, ${accent}14 0%, transparent 72%)`,
          }}
        />

        <div className="relative mx-auto w-full max-w-[110rem] px-6 sm:px-10">
          {/* -------- header -------- */}
          <div className="hairline flex items-baseline justify-between gap-6 pt-5">
            <div className="flex items-baseline gap-4 sm:gap-6">
              <span className="font-mono text-[0.68rem] tracking-[0.2em] text-signal">
                01
              </span>
              <span className="eyebrow">Selected work</span>
            </div>
            <span className="font-mono text-[0.68rem] tracking-[0.2em] text-dim">
              {pad2(active + 1)} / {pad2(projects.length)}
            </span>
          </div>

          {/* -------- panels -------- */}
          <div className="relative mt-10 min-h-[62vh] sm:mt-14">
            {projects.map((project, index) => (
              <Panel
                key={project.id}
                project={project}
                index={index}
                total={projects.length}
              />
            ))}
          </div>
        </div>

        {/* -------- progress rail -------- */}
        <div
          aria-hidden="true"
          className="absolute right-6 top-1/2 hidden h-40 w-px -translate-y-1/2 bg-chalk/10 lg:block"
        >
          <div
            data-showcase-progress
            className="h-full w-full origin-top"
            style={{ backgroundColor: accent }}
          />
        </div>

        {/* -------- scroll hint -------- */}
        {active < projects.length - 1 ? (
          <p
            aria-hidden="true"
            className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-dim"
          >
            ↓ Scroll
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Panel({
  project,
  index,
  total,
}: {
  project: PortfolioProject;
  index: number;
  total: number;
}) {
  const accent = project.accent ?? "#10b981";

  return (
    <article
      data-showcase-panel
      /*
       * All panels stay in the accessibility tree. They are real, distinct
       * projects, so a screen-reader user gets them as a straightforward list
       * instead of having five of six hidden behind a scroll interaction they
       * cannot perform.
       */
      className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16"
    >
      <div className="flex flex-col">
        <p className="font-mono text-[0.66rem] uppercase tracking-[0.2em] text-dim">
          Project {pad2(index + 1)} of {pad2(total)}
        </p>

        <h3 className="mt-4 text-headline font-medium uppercase leading-[0.95] text-chalk">
          {project.title}
        </h3>

        <ul className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          {project.categories.map((category) => (
            <li
              key={category}
              className="font-mono text-[0.64rem] uppercase tracking-[0.18em]"
              style={{ color: accent }}
            >
              {CATEGORY_LABELS[category]}
            </li>
          ))}
        </ul>

        {project.summary ? (
          <p className="mt-7 max-w-xl text-lede text-bone">{project.summary}</p>
        ) : (
          <p className="mt-7 max-w-xl text-lede text-dim">
            This repository has no description on GitHub yet.
          </p>
        )}

        {/* Derived metadata — all of it from the API */}
        <dl className="mt-9 grid max-w-lg grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
          <Meta label="Language" value={project.primaryLanguage ?? "—"} />
          <Meta label="Status" value={STATUS_LABELS[project.status]} />
          <Meta
            label="Last push"
            value={<RelativeTime iso={project.pushedAt} />}
          />
        </dl>

        {project.topics.length > 0 ? (
          <ul className="mt-7 flex flex-wrap gap-2">
            {project.topics.slice(0, 6).map((topic) => (
              <li
                key={topic}
                className="border border-chalk/10 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-mute"
              >
                {topic}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <ActionLink href={project.url} variant="outline" external>
            Source
          </ActionLink>
          {project.homepage ? (
            <ActionLink href={project.homepage} variant="solid" external>
              Live
            </ActionLink>
          ) : null}
          <Link
            href={`/projects/${project.slug}`}
            className="link-wipe font-mono text-[0.68rem] uppercase tracking-[0.16em] text-mute transition-colors hover:text-chalk"
          >
            Case study
          </Link>
        </div>
      </div>

      {/* -------- visual -------- */}
      <div className="relative hidden lg:block">
        <div
          className="absolute -inset-6 opacity-40 blur-3xl"
          style={{ background: `radial-gradient(circle, ${accent}22, transparent 70%)` }}
        />
        <div className="relative overflow-hidden border border-chalk/10 bg-ink">
          <PreviewImage
            src={project.previewImage}
            alt={`GitHub social preview for ${project.fullName}`}
            repo={project.repo}
            language={project.primaryLanguage}
            accent={project.accent}
            sizes="(max-width: 1024px) 0px, 45vw"
            // The showcase is near the fold; the first panel is worth
            // prioritising, the rest are not.
            priority={index === 0}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(160deg, transparent 40%, ${accent}18 100%)`,
            }}
          />
        </div>
        <p className="mt-3 text-right font-mono text-[0.6rem] uppercase tracking-[0.16em] text-faint">
          {project.fullName}
        </p>
      </div>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-dim">
        {label}
      </dt>
      <dd className={cn("mt-1.5 font-mono text-[0.74rem] text-bone")}>{value}</dd>
    </div>
  );
}
