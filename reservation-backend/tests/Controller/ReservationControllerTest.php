<?php

namespace App\Tests\Controller;

use App\Controller\ReservationController;
use App\Document\Reservation;
use App\Document\Session;
use App\Document\User;
use Doctrine\ODM\MongoDB\DocumentManager;
use Doctrine\Persistence\ObjectRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ReservationControllerTest extends TestCase
{
    public function testListReturnsCurrentUserReservations(): void
    {
        $user = $this->user('user-1', ['ROLE_USER']);
        $reservation = $this->reservation($user, $this->session('French'));

        $reservationRepository = $this->createMock(ObjectRepository::class);
        $reservationRepository->expects($this->once())->method('findBy')->with(['user' => $user])->willReturn([$reservation]);

        $response = $this->controller($user, false)->list($this->documentManager($reservationRepository));
        $payload = $this->payload($response);

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
        $this->assertSame('French', $payload[0]['session']['language']);
        $this->assertArrayNotHasKey('bookedBy', $payload[0]);
    }

    public function testAdminListFiltersOutAdminReservationsAndIncludesBookedBy(): void
    {
        $admin = $this->user('admin-1', ['ROLE_ADMIN']);
        $regularUser = $this->user('user-1', ['ROLE_USER']);
        $adminUser = $this->user('admin-2', ['ROLE_ADMIN']);
        $regularReservation = $this->reservation($regularUser, $this->session('French'));
        $adminReservation = $this->reservation($adminUser, $this->session('English'));

        $reservationRepository = $this->createMock(ObjectRepository::class);
        $reservationRepository->expects($this->once())->method('findAll')->willReturn([$regularReservation, $adminReservation]);

        $response = $this->controller($admin, true)->list($this->documentManager($reservationRepository));
        $payload = $this->payload($response);

        $this->assertCount(1, $payload);
        $this->assertSame($regularUser->getEmail(), $payload[0]['bookedBy']['email']);
    }

    public function testBookRejectsAdmins(): void
    {
        $response = $this->controller($this->user('admin-1', ['ROLE_ADMIN']), true)->book(
            $this->jsonRequest(['sessionId' => 'session-1']),
            $this->createMock(DocumentManager::class)
        );

        $this->assertSame(Response::HTTP_FORBIDDEN, $response->getStatusCode());
        $this->assertSame('Admins cannot book sessions', $this->payload($response)['error']);
    }

    public function testBookRejectsDuplicateReservations(): void
    {
        $user = $this->user('user-1', ['ROLE_USER']);
        $session = $this->session('French');

        $sessionRepository = $this->createMock(ObjectRepository::class);
        $sessionRepository->method('find')->with('session-1')->willReturn($session);

        $reservationRepository = $this->createMock(ObjectRepository::class);
        $reservationRepository->method('findOneBy')->willReturn(new Reservation());

        $response = $this->controller($user, false)->book(
            $this->jsonRequest(['sessionId' => 'session-1']),
            $this->documentManager($reservationRepository, $sessionRepository)
        );

        $this->assertSame(Response::HTTP_CONFLICT, $response->getStatusCode());
        $this->assertSame('You have already booked this session', $this->payload($response)['error']);
    }

    public function testBookPersistsReservationWhenSeatIsAvailable(): void
    {
        $user = $this->user('user-1', ['ROLE_USER']);
        $session = $this->session('French', 2);

        $sessionRepository = $this->createMock(ObjectRepository::class);
        $sessionRepository->method('find')->with('session-1')->willReturn($session);

        $reservationRepository = $this->createMock(ObjectRepository::class);
        $reservationRepository->method('findOneBy')->willReturn(null);
        $reservationRepository->method('findBy')->willReturn([new Reservation()]);

        $dm = $this->documentManager($reservationRepository, $sessionRepository);
        $dm->expects($this->once())
            ->method('persist')
            ->with($this->callback(fn (Reservation $reservation): bool =>
                $reservation->getUser() === $user && $reservation->getSession() === $session
            ));
        $dm->expects($this->once())->method('flush');

        $response = $this->controller($user, false)->book($this->jsonRequest(['sessionId' => 'session-1']), $dm);

        $this->assertSame(Response::HTTP_CREATED, $response->getStatusCode());
        $this->assertSame('Session booked', $this->payload($response)['status']);
    }

    public function testBookRejectsFullSession(): void
    {
        $user = $this->user('user-1', ['ROLE_USER']);
        $session = $this->session('French', 1);

        $sessionRepository = $this->createMock(ObjectRepository::class);
        $sessionRepository->method('find')->willReturn($session);

        $reservationRepository = $this->createMock(ObjectRepository::class);
        $reservationRepository->method('findOneBy')->willReturn(null);
        $reservationRepository->method('findBy')->willReturn([new Reservation()]);

        $response = $this->controller($user, false)->book(
            $this->jsonRequest(['sessionId' => 'session-1']),
            $this->documentManager($reservationRepository, $sessionRepository)
        );

        $this->assertSame(Response::HTTP_CONFLICT, $response->getStatusCode());
        $this->assertSame('No spaces available for this session', $this->payload($response)['error']);
    }

    public function testCancelRejectsOtherUsersReservation(): void
    {
        $currentUser = $this->user('user-1', ['ROLE_USER']);
        $otherUser = $this->user('user-2', ['ROLE_USER']);
        $reservation = $this->reservation($otherUser, $this->session('French'));

        $reservationRepository = $this->createMock(ObjectRepository::class);
        $reservationRepository->method('find')->with('reservation-1')->willReturn($reservation);

        $response = $this->controller($currentUser, false)->cancel(
            'reservation-1',
            $this->documentManager($reservationRepository)
        );

        $this->assertSame(Response::HTTP_FORBIDDEN, $response->getStatusCode());
        $this->assertSame('You can only cancel your own bookings', $this->payload($response)['error']);
    }

    public function testCancelRemovesOwnReservation(): void
    {
        $currentUser = $this->user('user-1', ['ROLE_USER']);
        $reservation = $this->reservation($currentUser, $this->session('French'));

        $reservationRepository = $this->createMock(ObjectRepository::class);
        $reservationRepository->method('find')->with('reservation-1')->willReturn($reservation);

        $dm = $this->documentManager($reservationRepository);
        $dm->expects($this->once())->method('remove')->with($reservation);
        $dm->expects($this->once())->method('flush');

        $response = $this->controller($currentUser, false)->cancel('reservation-1', $dm);

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
        $this->assertSame('Booking canceled', $this->payload($response)['status']);
    }

    private function controller(User $user, bool $isAdmin): ReservationController
    {
        $controller = $this->getMockBuilder(ReservationController::class)
            ->onlyMethods(['getUser', 'isGranted'])
            ->getMock();
        $controller->method('getUser')->willReturn($user);
        $controller->method('isGranted')->with('ROLE_ADMIN')->willReturn($isAdmin);

        return $controller;
    }

    private function documentManager(ObjectRepository $reservationRepository, ?ObjectRepository $sessionRepository = null): DocumentManager
    {
        $dm = $this->createMock(DocumentManager::class);
        $map = [[Reservation::class, $reservationRepository]];
        if ($sessionRepository) {
            $map[] = [Session::class, $sessionRepository];
        }

        $dm->method('getRepository')->willReturnMap($map);

        return $dm;
    }

    private function user(string $id, array $roles): User
    {
        $user = (new User())
            ->setName($id)
            ->setEmail($id . '@example.com')
            ->setRoles($roles);
        $this->setPrivateProperty($user, 'id', $id);

        return $user;
    }

    private function session(string $language, int $seats = 10): Session
    {
        return (new Session())
            ->setLanguage($language)
            ->setDate(new \DateTimeImmutable('2026-07-01'))
            ->setTime('10:00')
            ->setLocation('Room 1')
            ->setNumberOfSeats($seats);
    }

    private function reservation(User $user, Session $session): Reservation
    {
        return (new Reservation())
            ->setUser($user)
            ->setSession($session)
            ->setReservedAt(new \DateTimeImmutable('2026-06-01 09:00:00'));
    }

    private function setPrivateProperty(object $object, string $property, mixed $value): void
    {
        $reflection = new \ReflectionObject($object);
        $reflectedProperty = $reflection->getProperty($property);
        $reflectedProperty->setAccessible(true);
        $reflectedProperty->setValue($object, $value);
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
