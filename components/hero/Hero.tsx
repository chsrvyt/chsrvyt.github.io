"use client";

import { useRef } from "react";
import { profile } from "@/data/profile";
import { useLiveData } from "@/components/github/LiveDataProvider";
import { useBooted } from "@/components/motion/MotionProvider";
import { ActionLink } from "@/components/ui/ActionLink";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { useGsap } from "@/lib/animations/context";
import {
  createHeroExit,
  createHeroParallax,
  createHeroTimeline,
} from "@/lib/animations/hero";


/**
 * Hero — the site's strongest motion moment.
 *
 * All choreography lives in lib/animations/hero.ts; this file supplies markup
 * and the data-attribute contract. The timeline is gated on `useBooted()` so
 * it starts as the preloader curtain lifts rather than playing behind it.
 *
 * The status panel shows live GitHub values or nothing. If the API was
 * unreachable it says so — it never renders a decorative "ONLINE" state that
 * isn't backed by a successful fetch.
 */
export function Hero() {
  const { stats, meta } = useLiveData();
  const rootRef = useRef<HTMLElement>(null);
  const booted = useBooted();

  useGsap(
    ({ reduced }) => {
      const root = rootRef.current;
      if (!root || !booted) return;

      const hero = createHeroTimeline(root, { reduced, delay: 0.05 });
      const disposeParallax = createHeroParallax(root, { reduced });
      createHeroExit(root, { reduced });

      return () => {
        hero.cleanup();
        disposeParallax();
      };
    },
    [booted],
    rootRef,
  );

  const live = !meta.degraded;

  return (
    <section
      ref={rootRef}
      id="top"
      aria-label="Introduction"
      className="relative z-10 flex min-h-[100svh] items-center overflow-hidden pt-28 pb-20 sm:pt-32"
    >
      {/* Depth stack — each layer responds to the pointer at its own intensity */}
      <div
        aria-hidden="true"
        data-hero="grid"
        data-depth="0.16"
        className="grid-field pointer-events-none absolute inset-[-10%] opacity-[0.5]"
      />
      <div
        aria-hidden="true"
        data-hero="glow"
        data-depth="0.3"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[80vh] w-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 blur-[140px]"
        style={{
          background:
            "radial-gradient(circle, rgba(16,185,129,0.16) 0%, rgba(34,211,238,0.07) 45%, transparent 70%)",
        }}
      />

      <div
        data-hero="content"
        className="relative mx-auto grid w-full max-w-[110rem] grid-cols-1 gap-16 px-6 sm:px-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_24rem]"
      >
        {/* ---------------------------------------------------------------- */}
        <div data-depth="0.05" className="flex flex-col">
          <p
            data-hero="eyebrow"
            data-anim-hidden
            className="eyebrow flex items-center gap-3 text-bone"
          >
            {profile.disciplines.map((discipline, index) => (
              <span key={discipline} className="flex items-center gap-3">
                {index > 0 ? (
                  <span aria-hidden="true" className="text-signal">
                    •
                  </span>
                ) : null}
                {discipline}
              </span>
            ))}
          </p>

          <span
            aria-hidden="true"
            data-hero="rule"
            className="mt-6 block h-px w-full max-w-md origin-left bg-gradient-to-r from-signal via-signal/40 to-transparent"
          />

          <h1 className="mt-8 text-display font-medium uppercase text-chalk">
            <span className="line-mask">
              <span data-hero="title-line" data-anim-hidden className="block">
                Sarvesh
              </span>
            </span>
            <span className="line-mask">
              <span data-hero="title-line" data-anim-hidden className="block text-mute">
                Chonde
              </span>
            </span>
          </h1>

          <p
            data-hero="lede"
            data-anim-hidden
            className="mt-10 max-w-lg text-lede text-bone"
          >
            {profile.heroStatement.join(" ")}
          </p>

          <div className="mt-11 flex flex-wrap items-center gap-3">
            <span data-hero="cta" data-anim-hidden className="inline-block">
              <ActionLink href="#work" variant="solid">
                View work
              </ActionLink>
            </span>
            <span data-hero="cta" data-anim-hidden className="inline-block">
              <ActionLink href={profile.links.github} variant="outline" external>
                GitHub
              </ActionLink>
            </span>
            <span data-hero="cta" data-anim-hidden className="inline-block">
              <ActionLink href="#contact" variant="ghost">
                Contact
              </ActionLink>
            </span>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        <aside
          data-hero="panel"
          data-anim-hidden
          data-depth="0.11"
          aria-label="Live profile status"
          className="glass h-fit self-end p-6 lg:self-center"
        >
          <div className="flex items-center justify-between border-b border-chalk/8 pb-4">
            <span className="eyebrow text-bone">Status</span>
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${live ? "bg-signal" : "bg-warn"}`}
              />
              <span
                className={`font-mono text-[0.62rem] uppercase tracking-[0.16em] ${
                  live ? "text-signal" : "text-warn"
                }`}
              >
                {live ? "Connected" : "Cached"}
              </span>
            </span>
          </div>

          <dl className="mt-5 flex flex-col gap-4">
            <PanelRow label="Location" value={profile.location} />
            <PanelRow
              label="Education"
              value={`B.Tech CSE · ${profile.education.end}`}
            />
            <PanelRow
              label="Public repos"
              value={stats ? String(stats.publicRepos) : "—"}
            />
            <PanelRow
              label="Last push"
              value={
                stats?.lastPushAt ? (
                  <RelativeTime iso={stats.lastPushAt} />
                ) : (
                  "—"
                )
              }
            />
          </dl>

          <p className="mt-6 border-t border-chalk/8 pt-4 font-mono text-[0.6rem] uppercase leading-relaxed tracking-[0.14em] text-dim">
            {live
              ? "Data source · GitHub API"
              : "GitHub unreachable · showing cached data"}
          </p>
        </aside>
      </div>

      {/* Scroll cue */}
      <div
        data-hero="cue"
        data-anim-hidden
        aria-hidden="true"
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 sm:flex"
      >
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-dim">
          Scroll
        </span>
        <span className="block h-10 w-px bg-gradient-to-b from-signal/70 to-transparent" />
      </div>
    </section>
  );
}

function PanelRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-dim">
        {label}
      </dt>
      <dd className="text-right font-mono text-[0.72rem] text-bone">{value}</dd>
    </div>
  );
}
