"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/app/auth/AuthService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const result = await AuthService.getCurrentUser();
      if (!result.success) {
        setError(result.message || "Failed to load profile.");
        setLoading(false);
        if (result.message?.toLowerCase().includes("unauthorized")) router.push("/auth");
        return;
      }
      setName(result.data?.user?.name ?? "");
      setEmail(result.data?.user?.email ?? "");
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    if (!name.trim() || !email.trim()) { setError("Name and email are required."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError("Please enter a valid email address."); return; }
    setSaving(true);
    const result = await AuthService.updateUser({ name: name.trim(), email: email.trim() });
    if (!result.success) { setError(result.message || "Unable to update profile."); setSaving(false); return; }
    setName(result.data?.user?.name ?? name);
    setEmail(result.data?.user?.email ?? email);
    setStatus("Profile updated successfully.");
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
          <CardDescription>Update your name and email address.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-5">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {status && (
            <Alert variant="success" className="mb-5">
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          )}
          {loading ? (
            <p className="text-sm text-gray-500">Loading account details...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
              <div className="flex items-center justify-between gap-4 pt-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => { AuthService.logout(); router.push("/auth"); }}
                >
                  Sign out
                </Button>
                <Button type="submit" disabled={saving || loading}>
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
