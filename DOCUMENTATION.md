# Backend Template — How It Works

Complete guide for this NestJS backend starter: architecture, request flow, authentication, environment setup, and usage examples.

---

## Table of Contents

1. [Overview](#1-overview)
2. [How the App Starts](#2-how-the-app-starts)
3. [Project Structure](#3-project-structure)
4. [Environment Variables](#4-environment-variables)
5. [How Authentication Works](#5-how-authentication-works)
6. [How Authorization (RBAC) Works](#6-how-authorization-rbac-works)
7. [How API Responses Work](#7-how-api-responses-work)
8. [How Errors Are Handled](#8-how-errors-are-handled)
9. [How Database & Migrations Work](#9-how-database--migrations-work)
10. [How Redis Is Used](#10-how-redis-is-used)
11. [How Health Checks Work](#11-how-health-checks-work)
12. [How Security Is Applied](#12-how-security-is-applied)
13. [API Endpoints](#13-api-endpoints)
14. [Quick Start](#14-quick-start)
15. [Docker](#15-docker)

---

## 1. Overview

This template is a reusable, production-oriented NestJS backend with:

| Layer | Technology | Purpose |
|---|---|---|
| Framework | NestJS | Modular API architecture |
| Database | PostgreSQL + TypeORM | Persistent data + migrations |
| Auth | JWT (access + refresh) | Secure login sessions |
| Cache / tokens | Redis | Refresh-token storage, future caching/OTP |
| Docs | Swagger | Interactive API docs at `/docs` |
| Validation | class-validator | Request DTO validation |
| Logging | Winston | Dev-friendly + production JSON logs |
| Runtime | Docker Compose | App + Postgres + Redis |

All business APIs are versioned under:

```text
/api/v1/...
```

Swagger UI:

```text
http://localhost:3000/docs
```

---

## 2. How the App Starts

Boot sequence (`src/main.ts` + `src/app.module.ts`):

1. **ConfigModule** loads `.env` and validates required variables.
2. **TypeORM** connects to PostgreSQL (`synchronize: false`).
3. **Redis** client connects (used by auth + health).
4. **Winston** becomes the Nest logger.
5. Global middleware/guards/pipes are registered:
   - Helmet (HTTP headers)
   - CORS (from `CORS_ORIGINS`)
   - ValidationPipe (`whitelist`, `forbidNonWhitelisted`, `transform`)
   - API prefix + URI versioning (`/api/v1`)
   - JWT Auth Guard (global)
   - Roles Guard (global)
   - Throttler Guard (rate limit)
   - Transform Interceptor (success envelope)
   - Global Exception Filter (error envelope)
6. Swagger is mounted at `/docs`.
7. Server listens on `APP_PORT`.

If any required env variable is missing/invalid, the process **exits at startup**.

---

## 3. Project Structure

```text
src/
├── common/
│   ├── constants/       # Shared keys (roles metadata, redis token, etc.)
│   ├── decorators/      # @Public(), @Roles(), @CurrentUser()
│   ├── dto/             # Shared response DTO shape
│   ├── enums/           # Role enum (USER, ADMIN)
│   ├── filters/         # GlobalExceptionFilter
│   ├── guards/          # RolesGuard
│   ├── interceptors/    # Transform + HTTP logging
│   ├── interfaces/      # ApiResponse, JwtPayload, AuthenticatedUser
│   ├── middleware/      # Optional request logger
│   ├── pipes/           # Placeholder for custom pipes
│   └── utils/           # bcrypt helpers, duration parser
│
├── config/              # registerAs configs + validateEnv()
├── database/
│   ├── data-source.ts   # TypeORM CLI data source
│   ├── migrations/      # Schema migrations
│   └── seeds/           # Optional admin seed
│
├── logger/              # Winston config (dev vs prod)
│
├── modules/
│   ├── auth/            # Register / login / refresh / logout
│   ├── users/           # User entity + profile/admin CRUD
│   ├── health/          # GET /health
│   └── redis/           # Global Redis module/service
│
├── app.module.ts
└── main.ts
```

**Rule of thumb:** put new features in `src/modules/<feature>` and keep shared cross-cutting code in `src/common`.

---

## 4. Environment Variables

### Setup

```bash
cp .env.example .env
```

Edit `.env` before running. **Never commit `.env`.**

### Full `.env` example

```env
# ============================================================
# APPLICATION
# ============================================================
NODE_ENV=development
APP_NAME=Backend Template
APP_PORT=3000
API_PREFIX=api

# Comma-separated allowed frontend origins
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Rate limiting: max requests per TTL window (seconds)
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# Winston log level: error | warn | info | http | verbose | debug | silly
LOG_LEVEL=debug

# ============================================================
# POSTGRESQL (TypeORM)
# ============================================================
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=backend_template
DATABASE_SSL=false

# ============================================================
# JWT AUTHENTICATION
# ============================================================
# Use long random secrets in real environments (32+ chars)
JWT_ACCESS_SECRET=change-me-access-secret-min-32-chars!!
JWT_ACCESS_EXPIRES_IN=15m

JWT_REFRESH_SECRET=change-me-refresh-secret-min-32-chars!
JWT_REFRESH_EXPIRES_IN=7d

# ============================================================
# REDIS
# ============================================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Variable reference

| Variable | Required | Description | Example |
|---|---|---|---|
| `NODE_ENV` | No (default `development`) | `development` \| `production` \| `test` | `development` |
| `APP_NAME` | No | App name shown in logs/Swagger | `Backend Template` |
| `APP_PORT` | **Yes** | HTTP port | `3000` |
| `API_PREFIX` | No | Global route prefix | `api` |
| `CORS_ORIGINS` | No | Allowed origins (comma-separated) | `http://localhost:5173` |
| `THROTTLE_TTL` | No | Throttle window in seconds | `60` |
| `THROTTLE_LIMIT` | No | Max requests per window | `100` |
| `LOG_LEVEL` | No | Winston level | `info` |
| `DATABASE_HOST` | **Yes** | Postgres host | `localhost` |
| `DATABASE_PORT` | **Yes** | Postgres port | `5432` |
| `DATABASE_USERNAME` | **Yes** | DB user | `postgres` |
| `DATABASE_PASSWORD` | **Yes** | DB password | `postgres` |
| `DATABASE_NAME` | **Yes** | DB name | `backend_template` |
| `DATABASE_SSL` | No | Enable SSL (`true`/`false`) | `false` |
| `JWT_ACCESS_SECRET` | **Yes** | Access token signing secret | long random string |
| `JWT_ACCESS_EXPIRES_IN` | No | Access TTL (`15m`, `1h`, …) | `15m` |
| `JWT_REFRESH_SECRET` | **Yes** | Refresh token signing secret | long random string |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh TTL | `7d` |
| `REDIS_HOST` | **Yes** | Redis host | `localhost` |
| `REDIS_PORT` | **Yes** | Redis port | `6379` |
| `REDIS_PASSWORD` | No | Redis password (empty = none) | `` |
| `REDIS_DB` | No | Redis logical DB index | `0` |

### Docker Compose note

When running with Docker Compose, the backend container overrides:

- `DATABASE_HOST=postgres`
- `REDIS_HOST=redis`

because those are the Compose service names.

---

## 5. How Authentication Works

### Tokens

| Token | Lifetime (default) | Stored where? | Used for |
|---|---|---|---|
| Access token | `15m` | Client only (memory/local storage) | Protect API routes |
| Refresh token | `7d` | Client + **hashed copy in Redis** | Get new access token / logout revoke |

Passwords are hashed with **bcrypt** (12 salt rounds). Raw JWT tokens are never logged.

### Flow

```text
1) POST /api/v1/auth/register
   -> creates user
   -> returns user + accessToken + refreshToken
   -> stores sha256(refreshToken) in Redis with TTL

2) POST /api/v1/auth/login
   -> validates email/password
   -> same token response as register

3) Protected request
   Header: Authorization: Bearer <accessToken>
   -> JwtAuthGuard verifies access JWT
   -> attaches { id, email, role } to request.user

4) POST /api/v1/auth/refresh
   Body: { "refreshToken": "..." }
   -> verifies refresh JWT signature/expiry
   -> checks Redis hash matches
   -> issues new token pair

5) POST /api/v1/auth/logout  (requires access token)
   -> deletes refresh hash from Redis
   -> old refresh token can no longer be used
```

### Example: Register

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

### Example: Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

### Example success response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER",
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

### Example: Call a protected route

```http
GET /api/v1/users/me
Authorization: Bearer <accessToken>
```

### Public vs protected routes

- By default, **all routes require JWT** (global `JwtAuthGuard`).
- Mark public endpoints with `@Public()` (register, login, refresh, health).

---

## 6. How Authorization (RBAC) Works

Roles are defined in `Role` enum:

- `USER` — default for new accounts
- `ADMIN` — required for user management endpoints

Usage on a controller method:

```ts
@Roles(Role.ADMIN)
@Get()
findAll() { ... }
```

`RolesGuard` (global) reads `@Roles(...)` metadata and compares it to `request.user.role`.

If the role does not match → `403 Forbidden`.

---

## 7. How API Responses Work

`TransformInterceptor` wraps successful controller returns into a standard envelope.

### Success shape

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Users fetched successfully",
  "data": {}
}
```

Controllers typically return:

```ts
return {
  message: 'Profile fetched successfully',
  data: profile,
};
```

The interceptor fills `success` and `statusCode`.

---

## 8. How Errors Are Handled

`GlobalExceptionFilter` catches:

- Validation errors
- `BadRequestException`, `UnauthorizedException`, `ForbiddenException`
- `NotFoundException`, `ConflictException`
- TypeORM / database errors (e.g. unique constraint → 409)
- Unexpected errors

### Error shape

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    "email must be an email",
    "password must be longer than or equal to 8 characters"
  ],
  "timestamp": "2026-09-24T08:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```

In **production**, internal stack traces and raw DB details are not exposed to clients.

---

## 9. How Database & Migrations Work

- ORM: **TypeORM**
- Driver: **PostgreSQL**
- Primary keys: **UUID**
- Schema changes: **migrations only** (`synchronize: false`)

### Commands

```bash
# Create migration from entity changes
npm run migration:generate -- src/database/migrations/AddSomething

# Apply migrations
npm run migration:run

# Undo last migration
npm run migration:revert

# Seed default admin (optional)
npm run seed
```

### Default seed admin (after `npm run seed`)

```text
Email:    admin@example.com
Password: AdminPass123!
Role:     ADMIN
```

### User entity fields

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | string | |
| `email` | string | Unique |
| `password` | string | Hashed, excluded from responses |
| `role` | enum | `USER` \| `ADMIN` |
| `isActive` | boolean | Inactive users cannot login |
| `createdAt` | timestamptz | Auto |
| `updatedAt` | timestamptz | Auto |

---

## 10. How Redis Is Used

`RedisModule` is global. `RedisService` exposes:

- `get` / `set` / `del` / `exists` / `ping`

Current production use:

- Store **hashed refresh tokens** under key `refresh_token:<userId>`

Designed for easy extension later:

- Caching
- OTP codes
- Rate-limit counters
- Sessions
- Background job coordination

---

## 11. How Health Checks Work

```http
GET /api/v1/health
```

Checks:

1. Application is up
2. PostgreSQL connectivity (TypeORM ping)
3. Redis connectivity (`PING` → `PONG`)

Public endpoint (no JWT required).

---

## 12. How Security Is Applied

| Feature | Implementation |
|---|---|
| HTTP headers | Helmet |
| CORS | Configurable via `CORS_ORIGINS` |
| Rate limiting | `@nestjs/throttler` |
| Password hashing | bcrypt |
| JWT secrets | From env only (never hardcoded) |
| Mass assignment protection | ValidationPipe whitelist + forbidNonWhitelisted |
| Refresh revocation | Redis hash delete on logout |
| Safe errors | Filter hides internals in production |

---

## 13. API Endpoints

Base URL: `http://localhost:3000/api/v1`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Create account |
| `POST` | `/auth/login` | Public | Login |
| `POST` | `/auth/refresh` | Public | Rotate tokens |
| `POST` | `/auth/logout` | Bearer | Revoke refresh token |
| `GET` | `/users/me` | Bearer | Current user profile |
| `GET` | `/users` | Admin | List users |
| `GET` | `/users/:id` | Admin | Get user by id |
| `PATCH` | `/users/:id` | Admin | Update user |
| `DELETE` | `/users/:id` | Admin | Delete user |
| `GET` | `/health` | Public | Health status |

Interactive docs: **http://localhost:3000/docs**

---

## 14. Quick Start

### Option A — Local app + Docker infra

```bash
# 1) Install
npm install
cp .env.example .env

# 2) Start Postgres + Redis
docker compose up -d postgres redis

# 3) Migrate (+ optional seed)
npm run migration:run
npm run seed

# 4) Run API
npm run start:dev
```

Open:

- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/docs

### Option B — Full Docker stack

```bash
cp .env.example .env
npm run docker:up
```

Migrations run automatically in the container when `RUN_MIGRATIONS=true`.

---

## 15. Docker

### Services

| Service | Image / build | Port |
|---|---|---|
| `backend` | NestJS Dockerfile | `3000` |
| `postgres` | `postgres:16-alpine` | `5432` |
| `redis` | `redis:7-alpine` | `6379` |

Postgres and Redis use named volumes for persistence.

### Commands

```bash
npm run docker:up
npm run docker:down
npm run docker:logs
```

---

## Development Checklist for New Features

1. Create `src/modules/<feature>/`
2. Add entity + DTOs + service + controller + module
3. Import the module in `app.module.ts`
4. Mark public routes with `@Public()` if needed
5. Protect admin routes with `@Roles(Role.ADMIN)`
6. Generate and run a migration for schema changes
7. Add Swagger decorators
8. Keep secrets in `.env` only

---

## Useful Scripts

```bash
npm run start:dev
npm run build
npm run start:prod
npm run lint
npm run format
npm run test
npm run test:e2e
npm run migration:generate -- src/database/migrations/Name
npm run migration:run
npm run migration:revert
npm run seed
npm run docker:up
npm run docker:down
```

---

## Summary

This template gives you a clean enterprise baseline:

- Modular NestJS architecture
- JWT access + refresh auth with Redis revocation
- Role-based access control
- Consistent success/error API format
- Validated environment config
- TypeORM migrations (no Prisma, no `synchronize` in production)
- Swagger, Winston, Helmet, CORS, throttling
- Docker Compose for one-command infrastructure

Copy it, update `.env`, run migrations, and start building features under `src/modules/`.
