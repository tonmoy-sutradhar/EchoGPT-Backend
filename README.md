# Backend Template

Production-ready, reusable NestJS backend starter with JWT auth, PostgreSQL, TypeORM, Redis, Swagger, Winston, and Docker.

## Technology Stack

- **NestJS** – modular Node.js framework
- **PostgreSQL** – relational database
- **TypeORM** – ORM with migrations
- **Swagger / OpenAPI** – API documentation at `/docs`
- **JWT** – access + refresh token authentication
- **Redis** – token storage, caching-ready service
- **Docker Compose** – app + PostgreSQL + Redis
- **class-validator / class-transformer** – DTO validation
- **ConfigModule** – typed environment configuration
- **Winston** – structured logging
- **Helmet + CORS + Throttling** – baseline security

## Architecture

```
src/
├── common/           # Shared decorators, guards, filters, interceptors, utils
├── config/           # App, database, JWT, Redis config + env validation
├── database/         # TypeORM data-source, migrations, seeds
├── logger/           # Winston configuration
├── modules/
│   ├── auth/         # Register, login, logout, refresh
│   ├── users/        # User entity + CRUD (RBAC)
│   ├── health/       # PostgreSQL + Redis health checks
│   └── redis/        # Reusable Redis module/service
├── app.module.ts
└── main.ts
```

Modules are independent so you can add new feature modules under `src/modules/` without touching core infrastructure.

## Installation

```bash
npm install
cp .env.example .env
```

Update secrets in `.env` before deploying anywhere beyond local development.

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Runtime environment | `development` |
| `APP_PORT` | HTTP port | `3000` |
| `API_PREFIX` | Global route prefix | `api` |
| `CORS_ORIGINS` | Comma-separated origins | `http://localhost:3000` |
| `DATABASE_HOST` | PostgreSQL host | `localhost` |
| `DATABASE_PORT` | PostgreSQL port | `5432` |
| `DATABASE_USERNAME` | DB user | `postgres` |
| `DATABASE_PASSWORD` | DB password | `postgres` |
| `DATABASE_NAME` | DB name | `backend_template` |
| `JWT_ACCESS_SECRET` | Access token secret | *(long random string)* |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_SECRET` | Refresh token secret | *(long random string)* |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |

Required variables are validated at startup. The app will not boot if they are missing.

## Local PostgreSQL & Redis

Start only infrastructure:

```bash
docker compose up -d postgres redis
```

Or install PostgreSQL 16+ and Redis 7+ locally and point `.env` at them.

## Migrations

Schema changes are managed with TypeORM migrations (`synchronize` is always `false`).

```bash
# Generate a new migration after entity changes
npm run migration:generate -- src/database/migrations/MigrationName

# Apply pending migrations
npm run migration:run

# Revert the last migration
npm run migration:revert

# Optional admin seed
npm run seed
```

## Running the Project

```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod
```

API base URL: `http://localhost:3000/api/v1`  
Swagger: `http://localhost:3000/docs`

## Docker

```bash
# Build and start backend + postgres + redis
npm run docker:up

# Stop all services
npm run docker:down

# Tail backend logs
npm run docker:logs
```

After containers are healthy, run migrations against the compose network DB (from host with `DATABASE_HOST=localhost`, or exec into the backend container):

```bash
npm run migration:run
```

## API Versioning

All business routes use URI versioning:

```
/api/v1/...
```

## Authentication Flow

1. **Register** – `POST /api/v1/auth/register`
2. **Login** – `POST /api/v1/auth/login` → returns `accessToken` + `refreshToken`
3. **Protected routes** – send `Authorization: Bearer <accessToken>`
4. **Refresh** – `POST /api/v1/auth/refresh` with `{ "refreshToken": "..." }`
5. **Logout** – `POST /api/v1/auth/logout` (revokes refresh token in Redis)

Refresh tokens are stored as SHA-256 hashes in Redis so they can be revoked on logout without storing raw tokens.

### Roles

- `USER` – default
- `ADMIN` – required for user management endpoints

Use `@Roles(Role.ADMIN)` on handlers. `RolesGuard` is registered globally.

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Create account |
| `POST` | `/api/v1/auth/login` | Public | Login |
| `POST` | `/api/v1/auth/refresh` | Public | Refresh tokens |
| `POST` | `/api/v1/auth/logout` | Bearer | Revoke refresh token |
| `GET` | `/api/v1/users/me` | Bearer | Current profile |
| `GET` | `/api/v1/users` | Admin | List users |
| `GET` | `/api/v1/users/:id` | Admin | Get user |
| `PATCH` | `/api/v1/users/:id` | Admin | Update user |
| `DELETE` | `/api/v1/users/:id` | Admin | Delete user |
| `GET` | `/api/v1/health` | Public | App + DB + Redis health |

## Response Format

Success:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Users fetched successfully",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [],
  "timestamp": "2026-01-01T00:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```

## Development Guidelines

- Keep feature code inside `src/modules/<feature>`
- Put shared cross-cutting concerns in `src/common`
- Never hardcode secrets — use `.env`
- Prefer migrations over `synchronize`
- DTOs validate every write payload
- Do not log passwords or JWT tokens
- Add Swagger decorators on new controllers/DTOs

## Useful Scripts

```bash
npm run start:dev
npm run build
npm run lint
npm run format
npm run test
npm run test:e2e
npm run migration:generate -- src/database/migrations/Name
npm run migration:run
npm run migration:revert
npm run docker:up
npm run docker:down
```

## License

MIT
