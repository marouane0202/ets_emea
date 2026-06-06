"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdminUser } from "@/app/auth/AuthService";
import { ReservationService, type Session } from "../ReservationService";

export default function BookSessionPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingLoadingId, setBookingLoadingId] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    async function loadSessions() {
      // Determine role first because admins should not see the normal booking list.
      setLoading(true);
      setError(null);

      try {
        const admin = isAdminUser();
        setIsAdmin(admin);

        if (!admin) {
          // Regular users only need sessions with open seats, which the backend filters for them.
          const data = await ReservationService.getAvailableSessions();
          setSessions(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sessions");
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, []);

  async function handleBookSession(sessionId: string) {
    // Keep the UI aligned with backend rules by blocking admin booking before the request.
    if (isAdmin) {
      setBookingError("Admin users cannot book sessions.");
      return;
    }

    setBookingLoadingId(sessionId);
    setBookingError(null);

    try {
      const result = await ReservationService.bookSession(sessionId);

      if (!result.success) {
        // Surface capacity or duplicate-booking messages directly beside the session list.
        setBookingError(result.message);
        return;
      }

      // Store the booked ID to show confirmation and then return to the reservation list.
      setBookingId(result.reservationId || sessionId);
      setTimeout(() => {
        router.push("/reservation");
      }, 2000);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Failed to book session");
    } finally {
      setBookingLoadingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-white">Available Sessions</h1>
            <p className="mt-2 text-slate-400">
              {isAdmin
                ? "Viewing all sessions, including those already reserved by other users. Book if seats remain."
                : "Choose a session to book."}
            </p>
          </div>
          <Link
            href="/reservation"
            className="inline-flex items-center justify-center rounded-3xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            Back to My Reservations
          </Link>
        </div>

        {bookingId && (
          <div className="mb-6 rounded-3xl bg-emerald-500/10 p-4 text-emerald-300 ring-1 ring-emerald-500/20">
            ✓ Session booked successfully! Redirecting to your reservations...
          </div>
        )}

        {bookingError && (
          <div className="mb-6 rounded-3xl bg-rose-500/10 p-4 text-rose-300 ring-1 ring-rose-500/20">
            {bookingError}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-3xl bg-rose-500/10 p-4 text-rose-300 ring-1 ring-rose-500/20">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-12 text-center">
            <p className="text-slate-300">Loading available sessions...</p>
          </div>
        ) : isAdmin ? (
          <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-12 text-center">
            <p className="text-slate-300">Admins cannot book sessions. Use the admin dashboard to monitor sessions.</p>
            <Link
              href="/admin/sessions"
              className="mt-4 inline-flex items-center justify-center rounded-3xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Go to Admin Sessions
            </Link>
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-12 text-center">
            <p className="text-slate-300">No available sessions at the moment.</p>
          </div>
        ) : (
          <>
            <div className="hidden rounded-3xl border border-slate-700 bg-slate-900/50 md:block">
              <table className="w-full table-fixed text-left">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900">
                    <th className="w-[18%] px-4 py-4 text-sm font-semibold text-slate-300 lg:px-6">Session</th>
                    <th className="w-[16%] px-4 py-4 text-sm font-semibold text-slate-300 lg:px-6">Date</th>
                    <th className="w-[14%] px-4 py-4 text-sm font-semibold text-slate-300 lg:px-6">Time</th>
                    <th className="w-[22%] px-4 py-4 text-sm font-semibold text-slate-300 lg:px-6">Location</th>
                    <th className="w-[16%] px-4 py-4 text-sm font-semibold text-slate-300 lg:px-6">Available</th>
                    <th className="w-[14%] px-4 py-4 text-sm font-semibold text-slate-300 lg:px-6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice((page - 1) * pageSize, page * pageSize).map((session) => (
                    <tr key={session.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                      <td className="break-words px-4 py-4 text-sm text-slate-100 lg:px-6">{session.language}</td>
                      <td className="break-words px-4 py-4 text-sm text-slate-100 lg:px-6">{session.date}</td>
                      <td className="break-words px-4 py-4 text-sm text-slate-100 lg:px-6">{session.time}</td>
                      <td className="break-words px-4 py-4 text-sm text-slate-100 lg:px-6">{session.location}</td>
                      <td className="px-4 py-4 text-sm text-slate-100 lg:px-6">
                        <span className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                          {session.availableSpaces}/{session.numberOfSeats}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm lg:px-6">
                        <button
                          onClick={() => handleBookSession(session.id)}
                          disabled={session.availableSpaces === 0 || (bookingLoadingId !== null && bookingLoadingId !== session.id)}
                          className="inline-flex w-full items-center justify-center rounded-3xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {bookingLoadingId === session.id ? "Booking..." : session.availableSpaces === 0 ? "Full" : "Book"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 md:hidden">
              {sessions.slice((page - 1) * pageSize, page * pageSize).map((session) => (
                <article
                  key={session.id}
                  className="rounded-3xl border border-slate-700 bg-slate-900/50 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Session</p>
                      <h2 className="mt-1 break-words text-lg font-semibold text-white">{session.language}</h2>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                      {session.availableSpaces}/{session.numberOfSeats}
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
                    <div className="col-span-2">
                      <dt className="text-slate-400">Location</dt>
                      <dd className="mt-1 break-words font-medium text-slate-100">{session.location}</dd>
                    </div>
                  </dl>

                  <button
                    onClick={() => handleBookSession(session.id)}
                    disabled={session.availableSpaces === 0 || (bookingLoadingId !== null && bookingLoadingId !== session.id)}
                    className="mt-5 inline-flex w-full items-center justify-center rounded-3xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {bookingLoadingId === session.id ? "Booking..." : session.availableSpaces === 0 ? "Full" : "Book"}
                  </button>
                </article>
              ))}
            </div>

            {Math.ceil(sessions.length / pageSize) > 1 && (
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Previous
                </button>
                <div className="text-sm text-slate-400">
                  Page {page} of {Math.ceil(sessions.length / pageSize)}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(Math.ceil(sessions.length / pageSize), p + 1))}
                  disabled={page === Math.ceil(sessions.length / pageSize)}
                  className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
