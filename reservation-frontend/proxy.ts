import { NextResponse, type NextRequest } from "next/server";

const authRoute = "/auth";
const tokenCookieName = "reservation_token";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Middleware cannot access localStorage, so it uses the auth cookie written beside the JWT.
  const hasToken = Boolean(request.cookies.get(tokenCookieName)?.value);

  if (pathname === authRoute || hasToken) {
    // Let authenticated requests and the login page continue without redirect loops.
    return NextResponse.next();
  }

  // Preserve the current origin but strip search params so the auth URL is predictable.
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = authRoute;
  loginUrl.search = "";

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
