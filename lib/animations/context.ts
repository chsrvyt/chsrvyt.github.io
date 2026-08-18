"use client";

import {
  useEffect,
  useLayoutEffect,
  useState,
  type DependencyList,
  type RefObject,
} from "react";
import { gsap, ScrollTrigger, registerGsap } from "./registry";

/**
 * React lifecycle integration for GSAP.
 *
 * Every animation in this project is created inside a `gsap.context()` scoped
 * to a DOM subtree. On unmount the context is reverted, which kills the
 * tweens, removes the ScrollTriggers it created and restores inline styles.
 * Without this, navigating away leaves orphaned ScrollTriggers that keep
 * firing against detached nodes.
 */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Safe to call during render or on the server. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Reactive reduced-motion preference.
 *
 * Starts `false` so server and client agree on the first paint, then corrects
 * itself in an effect. Animations are gated on the corrected value, and the
 * CSS in globals.css already neutralises motion before JS runs.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    setReduced(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** `useLayoutEffect` in the browser, `useEffect` on the server (no warning). */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface GsapScope {
  gsap: typeof gsap;
  ScrollTrigger: typeof ScrollTrigger;
  /** Scoped selector — only matches inside the ref'd element. */
  q: (selector: string) => HTMLElement[];
  /** True when the visitor asked for reduced motion. */
  reduced: boolean;
  root: HTMLElement;
}

/**
 * Runs `setup` inside a scoped GSAP context.
 *
 * @param setup    Builds the animations. May return its own cleanup function
 *                 for non-GSAP listeners (GSAP's own are reverted for you).
 * @param deps     Re-runs setup when these change. The reduced-motion
 *                 preference is appended automatically.
 * @param scopeRef Element the context is scoped to. Setup is skipped entirely
 *                 until this ref is attached.
 */
export function useGsap(
  setup: (scope: GsapScope) => void | (() => void),
  deps: DependencyList = [],
  scopeRef?: RefObject<HTMLElement | null>,
): void {
  const reduced = useReducedMotion();

  useIsomorphicLayoutEffect(
    () => {
      registerGsap();

      const root = scopeRef?.current ?? null;
      // A scoped hook with no mounted element has nothing to animate yet.
      if (scopeRef && !root) return;

      let cleanup: void | (() => void);

      const ctx = gsap.context((self) => {
        const q = (selector: string): HTMLElement[] =>
          (self.selector?.(selector) ?? []) as HTMLElement[];

        cleanup = setup({
          gsap,
          ScrollTrigger,
          q,
          reduced,
          root: root ?? document.documentElement,
        });
      }, root ?? undefined);

      return () => {
        cleanup?.();
        ctx.revert();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...deps, reduced],
  );
}

/**
 * Marks the document as animation-capable.
 *
 * globals.css only hides `[data-anim]` under `.js-anim`, so a visitor with JS
 * disabled — or one who loads the page before this runs — sees fully rendered
 * content instead of a blank screen.
 */
export function enableAnimatedMode(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add("js-anim");
}
