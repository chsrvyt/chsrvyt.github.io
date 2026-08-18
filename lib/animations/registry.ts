"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Single registration point for GSAP and its plugins.
 *
 * Registering more than once is harmless but wasteful, and registering during
 * SSR throws — hence the guard. Every module that needs GSAP imports it from
 * here rather than from "gsap" directly, so the plugin set is guaranteed to be
 * registered before any timeline is built.
 */

let registered = false;

export function registerGsap(): void {
  if (registered || typeof window === "undefined") return;

  gsap.registerPlugin(ScrollTrigger);

  // House motion signature: precise, engineered, no overshoot.
  gsap.defaults({ ease: "expo.out", duration: 1.05 });

  ScrollTrigger.config({
    // Mobile browsers fire resize on every URL-bar collapse; recalculating
    // there causes visible jitter for no benefit.
    ignoreMobileResize: true,
    autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
  });

  registered = true;
}

export { gsap, ScrollTrigger };

/** Motion durations, kept in one place so the site feels internally consistent. */
export const DUR = {
  micro: 0.28,
  fast: 0.5,
  base: 0.85,
  slow: 1.2,
  cinematic: 1.6,
} as const;

export const EASE = {
  out: "expo.out",
  outQuint: "quint.out",
  inOut: "power3.inOut",
  /** For anything that must land without a bounce. */
  precise: "power4.out",
} as const;
