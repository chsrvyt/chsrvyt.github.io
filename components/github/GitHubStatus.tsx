"use client";

import { useLiveData } from "@/components/github/LiveDataProvider";
import { RelativeTime } from "@/components/ui/RelativeTime";

/**
 * Live connection indicator.
 *
 * Reports the outcome of a real fetch, never a decorative light. Three states,
 * matching `SyncMeta.source`:
 *
 *   build — the page is showing data baked in by the last rebuild, and the
 *           timestamp is the build time. Shown for the first couple of seconds
 *           and to anyone whose browser cannot reach GitHub in time.
 *   live  — the browser re-read api.github.com successfully; the timestamp is
 *           when that happened.
 *   cache — a re-read was attempted and failed. Says so, and keeps the build
 *           timestamp rather than pretending a sync occurred.
 */
export function GitHubStatus() {
  const { meta } = useLiveData();

  const tone = meta.degraded
    ? { dot: "border border-warn bg-transparent", text: "text-warn" }
    : meta.source === "live"
      ? { dot: "bg-signal", text: "text-signal" }
      : { dot: "bg-pulse", text: "text-pulse" };

  const label = meta.degraded
    ? "GitHub temporarily unavailable"
    : meta.source === "live"
      ? "GitHub connected"
      : "Synced at build";

  return (
    <div data-anim="right" className="glass flex flex-col gap-5 p-6" aria-live="polite">
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${tone.dot}`} />
        <span
          className={`font-mono text-[0.66rem] uppercase tracking-[0.18em] ${tone.text}`}
        >
          {label}
        </span>
      </div>

      <dl className="flex flex-col gap-4">
        <div>
          <dt className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-dim">
            Last sync
          </dt>
          <dd className="mt-1 font-mono text-[0.72rem] text-bone">
            <RelativeTime iso={meta.syncedAt} />
          </dd>
        </div>

        <div>
          <dt className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-dim">
            Data source
          </dt>
          <dd className="mt-1 font-mono text-[0.72rem] text-bone">
            {meta.degraded ? "Build-time snapshot" : "GitHub REST API"}
          </dd>
        </div>
      </dl>

      {meta.degraded ? (
        <p className="border-t border-chalk/8 pt-4 font-mono text-[0.6rem] uppercase leading-relaxed tracking-[0.14em] text-warn/80">
          Showing cached data
        </p>
      ) : null}
    </div>
  );
}
