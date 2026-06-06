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
    public function list(Request $request, DocumentManager $dm): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $page  = max(1, (int) $request->query->get('page', 1));
        $limit = min(50, max(1, (int) $request->query->get('limit', 10)));

        $isAdmin = $this->isGranted('ROLE_ADMIN');

        if ($isAdmin) {
            $allReservations = iterator_to_array(
                $dm->createQueryBuilder(Reservation::class)->getQuery()->execute()
            );

            // Batch-load all referenced users in one extra query to avoid N+1.
            $userIds = array_unique(array_filter(array_map(
                static fn(Reservation $r) => $r->getUser()?->getId(),
                $allReservations
            )));
            if ($userIds) {
                iterator_to_array(
                    $dm->createQueryBuilder(User::class)
                        ->field('id')->in(array_values($userIds))
                        ->getQuery()->execute()
                );
            }

            $reservations = array_values(array_filter(
                $allReservations,
                static fn(Reservation $r) => $r->getUser() !== null
                    && in_array('ROLE_USER', $r->getUser()->getRoles(), true)
                    && !in_array('ROLE_ADMIN', $r->getUser()->getRoles(), true)
            ));

            $total = count($reservations);
            $reservations = array_slice($reservations, ($page - 1) * $limit, $limit);
        } else {
            $total = $dm->createQueryBuilder(Reservation::class)
                ->field('user')->equals($user)
                ->count()
                ->getQuery()
                ->execute();

            $reservations = $dm->createQueryBuilder(Reservation::class)
                ->field('user')->equals($user)
                ->skip(($page - 1) * $limit)
                ->limit($limit)
                ->getQuery()
                ->execute();
        }

        $payload = array_map(static function (Reservation $reservation) use ($isAdmin) {
            $session = $reservation->getSession();
            $data = [
                'id'         => $reservation->getId(),
                'reservedAt' => $reservation->getReservedAt()->format('Y-m-d H:i:s'),
                'session'    => $session ? [
                    'id'            => $session->getId(),
                    'language'      => $session->getLanguage(),
                    'date'          => $session->getDate()?->format('Y-m-d'),
                    'time'          => $session->getTime(),
                    'location'      => $session->getLocation(),
                    'numberOfSeats' => $session->getNumberOfSeats(),
                ] : null,
            ];

            if ($isAdmin && $reservation->getUser()) {
                $data['bookedBy'] = [
                    'name'  => $reservation->getUser()->getName(),
                    'email' => $reservation->getUser()->getEmail(),
                ];
            }

            return $data;
        }, is_array($reservations) ? $reservations : iterator_to_array($reservations));

        return new JsonResponse([
            'data'     => $payload,
            'total'    => $total,
            'page'     => $page,
            'pageSize' => $limit,
        ], Response::HTTP_OK);
    }

    #[Route('', name: 'book', methods: ['POST'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function book(Request $request, DocumentManager $dm): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['sessionId'])) {
            return new JsonResponse(['error' => 'sessionId is required'], Response::HTTP_BAD_REQUEST);
        }

        if ($this->isGranted('ROLE_ADMIN')) {
            return new JsonResponse(['error' => 'Admins cannot book sessions'], Response::HTTP_FORBIDDEN);
        }

        $session = $dm->getRepository(Session::class)->find($data['sessionId']);
        if (!$session) {
            return new JsonResponse(['error' => 'Session not found'], Response::HTTP_NOT_FOUND);
        }

        $existingReservation = $dm->getRepository(Reservation::class)->findOneBy([
            'user'    => $user,
            'session' => $session,
        ]);
        if ($existingReservation) {
            return new JsonResponse(['error' => 'You have already booked this session'], Response::HTTP_CONFLICT);
        }

        $currentBookings = $dm->getRepository(Reservation::class)->findBy(['session' => $session]);
        $reservedCount   = count($currentBookings);
        $availableSeats  = $session->getNumberOfSeats() ?? 0;

        if ($reservedCount >= $availableSeats) {
            return new JsonResponse(['error' => 'No spaces available for this session'], Response::HTTP_CONFLICT);
        }

        $reservation = new Reservation();
        $reservation->setUser($user);
        $reservation->setSession($session);

        $dm->persist($reservation);
        $dm->flush();

        return new JsonResponse([
            'status'        => 'Session booked',
            'reservationId' => $reservation->getId(),
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'cancel', methods: ['DELETE'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function cancel(string $id, DocumentManager $dm): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $reservation = $dm->getRepository(Reservation::class)->find($id);
        if (!$reservation) {
            return new JsonResponse(['error' => 'Reservation not found'], Response::HTTP_NOT_FOUND);
        }

        if ($reservation->getUser()?->getId() !== $user->getId()) {
            return new JsonResponse(['error' => 'You can only cancel your own bookings'], Response::HTTP_FORBIDDEN);
        }

        $dm->remove($reservation);
        $dm->flush();

        return new JsonResponse(['status' => 'Booking canceled'], Response::HTTP_OK);
    }
}
