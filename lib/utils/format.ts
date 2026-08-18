/**
 * Formatting helpers.
 *
 * Everything here is deterministic across server and client: dates are
 * formatted in UTC with an explicit locale, so a server-rendered string and
 * the first client render are always byte-identical. Locale-dependent output
 * would produce hydration mismatches.
 */

const UTC_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const UTC_DATETIME = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  hour12: false,
});

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return UTC_DATE.format(date).toUpperCase();
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${UTC_DATETIME.format(date)} UTC`;
}

export function formatYear(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return String(date.getUTCFullYear());
}

const UNITS: Array<[limitSeconds: number, divisor: number, unit: string]> = [
  [60, 1, "second"],
  [3600, 60, "minute"],
  [86_400, 3600, "hour"],
  [604_800, 86_400, "day"],
  [2_629_800, 604_800, "week"],
  [31_557_600, 2_629_800, "month"],
  [Number.POSITIVE_INFINITY, 31_557_600, "year"],
];

/**
 * "2 hours ago" / "just now".
 *
 * Only ever called inside `useEffect` (see components/ui/RelativeTime.tsx), so
 * it cannot desynchronise a hydration pass.
 */
export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "—";

  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 10) return "just now";

  for (const [limit, divisor, unit] of UNITS) {
    if (seconds < limit) {
      const value = Math.floor(seconds / divisor);
      return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
    }
  }
  return "—";
}

/** 1234 → "1.2k". Used for star/fork counts. */
export function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) < 1000) return String(value);
  const thousands = value / 1000;
  return `${thousands.toFixed(thousands < 10 ? 1 : 0)}k`;
}

/** Zero-padded index for the editorial "01 / 02 / 03" numbering. */
export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Truncates on a word boundary. Commit subjects can be arbitrarily long and
 * would otherwise blow out the timeline layout.
 */
export function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  const cut = input.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
