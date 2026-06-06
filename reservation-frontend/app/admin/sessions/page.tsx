"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useIsAdminUser } from "@/app/auth/AuthHooks";
import { ReservationService, type Session, type SessionPayload } from "@/app/reservation/ReservationService";

const initialFormState = {
  language: "",
  date: "",
  time: "",
  location: "",
  numberOfSeats: "",
};

export default function AdminSessionsPage() {
  const isAdmin = useIsAdminUser();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [formState, setFormState] = useState(initialFormState);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    // Avoid admin API calls until the auth hook confirms the user has the right role.
    if (!isAdmin) {
      return;
    }

    loadSessions();
  }, [isAdmin]);

  async function loadSessions() {
    // Reloading clears action messages so the session table reflects the latest backend state cleanly.
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await ReservationService.getAdminSessions();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(sessions.length / pageSize));
  const pagedSessions = useMemo(
    // Slice the in-memory admin list because the backend currently returns all sessions at once.
    () => sessions.slice((page - 1) * pageSize, page * pageSize),
    [sessions, page, pageSize]
  );

  function setField<K extends keyof typeof initialFormState>(field: K, value: string) {
    // Update one field at a time while preserving the rest of the form state.
    setFormState((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    // Leaving edit mode should also clear the form so the next submit creates a fresh session.
    setEditingSessionId(null);
    setFormState(initialFormState);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setActionLoading(true);

    const payload: SessionPayload = {
      // Trim text fields before sending them so the backend stores clean schedule data.
      language: formState.language.trim(),
      date: formState.date,
      time: formState.time.trim(),
      location: formState.location.trim(),
      numberOfSeats: Number(formState.numberOfSeats),
    };

    if (!payload.language || !payload.date || !payload.time || !payload.location || !payload.numberOfSeats) {
      // Keep incomplete or invalid sessions out of the API and show one clear form-level message.
      setError("Please fill in all fields and provide a valid seat count.");
      setActionLoading(false);
      return;
    }

    try {
      // Editing and creating share the form, so the presence of editingSessionId decides the mutation.
      const result = editingSessionId
        ? await ReservationService.updateSession(editingSessionId, payload)
        : await ReservationService.createSession(payload);

      if (!result.success) {
        // Backend validation errors, such as invalid dates, should remain visible to the admin.
        setError(result.message);
        return;
      }

      // After a successful mutation, refresh from the backend so availability counts stay accurate.
      setSuccess(result.message);
      resetForm();
      await loadSessions();
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save session");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEdit(session: Session) {
    // Copy the selected row into the form so the admin can adjust values without retyping everything.
    setEditingSessionId(session.id);
    setFormState({
      language: session.language,
      date: session.date,
      time: session.time,
      location: session.location,
      numberOfSeats: String(session.numberOfSeats),
    });
    setSuccess(null);
    setError(null);
  }

  async function handleDelete(sessionId: string) {
    // Ask for confirmation because deleting a session can affect users looking for available bookings.
    if (!window.confirm("Delete this session? This action cannot be undone.")) {
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await ReservationService.deleteSession(sessionId);
      if (!result.success) {
        // Surface backend delete failures, for example if the session was already removed.
        setError(result.message);
        return;
      }

      // Refresh the table after deleting so pagination and totals cannot show stale rows.
      setSuccess(result.message);
      await loadSessions();
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session");
    } finally {
      setActionLoading(false);
    }
  }


  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-700 bg-slate-900/60 p-10 text-center">
            <h1 className="text-4xl font-semibold text-white">Admin Access Required</h1>
            <p className="mt-4 text-slate-400">
              This area is reserved for administrators. Please sign in with an admin account to manage sessions.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/reservation"
                className="inline-flex items-center justify-center rounded-3xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
              >
                Back to Reservations
              </Link>
              <Link
                href="/auth"
                className="inline-flex items-center justify-center rounded-3xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-white">Session Management</h1>
            <p className="mt-2 text-slate-400">Create, edit, and remove sessions for your training program.</p>
          </div>
          <Link
            href="/reservation"
            className="inline-flex items-center justify-center rounded-3xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
          >
            Back to Reservations
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-3xl bg-rose-500/10 p-4 text-rose-300 ring-1 ring-rose-500/20">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-3xl bg-emerald-500/10 p-4 text-emerald-300 ring-1 ring-emerald-500/20">
            {success}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <section className="rounded-3xl border border-slate-700 bg-slate-900/50 p-6 shadow-sm shadow-slate-950/10">
            <h2 className="text-2xl font-semibold text-white">
              {editingSessionId ? "Edit Session" : "Create Session"}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Enter the session details and save them to update the schedule.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Language</label>
                <input
                  value={formState.language}
                  onChange={(event) => setField("language", event.target.value)}
                  className="w-full rounded-3xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                  placeholder="English, French..."
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Date</label>
                <input
                  type="date"
                  value={formState.date}
                  onChange={(event) => setField("date", event.target.value)}
                  className="w-full rounded-3xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Time</label>
                <input
                  value={formState.time}
                  onChange={(event) => setField("time", event.target.value)}
                  className="w-full rounded-3xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                  placeholder="10:00 AM"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Location</label>
                <input
                  value={formState.location}
                  onChange={(event) => setField("location", event.target.value)}
                  className="w-full rounded-3xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                  placeholder="Room 101"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Seats</label>
                <input
                  type="number"
                  min="1"
                  value={formState.numberOfSeats}
                  onChange={(event) => setField("numberOfSeats", event.target.value)}
                  className="w-full rounded-3xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                  placeholder="20"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center justify-center rounded-3xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? "Saving..." : editingSessionId ? "Update Session" : "Create Session"}
                </button>
                {editingSessionId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center justify-center rounded-3xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-3xl border border-slate-700 bg-slate-900/50 p-6 shadow-sm shadow-slate-950/10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">Sessions</h2>
                <p className="mt-2 text-sm text-slate-400">Showing up to 10 sessions per page.</p>
              </div>
              <span className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                {sessions.length} total
              </span>
            </div>

            {loading ? (
              <div className="mt-6 rounded-3xl border border-slate-700 bg-slate-950/50 p-8 text-center text-slate-300">
                Loading sessions...
              </div>
            ) : sessions.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-slate-700 bg-slate-950/50 p-8 text-center text-slate-300">
                No sessions created yet.
              </div>
            ) : (
              <div className="mt-6">
                <div className="hidden rounded-3xl border border-slate-700 bg-slate-950/40 md:block">
                  <table className="w-full table-fixed text-left">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-900">
                        <th className="w-[18%] px-4 py-4 text-sm font-semibold text-slate-300">Session</th>
                        <th className="w-[14%] px-4 py-4 text-sm font-semibold text-slate-300">Date</th>
                        <th className="w-[12%] px-4 py-4 text-sm font-semibold text-slate-300">Time</th>
                        <th className="w-[18%] px-4 py-4 text-sm font-semibold text-slate-300">Location</th>
                        <th className="w-[10%] px-4 py-4 text-sm font-semibold text-slate-300">Seats</th>
                        <th className="w-[12%] px-4 py-4 text-sm font-semibold text-slate-300">Available</th>
                        <th className="w-[16%] px-4 py-4 text-sm font-semibold text-slate-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedSessions.map((session) => (
                        <tr key={session.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                          <td className="break-words px-4 py-4 text-sm text-slate-100">{session.language}</td>
                          <td className="break-words px-4 py-4 text-sm text-slate-100">{session.date}</td>
                          <td className="break-words px-4 py-4 text-sm text-slate-100">{session.time}</td>
                          <td className="break-words px-4 py-4 text-sm text-slate-100">{session.location}</td>
                          <td className="px-4 py-4 text-sm text-slate-100">{session.numberOfSeats}</td>
                          <td className="px-4 py-4 text-sm text-slate-100">
                            <span className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                              {session.availableSpaces}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-100">
                            <div className="grid gap-2 lg:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(session)}
                                className="rounded-3xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(session.id)}
                                disabled={actionLoading}
                                className="rounded-3xl bg-rose-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-4 md:hidden">
                  {pagedSessions.map((session) => (
                    <article
                      key={session.id}
                      className="rounded-3xl border border-slate-700 bg-slate-950/40 p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Session</p>
                          <h3 className="mt-1 break-words text-lg font-semibold text-white">{session.language}</h3>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                          {session.availableSpaces} open
                        </span>
                      </div>

                      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <dt className="text-slate-400">Date</dt>
                          <dd className="mt-1 break-words font-medium text-slate-100">{session.date}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Time</dt>
                          <dd className="mt-1 break-words font-medium text-slate-100">{session.time}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Seats</dt>
                          <dd className="mt-1 font-medium text-slate-100">{session.numberOfSeats}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Available</dt>
                          <dd className="mt-1 font-medium text-slate-100">{session.availableSpaces}</dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-slate-400">Location</dt>
                          <dd className="mt-1 break-words font-medium text-slate-100">{session.location}</dd>
                        </div>
                      </dl>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleEdit(session)}
                          className="rounded-3xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(session.id)}
                          disabled={actionLoading}
                          className="rounded-3xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                    <div className="text-sm text-slate-400">Page {page} of {totalPages}</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={page === 1}
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={page === totalPages}
                        onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                        className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
