"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { navSections } from "@/data/sections";
import { profile } from "@/data/profile";
import { useReducedMotion } from "@/lib/animations/context";

/**
 * Sticky navigation.
 *
 * The scroll compaction (glass surface, logo scale, border) is driven by GSAP
 * ScrollTrigger from lib/animations/scroll.ts — this component only provides
 * the markup contract (`data-nav`, `data-nav-shell`, `data-nav-logo`).
 *
 * The mobile drawer is Framer Motion rather than GSAP: it is component-local
 * enter/exit tied to React's mount lifecycle, which is precisely the case
 * where AnimatePresence beats a hand-managed timeline. It does not duplicate
 * any GSAP behaviour.
 */
export function Nav() {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  // Escape closes the drawer, and an open drawer must not leave the page
  // scrollable behind it.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const duration = reduced ? 0 : 0.34;

  return (
    <header data-nav className="fixed inset-x-0 top-0 z-[100]">
      <div
        data-nav-shell
        data-compact="false"
        className="border-b border-transparent px-6 py-6 transition-colors sm:px-10"
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-[110rem] items-center justify-between gap-6"
        >
          <a
            href="#top"
            data-nav-logo
            className="font-mono text-sm font-medium tracking-[0.28em] text-chalk"
          >
            SRV
            <span className="sr-only"> — {profile.name}, back to top</span>
          </a>

          <ul className="hidden items-center gap-9 md:flex">
            {navSections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="link-wipe font-mono text-[0.68rem] uppercase tracking-[0.18em] text-mute transition-colors hover:text-chalk"
                >
                  {section.nav}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <a
              href="#contact"
              data-magnetic
              data-magnetic-max="6"
              className="hidden border border-chalk/15 px-5 py-2.5 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-chalk transition-colors hover:border-signal/60 hover:text-signal-bright sm:inline-block"
            >
              <span data-magnetic-label>Contact</span>
            </a>

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              className="flex h-10 w-10 items-center justify-center border border-chalk/12 md:hidden"
            >
              <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
              <span aria-hidden="true" className="relative block h-3 w-4">
                <span
                  className="absolute left-0 block h-px w-full bg-chalk transition-transform duration-300"
                  style={{ top: open ? "6px" : "1px", transform: open ? "rotate(45deg)" : "none" }}
                />
                <span
                  className="absolute left-0 block h-px w-full bg-chalk transition-transform duration-300"
                  style={{ top: open ? "6px" : "11px", transform: open ? "rotate(-45deg)" : "none" }}
                />
              </span>
            </button>
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
            className="glass absolute inset-x-0 top-full border-x-0 px-6 py-8 md:hidden"
          >
            <ul className="flex flex-col gap-5">
              {navSections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    onClick={() => setOpen(false)}
                    className="font-mono text-sm uppercase tracking-[0.18em] text-bone"
                  >
                    {section.nav}
                  </a>
                </li>
              ))}
              <li className="hairline pt-5">
                <a
                  href="#contact"
                  onClick={() => setOpen(false)}
                  className="font-mono text-sm uppercase tracking-[0.18em] text-signal"
                >
                  Contact
                </a>
              </li>
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
