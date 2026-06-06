<?php

namespace App\Controller;

use App\Document\User;
use Doctrine\ODM\MongoDB\DocumentManager;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/auth', name: 'api_auth_')]
class AuthController extends AbstractController
{
    #[Route('/register', name: 'register', methods: ['POST'])]
    public function register(
        Request $request, 
        DocumentManager $dm, 
        UserPasswordHasherInterface $passwordHasher
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        // Stop early when the account cannot be created; this keeps invalid data out of persistence.
        if (empty($data['email']) || empty($data['password']) || empty($data['name'])) {
            return new JsonResponse(['error' => 'Missing required fields (name, email, password)'], Response::HTTP_BAD_REQUEST);
        }

        // Email is the login identifier, so duplicates would make authentication ambiguous.
        $existingUser = $dm->getRepository(User::class)->findOneBy(['email' => $data['email']]);
        if ($existingUser) {
            return new JsonResponse(['error' => 'Email already registered'], Response::HTTP_CONFLICT);
        }

        $user = new User();
        $user->setName($data['name']);
        $user->setEmail($data['email']);
        $user->setRoles(['ROLE_USER']);

        // Hash against the User object so Symfony can apply the configured password hasher for this user class.
        $hashedPassword = $passwordHasher->hashPassword($user, $data['password']);
        $user->setPassword($hashedPassword);

        // Persist only after validation and hashing have succeeded, so no half-created users are stored.
        $dm->persist($user);
        $dm->flush();

        return new JsonResponse(['status' => 'User successfully registered!'], Response::HTTP_CREATED);
    }


    #[Route('/login', name: 'login', methods: ['POST'])]
    public function login(
        Request $request,
        DocumentManager $dm,
        UserPasswordHasherInterface $passwordHasher,
        JWTTokenManagerInterface $jwtManager
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        // Both fields are required before looking up a user, which avoids unnecessary database work.
        if (empty($data['email']) || empty($data['password'])) {
            return new JsonResponse(
                ['error' => 'Missing required fields (email, password)'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $user = $dm->getRepository(User::class)->findOneBy(['email' => $data['email']]);

        // Use one generic failure response so attackers cannot tell whether the email exists.
        if (!$user || !$passwordHasher->isPasswordValid($user, $data['password'])) {
            return new JsonResponse(
                ['error' => 'Invalid credentials'],
                Response::HTTP_UNAUTHORIZED
            );
        }

        // The frontend stores this JWT and sends it as a bearer token on protected API calls.
        $token = $jwtManager->create($user);

        return new JsonResponse(['token' => $token], Response::HTTP_OK);
    }
}
