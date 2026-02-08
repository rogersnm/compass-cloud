# compass-cloud

Headless REST API backend for [compass](https://github.com/rogersnm/compass), a markdown-native task and document tracker. Built with Next.js App Router, Drizzle ORM, and PostgreSQL. Deployed to AWS ECS Fargate via CDK.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Next.js 16 (App Router, standalone output), Node.js 25 |
| Language | TypeScript 5 (strict mode) |
| Database | PostgreSQL 16+ with Drizzle ORM 0.45 |
| Auth | JWT access/refresh tokens, API keys (`cpk_` prefix), OAuth 2.0 device flow |
| Validation | Zod |
| Infrastructure | AWS CDK (ECS Fargate, ALB, RDS, Secrets Manager) |
| Testing | Vitest 4 (unit + integration) |
| CI/CD | GitHub Actions |

## Local Development

```bash
# Start Postgres (runs on port 5434 to avoid conflicts with local installs)
docker compose -f infra/docker-compose.yml up -d

# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Start dev server
npm run dev
```

The API runs at `http://localhost:3000`. All endpoints are under `/api/v1/`.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes* | Full Postgres connection string |
| `DB_HOST` | Yes* | Postgres host (alternative to `DATABASE_URL`) |
| `DB_PORT` | No | Postgres port (default: 5432) |
| `DB_USERNAME` | Yes* | Postgres user |
| `DB_PASSWORD` | Yes* | Postgres password |
| `DB_NAME` | No | Database name (default: compass) |
| `DB_SSLMODE` | No | SSL mode (`no-verify` for RDS) |
| `JWT_SECRET` | Yes | Secret for signing JWTs |
| `API_BASE_URL` | No | Public base URL for device auth verification links |

\* Provide either `DATABASE_URL` or the individual `DB_*` variables.

## Source Layout

```
src/
  app/
    api/
      health/route.ts              Health check with DB connectivity probe
      v1/
        auth/                      Authentication endpoints (register, login, device flow, API keys)
        orgs/                      Organization CRUD, members, invitations
        projects/                  Project CRUD, nested task/document listing
        tasks/                     Task CRUD, lifecycle transitions, dependencies
        documents/                 Document CRUD
        invitations/               Accept invitation endpoint
        search/                    Full-text search across entities
    auth/device/                   Device authorization flow UI pages (Next.js React)
  lib/
    auth/
      middleware.ts                Request authentication (JWT + API key detection)
      jwt.ts                       Token signing and verification (15m access, 7d refresh)
      api-keys.ts                  API key generation, hashing, validation
      device.ts                    Device code generation and management
      tokens.ts                    Token utilities
      passwords.ts                 bcrypt password hashing and comparison
    db/
      schema.ts                    Drizzle ORM schema (all tables, indexes, constraints)
      index.ts                     Database connection pool
      migrate.ts                   Migration runner
    services/
      orgs.ts                      Organization business logic (create, members, roles, cascade delete)
      projects.ts                  Project business logic (key generation, collision resolution)
      tasks.ts                     Task business logic (display IDs, versioning, DAG validation)
      documents.ts                 Document business logic (display IDs, versioning)
      invitations.ts               Invitation token generation, acceptance, expiration
      search.ts                    Full-text search across tasks, documents, projects
    dag/
      validate.ts                  DFS-based cycle detection (white/gray/black coloring)
      topo-sort.ts                 Kahn's algorithm for topological ordering
    id/
      generate.ts                  Display ID generation (T00001, D00001), project key derivation
    errors.ts                      AppError hierarchy with standardized HTTP error responses
    validation.ts                  Zod schemas for request validation
    pagination.ts                  Cursor-based pagination utilities

tests/
  unit/                            Pure function tests (no DB): jwt, api-keys, passwords, DAG, IDs, validation
  integration/                     Full-stack tests against real DB: auth flows, CRUD, dependencies, search
  helpers/
    db.ts                          Test database connection and cleanup
    fixtures.ts                    Factory functions for creating test data

infra/
  cdk/
    lib/
      stateful-stack.ts            VPC (3 AZs), RDS PostgreSQL, Secrets Manager
      stateless-stack.ts           ECS Fargate, ALB, ECR, CloudWatch Logs
    bin/cdk.ts                     CDK app entry point
  docker-compose.yml               Local Postgres (port 5434)
  init-test-db.sql                 Creates compass_test database

drizzle/
  migrations/                      Generated SQL migration files
```

## API Reference

All endpoints are prefixed with `/api/v1/` unless noted. Authenticated endpoints require `Authorization: Bearer <token>`. JWT-based requests also require the `X-Org-Slug` header.

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | No | Health check with database connectivity probe |

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create user account; optionally bootstrap an org with `org_name`/`org_slug` |
| POST | `/auth/login` | No | Authenticate with email/password; returns access + refresh tokens |
| POST | `/auth/refresh` | No | Exchange refresh token for new access token |
| POST | `/auth/logout` | Yes | Revoke a refresh token |
| GET | `/auth/me` | Yes | Get current user info (requires `X-Org-Slug`) |
| POST | `/auth/device` | No | Initiate device authorization flow; returns device_code, user_code, verification_uri |
| POST | `/auth/device/authorize` | Yes | Authorize a pending device code (called from UI) |
| GET | `/auth/device/token` | No | Poll for device authorization result |
| POST | `/auth/device/token` | No | Poll for device authorization result |
| POST | `/auth/keys` | Yes | Create API key for current org; returns full key (shown once) |
| GET | `/auth/keys` | Yes | List API keys for current user in org |
| DELETE | `/auth/keys/:keyId` | Yes | Revoke an API key |

### Organizations

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/orgs` | Yes | Create organization; creator becomes admin |
| GET | `/orgs` | Yes | List organizations for current user with roles |
| GET | `/orgs/:slug` | Yes | Get organization by slug |
| PATCH | `/orgs/:slug` | Yes (admin) | Update organization name |
| DELETE | `/orgs/:slug` | Yes (admin) | Soft-delete org and cascade to all projects/tasks/documents |
| GET | `/orgs/:slug/members` | Yes | List organization members with roles |
| PATCH | `/orgs/:slug/members/:userId` | Yes (admin) | Change member role; prevents demoting last admin |
| DELETE | `/orgs/:slug/members/:userId` | Yes (admin) | Remove member from organization |
| POST | `/orgs/:slug/invitations` | Yes (admin) | Invite user by email; generates token with 7-day expiry |
| GET | `/orgs/:slug/invitations` | Yes | List pending invitations |
| PATCH | `/orgs/:slug/invitations/:id` | Yes (admin) | Resend invitation |
| DELETE | `/orgs/:slug/invitations/:id` | Yes (admin) | Cancel invitation |

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/invitations/accept` | Yes | Accept invitation with token; adds user to org |

### Projects

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/projects` | Yes | Create project; key auto-generated from name or provided (2-5 uppercase alphanum) |
| GET | `/projects` | Yes | List projects (cursor pagination: `cursor`, `limit`) |
| GET | `/projects/:key` | Yes | Get project by key |
| PATCH | `/projects/:key` | Yes | Update project name and/or body |
| DELETE | `/projects/:key` | Yes | Soft-delete project and cascade to tasks/documents |

### Tasks

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/projects/:key/tasks` | Yes | Create task; body: `title`, `type` (task/epic), `status`, `priority`, `body`, `epic_task_id` |
| GET | `/projects/:key/tasks` | Yes | List tasks (filters: `status`, `type`, `epic`; cursor pagination) |
| GET | `/projects/:key/tasks/ready` | Yes | Tasks with zero unresolved dependencies |
| GET | `/projects/:key/tasks/graph` | Yes | Full dependency graph: `nodes` (tasks) + `edges` (dependencies) |
| GET | `/tasks/:displayId` | Yes | Get task by display ID (e.g. `T00001`) |
| PATCH | `/tasks/:displayId` | Yes | Update task (title, status, priority, body) |
| DELETE | `/tasks/:displayId` | Yes | Soft-delete task |
| POST | `/tasks/:displayId/start` | Yes | Transition task to `in_progress` |
| POST | `/tasks/:displayId/close` | Yes | Transition task to `closed` |
| POST | `/tasks/:displayId/dependencies` | Yes | Set dependencies (`depends_on` array); validates DAG for cycles |
| GET | `/tasks/:displayId/dependencies` | Yes | Get task's dependency list |

### Documents

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/projects/:key/documents` | Yes | Create document in project |
| GET | `/projects/:key/documents` | Yes | List documents (cursor pagination) |
| GET | `/documents/:displayId` | Yes | Get document by display ID (e.g. `D00001`) |
| PATCH | `/documents/:displayId` | Yes | Update document title and/or body |
| DELETE | `/documents/:displayId` | Yes | Soft-delete document |

### Search

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/search?q=term` | Yes | Full-text search across tasks, documents, and projects; optional `project` filter |

## Authentication

Three auth modes, all via `Authorization: Bearer <token>`:

**JWT Tokens** are issued on login/register. Access tokens expire in 15 minutes; refresh tokens in 7 days. JWT requests require the `X-Org-Slug` header to select the organization context.

**API Keys** have the prefix `cpk_` (Compass Private Key). They are scoped to a single organization and don't need the `X-Org-Slug` header. The full key is returned only at creation time; only the 12-character prefix is stored for display. Keys are hashed with SHA256 before storage. Used primarily by the Compass CLI.

**Device Authorization Flow** (OAuth 2.0) enables headless/CLI clients to authenticate. The flow issues a device code (64-hex) and a user code (8 alphanumeric with dash). Codes expire in 10 minutes. The client polls `/auth/device/token` until the user authorizes the code through the web UI at `/auth/device`.

The auth middleware (`src/lib/auth/middleware.ts`) auto-detects the token type by prefix and returns an `AuthContext` containing `userId`, `organizationId`, and `role`.

## Database Schema

PostgreSQL 16+ with Drizzle ORM. Schema defined in `src/lib/db/schema.ts`.

### Tables

| Table | Description | Key Columns |
|---|---|---|
| `users` | User accounts | `user_id` (UUID PK), `email` (unique), `name`, `password_hash` |
| `organizations` | Multi-tenant orgs | `organization_id` (UUID PK), `name`, `slug` (unique) |
| `org_members` | Org membership | `(organization_id, user_id)` composite PK, `role` (admin/member) |
| `invitations` | Org invites | `invitation_id` (UUID PK), `token` (unique, 64 chars), `expires_at` |
| `api_keys` | API keys | `api_key_id` (UUID PK), `key_hash`, `key_prefix`, org-scoped |
| `refresh_tokens` | JWT refresh tokens | `refresh_token_id` (UUID PK), `token_hash`, `expires_at` |
| `device_codes` | Device auth codes | `device_code_id` (UUID PK), `device_code`, `user_code`, `status` (pending/authorized/expired) |
| `projects` | Projects (versioned) | `(project_id, version)` composite PK, `key` (2-5 chars), `is_current` |
| `tasks` | Tasks (versioned) | `(task_id, version)` composite PK, `display_id` (e.g. T00001), `type` (task/epic), `status`, `priority`, `is_current` |
| `task_dependencies` | DAG edges | `(task_id, depends_on_task_id)` composite PK, no self-loops constraint |
| `documents` | Documents (versioned) | `(document_id, version)` composite PK, `display_id` (e.g. D00001), `is_current` |

### Design Patterns

**Append-only versioning**: Projects, tasks, and documents maintain full history. Each update creates a new row with an incremented `version` and sets the previous row's `is_current` to `false`. Active queries filter on `is_current = true AND deleted_at IS NULL`.

**Soft deletes**: All tables use a `deleted_at` timestamp rather than hard deletes.

**Multi-tenant isolation**: Every query filters by `organization_id` to prevent cross-org data access.

**Org-scoped display IDs**: Tasks and documents receive sequential display IDs within their organization (T00001, T00002, D00001, etc.) for human-friendly references.

**UUID primary keys**: All entities use `crypto.randomUUID()`.

**Cursor-based pagination**: Uses `(created_at, id)` tuples for stable pagination under concurrent writes.

**DAG validation**: Task dependencies are validated for cycles using DFS before insertion. Epics cannot have dependencies.

## Testing

Vitest 4 with `globals: true` and `fileParallelism: false`. Tests use a dedicated `compass_test` database on `localhost:5434`.

```bash
npm run test:unit          # Unit tests only (no DB required)
npm run test:integration   # Integration tests (requires Postgres running)
npm test                   # All tests

# Single file
npx vitest run tests/unit/dag.test.ts
npx vitest run tests/integration/tasks.test.ts

# Watch mode
npm run test:watch
```

Integration tests create and tear down their own data per test using helpers in `tests/helpers/`.

**E2E tests** run the full stack in Docker and exercise the Go CLI against the API:

```bash
./e2e.sh
```

## Deployment

Infrastructure is managed with AWS CDK in `infra/cdk/`.

### Architecture

```
Internet
  |
  ALB (public subnets, 3 AZs)
  |
  ECS Fargate Service (private subnets)
    - 512 CPU / 1024 MiB memory
    - Next.js standalone server on port 3000
    - Health checks every 30s
    - CloudWatch Logs (2-week retention)
  |
  RDS PostgreSQL 18 (isolated subnets)
    - t4g.micro, 20-100 GB storage
    - 7-day backup retention
    - Storage encryption enabled
    - Deletion protection enabled
  |
  Secrets Manager
    - DB credentials
    - JWT secret
```

### CDK Stacks

**StatefulStack** (`infra/cdk/lib/stateful-stack.ts`): VPC with 3 AZs (public/private/isolated subnets), RDS PostgreSQL instance, Secrets Manager secrets.

**StatelessStack** (`infra/cdk/lib/stateless-stack.ts`): ECR repository (10-image lifecycle), ECS Fargate cluster and service, Application Load Balancer, CloudWatch log group.

### Deploy

```bash
cd infra/cdk
npm install
npx cdk deploy --all
```

CD runs automatically via GitHub Actions on push to `main` (see `.github/workflows/cd.yml`).

### Docker

Multi-stage build: dependencies, Next.js compile, then a minimal runner image (Node.js 25 Alpine, non-root user, port 3000).

```bash
docker build -t compass-cloud .
docker run -p 3000:3000 --env-file .env compass-cloud
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on :3000 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Integration tests (requires Postgres) |
| `npm test` | All tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run db:migrate` | Run database migrations |
| `npm run db:generate` | Generate migration from schema changes |
| `npm run db:studio` | Open Drizzle Studio GUI |
