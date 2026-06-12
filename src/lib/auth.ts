import "server-only";

import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSession,
  verifySession,
  type SessionPayload,
} from "./session";

export { SESSION_COOKIE };
export type { SessionPayload };

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Read + verify the current session from the request cookies (server-side).
 *
 * Beyond the JWT signature check, this confirms the account still exists and the
 * token's version still matches the user's current `sessionVersion`. That makes
 * logout (and any future password change) able to invalidate already-issued
 * tokens — a stateless JWT alone cannot be revoked. Edge middleware keeps doing a
 * signature-only check; this DB-backed check is the authoritative gate enforced
 * by every API route and server component.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const payload = await verifySession(token);
  if (!payload) return null;

  const [row] = await db
    .select({ sessionVersion: users.sessionVersion })
    .from(users)
    .where(eq(users.id, payload.uid))
    .limit(1);
  if (!row || row.sessionVersion !== payload.v) return null;

  return payload;
}

/**
 * Invalidate every outstanding session for a user by bumping their
 * `sessionVersion`. Returns the new version so the caller can mint a fresh token
 * that survives (used by logout / "sign out everywhere").
 */
export async function revokeUserSessions(userId: string): Promise<number> {
  const [row] = await db
    .update(users)
    .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, userId))
    .returning({ sessionVersion: users.sessionVersion });
  return row?.sessionVersion ?? 0;
}

/** Persist the session cookie after login/registration. */
export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(): void {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
