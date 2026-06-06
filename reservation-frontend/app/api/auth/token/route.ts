import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "reservation_token";
const MAX_AGE = 86400; // 24 h

export async function POST(request: Request) {
  const { token } = await request.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: MAX_AGE,
    path: "/",
  });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  (await cookies()).set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  return NextResponse.json({ success: true });
}
