# compass-cloud

Headless API backend for [compass](https://github.com/rogersnm/compass), a markdown-native task and document tracker. Built with Next.js App Router, Drizzle ORM, and PostgreSQL.

## Stack

- **Runtime**: Next.js 16 (App Router, standalone output)
- **Database**: PostgreSQL 16+ with Drizzle ORM
- **Auth**: JWT access/refresh tokens, API keys (`cpk_` prefix), OAuth 2.0 device flow
- **Infrastructure**: AWS CDK (ECS Fargate, ALB, RDS)

## Local development

```bash
# Start Postgres
docker compose -f infra/docker-compose.yml up -d

# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Start dev server
npm run dev
```

The API runs at `http://localhost:3000`.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes* | Full Postgres connection string |
| `DB_HOST` | Yes* | Postgres host (alternative to DATABASE_URL) |
| `DB_PORT` | No | Postgres port (default: 5432) |
| `DB_USERNAME` | Yes* | Postgres user |
| `DB_PASSWORD` | Yes* | Postgres password |
| `DB_NAME` | No | Database name (default: compass) |
| `DB_SSLMODE` | No | SSL mode (`no-verify` for RDS) |
| `JWT_SECRET` | Yes | Secret for signing JWTs |
| `API_BASE_URL` | No | Public base URL for device auth links |

\* Provide either `DATABASE_URL` or the individual `DB_*` variables.

## API overview

All endpoints are under `/api/v1/`.

**Auth**
- `POST /auth/register` - Create user (optional `org_name`/`org_slug` to bootstrap an org)
- `POST /auth/login` - Get access + refresh tokens
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Revoke refresh token
- `GET /auth/me` - Current user info
- `POST /auth/device` - Start device authorization flow
- `POST /auth/device/token` - Poll for device authorization
- `POST /auth/keys` - Create API key
- `GET /auth/keys` - List API keys
- `DELETE /auth/keys/:keyId` - Revoke API key

**Organizations**
- `POST /orgs` - Create organization
- `GET /orgs` - List user's organizations
- `GET /orgs/:slug` - Get organization
- `PATCH /orgs/:slug` - Update organization
- `DELETE /orgs/:slug` - Delete organization
- `GET /orgs/:slug/members` - List members
- `DELETE /orgs/:slug/members/:userId` - Remove member
- `PATCH /orgs/:slug/members/:userId` - Change role
- `POST /orgs/:slug/invitations` - Create invitation
- `POST /invitations/accept` - Accept invitation

**Projects**
- `POST /projects` - Create project
- `GET /projects` - List projects
- `GET /projects/:key` - Get project
- `PATCH /projects/:key` - Update project
- `DELETE /projects/:key` - Delete project

**Tasks**
- `POST /projects/:key/tasks` - Create task
- `GET /projects/:key/tasks` - List tasks
- `GET /projects/:key/tasks/ready` - Get ready tasks
- `GET /projects/:key/tasks/graph` - Get dependency graph
- `GET /tasks/:displayId` - Get task
- `PATCH /tasks/:displayId` - Update task
- `DELETE /tasks/:displayId` - Delete task
- `POST /tasks/:displayId/start` - Start task
- `POST /tasks/:displayId/close` - Close task

**Documents**
- `POST /projects/:key/documents` - Create document
- `GET /projects/:key/documents` - List documents
- `GET /documents/:displayId` - Get document
- `PATCH /documents/:displayId` - Update document
- `DELETE /documents/:displayId` - Delete document

**Search**
- `GET /search?q=term` - Search across tasks, documents, and projects

## Authentication

Two modes, both via `Authorization: Bearer <token>`:

- **API keys** (prefix `cpk_`): Scoped to an organization. Used by the compass CLI.
- **JWT tokens**: Requires `X-Org-Slug` header to select the organization context.

## Running tests

```bash
# Unit tests
npm run test:unit

# Integration tests (needs Postgres running)
npm run test:integration

# E2E tests (spins up full stack in Docker, runs Go CLI integration tests)
./e2e.sh
```

## Deployment

Infrastructure is managed with AWS CDK in `infra/cdk/`.

```bash
cd infra/cdk
npm install
npx cdk deploy --all
```

CD is handled by GitHub Actions on push to `main` (see `.github/workflows/cd.yml`).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:migrate` | Run database migrations |
| `npm run db:generate` | Generate migration from schema changes |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
