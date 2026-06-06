<?php

namespace App\Document;

use Doctrine\ODM\MongoDB\Mapping\Annotations as MongoDB;

#[MongoDB\Document(collection: "reservations")]
#[MongoDB\UniqueIndex(keys: ["session" => "asc", "user" => "asc"])]
#[MongoDB\Index(keys: ["user" => "asc"])]
class Reservation
{
    #[MongoDB\Id]
    private $id;

    #[MongoDB\ReferenceOne(targetDocument: Session::class)]
    private $session;

    #[MongoDB\ReferenceOne(targetDocument: User::class)]
    private $user;

    #[MongoDB\Field(type: "date_immutable")]
    private $reservedAt;

    public function __construct()
    {
        // Capture booking time at creation so controllers do not need to remember to set it.
        $this->reservedAt = new \DateTimeImmutable();
    }

    public function getId(): ?string
    {
        return $this->id;
    }

    public function getSession(): ?Session
    {
        return $this->session;
    }

    public function setSession(?Session $session): self
    {
        $this->session = $session;

        return $this;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): self
    {
        $this->user = $user;

        return $this;
    }

    public function getReservedAt(): \DateTimeImmutable
    {
        return $this->reservedAt;
    }

    public function setReservedAt(\DateTimeImmutable $reservedAt): self
    {
        $this->reservedAt = $reservedAt;

        return $this;
    }
}
