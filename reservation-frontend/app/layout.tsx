import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthGuard from "./auth/AuthGuard";
import Navbar from "@/components/Navbar";
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
  title: "ETS Reservation System",
  description: "Book and manage your training sessions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-gray-50 antialiased">
        <AuthGuard>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-400">
            Developed by ROUANE
          </footer>
        </AuthGuard>
      </body>
    </html>
  );
}
