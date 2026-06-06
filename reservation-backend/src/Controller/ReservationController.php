<?php

namespace App\Controller;

use App\Document\Reservation;
use App\Document\Session;
use App\Document\User;
use Doctrine\ODM\MongoDB\DocumentManager;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/reservations', name: 'api_reservations_')]
class ReservationController extends AbstractController
{
    #[Route('', name: 'list', methods: ['GET'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function list(DocumentManager $dm): JsonResponse
    {
        $user = $this->getUser();
        // Controller methods may still be called in tests or misconfigured routes, so verify the security user shape.
        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $isAdmin = $this->isGranted('ROLE_ADMIN');
        if ($isAdmin) {
            // Admins see user bookings for oversight, but admin-owned reservations are hidden because admins cannot book.
            $reservations = $dm->getRepository(Reservation::class)->findAll();
            $reservations = array_filter($reservations, static fn (Reservation $reservation) =>
                ($reservation->getUser()?->getRoles() !== null)
                && in_array('ROLE_USER', $reservation->getUser()->getRoles(), true)
                && !in_array('ROLE_ADMIN', $reservation->getUser()->getRoles(), true)
            );
        } else {
            // Regular users should only see their own reservation history.
            $reservations = $dm->getRepository(Reservation::class)->findBy(['user' => $user]);
        }

        // Shape MongoDB documents into stable JSON so the frontend does not depend on ODM internals.
        $payload = array_map(static function (Reservation $reservation) use ($isAdmin) {
            $session = $reservation->getSession();
            $data = [
                'id' => $reservation->getId(),
                'reservedAt' => $reservation->getReservedAt()->format('Y-m-d H:i:s'),
                'session' => $session ? [
                    'id' => $session->getId(),
                    'language' => $session->getLanguage(),
                    'date' => $session->getDate()?->format('Y-m-d'),
                    'time' => $session->getTime(),
                    'location' => $session->getLocation(),
                    'numberOfSeats' => $session->getNumberOfSeats(),
                ] : null,
            ];

            if ($isAdmin && $reservation->getUser()) {
                $data['bookedBy'] = [
                    'name' => $reservation->getUser()->getName(),
                    'email' => $reservation->getUser()->getEmail(),
                ];
            }

            return $data;
        }, $reservations);

        return new JsonResponse($payload, Response::HTTP_OK);
    }

    #[Route('', name: 'book', methods: ['POST'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function book(Request $request, DocumentManager $dm): JsonResponse
    {
        $user = $this->getUser();
        // Only authenticated document users can create reservations.
        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $data = json_decode($request->getContent(), true);
        // A reservation is meaningless without a target session, so reject malformed bodies immediately.
        if (!is_array($data) || empty($data['sessionId'])) {
            return new JsonResponse(['error' => 'sessionId is required'], Response::HTTP_BAD_REQUEST);
        }

        // Admins manage sessions and inspect user bookings; blocking booking keeps those roles separate.
        if ($this->isGranted('ROLE_ADMIN')) {
            return new JsonResponse(['error' => 'Admins cannot book sessions'], Response::HTTP_FORBIDDEN);
        }

        $session = $dm->getRepository(Session::class)->find($data['sessionId']);
        // Booking an unknown session would create a dangling reference.
        if (!$session) {
            return new JsonResponse(['error' => 'Session not found'], Response::HTTP_NOT_FOUND);
        }

        // Prevent the same user from consuming more than one seat in a single session.
        $existingReservation = $dm->getRepository(Reservation::class)->findOneBy([
            'user' => $user,
            'session' => $session,
        ]);
        if ($existingReservation) {
            return new JsonResponse(['error' => 'You have already booked this session'], Response::HTTP_CONFLICT);
        }

        $currentBookings = $dm->getRepository(Reservation::class)->findBy(['session' => $session]);
        $reservedCount = count($currentBookings);
        $availableSeats = $session->getNumberOfSeats() ?? 0;

        // Count existing reservations before creating a new one so capacity cannot be exceeded.
        if ($reservedCount >= $availableSeats) {
            return new JsonResponse(['error' => 'No spaces available for this session'], Response::HTTP_CONFLICT);
        }

        $reservation = new Reservation();
        $reservation->setUser($user);
        $reservation->setSession($session);

        $dm->persist($reservation);
        $dm->flush();

        return new JsonResponse([
            'status' => 'Session booked',
            'reservationId' => $reservation->getId(),
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'cancel', methods: ['DELETE'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function cancel(string $id, DocumentManager $dm): JsonResponse
    {
        $user = $this->getUser();
        // Cancellation is tied to ownership, so anonymous or non-document users cannot proceed.
        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $reservation = $dm->getRepository(Reservation::class)->find($id);
        // Return a clear 404 when the requested booking no longer exists.
        if (!$reservation) {
            return new JsonResponse(['error' => 'Reservation not found'], Response::HTTP_NOT_FOUND);
        }

        // Users may only release their own seat; admins manage sessions through a separate workflow.
        if ($reservation->getUser()?->getId() !== $user->getId()) {
            return new JsonResponse(['error' => 'You can only cancel your own bookings'], Response::HTTP_FORBIDDEN);
        }

        $dm->remove($reservation);
        $dm->flush();

        return new JsonResponse(['status' => 'Booking canceled'], Response::HTTP_OK);
    }
}
