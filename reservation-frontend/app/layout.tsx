import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthGuard from "./auth/AuthGuard";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reservation Auth",
  description: "Login and register for the reservation system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Wrap every route with AuthGuard so protected pages share one route-access rule.
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthGuard>
          <div className="flex min-h-screen flex-col">
            <main className="flex-1">{children}</main>
            <footer className="border-t border-slate-800 bg-slate-950 px-4 py-4 text-center text-sm text-slate-500">
              Developed by ROUANE
            </footer>
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}
