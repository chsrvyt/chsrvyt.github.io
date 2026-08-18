import { getProfile, toEnvelope } from "@/lib/github";
import { guardRead, handleRouteError, ok } from "@/lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/github/profile — normalised public profile for the account. */
export async function GET(request: Request) {
  const limited = guardRead(request);
  if (limited) return limited;

  try {
    return ok(toEnvelope(await getProfile()), { sMaxAge: 900, swr: 3600 });
  } catch (error) {
    return handleRouteError("github/profile", error);
  }
}
