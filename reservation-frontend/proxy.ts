import { NextResponse, type NextRequest } from "next/server";

const authRoute = "/auth";
const tokenCookieName = "reservation_token";

function isTokenValid(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const segment = token.split(".")[1];
    if (!segment) return false;
    const payload = JSON.parse(atob(segment.replace(/-/g, "+").replace(/_/g, "/")));
    // Reject tokens with no expiry or that have already expired.
    return typeof payload.exp === "number" && Date.now() < payload.exp * 1000;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(tokenCookieName)?.value;
  const hasValidToken = isTokenValid(token);

  if (pathname === authRoute || hasValidToken) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = authRoute;
  loginUrl.search = "";

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
