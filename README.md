# EchoGPT Backend

A production-oriented NestJS backend for an AI platform: authentication, user management, Stripe-backed subscriptions, multi-provider AI (OpenAI, Anthropic, Gemini), chat with streaming, AI-assisted web search, and an admin panel API.

[EchoGPT Database Schema Design.pdf](https://drive.google.com/file/d/1MKs2I8TD4Yu9bRod7Kwi9r519H5EQnf-/view?usp=sharing)
[EchoGPT Diagram Design](https://drive.google.com/file/d/1BKdqH3OKt4pKmZIosygoSlppE_Mfez6X/view?usp=sharing)
[Postman collection](https://drive.google.com/file/d/1X8hqK10_nIRTaWfWVEZ1kHDwZyVFDRYm/view?usp=sharing)

## Tech Stack

| Area          | Technology                                                        |
| ------------- | ----------------------------------------------------------------- |
| Framework     | NestJS (TypeScript)                                               |
| Database      | PostgreSQL 16 (TypeORM, SQL migrations)                           |
| Cache / infra | Redis 7                                                           |
| Auth          | JWT access + refresh tokens (DB-backed sessions), bcrypt          |
| Payments      | Stripe Checkout, Billing Portal, Webhooks                         |
| Email         | Nodemailer (SMTP)                                                 |
| AI providers  | OpenAI, Anthropic (Claude), Google Gemini                         |
| Web search    | SerpApi                                                           |
| Docs          | Swagger / OpenAPI                                                 |
| Security      | Helmet, CORS, Throttler (rate limiting), AES-256-GCM for API keys |
| Logging       | Winston                                                           |
| Containers    | Docker, Docker Compose                                            |

## Features

- **Authentication**: register, login, logout (single / all devices), JWT + refresh token rotation, email verification, forgot/reset password.
- **User management**: profile, update profile, change password, delete account (soft delete), roles (admin/user), admin user CRUD with pagination.
- **Subscriptions**: Free and Premium (monthly/yearly) plans, Stripe checkout, billing portal, webhook sync, usage limits, remaining requests API.
- **AI providers**: add/edit/delete, enable/disable, encrypted API keys, default provider, health checks.
- **Chat**: send prompt, provider selection, conversation history, SSE streaming.
- **Web search**: AI-summarized search, history, recent searches, suggestions, DB result caching.
- **Admin panel**: dashboard stats, subscription overview, API usage analytics, request logs, system health.

## Architecture

```
src/
├── main.ts                    # Bootstrap: Helmet, CORS, versioning, Swagger
├── app.module.ts              # Root module, global guards/interceptors/filters
├── config/                    # Typed config + env validation
├── common/                    # Decorators, guards, filters, interceptors, enums, utils
├── database/
│   ├── data-source.ts         # TypeORM CLI data source
│   ├── migrations/            # SQL migrations (source of truth for schema)
│   └── seeds/                 # Seed scripts
├── logger/                    # Winston config
└── modules/
    ├── auth/                  # Register, login, sessions, email verify, password reset
    ├── users/                 # Profile + admin user management
    ├── roles/                 # Roles entity
    ├── subscriptions/         # Plans, subscriptions, usage counters, Stripe webhook
    ├── stripe/                # Stripe client wrapper (global)
    ├── ai-providers/          # Provider registry, key encryption, health checks
    ├── chat/                  # Conversations, messages, provider adapters, SSE
    ├── web-search/            # Search, cache, suggestions, history
    ├── observability/         # Usage/request log entities and services
    ├── admin/                 # Admin dashboard, analytics, logs, health
    ├── mailer/                # SMTP email service
    ├── health/                # Public health endpoint (Terminus)
    └── redis/                 # Redis client wrapper
```

### Key design decisions

- **Schema via migrations**: `synchronize` is off; all schema (including partial unique indexes, CHECK constraints, triggers) lives in SQL migrations.
- **Sessions in PostgreSQL**: each login creates a `sessions` row storing a SHA-256 hash of the refresh token. Refresh rotates the session; logout revokes it. Multi-device is supported.
- **Global guards**: `JwtAuthGuard` protects everything by default; use `@Public()` to opt out and `@Roles(Role.ADMIN)` for admin-only routes.
- **Uniform responses**: a global interceptor wraps successes as `{ success, statusCode, message, data }`; a global exception filter formats errors consistently.
- **API keys encrypted at rest**: AI provider keys are encrypted with AES-256-GCM. Only the last 4 characters are stored in plain text for display.
- **Provider adapter pattern**: one adapter per AI vendor behind a common shape, so adding a provider is isolated.
- **Soft deletes**: users, conversations and providers use `deleted_at`.
- **Usage limits**: plans define monthly chat/search limits (`-1` means unlimited); counters are tracked per billing period.

## Prerequisites

- Node.js 20+
- Docker and Docker Compose (for PostgreSQL and Redis)
- A Stripe account (test mode)
- An SMTP account (e.g. Gmail with an App Password)
- Optional: SerpApi key for web search, and at least one AI provider key

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in the values (see [Environment Variables](#environment-variables)).

### 3. Start PostgreSQL and Redis

```bash
docker compose up -d postgres redis
```

Make sure nothing else is already using ports `5432` and `6379` (for example a local PostgreSQL or pgAdmin service). If the database named in `DATABASE_NAME` does not exist yet, create it:

```bash
docker exec -it backend_postgres psql -U postgres -c "CREATE DATABASE \"<your_db_name>\";"
```

### 4. Run migrations

```bash
npm run typeorm -- migration:run -d src/database/data-source.ts
```

### 5. Link Stripe price IDs to plans

After creating monthly and yearly prices in the Stripe dashboard and setting them in `.env`:

```bash
npx ts-node -r tsconfig-paths/register src/database/seeds/plans.seed.ts
```

### 6. Start the app

```bash
npm run start:dev
```

- API base: `http://localhost:3000/api/v1`
- Swagger UI: `http://localhost:3000/docs`

### 7. Stripe webhooks (local)

In a separate terminal:

```bash
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe
```

Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET` and restart the app.

## Creating an Admin User

There is intentionally no public endpoint to create admins.

1. Register a normal user via `POST /api/v1/auth/register`.
2. Promote the user in the database:

```sql
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'admin'),
    status = 'active',
    email_verified_at = NOW()
WHERE email = 'admin@example.com';
```

3. Log in and use the returned access token.

## Environment Variables

| Variable                                                                                | Description                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `NODE_ENV`                                                                              | `development` / `production` / `test`           |
| `APP_PORT`, `API_PREFIX`                                                                | Server port and global prefix (default `api`)   |
| `CORS_ORIGINS`                                                                          | Comma-separated allowed origins                 |
| `THROTTLE_TTL`, `THROTTLE_LIMIT`                                                        | Rate limit window (seconds) and max requests    |
| `DATABASE_HOST/PORT/USERNAME/PASSWORD/NAME/SSL`                                         | PostgreSQL connection                           |
| `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`                                            | Access token secret and TTL (e.g. `15m`)        |
| `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`                                          | Refresh token secret and TTL (e.g. `7d`)        |
| `REDIS_HOST/PORT/PASSWORD/DB`                                                           | Redis connection                                |
| `SMTP_HOST/PORT/SECURE/USER/PASSWORD`                                                   | SMTP credentials                                |
| `MAIL_FROM_NAME`, `MAIL_FROM_EMAIL`                                                     | Sender identity                                 |
| `APP_FRONTEND_URL`                                                                      | Base URL used in verification/reset email links |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`                                            | Stripe credentials                              |
| `STRIPE_PRICE_PREMIUM_MONTHLY`, `STRIPE_PRICE_PREMIUM_YEARLY`                           | Stripe Price IDs (`price_...`)                  |
| `STRIPE_CHECKOUT_SUCCESS_URL`, `STRIPE_CHECKOUT_CANCEL_URL`, `STRIPE_PORTAL_RETURN_URL` | Redirect URLs                                   |
| `ENCRYPTION_KEY`                                                                        | Master key for encrypting AI provider API keys  |
| `SERPAPI_KEY`                                                                           | Web search provider key                         |
| `SEARCH_CACHE_TTL_HOURS`                                                                | Search cache TTL (default 24)                   |

Generate a strong encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## API Overview

All routes are prefixed with `/api/v1`. Full request/response details are in Swagger at `/docs`.

| Group                | Routes                                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth                 | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all`, `/auth/verify-email`, `/auth/resend-verification`, `/auth/forgot-password`, `/auth/reset-password` |
| Users                | `GET/PATCH/DELETE /users/me`, `PATCH /users/me/password`; admin: `GET /users`, `GET/PATCH/DELETE /users/:id`                                                                                  |
| Subscriptions        | `GET /subscriptions/plans`, `/subscriptions/me`, `/subscriptions/usage`; `POST /subscriptions/checkout`, `/portal`, `/cancel`                                                                 |
| AI Providers (admin) | `POST/GET /ai-providers`, `GET/PATCH/DELETE /ai-providers/:id`, `PATCH /:id/enable`, `/:id/disable`, `/:id/set-default`, `POST /:id/health-check`, `POST /health-check/all`                   |
| Chat                 | `POST /chat/send`, `GET /chat/stream` (SSE), `POST/GET /chat/conversations`, `GET/PATCH/DELETE /chat/conversations/:id`                                                                       |
| Web Search           | `POST /search`, `GET /search/history`, `/search/recent`, `/search/suggestions`, `DELETE /search/history[/:id]`                                                                                |
| Admin                | `GET /admin/dashboard`, `/admin/subscriptions`, `/admin/analytics/usage`, `/admin/logs/requests`, `/admin/system-health`, `/admin/system-health/history`                                      |
| Health               | `GET /health` (public)                                                                                                                                                                        |
| Webhooks             | `POST /webhooks/stripe` (called by Stripe)                                                                                                                                                    |

### Authentication

Send the access token on protected routes:

```
Authorization: Bearer <accessToken>
```

Users must verify their email before they can log in.

## Typical User Flow

1. Register, then verify email using the emailed link.
2. Log in to receive access and refresh tokens (a Free subscription is created automatically at registration).
3. Optionally upgrade via `POST /subscriptions/checkout` and complete payment on Stripe. The webhook activates Premium.
4. Use chat and search; usage counts against the plan limits.
5. Log out from the current device or all devices.

## Typical Admin Flow

1. Promote an account to admin (see above) and log in.
2. Add an AI provider with a real API key, set it as default, and run a health check.
3. Manage users, monitor subscriptions, usage analytics, request logs and system health.

## Default Plans

| Plan            | Price   | Chat / month | Search / month |
| --------------- | ------- | ------------ | -------------- |
| Free            | $0      | 50           | 20             |
| Premium Monthly | $19.99  | Unlimited    | Unlimited      |
| Premium Yearly  | $199.99 | Unlimited    | Unlimited      |

Limits and prices are seeded by migration and can be changed in the `plans` table. Actual charges are defined by your Stripe prices.

## Migrations

| Migration                   | Contents                                               |
| --------------------------- | ------------------------------------------------------ |
| `CreateAuthSchema`          | roles, users, sessions, email_verifications            |
| `CreatePasswordResets`      | password_resets                                        |
| `CreateSubscriptionSchema`  | plans, subscriptions, usage_counters                   |
| `CreateAiProviderSchema`    | ai_providers, provider_models, provider_health_checks  |
| `CreateChatSchema`          | conversations, chat_messages                           |
| `CreateWebSearchSchema`     | web_searches, search_results_cache, search_suggestions |
| `CreateObservabilitySchema` | api_usage_logs, request_logs, system_health_snapshots  |

Revert the last migration:

```bash
npm run typeorm -- migration:revert -d src/database/data-source.ts
```

## Running with Docker (full stack)

```bash
docker compose up -d --build
```

The `backend` service uses the Dockerfile in the repo root and connects to the `postgres` and `redis` services on the internal network.

## Testing

```bash
npm run test        # unit tests
npm run test:e2e    # e2e tests (requires PostgreSQL and Redis running)
```

## Security Notes

- Passwords hashed with bcrypt (12 rounds).
- Refresh tokens stored only as SHA-256 hashes; rotated on every refresh.
- Password change, reset, suspend and account deletion revoke all sessions.
- Forgot-password and resend-verification responses do not reveal whether an email exists.
- Provider API keys encrypted with AES-256-GCM and never returned in responses.
- Helmet, CORS allow-list, request validation with whitelisting, and global rate limiting.
- Stripe webhooks verified using the signature and raw request body.

## Known Limitations

- Email sending is fire-and-forget; production should use a queue with retries.
- Stripe webhook events are not deduplicated by event ID.
- Gemini streaming returns the full response as a single chunk.
- SSE streaming uses `GET` with query parameters, so prompts are length-limited by URL size.

## Tonmoy Sutradhar
