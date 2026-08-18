import { getStats, toEnvelope } from "@/lib/github";
import { guardRead, handleRouteError, ok } from "@/lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/github/stats — aggregates derived from the repository list.
 * Every field is a sum or a max over values GitHub returned.
 */
export async function GET(request: Request) {
  const limited = guardRead(request);
  if (limited) return limited;

  try {
    return ok(toEnvelope(await getStats()), { sMaxAge: 300, swr: 900 });
  } catch (error) {
    return handleRouteError("github/stats", error);
  }
}
