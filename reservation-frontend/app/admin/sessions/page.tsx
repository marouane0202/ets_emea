"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useIsAdminUser } from "@/app/auth/AuthHooks";
import { ReservationService, type Session, type SessionPayload } from "@/app/reservation/ReservationService";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const EMPTY = { language: "", date: "", time: "", location: "", numberOfSeats: "" };

export default function AdminSessionsPage() {
  const isAdmin = useIsAdminUser();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => { if (isAdmin) loadSessions(); }, [isAdmin]);

  async function loadSessions() {
    setLoading(true); setError(null); setSuccess(null);
    try { setSessions(await ReservationService.getAdminSessions()); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to load sessions"); }
    finally { setLoading(false); }
  }

  const totalPages = Math.max(1, Math.ceil(sessions.length / pageSize));
  const paged = useMemo(() => sessions.slice((page - 1) * pageSize, page * pageSize), [sessions, page, pageSize]);

  function setField<K extends keyof typeof EMPTY>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function resetForm() { setEditingId(null); setForm(EMPTY); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(null); setSuccess(null); setActionLoading(true);
    const payload: SessionPayload = {
      language: form.language.trim(), date: form.date,
      time: form.time.trim(), location: form.location.trim(),
      numberOfSeats: Number(form.numberOfSeats),
    };
    if (!payload.language || !payload.date || !payload.time || !payload.location || !payload.numberOfSeats) {
      setError("Please fill in all fields."); setActionLoading(false); return;
    }
    try {
      const result = editingId
        ? await ReservationService.updateSession(editingId, payload)
        : await ReservationService.createSession(payload);
      if (!result.success) { setError(result.message); return; }
      setSuccess(result.message); resetForm(); await loadSessions(); setPage(1);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save session"); }
    finally { setActionLoading(false); }
  }

  function handleEdit(session: Session) {
    setEditingId(session.id);
    setForm({ language: session.language, date: session.date, time: session.time, location: session.location, numberOfSeats: String(session.numberOfSeats) });
    setError(null); setSuccess(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this session? All associated reservations will also be removed.")) return;
    setActionLoading(true); setError(null); setSuccess(null);
    try {
      const result = await ReservationService.deleteSession(id);
      if (!result.success) { setError(result.message); return; }
      setSuccess(result.message); await loadSessions(); setPage(1);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to delete session"); }
    finally { setActionLoading(false); }
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>This page is restricted to administrators.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/reservation" className={buttonVariants({ variant: "outline" })}>
              Back to reservations
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Session Management</h1>
        <p className="mt-1 text-sm text-gray-500">Create, edit, and delete training sessions.</p>
      </div>

      {error && <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert variant="success" className="mb-5"><AlertDescription>{success}</AlertDescription></Alert>}

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit session" : "New session"}</CardTitle>
            <CardDescription>Fill in the session details below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { id: "language", label: "Language", placeholder: "English, French..." },
                { id: "time", label: "Time", placeholder: "10:00 AM" },
                { id: "location", label: "Location", placeholder: "Room 101" },
              ].map(({ id, label, placeholder }) => (
                <div key={id} className="space-y-1.5">
                  <Label htmlFor={id}>{label}</Label>
                  <Input
                    id={id}
                    value={form[id as keyof typeof EMPTY]}
                    onChange={(e) => setField(id as keyof typeof EMPTY, e.target.value)}
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="seats">Number of seats</Label>
                <Input id="seats" type="number" min="1" value={form.numberOfSeats} onChange={(e) => setField("numberOfSeats", e.target.value)} placeholder="20" />
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={actionLoading} className="flex-1">
                  {actionLoading ? "Saving..." : editingId ? "Update" : "Create"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sessions</CardTitle>
                <CardDescription className="mt-1">{sessions.length} total</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="px-6 py-12 text-center text-sm text-gray-500">Loading sessions...</p>
            ) : sessions.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-gray-500">No sessions yet. Create one to get started.</p>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Session</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Seats</TableHead>
                        <TableHead>Available</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paged.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium text-gray-900">{s.language}</TableCell>
                          <TableCell>{s.date}</TableCell>
                          <TableCell>{s.time}</TableCell>
                          <TableCell>{s.location}</TableCell>
                          <TableCell>{s.numberOfSeats}</TableCell>
                          <TableCell>
                            <Badge variant={s.availableSpaces === 0 ? "destructive" : "success"}>
                              {s.availableSpaces}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEdit(s)}>Edit</Button>
                              <Button size="sm" variant="destructive" disabled={actionLoading} onClick={() => handleDelete(s.id)}>Delete</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile */}
                <div className="grid gap-3 p-4 md:hidden">
                  {paged.map((s) => (
                    <div key={s.id} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-gray-900">{s.language}</p>
                        <Badge variant={s.availableSpaces === 0 ? "destructive" : "success"}>
                          {s.availableSpaces} open
                        </Badge>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div><dt className="text-gray-500">Date</dt><dd className="font-medium text-gray-900">{s.date}</dd></div>
                        <div><dt className="text-gray-500">Time</dt><dd className="font-medium text-gray-900">{s.time}</dd></div>
                        <div><dt className="text-gray-500">Seats</dt><dd className="font-medium text-gray-900">{s.numberOfSeats}</dd></div>
                        <div className="col-span-2"><dt className="text-gray-500">Location</dt><dd className="font-medium text-gray-900">{s.location}</dd></div>
                      </dl>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(s)}>Edit</Button>
                        <Button size="sm" variant="destructive" className="flex-1" disabled={actionLoading} onClick={() => handleDelete(s.id)}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
                    <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                      <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
