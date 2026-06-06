<?php

namespace App\Tests\Controller;

use App\Controller\SessionController;
use App\Document\Reservation;
use App\Document\Session;
use Doctrine\ODM\MongoDB\DocumentManager;
use Doctrine\Persistence\ObjectRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class SessionControllerTest extends TestCase
{
    public function testListShowsOnlySessionsWithAvailableSeatsForUsers(): void
    {
        $openSession = $this->session('French', 2);
        $fullSession = $this->session('English', 1);

        $sessionRepository = $this->createMock(ObjectRepository::class);
        $sessionRepository->method('findAll')->willReturn([$openSession, $fullSession]);

        $reservationRepository = $this->createMock(ObjectRepository::class);
        $reservationRepository->method('findBy')->willReturnCallback(
            fn (array $criteria) => $criteria['session'] === $openSession ? [new Reservation()] : [new Reservation()]
        );

        $controller = $this->controller(false);
        $response = $controller->list(new Request(), $this->documentManager($sessionRepository, $reservationRepository));

        $payload = $this->payload($response);
        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
        $this->assertCount(1, $payload);
        $this->assertSame('French', $payload[0]['language']);
        $this->assertSame(1, $payload[0]['availableSpaces']);
    }

    public function testListShowsFullSessionsWhenAdminRequestsAll(): void
    {
        $fullSession = $this->session('English', 1);

        $sessionRepository = $this->createMock(ObjectRepository::class);
        $sessionRepository->method('findAll')->willReturn([$fullSession]);

        $reservationRepository = $this->createMock(ObjectRepository::class);
        $reservationRepository->method('findBy')->willReturn([new Reservation()]);

        $request = new Request(['all' => '1']);
        $response = $this->controller(true)->list($request, $this->documentManager($sessionRepository, $reservationRepository));

        $payload = $this->payload($response);
        $this->assertCount(1, $payload);
        $this->assertSame(0, $payload[0]['availableSpaces']);
    }

    public function testCreateRejectsMissingRequiredFields(): void
    {
        $response = (new SessionController())->create(
            $this->jsonRequest(['language' => 'French']),
            $this->createMock(DocumentManager::class)
        );

        $this->assertSame(Response::HTTP_BAD_REQUEST, $response->getStatusCode());
        $this->assertSame('Missing required field: date', $this->payload($response)['error']);
    }

    public function testCreatePersistsSession(): void
    {
        $dm = $this->createMock(DocumentManager::class);
        $dm->expects($this->once())
            ->method('persist')
            ->with($this->callback(fn (Session $session): bool =>
                $session->getLanguage() === 'French'
                && $session->getDate()?->format('Y-m-d') === '2026-07-01'
                && $session->getTime() === '10:00'
                && $session->getLocation() === 'Room 1'
                && $session->getNumberOfSeats() === 12
            ));
        $dm->expects($this->once())->method('flush');

        $response = (new SessionController())->create(
            $this->jsonRequest([
                'language' => 'French',
                'date' => '2026-07-01',
                'time' => '10:00',
                'location' => 'Room 1',
                'numberOfSeats' => 12,
            ]),
            $dm
        );

        $this->assertSame(Response::HTTP_CREATED, $response->getStatusCode());
        $this->assertSame('Session created', $this->payload($response)['status']);
    }

    public function testUpdateChangesProvidedFields(): void
    {
        $session = $this->session('French', 10);
        $repository = $this->createMock(ObjectRepository::class);
        $repository->method('find')->with('session-1')->willReturn($session);

        $dm = $this->createMock(DocumentManager::class);
        $dm->method('getRepository')->with(Session::class)->willReturn($repository);
        $dm->expects($this->once())->method('flush');

        $response = (new SessionController())->update(
            'session-1',
            $this->jsonRequest(['language' => 'Arabic', 'numberOfSeats' => 5]),
            $dm
        );

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
        $this->assertSame('Arabic', $session->getLanguage());
        $this->assertSame(5, $session->getNumberOfSeats());
    }

    public function testDeleteRemovesSession(): void
    {
        $session = $this->session('French', 10);
        $repository = $this->createMock(ObjectRepository::class);
        $repository->method('find')->with('session-1')->willReturn($session);

        $dm = $this->createMock(DocumentManager::class);
        $dm->method('getRepository')->with(Session::class)->willReturn($repository);
        $dm->expects($this->once())->method('remove')->with($session);
        $dm->expects($this->once())->method('flush');

        $response = (new SessionController())->delete('session-1', $dm);

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
        $this->assertSame('Session deleted', $this->payload($response)['status']);
    }

    private function controller(bool $isAdmin): SessionController
    {
        $controller = $this->getMockBuilder(SessionController::class)
            ->onlyMethods(['isGranted'])
            ->getMock();
        $controller->method('isGranted')->with('ROLE_ADMIN')->willReturn($isAdmin);

        return $controller;
    }

    private function session(string $language, int $seats): Session
    {
        return (new Session())
            ->setLanguage($language)
            ->setDate(new \DateTimeImmutable('2026-07-01'))
            ->setTime('10:00')
            ->setLocation('Room 1')
            ->setNumberOfSeats($seats);
    }

    private function documentManager(ObjectRepository $sessionRepository, ObjectRepository $reservationRepository): DocumentManager
    {
        $dm = $this->createMock(DocumentManager::class);
        $dm->method('getRepository')->willReturnMap([
            [Session::class, $sessionRepository],
            [Reservation::class, $reservationRepository],
        ]);

        return $dm;
    }

    private function jsonRequest(array $payload): Request
    {
        return new Request([], [], [], [], [], [], json_encode($payload));
    }

    private function payload(\Symfony\Component\HttpFoundation\JsonResponse $response): array
    {
        return json_decode((string) $response->getContent(), true);
    }
}
