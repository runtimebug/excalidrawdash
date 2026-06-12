import { clearSessionCookie, getSession, revokeUserSessions } from "@/lib/auth";
import { handle } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST() {
  return handle(async () => {
    // Bump the account's session version so the just-cleared token (and any other
    // outstanding tokens for this account) can no longer be used, even if a copy
    // was captured before logout. Logout therefore signs out every session.
    const session = await getSession();
    if (session) await revokeUserSessions(session.uid);
    clearSessionCookie();
    return { ok: true };
  });
}
