# Reservation Backend

## Description

Reservation Backend is a Symfony API for user authentication, profile management, session management, and reservation booking. It uses PHP 8.2, Symfony 7.4 components, Doctrine MongoDB ODM, Lexik JWT Authentication Bundle, Nelmio CORS Bundle, and PHPUnit.

## Features

- User registration through `POST /api/auth/register`.
- User login through `POST /api/auth/login` with JWT token generation.
- Authenticated user profile retrieval through `GET /api/user`.
- Authenticated user profile updates through `PUT /api/user`.
- Authenticated session listing through `GET /api/sessions`.
- Admin-only session creation through `POST /api/sessions`.
- Admin-only session updates through `PUT /api/sessions/{id}`.
- Admin-only session deletion through `DELETE /api/sessions/{id}`.
- Authenticated reservation listing through `GET /api/reservations`.
- Session booking through `POST /api/reservations`.
- Reservation cancellation through `DELETE /api/reservations/{id}`.
- Admin user creation command: `app:create-admin-user`.

## Prerequisites & Installation

The project requires PHP `>=8.2` and uses Composer.

Install dependencies from `reservation-backend`:

```bash
composer install
```

Environment variables present in the Docker configuration:

```bash
MONGODB_URI=mongodb://mongodb:27017
MONGODB_DB=app
APP_ENV=dev
APP_SECRET=change_me
```

Additional environment keys present in the backend configuration include:

```bash
APP_ENV
APP_SECRET
APP_SHARE_DIR
DEFAULT_URI
MONGODB_URI
MONGODB_DB
JWT_SECRET_KEY
JWT_PUBLIC_KEY
JWT_PASSPHRASE
DATABASE_URL
CORS_ALLOW_ORIGIN
```

When launched through the root Docker Compose file, the backend service exposes port `8000` and depends on the `mongodb` service using the `mongo:7.0` image.

## Usage

Run the backend PHP server with the command used by the Dockerfile:

```bash
php -S 0.0.0.0:8000 -t public public/index.php
```

Run the full application stack from the repository root:

```bash
docker compose up --build
```

The backend is available at:

```text
http://localhost:8000
```

Create an admin user with the Symfony console command:

```bash
php bin/console app:create-admin-user email name password
```

The command also supports:

```bash
php bin/console app:create-admin-user email name password --force
```

## Development & Testing

Run PHPUnit from `reservation-backend`:

```bash
./vendor/bin/phpunit
```

The PHPUnit configuration loads tests from:

```text
tests
```

Composer scripts configured in `composer.json`:

```bash
composer install
composer update
```

Symfony auto-scripts configured by Composer:

```bash
cache:clear
assets:install %PUBLIC_DIR%
```
