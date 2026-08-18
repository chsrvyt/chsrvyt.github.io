"use client";

import { gsap, DUR, EASE } from "./registry";

/**
 * Load choreography and route transitions.
 *
 * Budget: the boot sequence must never be the reason the site feels slow.
 * `BOOT_BUDGET_MS` is the hard ceiling on perceived loading — real network
 * work continues independently behind it, and the sequence is skipped outright
 * for repeat visits within the session and under reduced motion.
 */

export const BOOT_BUDGET_MS = 1_400;

/** Set once per tab: the boot sequence is an arrival moment, not a toll booth. */
const BOOT_FLAG = "srv:booted";

export function hasBootedThisSession(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(BOOT_FLAG) === "1";
  } catch {
    // Private mode / storage disabled — treat as a first visit.
    return false;
  }
}

export function markBooted(): void {
  try {
    window.sessionStorage.setItem(BOOT_FLAG, "1");
  } catch {
    /* storage unavailable; the sequence simply plays again next time */
  }
}

export interface PreloaderOptions {
  reduced: boolean;
  onComplete: () => void;
}

/**
 * Technical boot sequence, then a wipe to the hero.
 *
 * Markup contract (components/preloader/Preloader.tsx):
 *   [data-boot="line"]   each status line
 *   [data-boot="bar"]    progress bar fill
 *   [data-boot="brand"]  the SRV.DEV wordmark
 *   [data-boot="curtain"] full-bleed panel that wipes away
 */
export function playBootSequence(
  root: HTMLElement | null,
  { reduced, onComplete }: PreloaderOptions,
): () => void {
  if (!root) {
    onComplete();
    return () => {};
  }

  const lines = Array.from(root.querySelectorAll<HTMLElement>('[data-boot="line"]'));
  const bar = root.querySelector<HTMLElement>('[data-boot="bar"]');
  const brand = root.querySelector<HTMLElement>('[data-boot="brand"]');
  const curtain = root.querySelector<HTMLElement>('[data-boot="curtain"]');

  if (reduced) {
    gsap.set(root, { autoAlpha: 0, display: "none" });
    onComplete();
    return () => {};
  }

  // Per-line timing derived from the budget so adding a line can't blow it.
  const lineStep = Math.min(0.16, (BOOT_BUDGET_MS / 1000) * 0.42 / Math.max(1, lines.length));

  const timeline = gsap.timeline({
    defaults: { ease: EASE.out },
    onComplete,
  });

  timeline
    .fromTo(
      brand,
      { opacity: 0, letterSpacing: "0.6em" },
      { opacity: 1, letterSpacing: "0.24em", duration: 0.5 },
      0,
    )
    .fromTo(
      lines,
      { opacity: 0, x: -10 },
      { opacity: 1, x: 0, duration: 0.26, stagger: lineStep },
      0.16,
    );

  if (bar) {
    timeline.fromTo(
      bar,
      { scaleX: 0, transformOrigin: "left center" },
      {
        scaleX: 1,
        duration: (BOOT_BUDGET_MS / 1000) * 0.62,
        ease: "power2.inOut",
      },
      0.12,
    );
  }

  // The wipe: curtain lifts, revealing the hero already mid-animation.
  timeline
    .to(
      [brand, ...lines],
      { opacity: 0, y: -8, duration: 0.3, stagger: 0.015 },
      ">-0.05",
    )
    .to(
      curtain,
      {
        yPercent: -100,
        duration: 0.85,
        ease: "expo.inOut",
      },
      "<0.1",
    )
    .set(root, { display: "none" });

  return () => {
    timeline.kill();
  };
}

/**
 * Route transition: current page wipes out, new page wipes in.
 *
 * Split into two halves so navigation happens while the curtain covers the
 * viewport — no black flash, and the new route's first paint is hidden.
 */
export function playRouteExit(curtain: HTMLElement | null): Promise<void> {
  if (!curtain) return Promise.resolve();

  return new Promise((resolve) => {
    gsap
      .timeline({ onComplete: () => resolve() })
      .set(curtain, { display: "block", yPercent: 100, pointerEvents: "auto" })
      .to(curtain, {
        yPercent: 0,
        duration: 0.42,
        ease: "expo.inOut",
      });
  });
}

export function playRouteEnter(curtain: HTMLElement | null): void {
  if (!curtain) return;

  gsap
    .timeline()
    .to(curtain, {
      yPercent: -100,
      duration: 0.62,
      ease: "expo.inOut",
    })
    .set(curtain, { display: "none", pointerEvents: "none" });
}

/** Content entrance for a freshly mounted route. */
export function playContentEnter(
  root: HTMLElement | null,
  { reduced }: { reduced: boolean },
): void {
  if (!root) return;

  if (reduced) {
    gsap.set(root, { opacity: 1, clearProps: "transform" });
    return;
  }

  gsap.fromTo(
    root,
    { opacity: 0, y: 18 },
    { opacity: 1, y: 0, duration: DUR.base, ease: EASE.out },
  );
}
