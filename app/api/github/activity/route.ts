import { getActivity, toEnvelope } from "@/lib/github";
import { guardRead, handleRouteError, ok } from "@/lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/github/activity — recent public events, newest first.
 * An empty array is a valid answer: it means the account has been quiet.
 */
export async function GET(request: Request) {
  const limited = guardRead(request);
  if (limited) return limited;

  try {
    return ok(toEnvelope(await getActivity()), { sMaxAge: 120, swr: 600 });
  } catch (error) {
    return handleRouteError("github/activity", error);
  }
}
