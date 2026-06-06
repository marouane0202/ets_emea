"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthenticatedUser } from "./AuthService";

type AuthGuardProps = {
  children: ReactNode;
};

const publicRoutes = new Set(["/auth"]);

export default function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicRoute = publicRoutes.has(pathname);

  useEffect(() => {
    // Redirect after hydration so browser-only token checks do not run during server rendering.
    if (!isPublicRoute && !isAuthenticatedUser()) {
      router.replace("/auth");
    }
  }, [isPublicRoute, router]);

  if (isPublicRoute) {
    // Public routes should render immediately even when there is no token.
    return children;
  }

  if (typeof window === "undefined" || !isAuthenticatedUser()) {
    // Hide protected content while redirecting, preventing a flash of private UI.
    return null;
  }

  return children;
}
