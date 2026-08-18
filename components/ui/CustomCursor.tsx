"use client";

import { useRef } from "react";
import { useGsap } from "@/lib/animations/context";

/**
 * Two-part cursor: a hard centre dot that tracks exactly, and a soft ring that
 * lags slightly and expands over interactive targets.
 *
 * Desktop-only by design. It is never rendered for coarse pointers, and the
 * native cursor is only hidden once this one is confirmed to be running — so a
 * touch user, a keyboard user, or anyone with reduced motion enabled keeps the
 * normal system cursor rather than losing all pointer feedback.
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useGsap(({ gsap, reduced }) => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!fine || reduced) return;

    // Only now is it safe to take the native cursor away.
    document.documentElement.classList.add("has-custom-cursor");
    gsap.set([dot, ring], { autoAlpha: 0, xPercent: -50, yPercent: -50 });

    const dotX = gsap.quickTo(dot, "x", { duration: 0.08, ease: "none" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.08, ease: "none" });
    const ringX = gsap.quickTo(ring, "x", { duration: 0.42, ease: "power3.out" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.42, ease: "power3.out" });

    let visible = false;

    const onMove = (event: PointerEvent) => {
      if (!visible) {
        visible = true;
        gsap.to([dot, ring], { autoAlpha: 1, duration: 0.25 });
      }
      dotX(event.clientX);
      dotY(event.clientY);
      ringX(event.clientX);
      ringY(event.clientY);
    };

    const INTERACTIVE =
      'a, button, [role="button"], input, textarea, select, summary, [data-cursor-target]';

    const onOver = (event: PointerEvent) => {
      const target = (event.target as Element | null)?.closest?.(INTERACTIVE);
      if (!target) return;
      gsap.to(ring, {
        scale: 2.1,
        borderColor: "rgba(16,185,129,0.85)",
        backgroundColor: "rgba(16,185,129,0.06)",
        duration: 0.35,
        ease: "expo.out",
      });
      gsap.to(dot, { scale: 0.4, duration: 0.35, ease: "expo.out" });
    };

    const onOut = (event: PointerEvent) => {
      const target = (event.target as Element | null)?.closest?.(INTERACTIVE);
      if (!target) return;
      gsap.to(ring, {
        scale: 1,
        borderColor: "rgba(242,244,246,0.35)",
        backgroundColor: "transparent",
        duration: 0.35,
        ease: "expo.out",
      });
      gsap.to(dot, { scale: 1, duration: 0.35, ease: "expo.out" });
    };

    const onLeave = () => {
      visible = false;
      gsap.to([dot, ring], { autoAlpha: 0, duration: 0.2 });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("pointerleave", onLeave);

    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[150] hidden md:block">
      <div
        ref={ringRef}
        className="fixed left-0 top-0 h-8 w-8 rounded-full border border-chalk/35"
        style={{ willChange: "transform" }}
      />
      <div
        ref={dotRef}
        className="fixed left-0 top-0 h-1.5 w-1.5 rounded-full bg-signal"
        style={{ willChange: "transform" }}
      />
    </div>
  );
}
