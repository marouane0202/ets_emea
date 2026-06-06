<?php

namespace App\Controller;

use App\Document\User;
use Doctrine\ODM\MongoDB\DocumentManager;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class UserController extends AbstractController
{
    #[Route('/api/user', name: 'api_user_show', methods: ['GET'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function show(): JsonResponse
    {
        $user = $this->getUser();

        // The route is protected, but this guard keeps the method safe if security is bypassed in tests or config.
        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        // Return only profile fields the frontend needs, avoiding accidental exposure of roles or password hashes.
        return new JsonResponse([
            'status' => 'User fetched successfully',
            'user' => [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'name' => $user->getName(),
            ],
        ], Response::HTTP_OK);
    }

    #[Route('/api/user', name: 'api_user_update', methods: ['PUT'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function update(Request $request, DocumentManager $dm): JsonResponse
    {
        $user = $this->getUser();

        // Profile updates must be tied to the authenticated document user.
        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $data = json_decode($request->getContent(), true);
        // Reject non-object JSON so later checks do not silently treat malformed input as an empty update.
        if (!is_array($data)) {
            return new JsonResponse(['error' => 'Invalid JSON body'], Response::HTTP_BAD_REQUEST);
        }

        // At least one editable field must be present; otherwise the request has no meaningful effect.
        if (!array_key_exists('name', $data) && !array_key_exists('email', $data)) {
            return new JsonResponse(
                ['error' => 'At least one of name or email must be provided'],
                Response::HTTP_BAD_REQUEST
            );
        }

        if (array_key_exists('email', $data)) {
            // Trim before validation so whitespace-only emails are rejected and stored emails stay canonical.
            $email = trim((string) $data['email']);
            if ($email === '') {
                return new JsonResponse(['error' => 'Email cannot be empty'], Response::HTTP_BAD_REQUEST);
            }

            // Prevent two accounts from sharing the same login identifier.
            $existing = $dm->getRepository(User::class)->findOneBy(['email' => $email]);
            if ($existing && $existing->getId() !== $user->getId()) {
                return new JsonResponse(['error' => 'Email already in use'], Response::HTTP_CONFLICT);
            }

            $user->setEmail($email);
        }

        if (array_key_exists('name', $data)) {
            // Names are display data, but blank names make admin/user views harder to read.
            $name = trim((string) $data['name']);
            if ($name === '') {
                return new JsonResponse(['error' => 'Name cannot be empty'], Response::HTTP_BAD_REQUEST);
            }

            $user->setName($name);
        }

        $dm->flush();

        return new JsonResponse([
            'status' => 'User updated successfully',
            'user' => [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'name' => $user->getName(),
            ],
        ], Response::HTTP_OK);
    }
}
