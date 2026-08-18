"use client";

import { gsap, ScrollTrigger, DUR, EASE } from "./registry";

/**
 * Dependency-free text splitting for masked line reveals.
 *
 * Deliberately not GSAP SplitText: this needs exactly three behaviours —
 * wrap words, group them into visual lines, and wrap each line in an
 * overflow-hidden mask — and hand-rolling that keeps the licensing question
 * moot and the bundle smaller.
 *
 * Constraint: the target must contain plain text only. An element with child
 * markup is left untouched and reported as a single line, so a stray <strong>
 * degrades to "no split" rather than to scrambled DOM.
 */

export type SplitMode = "lines" | "words" | "chars";

export interface SplitHandle {
  /** The elements to animate — inner wrappers, one per visual line. */
  lines: HTMLElement[];
  /** Overflow-hidden wrappers. Animating these instead of `lines` clips wrong. */
  masks: HTMLElement[];
  words: HTMLElement[];
  chars: HTMLElement[];
  /** Restores the original markup exactly. */
  revert(): void;
}

const EMPTY: SplitHandle = {
  lines: [],
  masks: [],
  words: [],
  chars: [],
  revert() {},
};

function hasElementChildren(el: HTMLElement): boolean {
  return Array.from(el.childNodes).some((node) => node.nodeType === Node.ELEMENT_NODE);
}

export function splitText(
  el: HTMLElement | null,
  mode: SplitMode = "lines",
): SplitHandle {
  if (!el) return EMPTY;

  const originalHtml = el.innerHTML;
  const originalLabel = el.getAttribute("aria-label");
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();

  if (!text || hasElementChildren(el)) return EMPTY;

  const revert = () => {
    el.innerHTML = originalHtml;
    if (originalLabel === null) el.removeAttribute("aria-label");
    else el.setAttribute("aria-label", originalLabel);
  };

  // --- words ---------------------------------------------------------------
  const words: HTMLElement[] = [];
  const chars: HTMLElement[] = [];
  const fragment = document.createDocumentFragment();

  text.split(" ").forEach((word, index) => {
    if (index > 0) fragment.appendChild(document.createTextNode(" "));

    const wordEl = document.createElement("span");
    wordEl.style.display = "inline-block";
    wordEl.style.willChange = "transform";

    if (mode === "chars") {
      for (const character of Array.from(word)) {
        const charEl = document.createElement("span");
        charEl.style.display = "inline-block";
        charEl.textContent = character;
        wordEl.appendChild(charEl);
        chars.push(charEl);
      }
    } else {
      wordEl.textContent = word;
    }

    fragment.appendChild(wordEl);
    words.push(wordEl);
  });

  el.replaceChildren(fragment);

  /*
   * Per-character spans make screen readers announce text letter by letter.
   * Naming the element and hiding the shrapnel restores normal announcement.
   * Word and line splitting keep words intact, so they need no such fix.
   */
  if (mode === "chars") {
    el.setAttribute("aria-label", text);
    for (const word of words) word.setAttribute("aria-hidden", "true");
  }

  if (mode !== "lines") {
    return { lines: [], masks: [], words, chars, revert };
  }

  // --- lines ---------------------------------------------------------------
  // Words that share an offsetTop occupy the same visual line. Reading it here
  // forces one layout pass; everything after this is DOM writes.
  const groups: HTMLElement[][] = [];
  let lastTop: number | null = null;

  for (const word of words) {
    const top = word.offsetTop;
    if (lastTop === null || Math.abs(top - lastTop) > 1) {
      groups.push([word]);
      lastTop = top;
    } else {
      groups[groups.length - 1]!.push(word);
    }
  }

  const masks: HTMLElement[] = [];
  const lines: HTMLElement[] = [];
  const lineFragment = document.createDocumentFragment();

  for (const group of groups) {
    const mask = document.createElement("span");
    mask.className = "line-mask";

    const inner = document.createElement("span");
    inner.style.display = "block";
    inner.style.willChange = "transform";

    group.forEach((word, index) => {
      if (index > 0) inner.appendChild(document.createTextNode(" "));
      inner.appendChild(word);
    });

    mask.appendChild(inner);
    lineFragment.appendChild(mask);
    masks.push(mask);
    lines.push(inner);
  }

  el.replaceChildren(lineFragment);

  return { lines, masks, words, chars, revert };
}

export interface RevealLinesOptions {
  /** ScrollTrigger element. Omit to play immediately. */
  trigger?: Element | null;
  start?: string;
  stagger?: number;
  delay?: number;
  duration?: number;
  reduced?: boolean;
  /** Called once the timeline is built — used to add it to a parent timeline. */
  onTimeline?: (timeline: gsap.core.Timeline) => void;
}

/**
 * Splits an element into masked lines and reveals them on scroll.
 *
 * Handles the two things that make this fiddly in practice: fonts loading
 * after first paint (which changes where lines break) and viewport resizes
 * (which change it again). Both trigger a re-split.
 *
 * @returns Cleanup that reverts the split and removes listeners. GSAP's own
 *          tweens are killed by the surrounding `gsap.context`.
 */
export function revealLines(
  el: HTMLElement | null,
  options: RevealLinesOptions = {},
): () => void {
  if (!el) return () => {};

  const {
    trigger,
    start = "top 82%",
    stagger = 0.09,
    delay = 0,
    duration = DUR.base,
    reduced = false,
  } = options;

  // Reduced motion: show the text, skip the choreography entirely.
  if (reduced) {
    gsap.set(el, { opacity: 1, clearProps: "transform" });
    return () => {};
  }

  let handle: SplitHandle = EMPTY;
  let timeline: gsap.core.Timeline | null = null;
  let lastWidth = window.innerWidth;
  let disposed = false;

  const build = () => {
    handle.revert();
    handle = splitText(el, "lines");
    if (handle.lines.length === 0) {
      gsap.set(el, { opacity: 1 });
      return;
    }

    gsap.set(el, { opacity: 1 });

    timeline?.kill();
    timeline = gsap.timeline({
      delay,
      paused: Boolean(trigger),
      defaults: { ease: EASE.out },
    });

    timeline.from(handle.lines, {
      yPercent: 108,
      duration,
      stagger,
    });

    if (trigger) {
      // `once` — an editorial reveal replaying on every scroll-by reads cheap.
      const built = timeline;
      ScrollTrigger.create({
        trigger,
        start,
        once: true,
        onEnter: () => built.play(),
      });
    }

    options.onTimeline?.(timeline);
  };

  const onResize = () => {
    if (disposed) return;
    // Vertical-only resizes (mobile URL bar) never change line breaks.
    if (Math.abs(window.innerWidth - lastWidth) < 24) return;
    lastWidth = window.innerWidth;
    build();
  };

  let resizeTimer: number | undefined;
  const debouncedResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(onResize, 180);
  };

  // Line breaks measured before the webfont swaps in are simply wrong.
  const ready = document.fonts?.ready ?? Promise.resolve();
  void ready.then(() => {
    if (!disposed) build();
  });

  window.addEventListener("resize", debouncedResize);

  return () => {
    disposed = true;
    window.clearTimeout(resizeTimer);
    window.removeEventListener("resize", debouncedResize);
    timeline?.kill();
    handle.revert();
  };
}
