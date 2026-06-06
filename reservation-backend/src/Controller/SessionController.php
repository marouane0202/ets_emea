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

        $payload = [];
        foreach ($sessions as $session) {
            // Availability is derived from reservations instead of stored, so it stays accurate after bookings change.
            $reservations = $dm->getRepository(Reservation::class)->findBy(['session' => $session]);
            $reservedCount = count($reservations);
            $availableSeats = $session->getNumberOfSeats() ?? 0;
            $availableSpaces = max(0, $availableSeats - $reservedCount);

            // Admin dashboards need full visibility, including sessions that are already full.
            if ($showAll && $isAdmin) {
                $payload[] = [
                    'id' => $session->getId(),
                    'language' => $session->getLanguage(),
                    'date' => $session->getDate()?->format('Y-m-d'),
                    'time' => $session->getTime(),
                    'location' => $session->getLocation(),
                    'numberOfSeats' => $session->getNumberOfSeats(),
                    'availableSpaces' => $availableSpaces,
                ];

                continue;
            }

            // Regular booking screens only receive sessions that still have at least one open seat.
            if ($reservedCount < $availableSeats) {
                $payload[] = [
                    'id' => $session->getId(),
                    'language' => $session->getLanguage(),
                    'date' => $session->getDate()?->format('Y-m-d'),
                    'time' => $session->getTime(),
                    'location' => $session->getLocation(),
                    'numberOfSeats' => $session->getNumberOfSeats(),
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
        // Require a JSON object so validation below can safely inspect fields.
        if (!is_array($data)) {
            return new JsonResponse(['error' => 'Invalid JSON body'], Response::HTTP_BAD_REQUEST);
        }

        foreach (['language', 'date', 'time', 'location', 'numberOfSeats'] as $field) {
            // Missing or blank schedule fields would produce sessions users cannot understand or book reliably.
            if (!array_key_exists($field, $data) || (empty($data[$field]) && $data[$field] !== 0)) {
                return new JsonResponse(['error' => sprintf('Missing required field: %s', $field)], Response::HTTP_BAD_REQUEST);
            }
        }

        try {
            // Normalize incoming dates to DateTimeImmutable so all responses can format dates consistently.
            $date = new \DateTimeImmutable($data['date']);
        } catch (\Exception $e) {
            return new JsonResponse(['error' => 'Invalid date format, expected YYYY-MM-DD'], Response::HTTP_BAD_REQUEST);
        }

        $session = new Session();
        $session->setLanguage((string) $data['language'])
            ->setDate($date)
            ->setTime((string) $data['time'])
            ->setLocation((string) $data['location'])
            ->setNumberOfSeats((int) $data['numberOfSeats']);

        $dm->persist($session);
        $dm->flush();

        return new JsonResponse([
            'status' => 'Session created',
            'id' => $session->getId(),
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'update', methods: ['PUT'])]
    #[IsGranted('ROLE_ADMIN')]
    public function update(string $id, Request $request, DocumentManager $dm): JsonResponse
    {
        $session = $dm->getRepository(Session::class)->find($id);
        // Updates must target an existing session; otherwise the admin UI would appear to save phantom data.
        if (!$session) {
            return new JsonResponse(['error' => 'Session not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        // Partial updates still need a JSON object so each optional field can be checked safely.
        if (!is_array($data)) {
            return new JsonResponse(['error' => 'Invalid JSON body'], Response::HTTP_BAD_REQUEST);
        }

        // Only mutate fields that were submitted, allowing the frontend to perform partial edits.
        if (isset($data['language'])) {
            $session->setLanguage((string) $data['language']);
        }

        if (isset($data['date'])) {
            try {
                // Validate date edits before flushing so an invalid date never overwrites the previous schedule.
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
            $session->setNumberOfSeats((int) $data['numberOfSeats']);
        }

        $dm->flush();

        return new JsonResponse(['status' => 'Session updated'], Response::HTTP_OK);
    }

    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_ADMIN')]
    public function delete(string $id, DocumentManager $dm): JsonResponse
    {
        $session = $dm->getRepository(Session::class)->find($id);
        // Deleting a missing session should be explicit so the admin knows nothing changed.
        if (!$session) {
            return new JsonResponse(['error' => 'Session not found'], Response::HTTP_NOT_FOUND);
        }

        $dm->remove($session);
        $dm->flush();

        return new JsonResponse(['status' => 'Session deleted'], Response::HTTP_OK);
    }
}
