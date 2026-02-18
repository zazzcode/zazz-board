# Zazz Board

**Zazz Board** is a Kanban-style orchestration app for coordinating **AI agents** and **humans** on software development. Work is organized as **deliverables** (features, bug fixes, refactors) that group **tasks**. Humans own specs and deliverable flow; agents own task execution and QA. Only deliverables are PR’d — never individual tasks.

**Stack**: Fastify API (JavaScript, ESM) · React client (Vite) · PostgreSQL 15 (Docker) · Drizzle ORM · Docker Compose

---

## What is the Zazz methodology?

The **Zazz methodology** is a way of working with AI agents on software projects:

1. **Spec-driven**: Each unit of work is a **deliverable** with a **DED** (Deliverable Expectations Document) and an **implementation plan** (markdown). Requirements and acceptance criteria live in the DED; tests are derived from AC.
2. **Deliverable = branch**: One Git worktree/branch per deliverable. Tasks live under that deliverable; agents implement tasks in that worktree.
3. **PR at deliverable level**: Tasks are never opened as PRs. When all tasks for a deliverable are done, a **single PR** is created for the deliverable’s branch. Humans review and merge the deliverable.
4. **Clear roles**: **Humans** create deliverables, write DEDs and plans, approve plans, and review/merge PRs. **Agents** create tasks from plans, implement tasks, run QA, and (when ready) create the deliverable PR. Task cards are for visibility; task execution is agent-managed.

So: **Project → Deliverable → Tasks**. You track *what* (deliverables and their status) and *how* (tasks and dependencies) in one place.

### Mandatory requirements

- **Git worktrees**: Each deliverable must use a **Git worktree** (one working directory + branch per deliverable). Worktrees give agents a single, unambiguous working context: no branch switching and no ambiguity about which branch or directory to use. Tooling and agents always operate in the correct place without inferring from branch names or history.
- **API-level testing**: Behavior and validation are exercised heavily via **API integration tests** (e.g. Vitest + PactumJS against the real API). Those tests validate functionality and **drive acceptance criteria** — AC is expressed and verified at the API boundary.
- **Language-neutral**: The methodology does not depend on a specific programming language or framework. Specs, DEDs, and plans are markdown; deliverables and tasks are generic work units.

---

## How it’s implemented

### Hierarchy and IDs

- **Projects** have a `code` (e.g. `ZAZZ`, `APIMOD`) and two workflows: one for **task** columns (Kanban), one for **deliverable** columns.
- **Deliverables** are the human-facing unit: human-readable ID `{PROJECT_CODE}-{n}` (e.g. `ZAZZ-1`), type (FEATURE, BUG_FIX, REFACTOR, etc.), DED/plan file paths, plan approval, Git worktree/branch, PR URL. Each deliverable has a status (Planning → In Progress → In Review → Staged → Done, or project-specific).
- **Tasks** belong to exactly one deliverable, identified by integer `id` (agent-facing). They use the Zazz task workflow: **To Do → Ready → In Progress → QA → Completed**. Dependencies and coordination are modeled in the task graph (DEPENDS_ON, COORDINATES_WITH); readiness and auto-promotion (e.g. TO_DO → READY when deps are met) are supported.

### Main views and features

| View | Purpose |
|------|--------|
| **Project list** | Create/edit projects; configure task and deliverable workflows. |
| **Deliverable list** | Sortable table of deliverables per project; DED/plan/PRD paths with copy-to-clipboard; PR links. |
| **Deliverable Kanban** | Columns from project’s deliverable workflow (Planning, In Progress, In Review, Staged, Done). Drag-and-drop deliverable cards; task progress and PR URL on cards. |
| **Task Kanban** | Columns from project’s task workflow (To Do, Ready, In Progress, QA, Completed). Tasks show deliverable name in card footer. Drag-and-drop. |
| **Task graph** | Dependency graph with **swim lanes per deliverable**; each lane is one deliverable’s sub-graph; edges can cross lanes. Readiness and coordination types (e.g. TEST_TOGETHER, DEPLOY_TOGETHER) supported. |

### Deliverable lifecycle (high level)

1. **Planning**: Human creates deliverable, sets DED/plan paths and worktree/branch. Human approves plan (sets `approved_by` / `approved_at`). Human or system moves deliverable to **In Progress** (guard: plan approved + plan path set).
2. **Execution**: Agents create tasks from the plan, work them through To Do → Ready → In Progress → QA → Completed. When all tasks are completed, agent (or human) creates PR and sets `pull_request_url` on the deliverable, then moves deliverable to **In Review**.
3. **Review & release**: Human reviews PR, merges to staging (**Staged**) then to main (**Done** or **Prod** for projects with a release-pipeline workflow). Status history is stored for lead-time and reporting.

### Tech notes

- **API**: Fastify, `TB_TOKEN` (or Bearer) auth, JSON Schema validation. All DB access via `databaseService`; schema in `api/lib/db/schema.js` (Drizzle). See [AGENTS.md](./AGENTS.md) for full route list.
- **API docs**: OpenAPI 3.1 (Swagger UI) at **/docs** when the API is running. The spec is generated from Fastify route schemas. **Access is protected**: only requests with a valid `TB_TOKEN` (or `Authorization: Bearer`) can load the docs, so in production only authenticated users and agents can view them.
- **Client**: React, Vite, Mantine, react-router-dom v7, @dnd-kit, react-i18next. Token in localStorage.
- **DB**: Schema-first; no migrations in this phase — `npm run db:reset` drops and recreates from schema then seeds. Separate dev and test DBs.

### Sample project (seed data)

Seed data includes a **sample project** (e.g. **ZAZZ**) so you can explore deliverables, task Kanban, deliverable Kanban, and the task graph with realistic data. The primary project is intended to have an overarching **Technical Architecture** document that applies to all deliverables: **TECH_ARCHITECTURE.md** (at repo root or in `docs/`). That doc describes the system-wide architecture; individual deliverables reference it and add deliverable-specific design in their DEDs and plans.

---

## Quick start

### Prerequisites

- Node.js 22+ and npm  
- Docker Desktop (PostgreSQL 15 on host port 5433)

### Setup

```bash
npm install
npm install --workspace=api
cd client && npm install && cd ..

cp api/.env.example api/.env
# Edit api/.env: set both DATABASE_URL and DATABASE_URL_TEST with password 'password' and port 5433

npm run docker:up:db
cd api && npm run db:reset && cd ..
```

### Run

```bash
npm run dev
```

- **Client**: http://localhost:3001  
- **API**: http://localhost:3030  

Optional: run API and client separately with `npm run dev:api` and `npm run dev:client`.

### Database

```bash
cd api
npm run db:reset   # Drop, recreate from schema, seed
npm run db:seed   # Seed only (tables must exist)
```

### Tests

```bash
cd api
set -a && source .env && set +a && NODE_ENV=test npm run test
```

Test DB must exist and be seeded; see [AGENTS.md](./AGENTS.md) for creating/resetting `task_blaster_test`. Full test guide: [api/__tests__/README.md](./api/__tests__/README.md).

---

## API authentication

**Which routes require a token?**  
All API routes except: `GET /health`, `GET /`, `GET /db-test`, `GET /token-info`. The docs at `GET /docs` (and `/docs/*`) also require a valid token.

**How is the access token set?**  
Send one of:

- **Header**: `TB_TOKEN: <uuid>` (e.g. from `USERS.access_token` in the DB).
- **Header**: `Authorization: Bearer <uuid>`.
- **Docs only (browser)**: open `/docs?token=<uuid>` so the first request includes the token in the query string (use only in trusted environments; avoid sharing the URL).

Example (seed user):  
`TB_TOKEN: 550e8400-e29b-41d4-a716-446655440000`

**Does Swagger UI let you set the token?**  
Yes. After the docs page loads, use **Authorize** (top of the page). Enter your UUID in the `TB_TOKEN` field (or use Bearer). Swagger UI will send that token on every “Try it out” request. Authorization is persisted in the browser for the session (`persistAuthorization: true`).

---

## Common issues

- **Port in use**: `lsof -ti:3030 | xargs kill -9` (API), `lsof -ti:3001 | xargs kill -9` (client), `lsof -ti:3031 | xargs kill -9` (test server).
- **drizzle-kit** “please install drizzle-orm”: From repo root, `ln -sf ./api/node_modules/drizzle-orm ./node_modules/drizzle-orm`.
- **Tests**: Always source `api/.env` and set `NODE_ENV=test`; see [AGENTS.md](./AGENTS.md) and [api/__tests__/README.md](./api/__tests__/README.md).

---

## Documentation

- **[AGENTS.md](./AGENTS.md)** — Primary reference for agents and developers: repo layout, full API route list, DB setup, test strategy (Vitest + PactumJS + test DB), troubleshooting.
- **API docs (Swagger UI)**: Run the API and open **http://localhost:3030/docs** for interactive OpenAPI 3.1 docs. Docs are token-protected (see [API authentication](#api-authentication) below).
- **[api/__tests__/README.md](./api/__tests__/README.md)** — Writing and running API tests (PactumJS, helpers, safety guards).
- **docs/deliverables_feature_DED.md** — Full Deliverable Expectations Document (DED) for the deliverables feature: problem statement, definitions, schema, API, UI, seed data, acceptance criteria, and Zazz lifecycle in detail.
