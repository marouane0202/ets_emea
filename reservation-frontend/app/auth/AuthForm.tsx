"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService, AuthResult, storeAuthToken } from "./AuthService";
import { notifyAuthChanged } from "./AuthHooks";

type Mode = "login" | "register";

type Status = {
  type: "success" | "error";
  message: string;
};

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);

  const title = useMemo(
    () => (mode === "login" ? "Welcome back" : "Create your account"),
    [mode]
  );

  const description = useMemo(
    () =>
      mode === "login"
        ? "Sign in with your email and password to continue."
        : "Register a new account and start reserving sessions today.",
    [mode]
  );

  const submitLabel = mode === "login" ? "Sign in" : "Create account";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    // Validate on the client first so users get immediate feedback before a network call.
    if (!email.trim() || !password.trim() || (mode === "register" && !name.trim())) {
      setStatus({ type: "error", message: "Please fill in all required fields." });
      return;
    }

    setLoading(true);

    try {
      // The same form switches between login and registration, so select the service by mode.
      const result: AuthResult =
        mode === "login"
          ? await AuthService.login({ email, password })
          : await AuthService.register({ name, email, password });

      if (!result.success) {
        setStatus({ type: "error", message: result.message });
        return;
      }

      if (mode === "login") {
        // Store the JWT before navigating so protected routes can load immediately after redirect.
        if (result.token) {
          storeAuthToken(result.token);
          notifyAuthChanged();
        }
        setStatus({ type: "success", message: "Successfully signed in. Redirecting..." });
        // Keep the success message visible briefly so the user sees that the login worked.
        setTimeout(() => {
          router.push("/reservation");
        }, 1500);
      } else {
        // After registration, return to login because the backend does not issue a token on register.
        setStatus({ type: "success", message: "Registration completed. You can now sign in." });
        setMode("login");
        setPassword("");
      }
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "An unexpected error occurred."
       });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-sky-300">Authentication</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
        </div>
        <div className="inline-flex rounded-full border border-slate-700 bg-slate-950/80 p-1 text-xs text-slate-300">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setStatus(null);
            }}
            className={`rounded-full px-4 py-2 transition ${
              mode === "login"
                ? "bg-slate-100 text-slate-950"
                : "text-slate-300 hover:bg-white/5"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setStatus(null);
            }}
            className={`rounded-full px-4 py-2 transition ${
              mode === "register"
                ? "bg-slate-100 text-slate-950"
                : "text-slate-300 hover:bg-white/5"
            }`}
          >
            Register
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl bg-slate-950/80 p-6 shadow-inner shadow-slate-950/30 sm:p-8"
      >
        {status ? (
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-medium ${
              status.type === "success"
                ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20"
                : "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20"
            }`}
          >
            {status.message}
          </div>
        ) : null}

        {mode === "register" ? (
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your full name"
              className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="text-sm font-medium text-slate-300">Email address</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="name@example.com"
            className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-300">Password</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="••••••••"
            className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
          />
        </label>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-400">
            {mode === "login"
              ? "Enter your credentials to sign in."
              : "Use a strong password for your new account."}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-3xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Please wait..." : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
