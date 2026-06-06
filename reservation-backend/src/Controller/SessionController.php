<?php

namespace App\Controller;

use App\Document\Reservation;
use App\Document\Session;
use Doctrine\ODM\MongoDB\DocumentManager;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/sessions', name: 'api_sessions_')]
class SessionController extends AbstractController
{
    #[Route('', name: 'list', methods: ['GET'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function list(Request $request, DocumentManager $dm): JsonResponse
    {
        $sessions = $dm->getRepository(Session::class)->findAll();
        $showAll = $request->query->getBoolean('all', false);
        $isAdmin = $this->isGranted('ROLE_ADMIN');

        // Load all reservations in one query; sessions are already in the identity map
        // so getSession() calls inside the loop hit no extra queries.
        $allReservations = $dm->getRepository(Reservation::class)->findAll();

        $countMap = [];
        foreach ($allReservations as $reservation) {
            $sid = $reservation->getSession()?->getId();
            if ($sid !== null) {
                $countMap[$sid] = ($countMap[$sid] ?? 0) + 1;
            }
        }

        $payload = [];
        foreach ($sessions as $session) {
            $reservedCount  = $countMap[$session->getId()] ?? 0;
            $availableSeats = $session->getNumberOfSeats() ?? 0;
            $availableSpaces = max(0, $availableSeats - $reservedCount);

            if ($showAll && $isAdmin) {
                $payload[] = [
                    'id'             => $session->getId(),
                    'language'       => $session->getLanguage(),
                    'date'           => $session->getDate()?->format('Y-m-d'),
                    'time'           => $session->getTime(),
                    'location'       => $session->getLocation(),
                    'numberOfSeats'  => $session->getNumberOfSeats(),
                    'availableSpaces' => $availableSpaces,
                ];
                continue;
            }

            if ($reservedCount < $availableSeats) {
                $payload[] = [
                    'id'             => $session->getId(),
                    'language'       => $session->getLanguage(),
                    'date'           => $session->getDate()?->format('Y-m-d'),
                    'time'           => $session->getTime(),
                    'location'       => $session->getLocation(),
                    'numberOfSeats'  => $session->getNumberOfSeats(),
                    'availableSpaces' => $availableSpaces,
                ];
            }
        }

        return new JsonResponse($payload, Response::HTTP_OK);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function create(Request $request, DocumentManager $dm): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return new JsonResponse(['error' => 'Invalid JSON body'], Response::HTTP_BAD_REQUEST);
        }

        foreach (['language', 'date', 'time', 'location', 'numberOfSeats'] as $field) {
            if (!array_key_exists($field, $data) || (empty($data[$field]) && $data[$field] !== 0)) {
                return new JsonResponse(['error' => sprintf('Missing required field: %s', $field)], Response::HTTP_BAD_REQUEST);
            }
        }

        $seats = (int) $data['numberOfSeats'];
        if ($seats < 1) {
            return new JsonResponse(['error' => 'numberOfSeats must be at least 1'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $date = new \DateTimeImmutable($data['date']);
        } catch (\Exception $e) {
            return new JsonResponse(['error' => 'Invalid date format, expected YYYY-MM-DD'], Response::HTTP_BAD_REQUEST);
        }

        $session = new Session();
        $session->setLanguage((string) $data['language'])
            ->setDate($date)
            ->setTime((string) $data['time'])
            ->setLocation((string) $data['location'])
            ->setNumberOfSeats($seats);

        $dm->persist($session);
        $dm->flush();

        return new JsonResponse([
            'status' => 'Session created',
            'id'     => $session->getId(),
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'update', methods: ['PUT'])]
    #[IsGranted('ROLE_ADMIN')]
    public function update(string $id, Request $request, DocumentManager $dm): JsonResponse
    {
        $session = $dm->getRepository(Session::class)->find($id);
        if (!$session) {
            return new JsonResponse(['error' => 'Session not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return new JsonResponse(['error' => 'Invalid JSON body'], Response::HTTP_BAD_REQUEST);
        }

        if (isset($data['language'])) {
            $session->setLanguage((string) $data['language']);
        }

        if (isset($data['date'])) {
            try {
                $session->setDate(new \DateTimeImmutable($data['date']));
            } catch (\Exception $e) {
                return new JsonResponse(['error' => 'Invalid date format, expected YYYY-MM-DD'], Response::HTTP_BAD_REQUEST);
            }
        }

        if (isset($data['time'])) {
            $session->setTime((string) $data['time']);
        }

        if (isset($data['location'])) {
            $session->setLocation((string) $data['location']);
        }

        if (isset($data['numberOfSeats'])) {
            $seats = (int) $data['numberOfSeats'];
            if ($seats < 1) {
                return new JsonResponse(['error' => 'numberOfSeats must be at least 1'], Response::HTTP_BAD_REQUEST);
            }
            $session->setNumberOfSeats($seats);
        }

        $dm->flush();

        return new JsonResponse(['status' => 'Session updated'], Response::HTTP_OK);
    }

    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_ADMIN')]
    public function delete(string $id, DocumentManager $dm): JsonResponse
    {
        $session = $dm->getRepository(Session::class)->find($id);
        if (!$session) {
            return new JsonResponse(['error' => 'Session not found'], Response::HTTP_NOT_FOUND);
        }

        // Remove all reservations for this session before deleting to avoid orphaned documents.
        $orphans = $dm->getRepository(Reservation::class)->findBy(['session' => $session]);
        foreach ($orphans as $orphan) {
            $dm->remove($orphan);
        }

        $dm->remove($session);
        $dm->flush();

        return new JsonResponse(['status' => 'Session deleted'], Response::HTTP_OK);
    }
}
