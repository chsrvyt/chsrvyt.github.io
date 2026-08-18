"use client";

import { useEffect, useState } from "react";
import { RelativeTime } from "@/components/ui/RelativeTime";
import type { ApiEnvelope, GitHubStats, SyncMeta } from "@/lib/github/types";

/**
 * Live connection indicator.
 *
 * The dot reflects the outcome of an actual fetch, nothing else. Three states:
 *
 *   CONNECTED   the last fetch reached GitHub — `syncedAt` is when
 *   CACHED      GitHub was unreachable, and this says so plainly
 *   CHECKING    a refresh is in flight
 *
 * There is no decorative "online" state. If the API is down the component
 * reports it rather than showing a green light over stale numbers.
 */
export function GitHubStatus({ initialMeta }: { initialMeta: SyncMeta }) {
  const [meta, setMeta] = useState(initialMeta);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const poll = async () => {
      setChecking(true);
      try {
        const response = await fetch("/api/github/stats", {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          // The route answered but could not serve data — that is degraded.
          setMeta((current) => ({
            ...current,
            source: "cache",
            degraded: true,
            reason: `Internal API responded ${response.status}`,
          }));
          return;
        }

        const payload = (await response.json()) as ApiEnvelope<GitHubStats>;
        setMeta(payload.meta);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setMeta((current) => ({
          ...current,
          source: "cache",
          degraded: true,
          reason: "Network request failed",
        }));
      } finally {
        setChecking(false);
      }
    };

    const id = window.setInterval(poll, 90_000);
    return () => {
      controller.abort();
      window.clearInterval(id);
    };
  }, []);

  const connected = !meta.degraded;

  return (
    <div
      data-anim="right"
      className="glass flex flex-col gap-5 p-6"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className={[
            "h-2 w-2 rounded-full",
            checking
              ? "bg-pulse animate-pulse"
              : connected
                ? "bg-signal"
                : "border border-warn bg-transparent",
          ].join(" ")}
        />
        <span
          className={[
            "font-mono text-[0.66rem] uppercase tracking-[0.18em]",
            connected ? "text-signal" : "text-warn",
          ].join(" ")}
        >
          {checking
            ? "Checking GitHub…"
            : connected
              ? "GitHub connected"
              : "GitHub temporarily unavailable"}
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
            {connected ? "GitHub REST API" : "Local cache"}
          </dd>
        </div>
      </dl>

      {!connected ? (
        <p className="border-t border-chalk/8 pt-4 font-mono text-[0.6rem] uppercase leading-relaxed tracking-[0.14em] text-warn/80">
          Showing cached data
        </p>
      ) : null}
    </div>
  );
}
