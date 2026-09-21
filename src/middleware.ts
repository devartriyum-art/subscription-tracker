import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Oturum çerezi yoksa /login'e yollar. Ağır doğrulama (JWT çözme) sayfa
 * tarafında yapılır; middleware yalnızca kapıyı tutar.
 * /api/cron/* uçları oturum yerine CRON_SECRET ile korunur (spec §8).
 */
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/cron"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
