import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const PUBLIC_PAGES = ["/sign-in", "/sign-up"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    // CSRF guard: browsers always send Origin on cross-site POST/PUT/PATCH/DELETE
    // (including "simple" text/plain requests that skip CORS preflight), so any
    // mutating API call whose Origin doesn't match our host is rejected.
    // Requests without Origin (curl, server-to-server) can't carry a victim's cookies.
    // Auth itself is enforced per route by withUser().
    // Personal API keys (Authorization: Bearer mwb_…) aren't ambient credentials, so they need no
    // CSRF guard; withUser() ignores the cookie on such requests. Browsers can't add this header
    // cross-site without a CORS preflight, which we never approve.
    if (SAFE_METHODS.has(request.method) || /^Bearer\s+mwb_/i.test(request.headers.get("authorization") ?? "")) {
      return NextResponse.next();
    }
    const origin = request.headers.get("origin");
    if (origin) {
      const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
      let originHost: string | null = null;
      try {
        originHost = new URL(origin).host;
      } catch {}
      if (originHost !== host) {
        return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
      }
    }
    return NextResponse.next();
  }

  // Pages: optimistic cookie check only (fast, no DB); real checks happen in route handlers.
  const isPublic = PUBLIC_PAGES.includes(pathname) || pathname.startsWith("/share/");
  if (!isPublic && !getSessionCookie(request)) {
    const url = new URL("/sign-in", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static files (anything with an extension).
  matcher: ["/((?!_next/|.*\\.[\\w]+$).*)"],
};
