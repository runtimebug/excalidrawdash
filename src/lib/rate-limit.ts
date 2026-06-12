import "server-only";

import type { NextRequest } from "next/server";

// Lightweight in-memory fixed-window rate limiter.
//
// Scope: a single app instance. State lives in process memory, so it does NOT
// coordinate across multiple replicas — if you run more than one instance behind
// a load balancer, enforce limits at the proxy (or swap this for a shared store
// like Redis). For the default single-container self-host it is exactly enough to
// stop online password guessing and registration floods.
type Bucket = { count: number; resetAt: number };

// Cache on the global so Next.js hot-reload in dev doesn't reset every window.
const globalForRl = globalThis as unknown as {
  __rlBuckets?: Map<string, Bucket>;
};
const buckets = globalForRl.__rlBuckets ?? new Map<string, Bucket>();
globalForRl.__rlBuckets = buckets;

// Opportunistic cap so a flood of unique keys can't grow the map without bound.
const MAX_KEYS = 50_000;

export type RateLimitResult = { ok: boolean; retryAfter: number };

/**
 * Record one hit against `key`. Returns `{ ok: false, retryAfter }` once more than
 * `limit` hits land within `windowMs`. `retryAfter` is seconds until the window
 * resets.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) sweep(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

function sweep(now: number): void {
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
  // If everything is still live, drop the oldest-expiring entries to stay bounded.
  if (buckets.size >= MAX_KEYS) {
    const sorted = [...buckets.entries()].sort(
      (a, b) => a[1].resetAt - b[1].resetAt
    );
    for (let i = 0; i < sorted.length / 2; i++) buckets.delete(sorted[i][0]);
  }
}

/**
 * Best-effort client IP for rate-limit keying. Honors `X-Forwarded-For` /
 * `X-Real-IP` (set these only via a trusted reverse proxy — they are
 * client-spoofable when the app is exposed directly). Falls back to a constant so
 * keys never collapse to `undefined`.
 */
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}
