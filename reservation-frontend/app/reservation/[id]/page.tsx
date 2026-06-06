"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useIsAdminUser } from "@/app/auth/AuthHooks";
import { ReservationService, type Reservation } from "../ReservationService";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    if (!reservationId) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await ReservationService.getReservations(1, 1000);
        const found = result.reservations.find((r) => r.id === reservationId);
        if (!found) { setError("Reservation not found"); return; }
        setReservation(found);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reservation");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reservationId]);

  async function handleCancel() {
    setCancelError(null);
    setCancelSuccess(null);
    setCancelling(true);
    try {
      const result = await ReservationService.cancelReservation(reservationId);
      if (!result.success) { setCancelError(result.message); return; }
      setCancelSuccess(result.message);
      setTimeout(() => router.push("/reservation"), 1200);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel reservation");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card><CardContent className="py-16 text-center text-sm text-gray-500">Loading reservation...</CardContent></Card>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>{error ?? "Reservation not found"}</AlertDescription>
        </Alert>
        <Link href="/reservation" className={`mt-4 inline-flex ${buttonVariants({ variant: "outline" })}`}>
          Back to reservations
        </Link>
      </div>
    );
  }

  const session = reservation.session;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link href="/reservation" className="text-sm font-medium text-gray-500 hover:text-gray-900">
          ← Back to reservations
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle>Reservation Details</CardTitle>
            <Badge variant="success">Confirmed</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Session</h3>
              <dl className="space-y-2 text-sm">
                <div><dt className="text-gray-500">Language</dt><dd className="mt-0.5 font-medium text-gray-900">{session?.language ?? "—"}</dd></div>
                <div><dt className="text-gray-500">Date</dt><dd className="mt-0.5 font-medium text-gray-900">{session?.date ?? "—"}</dd></div>
                <div><dt className="text-gray-500">Time</dt><dd className="mt-0.5 font-medium text-gray-900">{session?.time ?? "—"}</dd></div>
                <div><dt className="text-gray-500">Location</dt><dd className="mt-0.5 font-medium text-gray-900">{session?.location ?? "—"}</dd></div>
                <div><dt className="text-gray-500">Total seats</dt><dd className="mt-0.5 font-medium text-gray-900">{session?.numberOfSeats ?? "—"}</dd></div>
              </dl>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Booking</h3>
              <dl className="space-y-2 text-sm">
                <div><dt className="text-gray-500">Reservation ID</dt><dd className="mt-0.5 break-all font-mono text-xs text-gray-700">{reservation.id}</dd></div>
                <div><dt className="text-gray-500">Reserved at</dt><dd className="mt-0.5 font-medium text-gray-900">{new Date(reservation.reservedAt).toLocaleString()}</dd></div>
              </dl>
            </div>
          </div>

          {cancelError && (
            <Alert variant="destructive"><AlertDescription>{cancelError}</AlertDescription></Alert>
          )}
          {cancelSuccess && (
            <Alert variant="success"><AlertDescription>{cancelSuccess}</AlertDescription></Alert>
          )}

          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4">
            <Link href="/reservation" className={buttonVariants({ variant: "outline" })}>
              Back to list
            </Link>
            {!isAdmin && (
              <Link href="/reservation/book" className={buttonVariants({ variant: "secondary" })}>
                Book another
              </Link>
            )}
            {!isAdmin && (
              <Button variant="destructive" disabled={cancelling} onClick={handleCancel}>
                {cancelling ? "Cancelling..." : "Cancel booking"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
