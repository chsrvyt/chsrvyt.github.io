"use client";

import { useEffect, useState } from "react";
import { formatDate, formatDateTime, relativeTime } from "@/lib/utils/format";

/**
 * "2 hours ago", without a hydration mismatch.
 *
 * The server has no idea what time it is on the client, so relative strings
 * computed during render are a guaranteed mismatch near any unit boundary.
 * This renders a deterministic UTC date on the server and swaps to the
 * relative form in an effect, then keeps it current on a slow interval.
 *
 * The underlying <time> always carries the machine-readable ISO value, and the
 * exact UTC timestamp stays available in the tooltip.
 */
export function RelativeTime({
  iso,
  className,
  /** How often to recompute, in ms. Minute-level is plenty. */
  intervalMs = 60_000,
}: {
  iso: string | null | undefined;
  className?: string;
  intervalMs?: number;
}) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!iso) return;

    const update = () => setLabel(relativeTime(iso));
    update();

    const id = window.setInterval(update, intervalMs);
    return () => window.clearInterval(id);
  }, [iso, intervalMs]);

  if (!iso) {
    return <span className={className}>—</span>;
  }

  return (
    <time dateTime={iso} title={formatDateTime(iso)} className={className}>
      {label ?? formatDate(iso)}
    </time>
  );
}
