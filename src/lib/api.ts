import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession, type SessionPayload } from "./auth";

/** Thrown by route handlers to short-circuit with a specific status + message. */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Resolve the current user or throw a 401. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new HttpError(401, "Unauthorized");
  }
  return session;
}

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

// Default body cap for ordinary JSON endpoints (auth, folders, board metadata).
const DEFAULT_MAX_JSON_BYTES = 1 * 1024 * 1024;

/**
 * Read and parse a JSON request body, enforcing a hard byte cap on the bytes
 * actually received. `Content-Length` alone cannot be trusted — a chunked
 * request simply omits it — so the early header check is only a fast path and
 * the real limit is applied while streaming. Returns `{}` on a malformed body
 * so callers surface a Zod validation error (same as `req.json().catch(...)`).
 */
export async function readJsonBody(
  req: Request,
  maxBytes: number = DEFAULT_MAX_JSON_BYTES
): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) {
    throw new HttpError(413, "Request body is too large");
  }

  if (!req.body) return {};
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new HttpError(413, "Request body is too large");
    }
    chunks.push(value);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

/**
 * Wrap a route handler so thrown HttpError / ZodError / unknown errors become
 * clean JSON responses instead of 500 stack traces.
 */
export function handle<T>(
  fn: () => Promise<T>
): Promise<NextResponse> {
  return fn()
    .then((data) => NextResponse.json(data))
    .catch((err) => {
      if (err instanceof HttpError) {
        return jsonError(err.status, err.message);
      }
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return jsonError(
          422,
          first ? `${first.path.join(".")}: ${first.message}` : "Invalid input"
        );
      }
      console.error("[api] unhandled error:", err);
      return jsonError(500, "Internal server error");
    });
}
