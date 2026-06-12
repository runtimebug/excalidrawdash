import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { handle, readJsonBody, HttpError } from "@/lib/api";
import { registerSchema } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_IP = 10;

export async function POST(req: NextRequest) {
  return handle(async () => {
    if (process.env.DISABLE_REGISTRATION === "true") {
      throw new HttpError(403, "Self-registration is disabled on this instance");
    }

    // Throttle per IP so registration can't be used to mass-create accounts or to
    // probe which emails already exist (the 409 below otherwise reveals that).
    const ip = clientIp(req);
    if (!rateLimit(`register:ip:${ip}`, MAX_PER_IP, WINDOW_MS).ok) {
      throw new HttpError(429, "Too many attempts. Please try again later.");
    }

    const body = await readJsonBody(req);
    const { email, name, password } = registerSchema.parse(body);

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing) {
      throw new HttpError(409, "An account with this email already exists");
    }

    let user;
    try {
      [user] = await db
        .insert(users)
        .values({
          email,
          name: name && name.length > 0 ? name : null,
          password: await hashPassword(password),
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          sessionVersion: users.sessionVersion,
        });
    } catch (err) {
      // Two concurrent registrations can both pass the SELECT above; the email
      // unique constraint then rejects the loser. Same 409 as the common path.
      if (isUniqueViolation(err)) {
        throw new HttpError(409, "An account with this email already exists");
      }
      throw err;
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

/** Postgres unique-violation (SQLSTATE 23505), wherever it sits in the cause chain. */
function isUniqueViolation(err: unknown): boolean {
  let cur: unknown = err;
  while (cur instanceof Error) {
    if ((cur as Error & { code?: unknown }).code === "23505") return true;
    cur = cur.cause;
  }
  return false;
}
