<?php

namespace App\Tests\Document;

use App\Document\Reservation;
use App\Document\Session;
use App\Document\User;
use PHPUnit\Framework\TestCase;

class DocumentTest extends TestCase
{
    public function testUserAlwaysIncludesRoleUserAndUsesEmailAsIdentifier(): void
    {
        $user = (new User())
            ->setEmail('admin@example.com')
            ->setName('Admin')
            ->setRoles(['ROLE_ADMIN'])
            ->setPassword('hashed-password');

        $this->assertSame('admin@example.com', $user->getUserIdentifier());
        $this->assertContains('ROLE_ADMIN', $user->getRoles());
        $this->assertContains('ROLE_USER', $user->getRoles());
        $this->assertSame('hashed-password', $user->getPassword());
    }

    public function testUserSerializeHashesPasswordForSessionStorage(): void
    {
        $user = (new User())->setPassword('hashed-password');

        $serialized = $user->__serialize();

        $this->assertSame(hash('crc32c', 'hashed-password'), $serialized["\0" . User::class . "\0password"]);
    }

    public function testSessionStoresScheduleFields(): void
    {
        $date = new \DateTimeImmutable('2026-07-01');
        $session = (new Session())
            ->setLanguage('French')
            ->setDate($date)
            ->setTime('10:00')
            ->setLocation('Room 1')
            ->setNumberOfSeats(20);

        $this->assertSame('French', $session->getLanguage());
        $this->assertSame($date, $session->getDate());
        $this->assertSame('10:00', $session->getTime());
        $this->assertSame('Room 1', $session->getLocation());
        $this->assertSame(20, $session->getNumberOfSeats());
    }

    public function testReservationDefaultsReservedAtAndStoresRelations(): void
    {
        $before = new \DateTimeImmutable('-1 second');
        $user = (new User())->setEmail('user@example.com');
        $session = (new Session())->setLanguage('French');
        $reservation = (new Reservation())->setUser($user)->setSession($session);
        $after = new \DateTimeImmutable('+1 second');

        $this->assertSame($user, $reservation->getUser());
        $this->assertSame($session, $reservation->getSession());
        $this->assertGreaterThanOrEqual($before, $reservation->getReservedAt());
        $this->assertLessThanOrEqual($after, $reservation->getReservedAt());
    }
}
