"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useIsAdminUser } from "@/app/auth/AuthHooks";
import { ReservationService, type Reservation } from "./ReservationService";

export default function ReservationsPage() {
  const isAdmin = useIsAdminUser();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReservations() {
      // Reset loading and error state for each page change so pagination failures are visible.
      setLoading(true);
      setError(null);

      try {
        // The service applies client-side pagination to the backend reservation list.
        const result = await ReservationService.getReservations(page, pageSize);
        setReservations(result.reservations);
        setTotal(result.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reservations");
      } finally {
        setLoading(false);
      }
    }

    loadReservations();
  }, [page, pageSize]);

  // Calculate from backend total so pagination controls match the filtered list for the current user/admin.
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-white">
              {isAdmin ? "User Reservations" : "My Reservations"}
            </h1>
            <p className="mt-2 text-slate-400">
              {isAdmin
                ? "Showing sessions booked by users."
                : "View and manage your session reservations."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/profile"
              className="inline-flex items-center justify-center rounded-3xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
            >
              Profile
            </Link>

            {isAdmin ? (
              <Link
                href="/admin/sessions"
                className="inline-flex items-center justify-center rounded-3xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
              >
                Manage Sessions
              </Link>
            ) : (
              <Link
                href="/reservation/book"
                className="inline-flex items-center justify-center rounded-3xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Book Session
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-3xl bg-rose-500/10 p-4 text-rose-300 ring-1 ring-rose-500/20">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-12 text-center">
            <p className="text-slate-300">Loading reservations...</p>
          </div>
        ) : reservations.length === 0 ? (
          isAdmin ? (
            <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-12 text-center">
              <p className="text-slate-300">No user reservations found.</p>
              <p className="mt-4 text-sm text-slate-400">
                Admins cannot book or cancel user reservations here. Use the admin dashboard to manage sessions.
              </p>
              <Link
                href="/admin/sessions"
                className="mt-4 inline-flex items-center justify-center rounded-3xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Go to Admin Sessions
              </Link>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-12 text-center">
              <p className="text-slate-300">No reservations found.</p>
              <Link
                href="/reservation/book"
                className="mt-4 inline-flex items-center justify-center rounded-3xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Book your first session
              </Link>
            </div>
          )
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="rounded-3xl border border-slate-700 bg-slate-900/50 p-5 transition hover:border-slate-600 hover:bg-slate-900/60"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Reserved at</p>
                      <p className="mt-2 text-base font-semibold text-slate-100">
                        {new Date(reservation.reservedAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                      Confirmed
                    </span>
                  </div>
                  {isAdmin && reservation.bookedBy && (
                    <div className="mt-4 rounded-3xl bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
                      <p className="font-semibold text-slate-100">Booked by</p>
                      <p>{reservation.bookedBy.name || reservation.bookedBy.email}</p>
                    </div>
                  )}

                  <div className="mt-6 space-y-4">
                    <div>
                      <p className="text-sm text-slate-400">Session</p>
                      <p className="mt-1 text-lg font-semibold text-white">{reservation.session?.language || "N/A"}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-sm text-slate-400">Date</p>
                        <p className="mt-1 text-base font-medium text-slate-100">{reservation.session?.date || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Time</p>
                        <p className="mt-1 text-base font-medium text-slate-100">{reservation.session?.time || "N/A"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Location</p>
                      <p className="mt-1 text-base font-medium text-slate-100">{reservation.session?.location || "N/A"}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/reservation/${reservation.id}`}
                      className="inline-flex items-center justify-center rounded-3xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Previous
                </button>
                <div className="text-sm text-slate-400">
                  Page {page} of {totalPages}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
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
