# AGENTS.md

Reference for AI agents and developers: structure, setup, DB, tests, and API. **App name is changing from "Task Blaster" to "Zazz Board"** — code and docs may still reference the old name until the rename is complete.

## CRITICAL — Worktree Workflow (MANDATORY)

- **Main worktree is read-only.** Never edit or merge in main.
- **Work only in feature worktrees.** Create a worktree per branch.
- **Flow:** Work in feature worktree → push branch to GitHub → merge on GitHub → pull main locally.
- **Never merge into main locally.** Main must reflect GitHub after pull.

---

## Overview

**Zazz Board** (formerly Task Blaster) is a Kanban-style orchestration app for coordinating AI agents and humans on software work.

**Stack**: Fastify API (JavaScript, ESM) · React client (Vite) · PostgreSQL 15 (Docker) · Drizzle ORM · Docker Compose

⚠️ **JavaScript only**. No TypeScript. Use `.js` / `.mjs` and JSDoc for types.

## Repo layout

```
├── api/                          # Fastify backend
│   ├── src/routes/               # Route modules (users, projects, tags, taskGraph, deliverables, etc.)
│   ├── src/services/             # databaseService.js, tokenService.js
│   ├── src/middleware/           # Auth (TB_TOKEN / Bearer)
│   ├── src/schemas/              # Fastify JSON Schema validation
│   ├── lib/db/schema.js          # Single source of truth for DB schema
│   ├── lib/db/index.js           # DB connection (NODE_ENV → dev vs test URL)
│   ├── scripts/reset-and-seed.js # Drops tables, push schema, seeds
│   ├── scripts/seeders/          # Seed files (dependency order)
│   ├── __tests__/                # Vitest + PactumJS integration tests
│   │   ├── helpers/              # testServer.js, testDatabase.js
│   │   ├── routes/               # *.test.mjs per route area
│   │   ├── setup.pactum.mjs      # Start Fastify on 3031, set Pactum base URL
│   │   └── README.md             # PactumJS usage and troubleshooting
│   ├── vitest.config.mjs
│   ├── drizzle.config.js
│   └── .env / .env.example
├── client/                       # React (Vite, port 3001)
│   └── src/components, hooks, pages, i18n
├── docker-compose.yml            # PostgreSQL 15 (port 5433 → 5432)
└── package.json                  # Workspace scripts
```

**Rule**: Know your cwd — commands differ at root vs `api/`.

### Main branch read-only

The `main` branch worktree is read-only. Do all work in a feature worktree (e.g. `add-docs-swagger`). Changes reach main only via merge.

### Creating a new worktree

The repo uses a bare repository (`.bare`) to manage multiple worktrees.

**Create a new worktree:**

```bash
cd /Users/michael/Dev/task-blaster
GIT_DIR=.bare git worktree add -b <branch-name> ../<worktree-name> main
```

For example, to create a worktree for a dynamic graph feature:

```bash
GIT_DIR=.bare git worktree add -b dynamic-task-graph-mvp ../dynamic-task-graph-mvp main
```

This creates a new worktree at `../dynamic-task-graph-mvp` and checks out the `main` branch with a new branch named `dynamic-task-graph-mvp`.

**Copy environment files:**

After creating the worktree, copy `.env` files from the main worktree:

```bash
cp main/.env dynamic-task-graph-mvp/
cp main/api/.env dynamic-task-graph-mvp/api/
```

**List worktrees:**

```bash
GIT_DIR=.bare git worktree list
```

**Remove a worktree:**

```bash
GIT_DIR=.bare git worktree remove <worktree-name>
```

---

## API routes (full list)

**Auth**: All routes require `TB_TOKEN` header or `Authorization: Bearer <token>` **except** `GET /health`, `GET /`, `GET /db-test`, `GET /token-info`. For `/docs` you can also pass `?token=<uuid>` in the URL so the docs page loads in a browser; then use the UI’s **Authorize** to set the token for try-it-out.

### Core (`index.js`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health + token cache stats |
| GET | `/` | API info and endpoint list |
| GET | `/db-test` | DB connectivity check |
| GET | `/token-info` | Token cache debug (no auth) |
| GET | `/docs` | Swagger UI (OpenAPI 3.1). **Auth required** (TB_TOKEN or Bearer). |
| GET | `/docs/json` | OpenAPI 3.1 spec as JSON. **Auth required**. |

### Users (`users.js`)
| Method | Path |
|--------|------|
| GET | `/users/me` |
| GET | `/users` |
| GET | `/users/:id` |
| POST | `/users` |
| PUT | `/users/:id` |
| DELETE | `/users/:id` |

### Projects & tasks (`projects.js`)
| Method | Path |
|--------|------|
| GET | `/projects` |
| GET | `/projects/:id` |
| POST | `/projects` |
| PUT | `/projects/:id` |
| DELETE | `/projects/:id` |
| GET | `/projects/:id/tasks` |
| GET | `/projects/:id/kanban/tasks/column/:status` |
| PATCH | `/projects/:code/kanban/tasks/column/:status/positions` |
| PATCH | `/projects/:code/kanban/tasks/:taskId/position` |
| PATCH | `/projects/:code/tasks/:taskId/status` |
| PUT | `/projects/:code/tasks/:taskId` |
| DELETE | `/projects/:code/tasks/:taskId` |
| GET | `/projects/:code/statuses` |
| PUT | `/projects/:code/statuses` |
| GET | `/projects/:code/deliverable-statuses` |
| PUT | `/projects/:code/deliverable-statuses` |
| POST | `/projects/:code/deliverables/:delivId/tasks` |
| GET | `/projects/:code/deliverables/:delivId/tasks/:taskId` |
| PUT | `/projects/:code/deliverables/:delivId/tasks/:taskId` |
| DELETE | `/projects/:code/deliverables/:delivId/tasks/:taskId` |
| PATCH | `/projects/:code/deliverables/:delivId/tasks/:taskId/status` |
| PATCH | `/projects/:code/deliverables/:delivId/tasks/:taskId/reorder` |
| PUT | `/projects/:code/deliverables/:delivId/tasks/:taskId/tags` |

### Deliverables (`deliverables.js`)
| Method | Path |
|--------|------|
| GET | `/projects/:projectCode/deliverables` |
| GET | `/projects/:projectCode/deliverables/:id` |
| POST | `/projects/:projectCode/deliverables` |
| PUT | `/projects/:projectCode/deliverables/:id` |
| DELETE | `/projects/:projectCode/deliverables/:id` |
| PATCH | `/projects/:projectCode/deliverables/:id/status` |
| PATCH | `/projects/:projectCode/deliverables/:id/approve` |
| GET | `/projects/:projectCode/deliverables/:id/tasks` |

### Task graph (`taskGraph.js`)
| Method | Path |
|--------|------|
| GET | `/projects/:code/graph` |
| GET | `/projects/:code/tasks/:taskId/relations` |
| POST | `/projects/:code/tasks/:taskId/relations` |
| DELETE | `/projects/:code/tasks/:taskId/relations/:relatedTaskId/:relationType` |
| GET | `/projects/:code/tasks/:taskId/readiness` |
| GET | `/coordination-types` |

### Tags (`tags.js`)
| Method | Path |
|--------|------|
| GET | `/tags` |
| GET | `/tags/:id` |
| POST | `/tags` |
| PUT | `/tags/:id` |
| DELETE | `/tags/:id` |

### Other
| Method | Path | File |
|--------|------|------|
| GET | `/translations/:language` | translations.js |
| GET | `/status-definitions` | statusDefinitions.js |
| GET | `/tasks/:taskId/images` | images.js |
| POST | `/tasks/:taskId/images/upload` | images.js |
| GET | `/images/:id` | images.js |
| GET | `/images/:id/metadata` | images.js |
| DELETE | `/tasks/:taskId/images/:imageId` | images.js |

---

## Setup (fresh clone)

- Node 22+, Docker Desktop.
- Postgres runs in container `task_blaster_postgres`, host port **5433**.

```bash
npm install
npm install --workspace=api
cd client && npm install && cd ..
cp api/.env.example api/.env
```

Edit `api/.env`: set both URLs to use password `password` and port 5433:

- `DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_dev`
- `DATABASE_URL_TEST=postgres://postgres:password@localhost:5433/task_blaster_test`

```bash
npm run docker:up:db
docker ps | grep task_blaster_postgres
```

## Running the app

```bash
npm run dev          # API :3030, client :3001
npm run dev:api      # API only
npm run dev:client   # Client only
```

Manual API test token: `TB_TOKEN: 550e8400-e29b-41d4-a716-446655440000`

---

## Database

- **Schema**: `api/lib/db/schema.js` (Drizzle). No migrations; reset = drop + push.
- **Reset (dev)**: From `api/` run `npm run db:reset` (runs reset-and-seed: drop tables/enums → drizzle-kit push → seed).
- **Seeding order**: users → tags → status definitions → coordination requirement definitions → translations → projects → deliverables → tasks → task-tags → task relations. To add seed data: add or edit files in `scripts/seeders/` and register in `reset-and-seed.js` and `seed-all.js` in dependency order.

**Conventions**: Table names UPPER_CASE; columns snake_case in DB, camelCase in JS (Drizzle aliases). Task positions use sparse numbering (e.g. 10, 20) for reorder.

**Key tables**: USERS (access_token), PROJECTS (code, status_workflow, deliverable_status_workflow, completion_criteria_status), TASKS (deliverable_id, status, position), TASK_RELATIONS (task_id, related_task_id, relation_type), DELIVERABLES, TAGS, TASK_TAGS, STATUS_DEFINITIONS, COORDINATION_REQUIREMENT_DEFINITIONS, TRANSLATIONS, IMAGE_METADATA, IMAGE_DATA.

### Test database

- DB name: `task_blaster_test`. Tests use `DATABASE_URL_TEST` and clear task/deliverable data in `beforeEach`; schema + seed must exist.

**Create once:**

```bash
docker exec task_blaster_postgres psql -U postgres -c "CREATE DATABASE task_blaster_test;" 2>/dev/null || true
cd api && DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_test npm run db:reset
```

**Full recreate:**

```bash
docker exec task_blaster_postgres psql -U postgres -c "DROP DATABASE IF EXISTS task_blaster_test;"
docker exec task_blaster_postgres psql -U postgres -c "CREATE DATABASE task_blaster_test;"
cd api && DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_test npm run db:reset
```

**Verify:**

```bash
docker exec task_blaster_postgres psql -U postgres -d task_blaster_dev -c "\dt"
```

---

## Testing (Vitest + PactumJS + test DB)

- **Runner**: Vitest. **HTTP client/assertions**: PactumJS. **Target**: Real Fastify server on `127.0.0.1:3031` against `task_blaster_test`.
- **Details**: `api/__tests__/README.md`.

### Test strategy

1. **Environment**: `NODE_ENV=test` and `DATABASE_URL_TEST` pointing at `task_blaster_test` (enforced in setup and in `clearTaskData()`).
2. **Isolation**: `beforeEach` calls `clearTaskData()` (deletes TASK_RELATIONS, TASK_TAGS, TASKS, DELIVERABLES). Projects, users, tags, status/coordination definitions stay seeded.
3. **Primary test project**: Project 1 code **ZAZZ** (workflow e.g. TO_DO, READY, IN_PROGRESS, QA, COMPLETED). Use ZAZZ in route paths unless a test needs another project.
4. **Flow**: Use helpers to create data in DB → send HTTP with `spec()` → assert status and body with `.expectStatus()`, `.expectJsonLike()` (or `.expectJson()`, `.expectJsonSchema()`). Optionally assert DB state with Vitest `expect()` and helpers like `getTaskById`, `getDeliverableById`.
5. **Auth**: Every request must send `TB_TOKEN: 550e8400-e29b-41d4-a716-446655440000` (or Bearer). Test 401 when token missing/invalid.
6. **Coverage**: Add tests for new routes; follow existing `__tests__/routes/*.test.mjs` patterns (describe per route/behavior, Pactum chain per request).

### Run tests

```bash
cd api
set -a && source .env && set +a && NODE_ENV=test npm run test
```

Watch: same env then `npm run test:watch`. Coverage: `npm run test:coverage`.

### Config and helpers

- **vitest.config.mjs**: `__tests__/**/*.test.{js,mjs}`, setup `__tests__/setup.pactum.mjs`, 20s timeout, sequential (`fileParallelism: false`).
- **setup.pactum.mjs**: Validates NODE_ENV and DATABASE_URL_TEST, creates Fastify via `createTestServer()`, listens on 3031, sets Pactum base URL and default timeout.
- **testServer.js**: `createTestServer()`, `getTestToken()`.
- **testDatabase.js**: `validateTestEnvironment()`, `clearTaskData()`, `resetProjectDefaults()` (Project 1 ZAZZ), `createTestDeliverable()`, `createTestTask()`, `createTestRelation()`, `getTaskById()`, `getDeliverableById()`, `getTasksByStatus()`, `getRelationsForTask()`.

### Safety

Six guards: NODE_ENV=test; DATABASE_URL_TEST set and containing `task_blaster_test`; runtime DB name check; startup validation; `clearTaskData()` re-validates before deletes; seed scripts block non-dev/test DBs.

### Example test

```javascript
import { spec } from 'pactum';
import { clearTaskData, createTestTask } from '../helpers/testDatabase.js';

const TOKEN = '550e8400-e29b-41d4-a716-446655440000';

describe('PATCH /projects/:code/tasks/:taskId/status', () => {
  beforeEach(async () => { await clearTaskData(); });

  it('updates status and returns task', async () => {
    const task = await createTestTask(1, { status: 'TO_DO' });
    await spec()
      .patch(`/projects/ZAZZ/tasks/${task.id}/status`)
      .withHeaders('TB_TOKEN', TOKEN)
      .withJson({ status: 'IN_PROGRESS' })
      .expectStatus(200)
      .expectJsonLike({ id: task.id, status: 'IN_PROGRESS' });
  });
});
```

### Test file naming convention

- **API (`__tests__/routes/`)**: kebab-case prefix + `.test.mjs` — e.g. `deliverables-approval.test.mjs`, `project-statuses.test.mjs`
- **Client component tests**: PascalCase matching the component — e.g. `KanbanBoard.test.jsx`
- **Client hook/utility tests**: kebab-case — e.g. `use-tasks.test.js`
- The `.test.` separator is Vitest convention and must be kept.

### Current test files

- `translations.test.mjs`, `status-definitions.test.mjs`
- `project-statuses.test.mjs`, `project-deliverable-statuses.test.mjs`
- `deliverables.test.mjs`, `deliverables-status.test.mjs`, `deliverables-approval.test.mjs`
- `task-graph.test.mjs` (relations, graph, readiness, coordination)
- `agent-workflow.test.mjs` (end-to-end agent simulation: linear pipeline, parallel convergence, cancellation, notes audit trail)

---

## Architecture (concise)

- **API**: Fastify plugins per route file; `options.dbService`; auth middleware; JSON Schema in `schemas/`; all DB via `databaseService.js`; snake_case in DB, camelCase in JS.
- **Client**: Vite, React hooks, Mantine, react-router-dom v7, @dnd-kit, react-i18next, @uiw/react-md-editor; token in localStorage as TB_TOKEN. Main views: project list, Kanban (deliverable-scoped tasks), task graph (relations, readiness).
- **Task model**: Tasks belong to deliverables and projects; status and deliverable-status workflows are project-level; task graph uses DEPENDS_ON / COORDINATES_WITH with cycle checks and readiness/auto-promotion.

---

## Troubleshooting

- **drizzle-kit "please install required packages: drizzle-orm"**: From root: `ln -sf ./api/node_modules/drizzle-orm ./node_modules/drizzle-orm`.
- **DATABASE_URL_TEST not set**: Run tests with `set -a && source api/.env && set +a` (from api/).
- **SAFETY CHECK FAILED**: Ensure `task_blaster_test` exists and `DATABASE_URL_TEST` points to it; recreate test DB if needed.
- **Port in use**: `lsof -ti:3031 | xargs kill -9` (test), `3030` (API), `3001` (client).
- **Postgres not running**: `npm run docker:up:db`.

---

## Quick reference

```bash
npm run docker:up:db
cd api && npm run db:reset                                    # Dev DB
docker exec task_blaster_postgres psql -U postgres -c "DROP DATABASE IF EXISTS task_blaster_test; CREATE DATABASE task_blaster_test;"
cd api && DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_test npm run db:reset   # Test DB
cd api && set -a && source .env && set +a && NODE_ENV=test npm run test
npm run dev   # From root
```

**Related**: `api/__tests__/README.md` (PactumJS), root `README.md` (quick start).
