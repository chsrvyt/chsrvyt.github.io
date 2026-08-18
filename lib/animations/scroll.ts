"use client";

import { gsap, ScrollTrigger, DUR, EASE } from "./registry";

/**
 * Scroll choreography shared across sections.
 *
 * The centrepiece is `initGlobalReveals`: one batched ScrollTrigger pass over
 * every `[data-anim]` element on the page. Batching matters — a page with 80
 * reveal targets creates 80 ScrollTriggers if each component rolls its own,
 * and the scroll handler cost shows up immediately on mid-range hardware.
 *
 * It also guarantees no orphans. globals.css hides `[data-anim]` while
 * `.js-anim` is set, so anything the batch misses would stay invisible. One
 * document-wide query means nothing is missed.
 */

type Variant = "up" | "down" | "left" | "right" | "scale" | "fade";

const FROM: Record<Variant, gsap.TweenVars> = {
  up: { y: 34, opacity: 0 },
  down: { y: -28, opacity: 0 },
  left: { x: -44, opacity: 0 },
  right: { x: 44, opacity: 0 },
  scale: { scale: 0.94, opacity: 0 },
  fade: { opacity: 0 },
};

const TO: gsap.TweenVars = {
  x: 0,
  y: 0,
  scale: 1,
  opacity: 1,
  duration: DUR.base,
  ease: EASE.out,
  overwrite: "auto",
};

function variantOf(el: HTMLElement): Variant {
  const raw = el.dataset.anim?.trim();
  return raw && raw in FROM ? (raw as Variant) : "up";
}

/**
 * @param scope Root to search. Defaults to the whole document.
 * @returns Cleanup that kills the ScrollTriggers this call created.
 */
export function initGlobalReveals({
  reduced,
  scope,
}: {
  reduced: boolean;
  scope?: ParentNode;
}): () => void {
  const root = scope ?? document;
  const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-anim]"));
  if (targets.length === 0) return () => {};

  // Reduced motion: reveal in place, create no triggers at all.
  if (reduced) {
    gsap.set(targets, { opacity: 1, clearProps: "transform" });
    return () => {};
  }

  const byVariant = new Map<Variant, HTMLElement[]>();
  for (const el of targets) {
    const variant = variantOf(el);
    const bucket = byVariant.get(variant);
    if (bucket) bucket.push(el);
    else byVariant.set(variant, [el]);
  }

  const created: ScrollTrigger[] = [];

  for (const [variant, elements] of byVariant) {
    gsap.set(elements, FROM[variant]);

    const batched = ScrollTrigger.batch(elements, {
      start: "top 88%",
      once: true,
      onEnter: (batch) => {
        gsap.to(batch, { ...TO, stagger: 0.075 });
      },
    });
    created.push(...batched);
  }

  return () => {
    for (const trigger of created) trigger.kill();
  };
}

/**
 * Scroll-linked parallax for a decorative layer.
 * @param distance Total travel in px across the trigger's full scroll range.
 */
export function createParallax(
  el: HTMLElement | null,
  {
    distance = 90,
    reduced,
    trigger,
  }: { distance?: number; reduced: boolean; trigger?: Element | null },
): void {
  if (!el || reduced) return;

  gsap.fromTo(
    el,
    { yPercent: 0 },
    {
      y: distance,
      ease: "none",
      scrollTrigger: {
        trigger: trigger ?? el,
        start: "top bottom",
        end: "bottom top",
        scrub: 0.8,
        invalidateOnRefresh: true,
      },
    },
  );
}

/** Draws a vertical rule as the section scrolls — used by the activity timeline. */
export function drawLine(
  el: HTMLElement | null,
  { reduced, trigger }: { reduced: boolean; trigger?: Element | null },
): void {
  if (!el) return;

  if (reduced) {
    gsap.set(el, { scaleY: 1, opacity: 1 });
    return;
  }

  gsap.fromTo(
    el,
    { scaleY: 0, transformOrigin: "top center", opacity: 1 },
    {
      scaleY: 1,
      ease: "none",
      scrollTrigger: {
        trigger: trigger ?? el,
        start: "top 78%",
        end: "bottom 65%",
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    },
  );
}

/**
 * Compacts the navigation once the visitor leaves the top of the page.
 *
 * A paused timeline toggled by one ScrollTrigger, rather than a class swap, so
 * the transition is interruptible mid-flight and reverses cleanly.
 */
export function createNavScroll(
  nav: HTMLElement | null,
  { reduced }: { reduced: boolean },
): void {
  if (!nav) return;

  const shell = nav.querySelector<HTMLElement>("[data-nav-shell]");
  const logo = nav.querySelector<HTMLElement>("[data-nav-logo]");
  if (!shell) return;

  if (reduced) {
    ScrollTrigger.create({
      start: "top -60",
      onToggle: ({ isActive }) => {
        shell.dataset.compact = isActive ? "true" : "false";
      },
    });
    return;
  }

  const timeline = gsap
    .timeline({ paused: true, defaults: { duration: DUR.fast, ease: EASE.out } })
    .to(shell, {
      backgroundColor: "rgba(8, 9, 13, 0.82)",
      backdropFilter: "blur(16px) saturate(160%)",
      borderColor: "rgba(242, 244, 246, 0.09)",
      paddingTop: 12,
      paddingBottom: 12,
    })
    .to(logo, { scale: 0.9, transformOrigin: "left center" }, 0);

  ScrollTrigger.create({
    start: "top -60",
    onToggle: ({ isActive }) => {
      shell.dataset.compact = isActive ? "true" : "false";
      if (isActive) timeline.play();
      else timeline.reverse();
    },
  });
}

/**
 * Reports which section is currently in view.
 *
 * @param onChange Receives the index of the active section.
 * @returns Cleanup for the triggers created here.
 */
export function createSectionObserver(
  sections: Array<{ id: string }>,
  onChange: (index: number) => void,
): () => void {
  const created: ScrollTrigger[] = [];

  sections.forEach((section, index) => {
    const el = document.getElementById(section.id);
    if (!el) return;

    created.push(
      ScrollTrigger.create({
        trigger: el,
        start: "top 45%",
        end: "bottom 45%",
        onEnter: () => onChange(index),
        onEnterBack: () => onChange(index),
      }),
    );
  });

  return () => {
    for (const trigger of created) trigger.kill();
  };
}

/**
 * Counts a number up when it scrolls into view.
 * Writes `textContent` directly — no React state churn per frame.
 */
export function countUp(
  el: HTMLElement | null,
  value: number,
  { reduced }: { reduced: boolean },
): void {
  if (!el) return;

  if (reduced || value === 0) {
    el.textContent = String(value);
    return;
  }

  const state = { current: 0 };
  gsap.to(state, {
    current: value,
    duration: 1.4,
    ease: "power2.out",
    scrollTrigger: { trigger: el, start: "top 90%", once: true },
    onUpdate: () => {
      el.textContent = String(Math.round(state.current));
    },
  });
}

/**
 * ScrollTrigger measures positions at creation time. Anything that changes
 * layout afterwards — the preloader clearing, fonts swapping, a filter
 * collapsing a grid — has to tell it to re-measure.
 */
export function refreshScrollTriggers(): void {
  ScrollTrigger.refresh();
}
