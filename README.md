# Zazz Board

**Zazz Board** is a Kanban-style orchestration app for coordinating **AI agents** and **owners** — the people who define what to build, approve PLANs, and review results. Work is organized by **project**; each project contains **deliverables** (features, bug fixes, refactors) that group **tasks**. Owners manage SPECs and deliverable flow; agents handle task execution and QA. Only deliverables are PR’d — never individual tasks.

**Stack**: Fastify API (JavaScript, ESM) · React client (Vite) · PostgreSQL 15 (Docker) · Drizzle ORM · Docker Compose

**Framework:** Zazz Board is the tool that enables teams to practice the [Zazz Framework](docs/ZAZZ-FRAMEWORK.md) — a spec-driven methodology for multi-agent software development. The framework doc defines terminology (SPEC, PLAN, deliverables, tasks), workflow stages, agent roles, and how owners (Project Owners and Deliverable Owners) and agents collaborate.

---

## Table of contents

- [Main views and features](#main-views-and-features)
- [Quick start](#quick-start)
- [Running in the cloud](#running-in-the-cloud)
- [Running tests](#running-tests)
- [API docs (Swagger)](#api-docs-swagger)
- [API authentication](#api-authentication)
- [Common issues](#common-issues)
- [Reference](#reference)
- [About this repository](#about-this-repository)
- [Documentation](#documentation)

---

## Main views and features

| View | Purpose |
|------|--------|
| **Project list** | Create/edit projects; configure task and deliverable workflows. |
| **Deliverable list** | Sortable table of deliverables per project; SPEC/PLAN/PRD paths with copy-to-clipboard; PR links. |
| **Deliverable Kanban** | Columns from project’s deliverable workflow (Planning, In Progress, In Review, Staged, Done). Drag-and-drop deliverable cards; task progress and PR URL on cards. |
| **Task Kanban** | Columns from project’s task workflow (To Do, Ready, In Progress, QA, Completed). Tasks show deliverable name in card footer. Drag-and-drop. |
| **Task graph** | Dependency graph with **swim lanes per deliverable**; each lane is one deliverable’s sub-graph; edges can cross lanes. Readiness and coordination types (e.g. TEST_TOGETHER, DEPLOY_TOGETHER) supported. |

### Deliverable lifecycle (high level)

1. **Deliverable creation**: Owner works with the **spec builder agent** to create the deliverable specification (SPEC). During that dialogue, the agent drafts the SPEC document and creates the deliverable card on the Kanban board via the API — both with sufficient clarity and correct metadata (SPEC path, worktree, branch).
2. **Planning**: The **Planner agent** decomposes the SPEC into the PLAN — phased sequence of tasks with per-task acceptance criteria, test requirements, and file assignments. Owner approves PLAN (sets `approved_by` / `approved_at`), sets PLAN path. Owner or system moves deliverable to **In Progress** (guard: PLAN approved + PLAN path set).
3. **Execution**: **Coordinator** creates tasks from the PLAN via the API; **Workers** implement tasks; **QA** validates against acceptance criteria. When all tasks are complete, QA creates PR and sets `pull_request_url` on the deliverable, then moves deliverable to **In Review**.
4. **Review & release**: Owner reviews PR, merges to staging (**Staged**) then to main (**Done** or **Prod** for projects with a release-pipeline workflow). Status history is stored for lead-time and reporting.

### Tech notes

- **API**: Fastify, `TB_TOKEN` (or Bearer) auth, JSON Schema validation. All DB access via `databaseService`; schema in `api/lib/db/schema.js` (Drizzle). See [AGENTS.md](./AGENTS.md) for full route list.
- **API docs**: OpenAPI 3.1 (Swagger UI) at **/docs** — see [API docs (Swagger)](#api-docs-swagger) below.
- **Client**: React, Vite, Mantine, react-router-dom v7, @dnd-kit, react-i18next. Token in localStorage.
- **DB**: Schema-first; no migrations in this phase — `npm run db:reset` drops and recreates from schema then seeds. Separate dev and test DBs.

### Sample project (seed data)

Seed data includes a **sample project** (e.g. **ZAZZ**) so you can explore deliverables, task Kanban, deliverable Kanban, and the task graph with realistic data. The primary project is intended to have an overarching **Technical Architecture** document that applies to all deliverables: **TECH_ARCHITECTURE.md** (at repo root or in `docs/`). That doc describes the system-wide architecture; individual deliverables reference it and add deliverable-specific design in their SPECs and PLANs.

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

## About this repository

This repository is developed using the Zazz framework (dogfooding). Zazz Board is built with Zazz Board — we use our own deliverables, SPECs, PLANs, and workflow to evolve the product.

---

## Documentation

- **[docs/ZAZZ-FRAMEWORK.md](docs/ZAZZ-FRAMEWORK.md)** — Full framework overview: terminology (SPEC, PLAN), workflow stages, agent roles, two kanban boards, TDD, and how to follow the methodology.
- **[AGENTS.md](./AGENTS.md)** — Primary reference for agents and developers: repo layout, full API route list, DB setup, test strategy (Vitest + PactumJS + test DB), troubleshooting.
- **API docs (Swagger UI)**: **http://localhost:3030/docs** — OpenAPI 3.1, token-protected. See [API docs (Swagger)](#api-docs-swagger) and [How to access the docs with your access token](#how-to-access-the-docs-with-your-access-token).
- **[api/__tests__/README.md](./api/__tests__/README.md)** — Writing and running API tests (PactumJS, helpers, safety guards).
- **docs/deliverables_feature_SPEC.md** — Full Deliverable Specification (SPEC) for the deliverables feature: problem statement, definitions, schema, API, UI, seed data, acceptance criteria, and Zazz lifecycle in detail.
