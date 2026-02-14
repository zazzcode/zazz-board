# AGENTS.md

This document describes the Task Blaster project structure, development patterns, and how to set up, run, and test the application. It is the primary reference for AI agents and new developers.

## Project Overview

Task Blaster is a Kanban-style orchestration management application for coordinating AI agents and human users in software projects.

**Stack**: Fastify API (JavaScript, ES modules) · React client (JavaScript, Vite) · PostgreSQL 15 (Docker) · Drizzle ORM · Docker Compose

## Monorepo Layout

```
├── api/                     ← Fastify backend (JavaScript, ES modules)
│   ├── src/
│   │   ├── routes/          ← Route handlers (tasks, projects, users, tags, taskGraph, etc.)
│   │   ├── services/        ← Business logic (databaseService.js, tokenService.js)
│   │   ├── middleware/      ← Auth middleware (UUID token validation)
│   │   └── schemas/         ← Request validation (Fastify JSON Schema)
│   ├── lib/db/
│   │   ├── schema.js        ← Drizzle ORM table definitions (single source of truth for DB schema)
│   │   └── index.js         ← DB connection (switches on NODE_ENV for test vs dev)
│   ├── scripts/
│   │   ├── reset-and-seed.js← Drops all tables, pushes schema, seeds data
│   │   ├── seed-all.js      ← Seeds data only (tables must exist)
│   │   └── seeders/         ← Individual seed files in dependency order
│   ├── __tests__/           ← Vitest + PactumJS integration tests
│   │   ├── helpers/         ← testServer.js, testDatabase.js
│   │   ├── routes/          ← Test files (*.test.mjs)
│   │   ├── fixtures/        ← Expected data for assertions
│   │   ├── setup.pactum.mjs ← Global test setup (starts Fastify on port 3031)
│   │   └── README.md        ← Detailed PactumJS test guide
│   ├── vitest.config.mjs    ← Test runner config
│   ├── drizzle.config.js    ← Drizzle Kit config
│   ├── .env                 ← Environment variables (not committed)
│   ├── .env.example         ← Template for .env
│   └── package.json         ← API scripts (dev, test, db:reset, db:seed, etc.)
├── client/                  ← React frontend (Vite, port 3001)
│   └── src/
│       ├── components/      ← UI components (KanbanBoard, TaskCard, etc.)
│       ├── hooks/           ← Custom hooks (useTasks, useDragAndDrop, etc.)
│       ├── pages/           ← Route pages (HomePage, KanbanPage)
│       └── i18n/            ← Internationalization (en, es, fr, de)
├── docker-compose.yml       ← PostgreSQL 15 container config
├── package.json             ← Root workspace scripts (dev, docker:up:db, test, etc.)
└── README.md                ← Quick start guide
```

**Key rule**: Always know which directory you're in. Commands behave differently at project root vs `api/`.

## Related Documentation

- **`api/__tests__/README.md`** — PactumJS test guide: writing tests, helpers, matchers, troubleshooting.
- **`README.md`** (project root) — Quick start and common issues.

## Prerequisites

- **Node.js 22+** and npm
- **Docker Desktop** running (PostgreSQL 15 runs in a container)
- The Docker container is named `task_blaster_postgres` and maps **port 5433** on the host to 5432 in the container (avoids conflicts with any local Postgres on 5432)

## One-Time Setup (Fresh Clone)

```bash
# 1. Install root workspace dependencies (from project root)
npm install

# 2. Install API dependencies
npm install --workspace=api

# 3. Install client dependencies (not an npm workspace — use cd)
cd client && npm install && cd ..

# 4. Create API .env from template
cp api/.env.example api/.env
```

Edit `api/.env` and replace `your_secure_password` with `password` (the Docker default) in both URLs:

```
DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_dev
DATABASE_URL_TEST=postgres://postgres:password@localhost:5433/task_blaster_test
```

```bash
# 5. Start PostgreSQL container
npm run docker:up:db

# 6. Verify Postgres is running
docker ps | grep task_blaster_postgres
```

## Running the Application

### Both API + Client (recommended)

```bash
# From project root
npm run dev
```

- API: http://localhost:3030 (Fastify with `--watch` hot reload)
- Client: http://localhost:3001 (Vite dev server)

### Individually

```bash
npm run dev:api      # API only (from project root)
npm run dev:client   # Client only (from project root)
```

### Authentication for manual API testing

All API routes require a `TB_TOKEN` header. Use the seeded token:

```bash
curl -H "TB_TOKEN: 550e8400-e29b-41d4-a716-446655440000" http://localhost:3030/projects
```

## Database and Drizzle ORM

### Schema-First Development

The single source of truth for the database schema is `api/lib/db/schema.js`. This file defines all tables, columns, enums, indexes, and Drizzle relations. There are no incremental migrations during this development phase — the database is dropped and recreated from the schema on every reset.

### Nuke and Recreate Workflow

`npm run db:reset` (from `api/`) runs `api/scripts/reset-and-seed.js` which:
1. Drops all tables in dependency order
2. Drops custom enum types (`task_relation_type`, `graph_layout_direction`)
3. Runs `npx drizzle-kit push --force` to recreate all tables from the Drizzle schema
4. Seeds in order: users → tags → status definitions → coordination requirement definitions → translations → projects → tasks → task-tags → task relations

### Schema Conventions

- **Table names**: UPPER_CASE (`USERS`, `TASKS`, `TASK_RELATIONS`)
- **Column names**: snake_case in DB, camelCase in JavaScript (Drizzle aliases handle mapping)
- **Enums**: System-controlled keywords use pgEnum (e.g. `task_relation_type`); user-definable values use varchar
- **Primary keys**: serial integer for most tables; varchar for lookup tables (`TAGS.tag`, `STATUS_DEFINITIONS.code`)
- **Task positions**: Sparse numbering (increments of 10) for efficient drag-and-drop reordering

### Key Tables

- **USERS** — Users with `access_token` (UUID) for auth
- **PROJECTS** — Projects with unique `code`, `status_workflow` (ordered array), `completion_criteria_status`, `task_graph_layout_direction`
- **TASKS** — Tasks with human-readable `task_id` (e.g. `WEBRED-1`), `status`, `priority`, `position`, `coordination_code`
- **TASK_RELATIONS** — Task dependencies and coordination links (composite PK: task_id + related_task_id + relation_type)
- **STATUS_DEFINITIONS** — Instance-level status codes (referenced by project workflows)
- **COORDINATION_REQUIREMENT_DEFINITIONS** — Reference table for coordination types (TEST_TOGETHER, DEPLOY_TOGETHER, etc.)
- **TAGS** / **TASK_TAGS** — Tag definitions and many-to-many junction
- **TRANSLATIONS** — UI translations as JSON per language

### Seed Data Summary

- 5 users (User 1: Michael Woytowitz, token `550e8400-...`)
- 5 projects (WEBRED, MOBDEV, APIMOD, DATAMIG, SECURE — all workflows include READY)
- 13 status definitions, 5 coordination requirement definitions
- 10 tags, 4 language translations
- 13 tasks (2 WEBRED, 2 MOBDEV, 9 APIMOD), 10 task-tag links
- 16 task relations in APIMOD project covering: solo task (APIMOD-5), sequential chain (1→2→3→6), fan-out (2→3,7,8,9), fan-in (6 depends on 3+4), 2-task coordination (3↔4 TEST_TOGETHER), 3-task coordination (7↔8↔9 DEPLOY_TOGETHER), blocked-past-READY (APIMOD-4 is IN_REVIEW but dep not met)

### DEV Database Reset

```bash
# From api/
npm run db:reset
```

### TEST Database Setup and Reset

The test database (`task_blaster_test`) is separate from dev. Tests clear task data in `beforeEach` hooks, but the database must exist with the correct schema and seed data.

```bash
# Create test database (first time only)
docker exec task_blaster_postgres psql -U postgres -c "CREATE DATABASE task_blaster_test;" 2>/dev/null || true

# Push schema and seed (from api/)
DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_test npm run db:reset
```

To fully nuke and recreate:

```bash
docker exec task_blaster_postgres psql -U postgres -c "DROP DATABASE IF EXISTS task_blaster_test;"
docker exec task_blaster_postgres psql -U postgres -c "CREATE DATABASE task_blaster_test;"
DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_test npm run db:reset
```

### Verify Database

```bash
docker exec task_blaster_postgres psql -U postgres -d task_blaster_dev -c "\dt"
docker exec task_blaster_postgres psql -U postgres -d task_blaster_dev \
  -c "SELECT count(*) AS users FROM \"USERS\";" \
  -c "SELECT count(*) AS projects FROM \"PROJECTS\";" \
  -c "SELECT count(*) AS tasks FROM \"TASKS\";"
```

## Development Patterns

### API Architecture

- **Route registration**: Fastify plugin pattern — each route file exports an async function receiving `(fastify, options)` with `options.dbService`
- **Authentication**: `authMiddleware` validates `TB_TOKEN` header (or `Authorization: Bearer`) against an in-memory token cache initialized on startup
- **Request validation**: Fastify JSON Schema on route definitions (not Zod). Schemas defined in `api/src/schemas/validation.js`
- **Database access**: All DB operations go through `databaseService.js` — routes never query the DB directly
- **Field mapping**: Database uses snake_case, JavaScript uses camelCase. Drizzle select queries use explicit aliases (e.g. `{ fullName: USERS.full_name }`)
- **Error responses**: Descriptive error messages with proper HTTP status codes. Business logic errors (400) vs not found (404) vs server errors (500)
- **Logging**: Built-in Pino logger with correlation IDs (`x-correlation-id` header)

### Main UI Views and Features

The application has three main views, each backed by corresponding API routes:

#### Project List (`/projects` → HomePage)
- Lists all projects with code, title, description, and leader
- Create/edit projects via modal (ProjectModal)
- Each project has a configurable `status_workflow` (ordered array of status codes)
- Project codes are immutable after creation (uppercase letters only, e.g. `WEBRED`)
- API: `GET/POST /projects`, `GET/PUT/DELETE /projects/:id`, `GET/PUT /projects/:code/statuses`
- Status workflow editor validates against `STATUS_DEFINITIONS` table and prevents removing statuses that have tasks

#### Kanban Board (`/projects/:projectCode/kanban` → KanbanPage)
- Columns are dynamically generated from the project's `status_workflow`
- Tasks displayed as cards with title, priority, assignee, tags, story points
- Drag-and-drop reordering within and across columns (@dnd-kit)
- Sparse position numbering (increments of 10) minimizes DB updates on reorder
- Click a card to open TaskDetailModal for full editing (title, description, status, priority, assignee, tags, markdown prompt)
- Create new tasks via Ctrl+N / Cmd+N shortcut or menu
- API: `GET /projects/:id/tasks`, `PATCH /tasks/:id/status`, `PATCH /tasks/:id/reorder`, `PATCH /projects/:code/kanban/tasks/:taskId/position`

#### Task Graph (`/projects/:projectCode/taskGraph` → TaskGraphPage, client UI in progress)
- **Task relations**: `DEPENDS_ON` (directional) and `COORDINATES_WITH` (bidirectional — auto-creates mirror row)
- **Cycle detection**: BFS from target node before inserting `DEPENDS_ON` edges
- **Readiness check**: A task is "ready" when all its `DEPENDS_ON` dependencies have reached the project's `completionCriteriaStatus` (or `DONE` if not set)
- **Auto-promotion**: When a task status changes, `checkAndPromoteDependents()` promotes dependent tasks from `TO_DO` → `READY` if all their dependencies are met and the project workflow includes `READY`
- **Duplicate detection**: Explicit duplicate check before inserting relations (not relying on DB constraint error parsing)
- **Status validation**: `PATCH /tasks/:id/status` validates the requested status against `STATUS_DEFINITIONS` table before applying
- API: `GET /projects/:id/graph`, `GET/POST /tasks/:id/relations`, `DELETE /tasks/:id/relations/:relatedTaskId/:relationType`, `GET /tasks/:id/readiness`, `GET /coordination-requirements`

### Client Architecture

- **Build tool**: Vite (port 3001)
- **State management**: React hooks (no Redux/MobX)
- **UI library**: Mantine Core components
- **Drag & drop**: @dnd-kit for Kanban board
- **Routing**: react-router-dom v7
- **i18n**: react-i18next with browser locale detection (en, es, fr, de)
- **Markdown**: @uiw/react-md-editor for task descriptions
- **Token storage**: `TB_TOKEN` in localStorage

### Adding Seed Data

Seed files live in `api/scripts/seeders/`. Execution order is controlled by `seed-all.js` and `reset-and-seed.js`.

1. Create or edit a seeder in `api/scripts/seeders/`
2. If new, add the import and call to both `seed-all.js` and `reset-and-seed.js` in dependency order
3. Run `npm run db:reset` from `api/` to verify

## Testing

### Overview

Tests are API integration tests using **Vitest** (test runner) and **PactumJS** (HTTP API testing DSL). They start a real Fastify server on port 3031 and make HTTP requests against the `task_blaster_test` database.

See `api/__tests__/README.md` for the full PactumJS guide, matchers, helpers, and troubleshooting.

### Test Strategy

All task operations are tested within the scope of **Project 1 (WEBRED)** — the primary test project. This provides a consistent, well-defined environment:
- Workflow: `TO_DO → READY → IN_PROGRESS → IN_REVIEW → DONE`
- Default `completionCriteriaStatus`: null (defaults to `DONE`)
- Default `taskGraphLayoutDirection`: `LR`

Tests that need different project configurations (e.g. custom `completionCriteriaStatus`) set up that state explicitly. Testing across multiple project configurations will be added as the project matures.

### How to run

```bash
# From api/ — you MUST source .env first to load DATABASE_URL_TEST
set -a && source .env && set +a && NODE_ENV=test npm run test
```

**What this does:**
1. `source .env` loads `DATABASE_URL_TEST` into the shell
2. `NODE_ENV=test` tells the DB connection to use `DATABASE_URL_TEST`
3. `npm run test` runs `vitest run` (single pass, no watch)

### Other test commands (from api/)

```bash
set -a && source .env && set +a && NODE_ENV=test npm run test:watch     # Watch mode
set -a && source .env && set +a && NODE_ENV=test npm run test:coverage  # With coverage
```

### Test Architecture

- **Config**: `api/vitest.config.mjs` — test pattern `__tests__/**/*.test.{js,mjs}`, 20s timeout, sequential execution
- **Setup**: `__tests__/setup.pactum.mjs` — validates environment, starts Fastify on `127.0.0.1:3031`, configures PactumJS
- **Helpers**: `__tests__/helpers/testDatabase.js`:
  - `clearTaskData()` — deletes TASK_RELATIONS, TASK_TAGS, TASKS before each test
  - `resetProjectDefaults()` — resets Project 1 (WEBRED) settings to seeded defaults
  - `createTestTask(projectId, overrides)` — creates a task with auto-generated task_id
  - `createTestRelation(taskId, relatedTaskId, relationType)` — creates a task relation
  - `getTaskById(id)`, `getTasksByStatus(projectId, status)`, `getRelationsForTask(taskId)`
- **Server**: `__tests__/helpers/testServer.js` — `createTestServer()`, `getTestToken()`
- **Test token**: `550e8400-e29b-41d4-a716-446655440000`

### Safety Guards

6 safety checks prevent accidental data deletion:
1. `NODE_ENV` must be `test`
2. `DATABASE_URL_TEST` must be set
3. `DATABASE_URL_TEST` must contain `task_blaster_test`
4. Runtime SQL query confirms the connected database name
5. `clearTaskData()` re-validates before every delete
6. Seed scripts refuse to run against stage/prod databases

### Writing New Tests

```javascript
import { spec } from 'pactum';
import { clearTaskData, createTestTask, getTaskById } from '../helpers/testDatabase.js';

const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

describe('GET /your-endpoint', () => {
  beforeEach(async () => {
    await clearTaskData();
  });

  it('should do something', async () => {
    const task = await createTestTask(1, { status: 'TO_DO' });
    await spec()
      .get(`/your-endpoint/${task.id}`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .expectStatus(200)
      .expectJsonLike({ id: task.id });
  });
});
```

## Troubleshooting

### `drizzle-kit push` errors with "please install required packages: drizzle-orm"

Known npm workspace issue. Fix with a symlink from project root:
```bash
ln -sf ./api/node_modules/drizzle-orm ./node_modules/drizzle-orm
```

### Tests fail with "DATABASE_URL_TEST not set"

Source `.env` before running tests:
```bash
set -a && source .env && set +a && NODE_ENV=test npm run test
```

### Tests fail with "SAFETY CHECK FAILED"

Test database doesn't exist or `DATABASE_URL_TEST` is wrong:
```bash
grep DATABASE_URL_TEST api/.env
docker exec task_blaster_postgres psql -U postgres -c "\l" | grep task_blaster_test
```

If missing, create and seed it (see "TEST Database Setup and Reset" above).

### Port already in use

```bash
lsof -ti:3031 | xargs kill -9   # Test server
lsof -ti:3030 | xargs kill -9   # API dev server
lsof -ti:3001 | xargs kill -9   # Client dev server
```

### Docker Postgres not running

```bash
npm run docker:up:db
docker ps | grep task_blaster_postgres
```

## Quick Reference

```bash
# Start Postgres
npm run docker:up:db

# Reset DEV DB (from api/)
npm run db:reset

# Reset TEST DB (from api/)
docker exec task_blaster_postgres psql -U postgres -c "DROP DATABASE IF EXISTS task_blaster_test;"
docker exec task_blaster_postgres psql -U postgres -c "CREATE DATABASE task_blaster_test;"
DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_test npm run db:reset

# Run tests (from api/)
set -a && source .env && set +a && NODE_ENV=test npm run test

# Run app (from project root)
npm run dev
```
