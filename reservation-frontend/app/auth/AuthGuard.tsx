"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isPublicRoute && !isAuthenticatedUser()) {
      router.replace("/auth");
    }
  }, [isPublicRoute, router]);

  // Render nothing until hydration is complete — both server and client agree on null.
  if (!mounted) return null;

  if (isPublicRoute) return children;

  if (!isAuthenticatedUser()) return null;

  return children;
}
