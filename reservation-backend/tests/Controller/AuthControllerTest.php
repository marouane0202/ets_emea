<?php

namespace App\Tests\Controller;

use App\Controller\AuthController;
use App\Document\User;
use Doctrine\ODM\MongoDB\DocumentManager;
use Doctrine\Persistence\ObjectRepository;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class AuthControllerTest extends TestCase
{
    public function testRegisterRejectsMissingFields(): void
    {
        $controller = new AuthController();

        $response = $controller->register(
            $this->jsonRequest(['email' => 'user@example.com']),
            $this->createMock(DocumentManager::class),
            $this->createMock(UserPasswordHasherInterface::class)
        );

        $this->assertSame(Response::HTTP_BAD_REQUEST, $response->getStatusCode());
        $this->assertSame('Missing required fields (name, email, password)', $this->payload($response)['error']);
    }

    public function testRegisterRejectsExistingEmail(): void
    {
        $repository = $this->createMock(ObjectRepository::class);
        $repository->expects($this->once())
            ->method('findOneBy')
            ->with(['email' => 'user@example.com'])
            ->willReturn(new User());

        $dm = $this->createMock(DocumentManager::class);
        $dm->method('getRepository')->with(User::class)->willReturn($repository);
        $dm->expects($this->never())->method('persist');

        $response = (new AuthController())->register(
            $this->jsonRequest(['name' => 'User', 'email' => 'user@example.com', 'password' => 'secret']),
            $dm,
            $this->createMock(UserPasswordHasherInterface::class)
        );

        $this->assertSame(Response::HTTP_CONFLICT, $response->getStatusCode());
        $this->assertSame('Email already registered', $this->payload($response)['error']);
    }

    public function testRegisterPersistsNewUserWithHashedPassword(): void
    {
        $repository = $this->createMock(ObjectRepository::class);
        $repository->method('findOneBy')->willReturn(null);

        $dm = $this->createMock(DocumentManager::class);
        $dm->method('getRepository')->with(User::class)->willReturn($repository);
        $dm->expects($this->once())
            ->method('persist')
            ->with($this->callback(function (User $user): bool {
                return $user->getName() === 'User'
                    && $user->getEmail() === 'user@example.com'
                    && $user->getPassword() === 'hashed-secret'
                    && in_array('ROLE_USER', $user->getRoles(), true);
            }));
        $dm->expects($this->once())->method('flush');

        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $hasher->expects($this->once())->method('hashPassword')->willReturn('hashed-secret');

        $response = (new AuthController())->register(
            $this->jsonRequest(['name' => 'User', 'email' => 'user@example.com', 'password' => 'secret']),
            $dm,
            $hasher
        );

        $this->assertSame(Response::HTTP_CREATED, $response->getStatusCode());
        $this->assertSame('User successfully registered!', $this->payload($response)['status']);
    }

    public function testLoginRejectsInvalidCredentials(): void
    {
        $repository = $this->createMock(ObjectRepository::class);
        $repository->method('findOneBy')->willReturn(null);

        $dm = $this->createMock(DocumentManager::class);
        $dm->method('getRepository')->with(User::class)->willReturn($repository);

        $response = (new AuthController())->login(
            $this->jsonRequest(['email' => 'user@example.com', 'password' => 'wrong']),
            $dm,
            $this->createMock(UserPasswordHasherInterface::class),
            $this->createMock(JWTTokenManagerInterface::class)
        );

        $this->assertSame(Response::HTTP_UNAUTHORIZED, $response->getStatusCode());
        $this->assertSame('Invalid credentials', $this->payload($response)['error']);
    }

    public function testLoginReturnsJwtToken(): void
    {
        $user = (new User())->setEmail('user@example.com');

        $repository = $this->createMock(ObjectRepository::class);
        $repository->method('findOneBy')->with(['email' => 'user@example.com'])->willReturn($user);

        $dm = $this->createMock(DocumentManager::class);
        $dm->method('getRepository')->with(User::class)->willReturn($repository);

        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $hasher->method('isPasswordValid')->with($user, 'secret')->willReturn(true);

        $jwtManager = $this->createMock(JWTTokenManagerInterface::class);
        $jwtManager->method('create')->with($user)->willReturn('jwt-token');

        $response = (new AuthController())->login(
            $this->jsonRequest(['email' => 'user@example.com', 'password' => 'secret']),
            $dm,
            $hasher,
            $jwtManager
        );

        $this->assertSame(Response::HTTP_OK, $response->getStatusCode());
        $this->assertSame('jwt-token', $this->payload($response)['token']);
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
