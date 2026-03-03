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

### Dogfooding context

This repo **dogfoods** the Zazz Framework: Zazz Board is built with Zazz Board. In the next phase, a Zazz Board instance will run in its own container, orchestrating agents that are building Zazz Board itself. If you're acting as a framework agent (planner, coordinator, worker, qa), the deliverables and tasks you create via the API live in that instance—tracking work on this very repo. Don't be confused by the recursion; it's intentional and helps us find gaps in the framework.

## Zazz agent skills and rules

**Skills** (`.agents/skills/`): Role-specific capabilities loaded when acting as a Zazz framework agent. Used by Warp/oz, Claude, etc. when you invoke an agent with a skill (e.g. `oz agent run --skill planner-agent`).

| Skill | Type | When it applies |
|-------|------|-----------------|
| **zazz-board-api** | rule | Required by all framework agents. Load with any role skill — defines API auth, endpoints, deliverable/task operations. |
| spec-builder-agent | role | Owner + agent creating a deliverable specification |
| planner-agent | role | One-shot decomposition of SPEC → PLAN |
| coordinator-agent | role | Orchestrates execution after plan approval |
| worker-agent | role | Implements tasks |
| qa-agent | role | Verifies AC, creates rework tasks |

**Rules** (`.cursor/rules/`): Always-applied for Cursor agents in this repo (e.g. worktree workflow). Not role-specific.

**zazz-board-api**: Rule-type skill — required for framework agents, not a Cursor always-apply rule. Load with role skill.

---

## Repo layout

```
├── .agents/skills/               # Zazz agent skills
├── .zazz/                        # project.md, standards/, deliverables/
├── .cursor/rules/                # Cursor always-apply (worktree)
├── api/                          # Fastify, routes/, services/, lib/db/schema.js, __tests__/
├── client/                       # React, Vite, Mantine
├── docker-compose.yml            # Postgres 5433
└── package.json
```

**Cwd**: Commands differ at root vs `api/`. **Worktree**: `GIT_DIR=.bare git worktree add -b <branch> ../<worktree-name> main`; copy `.env` from main. See README for full workflow.

---

## API

**Auth**: `TB_TOKEN` or `Authorization: Bearer <token>`. **Full spec**: `http://localhost:3030/docs` (Swagger).

**Key routes for agents**: `GET/POST/PUT/DELETE /projects/:code/deliverables`, `PATCH .../status`, `PATCH .../approve`, `POST/GET/PUT/PATCH/DELETE .../deliverables/:delivId/tasks`, `GET .../graph`, `POST .../tasks/:taskId/relations`. Use `:code` (e.g. ZAZZ) for project.

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

- **Schema**: `api/lib/db/schema.js` (Drizzle). Pre-v1: no migrations — we push the schema directly (`db:push` / `db:reset`). At v1 we'll switch to migrations for production upgrades.
- **Reset (dev)**: From `api/` run `npm run db:reset` (runs reset-and-seed: drop tables/enums → drizzle-kit push → seed).
- **Seeding order**: users → tags → status definitions → coordination requirement definitions → translations → projects → deliverables → tasks → task-tags → task relations. To add seed data: add or edit files in `scripts/seeders/` and register in `reset-and-seed.js` and `seed-all.js` in dependency order.

**Conventions**: Table names UPPER_CASE; columns snake_case in DB, camelCase in JS (Drizzle aliases). Task positions use sparse numbering (e.g. 10, 20) for reorder.

**Key tables**: USERS (access_token), PROJECTS (code, status_workflow, deliverable_status_workflow, completion_criteria_status), TASKS (deliverable_id, status, position), TASK_RELATIONS (task_id, related_task_id, relation_type), DELIVERABLES, TAGS, TASK_TAGS, STATUS_DEFINITIONS, COORDINATION_REQUIREMENT_DEFINITIONS, TRANSLATIONS, IMAGE_METADATA, IMAGE_DATA.

### Test database

`task_blaster_test`. Create: `docker exec task_blaster_postgres psql -U postgres -c "CREATE DATABASE task_blaster_test;" 2>/dev/null || true` then `cd api && DATABASE_URL=.../task_blaster_test npm run db:reset`. See Quick reference for full recreate.

---

## Testing

Vitest + PactumJS against `task_blaster_test` on 3031. **Details**: `api/__tests__/README.md`.

**Run**: `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test`

**Key**: `beforeEach` → `clearTaskData()`. Use ZAZZ project. Helpers: `createTestDeliverable()`, `createTestTask()`. Token: `550e8400-e29b-41d4-a716-446655440000`.

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
