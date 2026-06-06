"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthService } from "@/app/auth/AuthService";

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      // Reset transient messages before loading so stale errors do not remain after retries/navigation.
      setLoading(true);
      setError(null);
      setStatus(null);

      const result = await AuthService.getCurrentUser();
      if (!result.success) {
        setError(result.message || "Failed to load profile.");
        setLoading(false);

        // If the backend rejects the token, send the user back through authentication.
        if (result.message?.toLowerCase().includes("unauthorized")) {
          router.push("/auth");
        }

        return;
      }

      const user = result.data?.user;
      // Use backend values as the source of truth so the form reflects saved account data.
      setName(user?.name ?? "");
      setEmail(user?.email ?? "");
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);

    // Client validation avoids avoidable API calls and keeps the form state predictable.
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }

    // Keep obviously invalid emails from reaching the backend; server validation still remains authoritative.
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setSaving(true);

    const result = await AuthService.updateUser({ name: name.trim(), email: email.trim() });
    if (!result.success) {
      // Preserve backend validation messages such as duplicate email conflicts.
      setError(result.message || "Unable to update profile.");
      setSaving(false);
      return;
    }

    const user = result.data?.user;
    // Refresh local state from the response because the backend may trim or normalize fields.
    setName(user?.name ?? name);
    setEmail(user?.email ?? email);
    setStatus("Profile updated successfully.");
    setSaving(false);
  }

  function handleLogout() {
    // Clear tokens before navigation so the auth guard does not briefly treat the user as signed in.
    AuthService.logout();
    router.push("/auth");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-sky-300">Account</p>
            <h1 className="mt-2 text-4xl font-semibold text-white">Your profile</h1>
            <p className="mt-2 text-slate-400">Update your personal information or log out of the reservation system.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/reservation"
              className="inline-flex items-center justify-center rounded-3xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
            >
              Back to reservations
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-3xl bg-rose-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-rose-400"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-8 shadow-xl shadow-slate-950/20">
          {error ? (
            <div className="mb-6 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/20">
              {error}
            </div>
          ) : null}

          {status ? (
            <div className="mb-6 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 ring-1 ring-emerald-500/20">
              {status}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300">Name</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Email</label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                placeholder="name@example.com"
              />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-400">Update your registered name and email address.</p>
              <button
                type="submit"
                disabled={saving || loading}
                className="inline-flex items-center justify-center rounded-3xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>

          {loading && (
            <div className="mt-6 rounded-3xl border border-slate-700 bg-slate-900/70 p-6 text-slate-300">
              Loading account details...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
