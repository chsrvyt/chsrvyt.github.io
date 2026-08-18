"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useRef, useState } from "react";
import { Preloader } from "@/components/preloader/Preloader";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { useGsap } from "@/lib/animations/context";
import { attachMagneticAll } from "@/lib/animations/magnetic";
import {
  createNavScroll,
  initGlobalReveals,
  refreshScrollTriggers,
} from "@/lib/animations/scroll";
import { playContentEnter } from "@/lib/animations/transitions";

/**
 * Owns everything page-wide about motion:
 *
 *   - the boot sequence and the "has it finished" signal other sections wait on
 *   - the single batched reveal pass over every [data-anim] element
 *   - magnetic bindings for every [data-magnetic] control
 *   - the navigation's scroll compaction
 *   - the custom cursor
 *
 * Section components never set any of this up themselves; they only declare
 * their intent through data attributes.
 */

const BootContext = createContext(false);

/**
 * True once the boot sequence has cleared the viewport.
 * Hero and other above-the-fold animations gate on this so they aren't
 * playing behind a curtain.
 */
export function useBooted(): boolean {
  return useContext(BootContext);
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [booted, setBooted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const firstRoute = useRef(true);

  useGsap(
    ({ reduced, root }) => {
      // Wait for the curtain: ScrollTrigger measures element positions at
      // creation time, and those measurements are only valid once the
      // preloader has stopped covering (and locking) the page.
      if (!booted) return;

      /*
       * Re-runs on every route change. This is not optional — globals.css
       * hides [data-anim] under .js-anim, so a newly mounted route whose
       * elements were never handed to the batch would stay at opacity 0.
       */
      const disposeReveals = initGlobalReveals({ reduced });
      const disposeMagnetic = attachMagneticAll(root, { reduced });
      createNavScroll(document.querySelector("[data-nav]"), { reduced });

      /*
       * Route transition. Rather than intercepting navigation to play an exit
       * before the route changes, the incoming content wipes in over the
       * already-painted background. There is no full-bleed curtain and so no
       * black flash, and no navigation is ever blocked waiting on an animation.
       */
      if (!firstRoute.current) {
        playContentEnter(document.getElementById("main"), { reduced });
      }
      firstRoute.current = false;

      // Fonts swap after first paint and shift every subsequent trigger.
      let cancelled = false;
      void (document.fonts?.ready ?? Promise.resolve()).then(() => {
        if (!cancelled) refreshScrollTriggers();
      });

      return () => {
        cancelled = true;
        disposeReveals();
        disposeMagnetic();
      };
    },
    [booted, pathname],
    rootRef,
  );

  return (
    <BootContext.Provider value={booted}>
      <Preloader onDone={() => setBooted(true)} />
      <div ref={rootRef} className="contents">
        {children}
      </div>
      <CustomCursor />
    </BootContext.Provider>
  );
}
