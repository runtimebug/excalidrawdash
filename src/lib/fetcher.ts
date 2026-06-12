"use client";

// Thin fetch wrapper for the JSON API. Throws an Error with the server message
// on non-2xx so callers can surface it directly.
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    const message =
      (payload as { error?: string } | null)?.error ??
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  return payload as T;
}
