import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Routes that require an authenticated session.
const PROTECTED_PREFIXES = ["/dashboard", "/board"];
// API routes that require auth (everything under /api except the auth endpoints).
const PROTECTED_API_PREFIX = "/api";
const PUBLIC_API_PREFIXES = ["/api/auth"];

function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isProtectedApi(pathname: string): boolean {
  if (!pathname.startsWith(PROTECTED_API_PREFIX)) return false;
  return !PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  // Authenticated users hitting the auth pages get bounced to the dashboard.
  if (session && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isProtectedApi(pathname) && !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isProtectedPage(pathname) && !session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on app routes + api, skip Next internals and static assets.
  matcher: [
    "/dashboard/:path*",
    "/board/:path*",
    "/login",
    "/register",
    "/api/:path*",
  ],
};
