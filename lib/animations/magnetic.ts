"use client";

import { gsap } from "./registry";

/**
 * Magnetic pointer attraction for buttons and links.
 *
 * Travel is capped at 8px. Past roughly that, the control stops feeling
 * responsive and starts feeling broken — the cursor and the button visibly
 * disagree about where the click target is.
 *
 * Disabled on coarse pointers (nothing to attract to) and under reduced
 * motion. The element's own position is restored on cleanup, so a magnetic
 * button that unmounts mid-hover doesn't leave a transform behind.
 */

export interface MagneticOptions {
  reduced: boolean;
  /** Maximum travel in px. Spec range is 4–8. */
  max?: number;
  /** How far outside the element the field extends, as a fraction of its size. */
  radius?: number;
}

export function attachMagnetic(
  el: HTMLElement | null,
  { reduced, max = 8, radius = 0.6 }: MagneticOptions,
): () => void {
  if (!el || reduced) return () => {};
  if (typeof window === "undefined") return () => {};
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return () => {};
  }

  const travel = Math.min(max, 8);

  const setX = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
  const setY = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });

  // The inner label trails slightly further — reads as depth, not wobble.
  const label = el.querySelector<HTMLElement>("[data-magnetic-label]");
  const setLabelX = label
    ? gsap.quickTo(label, "x", { duration: 0.6, ease: "power3.out" })
    : null;
  const setLabelY = label
    ? gsap.quickTo(label, "y", { duration: 0.6, ease: "power3.out" })
    : null;

  const onMove = (event: PointerEvent) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Normalise by half-size so the pull scales with the control, not the page.
    const dx = (event.clientX - cx) / (rect.width * (0.5 + radius));
    const dy = (event.clientY - cy) / (rect.height * (0.5 + radius));

    const clampedX = gsap.utils.clamp(-1, 1, dx);
    const clampedY = gsap.utils.clamp(-1, 1, dy);

    setX(clampedX * travel);
    setY(clampedY * travel);
    setLabelX?.(clampedX * travel * 0.35);
    setLabelY?.(clampedY * travel * 0.35);
  };

  const onLeave = () => {
    setX(0);
    setY(0);
    setLabelX?.(0);
    setLabelY?.(0);
  };

  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerleave", onLeave);
  // A magnetic control must not stay displaced once focus moves on.
  el.addEventListener("blur", onLeave);

  return () => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerleave", onLeave);
    el.removeEventListener("blur", onLeave);
    gsap.set(el, { x: 0, y: 0 });
    if (label) gsap.set(label, { x: 0, y: 0 });
  };
}

/**
 * Binds magnetic behaviour to every `[data-magnetic]` element in a subtree.
 * @returns One cleanup that detaches all of them.
 */
export function attachMagneticAll(
  root: ParentNode | null,
  options: MagneticOptions,
): () => void {
  if (!root) return () => {};

  const cleanups = Array.from(
    root.querySelectorAll<HTMLElement>("[data-magnetic]"),
  ).map((el) =>
    attachMagnetic(el, {
      ...options,
      max: Number(el.dataset.magneticMax) || options.max,
    }),
  );

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
