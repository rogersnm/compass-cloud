# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Compass Cloud is the headless REST API backend for the Compass task/document tracker. Built with Next.js 16 (App Router), PostgreSQL, and Drizzle ORM. Deployed to AWS ECS Fargate via CDK.

Compass project key: **CLOUD**

## Commands

```bash
# Local dev
docker compose -f infra/docker-compose.yml up -d   # Start PostgreSQL on port 5434
npm run dev                                          # Next.js dev server on :3000

# Quality gates (CI runs all four)
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests (requires PostgreSQL running)

# Run all tests
npm test

# Run a single test file
npx vitest run tests/unit/dag.test.ts
npx vitest run tests/integration/tasks.test.ts

# Watch mode
npm run test:watch

# Database
npm run db:migrate    # Run migrations
npm run db:generate   # Generate migrations from schema changes
npm run db:studio     # Drizzle Studio GUI

# E2E (runs CLI integration tests against dockerized API)
./e2e.sh
```

## Architecture

### Source Layout

- `src/app/api/v1/` - REST API routes (auth, orgs, projects, tasks, documents, invitations, search)
- `src/app/api/health/` - Health check endpoint (`/api/health`)
- `src/app/auth/device/` - Device authorization flow UI pages
- `src/lib/auth/` - Authentication: JWT tokens, API keys (`cpk_` prefix), device flow, middleware
- `src/lib/services/` - Business logic layer (orgs, projects, tasks, documents, invitations, search)
- `src/lib/db/` - Drizzle ORM schema, connection, migration runner
- `src/lib/dag/` - Directed acyclic graph utilities for task dependencies (cycle detection, topological sort)
- `src/lib/errors.ts` - Custom AppError hierarchy with standardized error responses
- `src/lib/validation.ts` - Zod schemas for request validation
- `infra/cdk/` - AWS CDK stacks (StatefulStack: VPC/RDS/Secrets, StatelessStack: ECS/ALB/ECR)
- `drizzle/migrations/` - Generated SQL migration files
- `tests/` - Unit, integration, and e2e tests with shared helpers

### Key Patterns

- **Versioned entities**: Projects, tasks, and documents use an append-only version history. Rows have `is_current` flag; queries filter on `is_current = true AND deleted_at IS NULL`.
- **Soft deletes**: Most entities use a `deleted_at` timestamp rather than hard deletes.
- **Two auth modes**: JWT (via Bearer token, requires `X-Org-Slug` header) and API keys (org-scoped, `cpk_` prefix). Auth middleware in `src/lib/auth/middleware.ts` handles both.
- **UUID primary keys**: Generated via `crypto.randomUUID()`.
- **Display IDs**: Tasks and documents get sequential org-scoped display IDs (e.g., `T00001`, `D00001`).
- **Task dependencies**: Stored as edges in a DAG. Cycle validation happens before insert.

### Database

- PostgreSQL 16+ with Drizzle ORM
- Schema defined in `src/lib/db/schema.ts`
- Migrations in `drizzle/migrations/`, run via `npm run db:migrate`
- Local dev database on port 5434 (not default 5432) to avoid conflicts

### Testing

- **Framework**: Vitest 4 with `globals: true` and `fileParallelism: false`
- **Test DB**: `compass_test` database on localhost:5434 (auto-configured in vitest.config.ts)
- Integration tests create/teardown their own data per test using helpers in `tests/helpers/`

## Commit Style

Use [Conventional Commits](https://www.conventionalcommits.org/). Format: `type(scope): description`

Types: `feat`, `fix`, `test`, `build`, `ci`, `infra`, `docs`, `chore`, `refactor`

Scopes (optional): `auth`, `orgs`, `projects`, `tasks`, `docs`

Examples:
- `feat(tasks): add bulk delete endpoint`
- `fix(auth): handle expired refresh tokens`
- `test(orgs): add multi-tenant isolation tests`
- `infra: increase ECS task memory to 2048`

### Environment Variables

```
DATABASE_URL=postgresql://compass:compass@localhost:5434/compass  # or individual DB_HOST/DB_PORT/etc.
JWT_SECRET=<required>
API_BASE_URL=<optional, for device auth links>
DB_SSLMODE=<optional, e.g. "no-verify" for RDS>
```
