"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService, AuthResult, storeAuthToken } from "./AuthService";
import { notifyAuthChanged } from "./AuthHooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Mode = "login" | "register";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => (mode === "login" ? "Welcome back" : "Create account"), [mode]);
  const description = useMemo(
    () =>
      mode === "login"
        ? "Enter your credentials to sign in."
        : "Fill in the form below to get started.",
    [mode]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!email.trim() || !password.trim() || (mode === "register" && !name.trim())) {
      setStatus({ type: "error", message: "Please fill in all required fields." });
      return;
    }

    setLoading(true);

    try {
      const result: AuthResult =
        mode === "login"
          ? await AuthService.login({ email, password })
          : await AuthService.register({ name, email, password });

      if (!result.success) {
        setStatus({ type: "error", message: result.message });
        return;
      }

      if (mode === "login") {
        if (result.token) {
          await storeAuthToken(result.token);
          notifyAuthChanged();
        }
        setStatus({ type: "success", message: "Signed in. Redirecting..." });
        setTimeout(() => router.push("/reservation"), 1000);
      } else {
        setStatus({ type: "success", message: "Account created. You can now sign in." });
        setMode("login");
        setPassword("");
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent>
        {status && (
          <Alert variant={status.type === "success" ? "success" : "destructive"} className="mb-5">
            <AlertDescription>{status.message}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="mt-5 text-center text-sm text-gray-500">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => { setMode("register"); setStatus(null); }}
                className="font-medium text-gray-900 hover:underline"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => { setMode("login"); setStatus(null); }}
                className="font-medium text-gray-900 hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
