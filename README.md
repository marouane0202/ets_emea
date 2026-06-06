# ETS Reservation System

## Overview
This workspace contains two projects:
- `reservation-backend`: Symfony API backend with MongoDB and JWT authentication.
- `reservation-frontend`: Next.js frontend for booking and admin management.

## Features
- User registration and login with JWT
- Profile page and logout
- Reservation list and details
- Admin session CRUD and admin-only monitoring
- Docker support for backend, frontend, and MongoDB
- Automated tests with PHPUnit and Jest

## Start with Docker
```bash
docker compose up --build
```
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

## Run backend tests
```bash
cd reservation-backend
composer install
./vendor/bin/phpunit
```

## Run frontend tests
```bash
cd reservation-frontend
npm install
npm test
```

## Project docs
- `reservation-backend/README.md` — backend features and commands
- `reservation-frontend/README.md` — frontend features and commands
