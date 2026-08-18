"use client";

import { gsap, ScrollTrigger, DUR, EASE } from "./registry";

/**
 * Project presentation motion: the sticky case-study scroll and card hover.
 */

export interface StickyShowcaseOptions {
  reduced: boolean;
  /** Called with the active panel index as the scroll crosses each threshold. */
  onChange?: (index: number) => void;
}

/**
 * Sticky case-study showcase.
 *
 * Pinning is left to CSS `position: sticky` rather than ScrollTrigger's `pin`.
 * Pin injects a spacer element and re-measures on every refresh, which fights
 * with a responsive grid; sticky is one line of CSS and never reflows the page.
 * ScrollTrigger is used purely to scrub the crossfade.
 *
 * Markup contract (components/projects/StickyShowcase.tsx):
 *   [data-showcase]           the tall section — height drives the scroll range
 *   [data-showcase-viewport]  the position:sticky, h-screen child
 *   [data-showcase-panel]     one absolutely-positioned panel per project
 *   [data-showcase-progress]  progress bar filled via scaleY
 *
 * @returns Cleanup for the non-GSAP listener; tweens are reverted by context.
 */
export function createStickyShowcase(
  section: HTMLElement | null,
  { reduced, onChange }: StickyShowcaseOptions,
): () => void {
  if (!section) return () => {};

  const panels = Array.from(
    section.querySelectorAll<HTMLElement>("[data-showcase-panel]"),
  );
  const progress = section.querySelector<HTMLElement>("[data-showcase-progress]");

  if (panels.length === 0) return () => {};

  // One project, or reduced motion: show everything, scrub nothing.
  if (reduced || panels.length === 1) {
    gsap.set(panels, { opacity: 1, yPercent: 0, filter: "blur(0px)" });
    gsap.set(progress, { scaleY: 1 });
    section.dataset.showcaseStatic = "true";
    onChange?.(0);
    return () => {};
  }

  gsap.set(panels[0]!, { opacity: 1, yPercent: 0, filter: "blur(0px)" });
  gsap.set(panels.slice(1), { opacity: 0, yPercent: 8, filter: "blur(8px)" });

  const steps = panels.length - 1;
  let lastIndex = -1;

  const timeline = gsap.timeline({
    defaults: { ease: EASE.inOut, duration: 1 },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      // A little scrub smoothing reads as a case-study dissolve rather than a
      // 1:1 scroll-jack.
      scrub: 0.7,
      invalidateOnRefresh: true,
      onUpdate: ({ progress: value }) => {
        const index = Math.min(steps, Math.round(value * steps));
        if (index !== lastIndex) {
          lastIndex = index;
          onChange?.(index);
        }
      },
    },
  });

  panels.forEach((panel, index) => {
    if (index === 0) return;
    const previous = panels[index - 1]!;
    const at = index - 1;

    timeline
      .to(previous, { opacity: 0, yPercent: -8, filter: "blur(8px)" }, at)
      .to(panel, { opacity: 1, yPercent: 0, filter: "blur(0px)" }, at);
  });

  if (progress) {
    gsap.fromTo(
      progress,
      { scaleY: 0, transformOrigin: "top center" },
      {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.7,
        },
      },
    );
  }

  onChange?.(0);
  return () => {};
}

/**
 * Card hover.
 *
 * A single timeline played forward on enter and reversed on leave, plus a
 * pointer-driven tilt. Reversing beats building a second timeline: an
 * interrupted hover resolves from wherever it got to.
 *
 * Tilt maxes out at 3.2° — enough to register as depth, not enough to look
 * like a gaming site.
 */
export function attachProjectCardHover(
  card: HTMLElement | null,
  { reduced }: { reduced: boolean },
): () => void {
  if (!card || reduced) return () => {};

  // Touch devices fire synthetic hover that then sticks. Skip them.
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return () => {};
  }

  const media = card.querySelector<HTMLElement>("[data-card-media]");
  const arrow = card.querySelector<HTMLElement>("[data-card-arrow]");
  const meta = card.querySelector<HTMLElement>("[data-card-meta]");
  const veil = card.querySelector<HTMLElement>("[data-card-veil]");

  const timeline = gsap
    .timeline({ paused: true, defaults: { duration: DUR.fast, ease: EASE.out } })
    .to(card, { borderColor: "rgba(16, 185, 129, 0.42)" }, 0)
    .to(media, { scale: 1.06 }, 0)
    .to(veil, { clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }, 0)
    .to(meta, { y: -4 }, 0)
    .to(arrow, { x: 6, y: -6, opacity: 1 }, 0);

  const MAX_TILT = 3.2;
  const rotateX = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power3.out" });
  const rotateY = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power3.out" });

  const onEnter = () => timeline.play();

  const onMove = (event: PointerEvent) => {
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    rotateY(px * MAX_TILT * 2);
    rotateX(-py * MAX_TILT * 2);
  };

  const onLeave = () => {
    timeline.reverse();
    rotateX(0);
    rotateY(0);
  };

  card.addEventListener("pointerenter", onEnter);
  card.addEventListener("pointermove", onMove);
  card.addEventListener("pointerleave", onLeave);
  // Keyboard users get the same emphasis, without the tilt.
  card.addEventListener("focusin", onEnter);
  card.addEventListener("focusout", onLeave);

  return () => {
    card.removeEventListener("pointerenter", onEnter);
    card.removeEventListener("pointermove", onMove);
    card.removeEventListener("pointerleave", onLeave);
    card.removeEventListener("focusin", onEnter);
    card.removeEventListener("focusout", onLeave);
    timeline.kill();
  };
}

/**
 * Alternating entrance for the explorer grid — cards arrive from the side they
 * sit on, so the grid assembles inward instead of sliding as one block.
 */
export function revealProjectGrid(
  grid: HTMLElement | null,
  { reduced }: { reduced: boolean },
): void {
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll<HTMLElement>("[data-grid-card]"));
  if (cards.length === 0) return;

  if (reduced) {
    gsap.set(cards, { opacity: 1, clearProps: "transform" });
    return;
  }

  ScrollTrigger.batch(cards, {
    start: "top 90%",
    once: true,
    onEnter: (batch) => {
      gsap.fromTo(
        batch,
        {
          opacity: 0,
          y: 40,
          x: (index: number) => (index % 2 === 0 ? -26 : 26),
        },
        {
          opacity: 1,
          y: 0,
          x: 0,
          duration: DUR.base,
          ease: EASE.out,
          stagger: 0.07,
          overwrite: "auto",
        },
      );
    },
  });
}

/**
 * Re-animates the grid after a filter change.
 *
 * The filtered-out cards are already unmounted by React; this just makes the
 * survivors re-enter so the change reads as a deliberate transition.
 */
export function restageGrid(
  grid: HTMLElement | null,
  { reduced }: { reduced: boolean },
): void {
  if (!grid || reduced) return;

  const cards = Array.from(grid.querySelectorAll<HTMLElement>("[data-grid-card]"));
  if (cards.length === 0) return;

  gsap.fromTo(
    cards,
    { opacity: 0, y: 18 },
    {
      opacity: 1,
      y: 0,
      duration: DUR.fast,
      ease: EASE.out,
      stagger: 0.035,
      overwrite: "auto",
      onComplete: () => ScrollTrigger.refresh(),
    },
  );
}
