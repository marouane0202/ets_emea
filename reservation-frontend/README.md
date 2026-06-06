# Reservation Frontend

## Description

Reservation Frontend is a Next.js application for authenticating users, browsing available sessions, booking reservations, and managing reservation-related pages. It uses React, TypeScript, Tailwind CSS, Jest, ESLint, and a Next.js proxy to redirect unauthenticated users to `/auth`.

## Features

- Login and registration UI backed by the Symfony API.
- JWT token storage in `localStorage` and a `reservation_token` cookie.
- Route-level authentication redirect through `proxy.ts`.
- User reservation listing with pagination.
- Available session booking flow.
- Reservation detail page with cancellation for non-admin users.
- Admin session management page for creating, editing, and deleting sessions.
- Profile page for viewing and updating account information.
- Jest tests for auth role parsing.

## Prerequisites & Installation

The project uses `npm` and runs on Node through the Docker image `node:20-alpine`.

Install dependencies from `reservation-frontend`:

```bash
npm install
```

Environment variable used by the frontend:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

When launched through the root Docker Compose file, the frontend service exposes port `3000`.

## Usage

Run the frontend development server from `reservation-frontend`:

```bash
npm run dev -- --hostname 0.0.0.0 --webpack
```

Run the full application stack from the repository root:

```bash
docker compose up --build
```

The frontend is available at:

```text
http://localhost:3000
```

## Development & Testing

Available npm scripts from `package.json`:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
```

The test runner command uses Jest with the configured script:

```bash
jest --runInBand
```

