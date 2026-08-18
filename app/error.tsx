"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary.
 *
 * Shows a fixed message and a retry affordance. `error.message` is
 * deliberately not rendered: in production Next replaces it with a digest, and
 * in development it can carry internal paths — neither belongs on screen for a
 * visitor. The real error goes to the console for whoever is debugging.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  return (
    <div className="relative z-10 mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col justify-center px-6 py-32 sm:px-10">
      <p className="eyebrow text-warn">Error</p>
      <h1 className="mt-6 text-headline font-medium uppercase text-chalk">
        Something broke
      </h1>
      <p className="mt-6 max-w-lg text-lede text-mute">
        This section failed to render. It is most likely a temporary problem
        reaching the GitHub API.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="border border-signal bg-signal px-6 py-3.5 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-void transition-colors hover:bg-signal-bright"
        >
          Try again
        </button>
        <a
          href="/"
          className="link-wipe font-mono text-[0.68rem] uppercase tracking-[0.18em] text-mute"
        >
          Back to the portfolio
        </a>
      </div>

      {error.digest ? (
        <p className="mt-10 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-faint">
          Reference {error.digest}
        </p>
      ) : null}
    </div>
  );
}
