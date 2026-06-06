"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useIsAdminUser } from "@/app/auth/AuthHooks";
import { ReservationService, type Reservation } from "../ReservationService";

export default function ReservationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const isAdmin = useIsAdminUser();
  const reservationId = params.id as string;
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadReservation() {
      // There is no single-reservation endpoint, so load a large page and find the matching booking locally.
      setLoading(true);
      setError(null);

      try {
        const result = await ReservationService.getReservations(1, 1000);
        const found = result.reservations.find((r) => r.id === reservationId);
        if (!found) {
          // Treat missing records as a user-facing not-found state instead of rendering empty details.
          setError("Reservation not found");
          return;
        }
        setReservation(found);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reservation");
      } finally {
        setLoading(false);
      }
    }

    if (reservationId) {
      // Wait until Next route params are available before requesting data.
      loadReservation();
    }
  }, [reservationId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-12 text-center">
            <p className="text-slate-300">Loading reservation details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="rounded-3xl bg-rose-500/10 p-6 text-rose-300 ring-1 ring-rose-500/20">
            {error || "Reservation not found"}
          </div>
          <Link
            href="/reservation"
            className="mt-6 inline-flex items-center justify-center rounded-3xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            Back to Reservations
          </Link>
        </div>
      </div>
    );
  }

  const session = reservation.session;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/reservation"
          className="inline-flex items-center gap-2 text-sm font-medium text-sky-300 hover:text-sky-200"
        >
          ← Back to Reservations
        </Link>

        <div className="mt-8 rounded-3xl border border-slate-700 bg-slate-900/50 p-8">
          <h1 className="text-3xl font-semibold text-white">Reservation Details</h1>

          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
            {/* Session Information */}
            <div className="rounded-2xl bg-slate-800/50 p-6">
              <h2 className="text-lg font-semibold text-slate-200">Session Information</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm text-slate-400">Language</p>
                  <p className="mt-1 text-base font-medium text-slate-100">{session?.language || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Date</p>
                  <p className="mt-1 text-base font-medium text-slate-100">{session?.date || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Time</p>
                  <p className="mt-1 text-base font-medium text-slate-100">{session?.time || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Location</p>
                  <p className="mt-1 text-base font-medium text-slate-100">{session?.location || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Reservation Information */}
            <div className="rounded-2xl bg-slate-800/50 p-6">
              <h2 className="text-lg font-semibold text-slate-200">Reservation Information</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm text-slate-400">Reservation ID</p>
                  <p className="mt-1 text-base font-medium text-slate-100 break-all">{reservation.id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Reserved At</p>
                  <p className="mt-1 text-base font-medium text-slate-100">
                    {new Date(reservation.reservedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total Seats</p>
                  <p className="mt-1 text-base font-medium text-slate-100">{session?.numberOfSeats || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Status</p>
                  <p className="mt-1 inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">
                    Confirmed
                  </p>
                </div>
              </div>
            </div>
          </div>

          {cancelError && (
            <div className="mt-6 rounded-3xl bg-rose-500/10 p-4 text-rose-300 ring-1 ring-rose-500/20">
              {cancelError}
            </div>
          )}
          {cancelSuccess && (
            <div className="mt-6 rounded-3xl bg-emerald-500/10 p-4 text-emerald-300 ring-1 ring-emerald-500/20">
              {cancelSuccess}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/reservation"
              className="inline-flex items-center justify-center rounded-3xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              Back to List
            </Link>
            {!isAdmin && (
              <Link
                href="/reservation/book"
                className="inline-flex items-center justify-center rounded-3xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Book Another Session
              </Link>
            )}
            {!isAdmin && (
              <button
                type="button"
                disabled={cancelling}
                onClick={async () => {
                  // Clear previous cancellation messages so the current attempt has a single visible outcome.
                  setCancelError(null);
                  setCancelSuccess(null);
                  setCancelling(true);

                  try {
                    const result = await ReservationService.cancelReservation(reservationId);
                    if (!result.success) {
                      // Preserve backend ownership/not-found errors for the detail page.
                      setCancelError(result.message);
                    } else {
                      setCancelSuccess(result.message);
                      // Redirect after a short confirmation because the canceled reservation no longer belongs in detail view.
                      setTimeout(() => {
                        router.push("/reservation");
                      }, 1200);
                    }
                  } catch (err) {
                    setCancelError(err instanceof Error ? err.message : "Failed to cancel reservation");
                  } finally {
                    setCancelling(false);
                  }
                }}
                className="inline-flex items-center justify-center rounded-3xl bg-rose-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelling ? "Cancelling..." : "Cancel Booking"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
