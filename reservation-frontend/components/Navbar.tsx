"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useIsAdminUser } from "@/app/auth/AuthHooks";
import { AuthService } from "@/app/auth/AuthService";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = useIsAdminUser();

  if (pathname === "/auth") return null;

  function handleLogout() {
    AuthService.logout();
    router.push("/auth");
  }

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={cn(
        "text-sm font-medium transition-colors",
        pathname === href || (href !== "/reservation" && pathname.startsWith(href))
          ? "text-gray-900"
          : "text-gray-500 hover:text-gray-900"
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/reservation" className="text-base font-semibold text-gray-900">
            ETS Reservations
          </Link>
          <nav className="hidden items-center gap-6 sm:flex">
            {navLink("/reservation", "Reservations")}
            {isAdmin && navLink("/admin/sessions", "Sessions")}
            {navLink("/profile", "Profile")}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <span className="hidden rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-white sm:inline-flex">
              Admin
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
