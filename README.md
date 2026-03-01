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
- **API docs**: OpenAPI 3.1 (Swagger UI) at **/docs** — see [API docs (Swagger)](#api-docs-swagger) below.
- **Client**: React, Vite, Mantine, react-router-dom v7, @dnd-kit, react-i18next. Token in localStorage.
- **DB**: Schema-first; no migrations in this phase — `npm run db:reset` drops and recreates from schema then seeds. Separate dev and test DBs.

### Sample project (seed data)

Seed data includes a **sample project** (e.g. **ZAZZ**) so you can explore deliverables, task Kanban, deliverable Kanban, and the task graph with realistic data. The primary project is intended to have an overarching **Technical Architecture** document that applies to all deliverables: **TECH_ARCHITECTURE.md** (at repo root or in `docs/`). That doc describes the system-wide architecture; individual deliverables reference it and add deliverable-specific design in their DEDs and plans.

---

## Quick start

Prerequisites: Node.js 22+, Docker Desktop. All commands assume the terminal is in the project root (directory containing `api/`, `client/`, `package.json`).

### 1. Install dependencies

```bash
npm install
npm install --workspace=api
cd client && npm install && cd ..
```

### 2. Configure environment

```bash
cp api/.env.example api/.env
```

Edit `api/.env`: set `DATABASE_URL` and `DATABASE_URL_TEST` to use password `password` and port `5433`:

```
DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_dev
DATABASE_URL_TEST=postgres://postgres:password@localhost:5433/task_blaster_test
```

### 3. Start PostgreSQL

```bash
npm run docker:up:db
```

### 4. Create and seed database

```bash
cd api && npm run db:reset && cd ..
```

### 5. Run the app

```bash
npm run dev
```

- API: http://localhost:3030  
- Client: http://localhost:3001  

---

## Running in the cloud

### Option 1: Docker Compose (self-hosted)

For a single-node deployment, use `docker-compose.prod.yml`:

```bash
export POSTGRES_PASSWORD=your_secure_password
docker compose -f docker-compose.prod.yml up -d
```

- **Postgres**: port 5432 (internal)
- **API**: http://localhost:3030
- **Client**: http://localhost:80 (Nginx)

Set `API_BASE_URL` in the API container if the client needs to reach the API at a different host (e.g. a public URL).

---

### Option 2: AWS (RDS + ECS)

| Component | AWS service |
|-----------|-------------|
| Database | **RDS** PostgreSQL 15 |
| API | **ECS Fargate** (container from `api/Dockerfile`) |
| Client | **S3** + **CloudFront** (static build) |
| Task images | **S3** (in work — see [Cloud deployment notes](#cloud-deployment-notes-in-work)) |

**Flow:** Create RDS instance → build and push API image to ECR → deploy ECS task with `DATABASE_URL` pointing at RDS → build client with `VITE_API_URL` set to your API URL → upload to S3, configure CloudFront. Use **Application Load Balancer** in front of ECS for the API.

---

### Option 3: GCP (Cloud SQL + Cloud Run)

| Component | GCP service |
|-----------|-------------|
| Database | **Cloud SQL** (PostgreSQL 15) |
| API | **Cloud Run** (container from `api/Dockerfile`) |
| Client | **Cloud Storage** + **Cloud CDN** (or Firebase Hosting) |
| Task images | **Cloud Storage** (in work — see [Cloud deployment notes](#cloud-deployment-notes-in-work)) |

**Step 1 — Cloud SQL**

1. Create a Cloud SQL instance (PostgreSQL 15).
2. Create database `task_blaster_db` and user.
3. Enable **Cloud SQL Admin API** and (optionally) **Private IP** for VPC connectivity.

**Step 2 — API on Cloud Run**

1. Build and push the API image to **Artifact Registry**:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT/zazz-board-api ./api
   ```
2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy zazz-board-api \
     --image gcr.io/YOUR_PROJECT/zazz-board-api \
     --platform managed \
     --region us-central1 \
     --set-env-vars "DATABASE_URL=postgres://USER:PASS@/task_blaster_db?host=/cloudsql/PROJECT:REGION:INSTANCE" \
     --add-cloudsql-instances PROJECT:REGION:INSTANCE
   ```
3. Use **Cloud SQL Auth Proxy** connection name in `DATABASE_URL` when using Unix socket, or configure **VPC connector** for private IP.

**Step 3 — Client**

1. Build the client with the API URL:
   ```bash
   cd client && VITE_API_URL=https://your-api-url.run.app npm run build
   ```
2. Upload `dist/` to a **Cloud Storage** bucket and enable static website hosting, or use **Firebase Hosting**.
3. Optionally put **Cloud CDN** in front for caching.

**Step 4 — Seed the database**

Run the seed script once against Cloud SQL (e.g. from Cloud Shell or a one-off Cloud Run job with `npm run db:reset`), or use a local connection through the Cloud SQL Auth Proxy.

---

### Cloud deployment notes (in work)

**Image storage:** For cloud deployments, task images should be stored in object storage rather than the database:

- **AWS:** **S3** — upload images to a bucket; store metadata and object keys in the DB.
- **GCP:** **Cloud Storage** — same pattern; store metadata and `gs://` URLs or object names in the DB.

**Configuration:** The API will need environment or config to distinguish cloud vs local (e.g. `STORAGE_BACKEND=s3` or `STORAGE_BACKEND=gcs` vs database). This allows the image service to route uploads and serves to the correct backend. *This functionality is in work.*

---

## Running tests

Tests use a separate database (`task_blaster_test`). One-time setup:

```bash
docker exec task_blaster_postgres psql -U postgres -c "CREATE DATABASE task_blaster_test;" 2>/dev/null || true
cd api && DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_test npm run db:reset
```

Then run tests (from `api/`):

```bash
set -a && source .env && set +a && NODE_ENV=test npm run test
```

See [api/__tests__/README.md](./api/__tests__/README.md) for details.

---

## API docs (Swagger)

The API serves **OpenAPI 3.1** interactive docs (Swagger UI) at **http://localhost:3030/docs** when the API is running. The spec is **generated from Fastify route schemas** (single source of truth; no separate YAML to maintain). It includes all routes, request/response shapes, and security: **TB_TOKEN** (header) and **Bearer** (Authorization header). Access to `/docs` is **token-protected** so only authenticated users and agents can view it in production.

### What’s in the docs

- **Tags**: core, users, projects, deliverables, task-graph, tags, translations, status-definitions, images.
- **Security**: Global auth via `TB_TOKEN` or Bearer; the UI has an **Authorize** button to set your token for “Try it out” requests.
- **Try it out**: You can run requests from the browser; once authorized, the token is sent automatically and persisted for the session.

### How to access the docs with your access token

You need a valid **access token** (UUID from `USERS.access_token`; seed example: `550e8400-e29b-41d4-a716-446655440000`).

**Option A — Browser (easiest)**  
1. Start the API (`npm run dev` or `npm run dev:api`).  
2. Open: **http://localhost:3030/docs?token=550e8400-e29b-41d4-a716-446655440000** (replace with your token).  
3. The docs page loads. Click **Authorize**, enter the same token in the **TB_TOKEN** field, then **Authorize** → **Close**.  
4. Use “Try it out” on any route; the token is sent on every request.

**Option B — Browser (no token in URL)**  
If you can send a header with the first request (e.g. a REST client or extension), open `http://localhost:3030/docs` with header `TB_TOKEN: <your-uuid>`. Then use **Authorize** in the UI as above for try-it-out.

**Option C — Raw OpenAPI JSON**  
Fetch the spec with your token (e.g. for codegen or tooling):

```bash
curl -H "TB_TOKEN: 550e8400-e29b-41d4-a716-446655440000" http://localhost:3030/docs/json
```

**Security**: Don’t share URLs that contain `?token=...`; use that pattern only in trusted environments.

---

## API authentication

**Which routes require a token?**  
All API routes except: `GET /health`, `GET /`, `GET /db-test`, `GET /token-info`. The docs at `GET /docs` (and `/docs/*`) also require a valid token.

**How is the access token set for API calls?**  
Send one of:

- **Header**: `TB_TOKEN: <uuid>` (from `USERS.access_token`).
- **Header**: `Authorization: Bearer <uuid>`.

Example (seed user): `TB_TOKEN: 550e8400-e29b-41d4-a716-446655440000`

For **Swagger UI**, see [How to access the docs with your access token](#how-to-access-the-docs-with-your-access-token) above.

---

## Common issues

- **Port in use**: `lsof -ti:3030 | xargs kill -9` (API), `lsof -ti:3001 | xargs kill -9` (client), `lsof -ti:3031 | xargs kill -9` (test server).
- **drizzle-kit** “please install drizzle-orm”: From repo root, `ln -sf ./api/node_modules/drizzle-orm ./node_modules/drizzle-orm`.
- **Tests**: Always source `api/.env` and set `NODE_ENV=test`; see [AGENTS.md](./AGENTS.md) and [api/__tests__/README.md](./api/__tests__/README.md).

---

## Reference

| Action | Command (project root unless noted) |
|--------|-------------------------------------|
| Run API + client | `npm run dev` |
| Run API only | `npm run dev:api` |
| Run client only | `npm run dev:client` |
| Reset dev DB (from `api/`) | `npm run db:reset` |
| Seed only (from `api/`) | `npm run db:seed` |
| Run tests (from `api/`) | `set -a && source .env && set +a && NODE_ENV=test npm run test` |

Env: `api/.env` — `DATABASE_URL` (dev), `DATABASE_URL_TEST` (tests). Port 5433. Test DB setup: [AGENTS.md](./AGENTS.md). Test guide: [api/__tests__/README.md](./api/__tests__/README.md).

---

## Documentation

- **[AGENTS.md](./AGENTS.md)** — Primary reference for agents and developers: repo layout, full API route list, DB setup, test strategy (Vitest + PactumJS + test DB), troubleshooting.
- **API docs (Swagger UI)**: **http://localhost:3030/docs** — OpenAPI 3.1, token-protected. See [API docs (Swagger)](#api-docs-swagger) and [How to access the docs with your access token](#how-to-access-the-docs-with-your-access-token).
- **[api/__tests__/README.md](./api/__tests__/README.md)** — Writing and running API tests (PactumJS, helpers, safety guards).
- **docs/deliverables_feature_DED.md** — Full Deliverable Expectations Document (DED) for the deliverables feature: problem statement, definitions, schema, API, UI, seed data, acceptance criteria, and Zazz lifecycle in detail.
