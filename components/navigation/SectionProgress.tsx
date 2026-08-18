"use client";

import { useRef, useState } from "react";
import { sections } from "@/data/sections";
import { useGsap } from "@/lib/animations/context";
import { createSectionObserver } from "@/lib/animations/scroll";
import { pad2 } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * Vertical section rail — "01 02 03 …" pinned to the left edge on large
 * screens.
 *
 * Purely an orientation aid: the numbers are `aria-hidden` because the real
 * navigation already exposes these destinations, and a screen reader has no
 * use for a duplicate list of two-digit labels. It is hidden below `lg`, where
 * there is no room for it and the nav is a drawer anyway.
 */
export function SectionProgress() {
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useGsap(
    () => createSectionObserver([...sections], setActive),
    [],
    rootRef,
  );

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-6 top-1/2 z-[90] hidden -translate-y-1/2 lg:block"
    >
      <ul className="flex flex-col gap-4">
        {sections.map((section, index) => {
          const current = index === active;
          return (
            <li key={section.id} className="flex items-center gap-3">
              <span
                className={cn(
                  "block h-px transition-all duration-500 ease-out",
                  current ? "w-6 bg-signal" : "w-2.5 bg-faint",
                )}
              />
              <span
                className={cn(
                  "font-mono text-[0.6rem] tracking-[0.16em] transition-colors duration-500",
                  current ? "text-signal" : "text-faint",
                )}
              >
                {pad2(index + 1)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
