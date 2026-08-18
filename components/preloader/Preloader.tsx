"use client";

import { useRef } from "react";
import {
  prefersReducedMotion,
  useIsomorphicLayoutEffect,
} from "@/lib/animations/context";
import {
  hasBootedThisSession,
  markBooted,
  playBootSequence,
} from "@/lib/animations/transitions";

const BOOT_LINES = [
  "LOADING IDENTITY",
  "LOADING PROJECT INDEX",
  "CONNECTING GITHUB",
  "INITIALIZING EXPERIENCE",
  "READY",
] as const;

/**
 * Technical boot sequence.
 *
 * Runs once per tab and never blocks the real page: the GitHub fetch happens
 * server-side before this component ever mounts, so the sequence is pure
 * choreography over content that is already there. Repeat navigations within
 * the session skip it entirely — an arrival moment stops being one the third
 * time you see it.
 *
 * `aria-hidden` throughout: a screen-reader user gets the actual page
 * immediately rather than a recital of fake log lines.
 */
export function Preloader({ onDone }: { onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Skip for repeat visits and for anyone who asked for less motion.
    if (hasBootedThisSession() || prefersReducedMotion()) {
      root.style.display = "none";
      onDone();
      return;
    }

    // The curtain covers the viewport; scrolling behind it would desync
    // ScrollTrigger's measurements.
    document.body.style.overflow = "hidden";

    const dispose = playBootSequence(root, {
      reduced: false,
      onComplete: () => {
        document.body.style.overflow = "";
        markBooted();
        onDone();
      },
    });

    return () => {
      document.body.style.overflow = "";
      dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="fixed inset-0 z-[120] flex items-end justify-start"
    >
      <div
        data-boot="curtain"
        className="absolute inset-0 flex flex-col justify-between bg-void px-6 py-8 sm:px-12 sm:py-12"
      >
        <div
          data-boot="brand"
          className="font-mono text-[0.7rem] uppercase tracking-[0.24em] text-signal"
        >
          Initializing SRV.DEV
        </div>

        <div className="flex flex-col gap-6">
          <ul className="flex flex-col gap-1.5">
            {BOOT_LINES.map((line) => (
              <li
                key={line}
                data-boot="line"
                className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-dim"
              >
                <span className="mr-3 text-signal/70">›</span>
                {line}
              </li>
            ))}
          </ul>

          <div className="h-px w-full overflow-hidden bg-slate-line">
            <div data-boot="bar" className="h-full w-full origin-left bg-signal" />
          </div>
        </div>
      </div>
    </div>
  );
}
