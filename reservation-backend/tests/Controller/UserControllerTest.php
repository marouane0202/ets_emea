<?php

namespace App\Tests\Controller;

use App\Controller\UserController;
use App\Document\User;
use Doctrine\ODM\MongoDB\DocumentManager;
use Doctrine\Persistence\ObjectRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;

class UserControllerTest extends TestCase
{
    public function testShowReturnsCurrentUser(): void
    {
        $user = new User();
        $user->setEmail('user@example.com');
        $user->setName('Test User');

        $controller = $this->getMockBuilder(UserController::class)
            ->onlyMethods(['getUser'])
            ->getMock();

        $controller->method('getUser')->willReturn($user);

        $response = $controller->show();
        $this->assertInstanceOf(JsonResponse::class, $response);

        $payload = json_decode($response->getContent(), true);
        $this->assertSame('user@example.com', $payload['user']['email']);
        $this->assertSame('Test User', $payload['user']['name']);
    }

    public function testUpdateChangesUserFields(): void
    {
        $user = new User();
        $user->setEmail('user@example.com');
        $user->setName('Test User');

        $request = new Request([], [], [], [], [], [], json_encode([
            'name' => 'Updated Name',
            'email' => 'updated@example.com',
        ]));

        $repository = $this->createMock(ObjectRepository::class);
        $repository->method('findOneBy')->willReturn(null);

        $documentManager = $this->createMock(DocumentManager::class);
        $documentManager->method('getRepository')->with(User::class)->willReturn($repository);
        $documentManager->expects($this->once())->method('flush');

        $controller = $this->getMockBuilder(UserController::class)
            ->onlyMethods(['getUser'])
            ->getMock();

        $controller->method('getUser')->willReturn($user);

        $response = $controller->update($request, $documentManager);
        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertSame(200, $response->getStatusCode());

        $payload = json_decode($response->getContent(), true);
        $this->assertSame('Updated Name', $payload['user']['name']);
        $this->assertSame('updated@example.com', $payload['user']['email']);
    }
}
