import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { handle, readJsonBody, HttpError } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_PER_IP = 20;
const MAX_PER_EMAIL = 8;

// A valid bcrypt hash (of a throwaway value) to compare against when the email is
// unknown, so we still spend ~the same time hashing and don't leak account
// existence through response timing.
const DUMMY_HASH =
  "$2a$10$1HHb4gkZQzfU1PehPntlkOtyAdAMcPEnur9cDJo6vNEyhQY8Nnsw2";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const ip = clientIp(req);
    if (!rateLimit(`login:ip:${ip}`, MAX_PER_IP, WINDOW_MS).ok) {
      throw new HttpError(429, "Too many attempts. Please try again later.");
    }

    const body = await readJsonBody(req);
    const { email, password } = loginSchema.parse(body);

    // Per-account throttle so one target can't be brute-forced from many IPs.
    if (!rateLimit(`login:email:${email}`, MAX_PER_EMAIL, WINDOW_MS).ok) {
      throw new HttpError(429, "Too many attempts. Please try again later.");
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    // Always run a comparison (against a dummy hash when the user is missing) so
    // timing is the same. Same error whether the email or the password is wrong.
    const ok = await verifyPassword(password, user?.password ?? DUMMY_HASH);
    if (!user || !ok) {
      throw new HttpError(401, "Invalid email or password");
    }

    await setSessionCookie({
      uid: user.id,
      email: user.email,
      name: user.name,
      v: user.sessionVersion,
    });
    return { id: user.id, email: user.email, name: user.name };
  });
}
