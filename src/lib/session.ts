// Edge-safe session helpers (jose only — no Node built-ins, no "server-only").
// Imported by both middleware (edge runtime) and the server-only auth module.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "edash_session";
const ALG = "HS256";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = {
  uid: string;
  email: string;
  name: string | null;
  // Session version at sign time. Compared against the user's current
  // `sessionVersion` server-side (see getSession) so revoked tokens are rejected.
  v: number;
};

// Placeholder values that appear in this repo (.env.example, docker-compose.yml,
// Dockerfile, CI) and are therefore public. Refusing them stops an instance from
// silently signing sessions with a repo-public key (which would let anyone forge
// a valid session for any user). Keep in sync with docker-entrypoint.sh.
const INSECURE_PLACEHOLDERS = new Set([
  "please-change-me-to-a-long-random-secret",
  "change-me-to-a-long-random-string-please",
  // Build-time-only value baked into the Dockerfile and CI workflow. No DB or
  // auth calls happen during build; it must never reach a running server.
  "build-time-placeholder-secret-value-000000",
  // Sample value from early dev setups.
  "dev-secret-please-change-in-production-0000000000",
]);

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set a long random value in your environment."
    );
  }
  if (INSECURE_PLACEHOLDERS.has(secret)) {
    throw new Error(
      "AUTH_SECRET is still set to a placeholder value. Generate a real one, e.g. `openssl rand -base64 32`."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: [ALG],
    });
    if (typeof payload.uid === "string" && typeof payload.email === "string") {
      return {
        uid: payload.uid,
        email: payload.email,
        name: (payload.name as string | null) ?? null,
        v: typeof payload.v === "number" ? payload.v : 0,
      };
    }
    return null;
  } catch {
    return null;
  }
}
