"use client";

import { gsap, ScrollTrigger, DUR, EASE } from "./registry";
import { splitText, type SplitHandle } from "./text";

/**
 * Hero choreography — the strongest motion on the site.
 *
 * Order matches the intended reading order, not the DOM order: eyebrow →
 * accent rule → headline (line masks, letters staggered inside each line) →
 * lede → CTAs → status panel → scroll cue. Everything overlaps slightly so it
 * reads as one movement rather than nine separate entrances.
 *
 * Markup contract (set in components/hero/Hero.tsx):
 *   [data-hero="grid"]        background grid layer
 *   [data-hero="glow"]        radial glow layer
 *   [data-hero="eyebrow"]     discipline line
 *   [data-hero="rule"]        horizontal accent rule (scales from the left)
 *   [data-hero="title-line"]  one per headline line, inside a .line-mask
 *   [data-hero="lede"]        supporting paragraph
 *   [data-hero="cta"]         each call-to-action
 *   [data-hero="panel"]       technical status panel
 *   [data-hero="cue"]         scroll cue
 */

export interface HeroOptions {
  reduced: boolean;
  /** Delay before the first tween, letting the preloader clear the viewport. */
  delay?: number;
}

export interface HeroHandle {
  timeline: gsap.core.Timeline;
  cleanup: () => void;
}

const q = (root: HTMLElement, selector: string): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(selector));

export function createHeroTimeline(
  root: HTMLElement,
  { reduced, delay = 0 }: HeroOptions,
): HeroHandle {
  const eyebrow = root.querySelector<HTMLElement>('[data-hero="eyebrow"]');
  const rule = root.querySelector<HTMLElement>('[data-hero="rule"]');
  const titleLines = q(root, '[data-hero="title-line"]');
  const lede = root.querySelector<HTMLElement>('[data-hero="lede"]');
  const ctas = q(root, '[data-hero="cta"]');
  const panel = root.querySelector<HTMLElement>('[data-hero="panel"]');
  const cue = root.querySelector<HTMLElement>('[data-hero="cue"]');
  const glow = root.querySelector<HTMLElement>('[data-hero="glow"]');
  const grid = root.querySelector<HTMLElement>('[data-hero="grid"]');

  const animated = [eyebrow, rule, lede, panel, cue, ...ctas, ...titleLines].filter(
    Boolean,
  ) as HTMLElement[];

  // Reduced motion: everything is placed, nothing moves.
  if (reduced) {
    gsap.set(animated, { opacity: 1, clearProps: "transform" });
    gsap.set(rule, { opacity: 1, scaleX: 1 });
    return { timeline: gsap.timeline(), cleanup: () => {} };
  }

  const splits: SplitHandle[] = [];
  const timeline = gsap.timeline({
    delay,
    defaults: { ease: EASE.out, duration: DUR.base },
  });

  // --- 1. eyebrow ----------------------------------------------------------
  if (eyebrow) {
    timeline.fromTo(
      eyebrow,
      { opacity: 0, y: 14, filter: "blur(6px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: DUR.fast },
      0,
    );
  }

  // --- 2. accent rule expands horizontally ---------------------------------
  if (rule) {
    timeline.fromTo(
      rule,
      { opacity: 1, scaleX: 0, transformOrigin: "left center" },
      { scaleX: 1, duration: DUR.slow, ease: EASE.inOut },
      0.08,
    );
  }

  // --- 3. headline: lines reveal, letters stagger inside each line ----------
  titleLines.forEach((line, index) => {
    const split = splitText(line, "chars");
    splits.push(split);
    gsap.set(line, { opacity: 1 });

    const targets = split.chars.length > 0 ? split.chars : [line];

    timeline.fromTo(
      targets,
      { yPercent: 112, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: DUR.slow,
        ease: EASE.precise,
        // Small enough to read as one movement with texture, not a wave.
        stagger: 0.014,
      },
      0.18 + index * 0.13,
    );
  });

  const afterTitle = 0.18 + Math.max(0, titleLines.length - 1) * 0.13 + 0.42;

  // --- 4. supporting paragraph --------------------------------------------
  if (lede) {
    timeline.fromTo(
      lede,
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: DUR.base },
      afterTitle,
    );
  }

  // --- 5. CTAs enter sequentially -----------------------------------------
  if (ctas.length > 0) {
    timeline.fromTo(
      ctas,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: DUR.fast, stagger: 0.08 },
      afterTitle + 0.12,
    );
  }

  // --- 6. technical status panel slides in ---------------------------------
  if (panel) {
    timeline.fromTo(
      panel,
      { opacity: 0, x: 34, clipPath: "inset(0 0 0 100%)" },
      {
        opacity: 1,
        x: 0,
        clipPath: "inset(0 0 0 0%)",
        duration: DUR.slow,
        ease: EASE.inOut,
      },
      afterTitle - 0.15,
    );
  }

  // --- 7. glow settles -----------------------------------------------------
  if (glow) {
    timeline.fromTo(
      glow,
      { opacity: 0, scale: 0.82 },
      { opacity: 1, scale: 1, duration: DUR.cinematic, ease: EASE.out },
      0,
    );
  }

  // --- 8. scroll cue, last ------------------------------------------------
  if (cue) {
    timeline.fromTo(
      cue,
      { opacity: 0, y: -10 },
      { opacity: 1, y: 0, duration: DUR.fast },
      afterTitle + 0.5,
    );
  }

  // --- 9. background grid drifts continuously ------------------------------
  const drift = grid
    ? gsap.to(grid, {
        backgroundPositionX: "72px",
        backgroundPositionY: "72px",
        duration: 26,
        ease: "none",
        repeat: -1,
      })
    : null;

  return {
    timeline,
    cleanup: () => {
      drift?.kill();
      for (const split of splits) split.revert();
    },
  };
}

/**
 * Mouse parallax across the hero's depth stack.
 *
 * Layers move at different intensities (`data-depth`) so the composition has
 * perceived depth. Movement is capped at a few pixels — this should be felt
 * more than seen.
 *
 * Skipped entirely on touch/coarse pointers and under reduced motion: on a
 * phone there is no cursor to parallax against, and the listener would just
 * burn battery.
 */
export function createHeroParallax(
  root: HTMLElement,
  { reduced }: { reduced: boolean },
): () => void {
  if (reduced) return () => {};
  if (typeof window === "undefined") return () => {};

  const fine = window.matchMedia("(pointer: fine)").matches;
  const wideEnough = window.matchMedia("(min-width: 768px)").matches;
  if (!fine || !wideEnough) return () => {};

  const layers = q(root, "[data-depth]");
  if (layers.length === 0) return () => {};

  // quickTo keeps this to one interpolated setter per axis per layer.
  const setters = layers.map((layer) => {
    const depth = Number(layer.dataset.depth ?? "0.1");
    return {
      depth,
      x: gsap.quickTo(layer, "x", { duration: 0.9, ease: "power3.out" }),
      y: gsap.quickTo(layer, "y", { duration: 0.9, ease: "power3.out" }),
    };
  });

  /** Maximum travel in px for a layer at depth 1.0. */
  const MAX_TRAVEL = 34;

  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;

  const apply = () => {
    frame = 0;
    for (const setter of setters) {
      setter.x(pointerX * MAX_TRAVEL * setter.depth);
      setter.y(pointerY * MAX_TRAVEL * setter.depth);
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    // Normalised to −1…1 from the viewport centre.
    pointerX = (event.clientX / window.innerWidth) * 2 - 1;
    pointerY = (event.clientY / window.innerHeight) * 2 - 1;
    if (!frame) frame = window.requestAnimationFrame(apply);
  };

  const onPointerLeave = () => {
    pointerX = 0;
    pointerY = 0;
    if (!frame) frame = window.requestAnimationFrame(apply);
  };

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerleave", onPointerLeave);

  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    window.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerleave", onPointerLeave);
    gsap.set(layers, { x: 0, y: 0 });
  };
}

/**
 * Scroll-linked hero exit.
 *
 * The composition drifts up and dissolves as the next section arrives, so the
 * hero hands off rather than simply scrolling away.
 */
export function createHeroExit(
  root: HTMLElement,
  { reduced }: { reduced: boolean },
): void {
  if (reduced) return;

  const content = root.querySelector<HTMLElement>('[data-hero="content"]');
  if (!content) return;

  gsap.to(content, {
    yPercent: -12,
    opacity: 0.15,
    filter: "blur(4px)",
    ease: "none",
    scrollTrigger: {
      trigger: root,
      start: "top top",
      end: "bottom top",
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  });

  ScrollTrigger.refresh();
}
