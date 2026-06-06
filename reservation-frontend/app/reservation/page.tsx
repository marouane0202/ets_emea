"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useIsAdminUser } from "@/app/auth/AuthHooks";
import { ReservationService, type Reservation } from "./ReservationService";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export default function ReservationsPage() {
  const isAdmin = useIsAdminUser();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await ReservationService.getReservations(page, pageSize);
        setReservations(result.reservations);
        setTotal(result.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reservations");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page, pageSize]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isAdmin ? "User Reservations" : "My Reservations"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin ? "All bookings made by users." : "View and manage your session bookings."}
          </p>
        </div>
        {!isAdmin && (
          <Link href="/reservation/book" className={buttonVariants()}>
            Book a session
          </Link>
        )}
        {isAdmin && (
          <Link href="/admin/sessions" className={buttonVariants({ variant: "outline" })}>
            Manage sessions
          </Link>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-gray-500">
            Loading reservations...
          </CardContent>
        </Card>
      ) : reservations.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm text-gray-500">
              {isAdmin ? "No user reservations found." : "You have no reservations yet."}
            </p>
            {!isAdmin && (
              <Link href="/reservation/book" className={cn(buttonVariants(), "mt-4 inline-flex")}>
                Book your first session
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin/sessions" className={cn(buttonVariants({ variant: "outline" }), "mt-4 inline-flex")}>
                Go to session management
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {reservations.map((reservation) => (
              <Card key={reservation.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      {reservation.session?.language ?? "Session removed"}
                    </CardTitle>
                    <Badge variant="success">Confirmed</Badge>
                  </div>
                  {isAdmin && reservation.bookedBy && (
                    <CardDescription>
                      Booked by {reservation.bookedBy.name || reservation.bookedBy.email}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-gray-500">Date</dt>
                      <dd className="font-medium text-gray-900">{reservation.session?.date ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Time</dt>
                      <dd className="font-medium text-gray-900">{reservation.session?.time ?? "—"}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-gray-500">Location</dt>
                      <dd className="font-medium text-gray-900">{reservation.session?.location ?? "—"}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-gray-500">Reserved</dt>
                      <dd className="font-medium text-gray-900">
                        {new Date(reservation.reservedAt).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-auto pt-2">
                    <Link
                      href={`/reservation/${reservation.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      View details
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
