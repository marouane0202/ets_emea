"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdminUser } from "@/app/auth/AuthService";
import { ReservationService, type Session } from "../ReservationService";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";

export default function BookSessionPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingLoadingId, setBookingLoadingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const admin = isAdminUser();
        setIsAdmin(admin);
        if (!admin) {
          setSessions(await ReservationService.getAvailableSessions());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sessions");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleBook(sessionId: string) {
    if (isAdmin) { setBookingError("Admin users cannot book sessions."); return; }
    setBookingLoadingId(sessionId);
    setBookingError(null);
    try {
      const result = await ReservationService.bookSession(sessionId);
      if (!result.success) { setBookingError(result.message); return; }
      setBookingSuccess("Session booked! Redirecting...");
      setTimeout(() => router.push("/reservation"), 1500);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Failed to book session");
    } finally {
      setBookingLoadingId(null);
    }
  }

  const paged = sessions.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(sessions.length / pageSize);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Available Sessions</h1>
          <p className="mt-1 text-sm text-gray-500">Choose a session to book your seat.</p>
        </div>
        <Link href="/reservation" className={buttonVariants({ variant: "outline" })}>
          Back to reservations
        </Link>
      </div>

      {bookingSuccess && (
        <Alert variant="success" className="mb-5">
          <AlertDescription>{bookingSuccess}</AlertDescription>
        </Alert>
      )}
      {bookingError && (
        <Alert variant="destructive" className="mb-5">
          <AlertDescription>{bookingError}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="mb-5">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <Card><CardContent className="py-16 text-center text-sm text-gray-500">Loading sessions...</CardContent></Card>
      ) : isAdmin ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm text-gray-500">Admins cannot book sessions.</p>
            <Link href="/admin/sessions" className="mt-4 inline-flex">
              <Button>Go to session management</Button>
            </Link>
          </CardContent>
        </Card>
      ) : sessions.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-sm text-gray-500">No available sessions at the moment.</CardContent></Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium text-gray-900">{session.language}</TableCell>
                    <TableCell>{session.date}</TableCell>
                    <TableCell>{session.time}</TableCell>
                    <TableCell>{session.location}</TableCell>
                    <TableCell>
                      <Badge variant={session.availableSpaces === 0 ? "destructive" : "success"}>
                        {session.availableSpaces}/{session.numberOfSeats} open
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        disabled={session.availableSpaces === 0 || bookingLoadingId !== null}
                        onClick={() => handleBook(session.id)}
                      >
                        {bookingLoadingId === session.id ? "Booking..." : "Book"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <div className="grid gap-4 md:hidden">
            {paged.map((session) => (
              <Card key={session.id}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-gray-900">{session.language}</p>
                    <Badge variant={session.availableSpaces === 0 ? "destructive" : "success"}>
                      {session.availableSpaces}/{session.numberOfSeats}
                    </Badge>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-gray-500">Date</dt><dd className="font-medium text-gray-900">{session.date}</dd></div>
                    <div><dt className="text-gray-500">Time</dt><dd className="font-medium text-gray-900">{session.time}</dd></div>
                    <div className="col-span-2"><dt className="text-gray-500">Location</dt><dd className="font-medium text-gray-900">{session.location}</dd></div>
                  </dl>
                  <Button
                    className="mt-4 w-full"
                    disabled={session.availableSpaces === 0 || bookingLoadingId !== null}
                    onClick={() => handleBook(session.id)}
                  >
                    {bookingLoadingId === session.id ? "Booking..." : session.availableSpaces === 0 ? "Full" : "Book"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
