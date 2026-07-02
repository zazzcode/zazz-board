# Zazz Board

**Zazz Board** is a Kanban-style orchestration app for coordinating **AI agents** and **owners** — the people who define what to build, approve deliverable specifications, and review results. Work is organized by **project**; each project contains **deliverables** (features, bug fixes, refactors) that group **tasks**. Owners manage SPECs and deliverable flow; agents execute implementation work and board updates. Only deliverables are PR’d — never individual tasks.

**Current initiative focus:** `spec-builder`, `worker`, and built-in agent/subagent execution flows. A worker is the implementation unit: it may be one lead agent, delegated subagents, or both working together.

**Stack**: Fastify API (JavaScript, ESM on Node.js 24 LTS) · React client (Vite) · PostgreSQL 15 (Docker) · Drizzle ORM · Docker Compose

**Framework:** Zazz Board is the tool that enables teams to practice the [Zazz Framework](https://github.com/zazzcode/zazz-skills/blob/main/zazz-framework.md) — a spec-driven methodology for multi-agent software development. The framework doc defines terminology (SPEC, deliverables, tasks), workflow stages, agent roles, and how owners (Project Owners and Deliverable Owners) and agents collaborate.

---

## Table of contents

- [Board views](#board-views)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Contributor setup](#contributor-setup)
- [Running in the cloud](#running-in-the-cloud)
- [Running tests](#running-tests)
- [API docs (Swagger)](#api-docs-swagger)
- [API authentication](#api-authentication)
- [Common issues](#common-issues)
- [Reference](#reference)
- [About this repository](#about-this-repository)
- [Documentation](#documentation)
- [Curating skills from zazz-skills](#curating-skills-from-zazz-skills)

---

## Board views

Zazz Board gives owners and agents several project-level views over the same deliverables and tasks:

| View | Purpose |
|------|--------|
| **Project** | Create and edit projects, choose the active project, and configure project-level task, deliverable, and Gantt settings. |
| **Gantt chart** | Schedule and inspect project milestones, dated deliverables, dependencies, month/sprint/week headers, the current-date marker, and lazy-loaded task rows under deliverables. |
| **Deliverables Kanban** | Track deliverables through the project’s deliverable workflow (Planning, In Progress, In Review, Staged, Done), with drag-and-drop cards, task progress, and PR URLs. |
| **Task Kanban** | Track agent tasks through the project’s task workflow (To Do, Ready, In Progress, QA, Completed), with deliverable context on each task card. |
| **Task Graph** | Inspect one deliverable’s task dependency graph at a time, including readiness and coordination relationships such as `TEST_TOGETHER` and `DEPLOY_TOGETHER`. |

The deliverables table gives an additional sortable list view with SPEC/PRD paths, copy-to-clipboard actions, PR
links, and task counts.

### Deliverable lifecycle (high level)

1. **Deliverable creation**: Owner works with the **spec builder agent** to create the deliverable specification (SPEC). During that dialogue, the agent drafts the SPEC document and creates the deliverable card on the Kanban board via the API — both with sufficient clarity and correct metadata (SPEC path, worktree, branch).
2. **Readiness**: Owner approves the SPEC, confirms the branch/worktree and review shape, and moves the deliverable to **In Progress** when the deliverable is ready for implementation.
3. **Execution**: The **worker** realizes SPEC-derived tasks just-in-time on the board, creates required relations, and implements with TDD while keeping statuses and block flags current via API. The worker may operate as a lead agent, delegated subagents, or both, depending on the active model and harness.
4. **Review & release**: Owner reviews PR, merges to staging (**Staged**) then to main (**Done** or **Prod** for projects with a release-pipeline workflow). Status history is stored for lead-time and reporting.

### Tech notes

- **API**: Fastify, `TB_TOKEN` (or Bearer) auth, JSON Schema validation. All DB access via `databaseService`; schema in `api/lib/db/schema.js` (Drizzle). See [AGENTS.md](./AGENTS.md) for full route list.
- **API docs**: OpenAPI 3.1 (Swagger UI) at **/docs** — see [API docs (Swagger)](#api-docs-swagger) below.
- **Client**: React, Vite, Mantine, react-router-dom v7, @dnd-kit, react-i18next. Token in localStorage.
- **DB**: Schema-first; no migrations in this phase — `npm run db:reset` drops and recreates from schema then seeds. Separate dev and test DBs.

### Sample project (seed data)

Seed data includes a **sample project** (e.g. **ZAZZ**) so you can explore deliverables, milestones, the project Gantt, task Kanban, deliverable Kanban, and the task graph with realistic data. The sample Gantt data includes historical milestones, dated deliverables, lazy-loaded agent tasks, sprint/week labels, and milestone 4 demo data for the Gantt milestone MVP. Committed deliverable specifications live in **`.zazz/specifications/`**; project standards live in **`.zazz/standards/`**. See the canonical [zazz-framework.md](https://github.com/zazzcode/zazz-skills/blob/main/zazz-framework.md) for the full structure.

---

## Prerequisites

- Docker Desktop installed and running.
- The Zazz Board repo cloned locally.
- Ports `5433`, `3030`, and `3001` available for Postgres, the API, and the client.

## Quick start
Local Docker setup has two flows: first install and upgrade.

Docker images for the API and client build use Node.js `v24.18.0`, matching `.nvmrc`.

### Flow A — Initial install (first time)

```bash
docker compose up --build
```

Optional non-destructive seed attempt:

```bash
npm run docker:seed
```

Expected result:
- PostgreSQL on `localhost:5433`
- API on `localhost:3030`
- Client on `localhost:3001`
- First-run schema + seed happens automatically

### Verify readiness

Wait for API logs to settle and for schema/seed startup to finish before running `psql` queries:

```bash
# Health check (wait until this returns OK)
curl http://localhost:3030/health
```

Expected response: `{"status":"ok"}`

Once healthy, you can safely query the database. Example:

```bash
set -a && source .env && set +a
docker compose --env-file .env exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) AS task_count FROM \"TASKS\";"
```

### Flow B — Upgrade existing install (preserve data)

```bash
docker compose up --build -d
```

Notes:
- Do **not** run `docker compose down -v` for normal upgrades (that deletes Postgres data).
- If schema has changed and data must be preserved, run:

```bash
docker compose exec api npm run db:push
```

### Optional environment overrides

You can skip env files and use defaults. To customize DB settings, copy `.env.example` to `.env` and change values.

Default credentials (from `docker-compose.yml`):

```bash
POSTGRES_DB=zazz_board_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
```

Agent skills and `zazzctl` read `ZAZZ_API_TOKEN` from root `.env`:

```bash
ZAZZ_API_TOKEN=550e8400-e29b-41d4-a716-446655440000
```

### Docker Compose reference (from `docker-compose.yml`)

| Service  | Container name       | Host port | Container port | Notes                    |
|----------|----------------------|-----------|----------------|--------------------------|
| postgres | zazz_board_postgres  | 5433      | 5432          | DB: `zazz_board_db`      |
| api      | zazz_board_api       | 3030      | 3030          | Fastify API              |
| client   | zazz_board_client    | 3001      | 80            | React app (Nginx)        |

- **API**: [http://localhost:3030](http://localhost:3030)
- **Client**: [http://localhost:3001](http://localhost:3001)
- **Postgres** (from host): `localhost:5433`, database `zazz_board_db`

## Contributor setup

Contributor/committer instructions are in [CONTRIBUTOR_SETUP.md](./CONTRIBUTOR_SETUP.md).

### Log in from the browser with an access token

1. Open [http://localhost:3001](http://localhost:3001)
2. Click the **Zazz Board** menu in the header
3. Click **Set Access Token**
4. Paste this token and submit:

```
550e8400-e29b-41d4-a716-446655440000
```

If that token does not work, fetch a valid one from your local DB:

```bash
set -a && source .env && set +a
docker compose --env-file .env exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT email, access_token FROM \"USERS\";"
```

### Local URLs (from `docker-compose.yml`)

- API: [http://localhost:3030](http://localhost:3030)
- Client: [http://localhost:3001](http://localhost:3001)

---

## Running in the cloud

Zazz Board can run beyond local Docker with the same API/client split. The current deployment options are Docker Compose for a single host, AWS with RDS/ECS/S3, or GCP with Cloud SQL/Cloud Run/Cloud Storage.

### Option 1: Docker Compose (self-hosted)

For a single-node deployment, use `docker-compose.prod.yml`:

```bash
export POSTGRES_PASSWORD=your_secure_password
docker compose -f docker-compose.prod.yml up -d
```

- **Postgres**: port 5432 (internal)
- **API**: [http://localhost:3030](http://localhost:3030)
- **Client**: [http://localhost:80](http://localhost:80) (Nginx)

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
2. Create database `zazz_board_db` and user.
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
     --set-env-vars "DATABASE_URL=postgres://USER:PASS@/zazz_board_db?host=/cloudsql/PROJECT:REGION:INSTANCE" \
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

Tests use a separate database (`zazz_board_test`). One-time setup (from project root):

```bash
set -a && source .env && set +a
docker compose exec postgres psql -U postgres -c "CREATE DATABASE zazz_board_test;" 2>/dev/null || true
cd api && DATABASE_URL=postgres://postgres:$POSTGRES_PASSWORD@localhost:5433/zazz_board_test npm run db:reset
```

Then run tests (from `api/`):

```bash
set -a && source .env && set +a && NODE_ENV=test npm run test
```

### Using nvm in non-interactive shells

Developers who use `nvm` usually get `node` and `npm` automatically in interactive terminals because their shell startup files load `nvm`. Non-interactive shells, editor tasks, agent shells, and some CI steps may not load that setup, which can make `npm` appear to be missing even though it works in a normal terminal.

The repo includes `.nvmrc` pinned to Node.js `v24.18.0`, so `nvm use` selects the project runtime. With the current project runtime, npm reports `11.16.0`.

If a non-interactive command reports `npm: command not found`, initialize `nvm` explicitly before running repo commands:

```bash
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use
```

For example:

```bash
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use
cd api
set -a && source .env && set +a && NODE_ENV=test npm run test
```

See [api/__tests__/README.md](./api/__tests__/README.md) for details.

---

## API docs (Swagger)

The API serves **OpenAPI 3.1** interactive docs (Swagger UI) at [http://localhost:3030/docs](http://localhost:3030/docs) when the API is running. The spec is **generated from Fastify route schemas** (single source of truth; no separate YAML to maintain). It includes all routes, request/response shapes, and security: **TB_TOKEN** (header) and **Bearer** (Authorization header). Access to `/docs` is **token-protected** so only authenticated users and agents can view it in production.

### Spec and docs URLs

| URL | Purpose |
|-----|---------|
| **/openapi.json** | Raw OpenAPI 3.1 JSON spec — no auth. Use for agents, codegen, tooling. |
| **/docs** | Swagger UI — interactive docs. Use Authorize for try-it-out. |

### What's in the docs

- **Tags**: core, users, projects, deliverables, task-graph, tags, translations, status-definitions, images.
- **Security**: Global auth via `TB_TOKEN` or Bearer; the UI has an **Authorize** button to set your token for “Try it out” requests.
- **Try it out**: You can run requests from the browser; once authorized, the token is sent automatically and persisted for the session.

### How to access the docs with your access token

You need a valid **access token** (UUID from `USERS.access_token`; seed example: `550e8400-e29b-41d4-a716-446655440000`).

**Option A — Browser (easiest)**  
1. Start the API (`npm run dev` or `npm run dev:api`).  
2. Open [http://localhost:3030/docs](http://localhost:3030/docs) (the `?token=` query string does not work; use Authorize instead)
3. Click **Authorize**, enter `550e8400-e29b-41d4-a716-446655440000` in the **TB_TOKEN** field, then **Authorize** → **Close**  
4. Use “Try it out” on any route; the token is sent on every request.

**Option B — Browser (no token in URL)**  
If you can send a header with the first request (e.g. a REST client or extension), open `http://localhost:3030/docs` with header `TB_TOKEN: <your-uuid>`. Then use **Authorize** in the UI as above for try-it-out.

**Option C — Raw OpenAPI JSON (for agents and codegen)**  
The spec is available at **`/openapi.json`** (no auth required). Agents and tooling can fetch it directly:

```bash
curl http://localhost:3030/openapi.json
```

For authenticated requests, use the token header: `curl -H "TB_TOKEN: 550e8400-e29b-41d4-a716-446655440000" http://localhost:3030/openapi.json`

---

## API authentication

**Which routes require a token?**  
All API routes except: `GET /health`, `GET /`, `GET /db-test`, `GET /token-info`, `GET /openapi.json`. The docs at `GET /docs` (and `/docs/*`) also require a valid token.

**How is the access token set for API calls?**  
Send one of:

- **Header**: `TB_TOKEN: <uuid>` (from `USERS.access_token`).
- **Header**: `Authorization: Bearer <uuid>`.

Example (seed user): `TB_TOKEN: 550e8400-e29b-41d4-a716-446655440000`

For **Swagger UI**, see [How to access the docs with your access token](#how-to-access-the-docs-with-your-access-token) above.

---

## Common issues

- **Port in use**: `lsof -ti:3030 | xargs kill -9` (API), `lsof -ti:3001 | xargs kill -9` (client), `lsof -ti:3031 | xargs kill -9` (test server).
- **Sample data missing or first-run seed failed**: with containers running, run `npm run docker:reset:seed`, then re-run the health check.
- **drizzle-kit** “please install drizzle-orm”: From repo root, run `npm install` and `npm install --workspace=api`. Do not create manual `node_modules` symlinks in worktrees.
- **`npm: command not found` when using nvm**: initialize `nvm` explicitly in non-interactive shells; see [Using nvm in non-interactive shells](#using-nvm-in-non-interactive-shells).
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
| Reset + reseed Docker DB (containers running) | `npm run docker:reset:seed` |
| Run tests (from `api/`) | `set -a && source .env && set +a && NODE_ENV=test npm run test` |

Env: `api/.env` — `DATABASE_URL` (dev), `DATABASE_URL_TEST` (tests). Port 5433. Test DB setup: [AGENTS.md](./AGENTS.md). Test guide: [api/__tests__/README.md](./api/__tests__/README.md).

---

## About this repository

This repository is developed using the Zazz framework (dogfooding). Zazz Board is built with Zazz Board — we use our own deliverables, SPECs, and workflow to evolve the product.

---

## Documentation

- **[zazz-framework.md (canonical)](https://github.com/zazzcode/zazz-skills/blob/main/zazz-framework.md)** — Full framework overview: terminology (SPEC), workflow stages, agent roles, two kanban boards, TDD, and how to follow the methodology.
- **[AGENTS.md](./AGENTS.md)** — Primary reference for agents and developers: repo layout, full API route list, DB setup, test strategy (Vitest + PactumJS + test DB), troubleshooting.
- **API docs (Swagger UI)**: **http://localhost:3030/docs** — OpenAPI 3.1, token-protected. See [API docs (Swagger)](#api-docs-swagger) and [How to access the docs with your access token](#how-to-access-the-docs-with-your-access-token).
- **[api/__tests__/README.md](./api/__tests__/README.md)** — Writing and running API tests (PactumJS, helpers, safety guards).
- **`.zazz/`** — Zazz Framework structure (this repo's DOCS_ROOT is `.zazz/`): `project.md`, `standards/` (atomic project standards), `features/`, `proposals/`, `specifications/`, `architecture/`, `docs/` (vendored methodology guides), and `execution/` (gitignored runtime records). See [zazz-framework.md](https://github.com/zazzcode/zazz-skills/blob/main/zazz-framework.md) for repository structure guidance and `.zazz/standards/index.yaml` for the standards index.
- **`.agents/skills/`** — Agent skills. `zazz-skills` provides seed/reference skills, but this repo's checked-in skill files are curated locally and may diverge when project behavior requires it.
- **`.zazz/deliverables/deliverables-feature-SPEC.md`** — Full Deliverable Specification for the deliverables feature. Also in [docs/deliverables_feature_SPEC.md](docs/deliverables_feature_SPEC.md) (legacy path).

## Curating skills from zazz-skills

`zazz-skills` is an initial seed and upstream reference for reusable framework skills. After a project has local skill files, updates are curated selectively: compare upstream intent, keep local project behavior, and only copy changes that still fit this repo.

Typical curation flow:

1. Review upstream changes in `zazz-skills` and decide whether they apply to this repo.
2. Compare the relevant upstream skill files against the local `.agents/skills/` files.
3. Apply selected changes manually, preserving local edits such as repo-specific workflow, skill names, ignored upstream skills, and local-only skills.
4. Review related docs (`README.md`, `AGENTS.md`, `.zazz/`) because skill renames or policy changes often leave stale references outside skill folders.

Notes:

- Upstream skills this project does not use, such as SQL Server or external-tracker integrations, should stay out unless the project need changes.
- Repo-owned skills and local skill edits must not be overwritten by upstream reference material.
- Do not treat upstream as automatically authoritative for this repo.

## Updating standards from zazz-skills

Use `.zazz/standards/index.yaml` as the routing source of truth for standard selection. See `.zazz/standards/contextual-split.md` for ownership and sync discipline before refreshing vendored standards from `zazz-skills`.
