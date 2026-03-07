# Contributor setup

This guide is for developers/committers working on the codebase locally. **Only the database runs in Docker**; the API and client run natively so you get visible logs and hot reload on frontend changes.

## Prerequisites

- Node.js 22+
- Docker Desktop or Colima (for Postgres only)

## 1) Install dependencies

From repo root:

```bash
npm install
npm install --workspace=api
cd client && npm install --legacy-peer-deps && cd ..
cp api/.env.example api/.env
```

## 2) Configure environment

Edit `api/.env` and ensure both URLs use port **5433** and password `password`:

```
DATABASE_URL=postgres://postgres:password@localhost:5433/zazz_board_db
DATABASE_URL_TEST=postgres://postgres:password@localhost:5433/zazz_board_test
```

## 3) Start the database (Docker)

From repo root:

```bash
npm run docker:up:db
```

Verify Postgres is running:

```bash
docker ps | grep zazz_board_postgres
```

## 4) Create test database (one-time)

Tests use a separate DB. Create it and apply schema once:

```bash
docker exec zazz_board_postgres psql -U postgres -c "CREATE DATABASE zazz_board_test;" 2>/dev/null || true
npm run db:reset
cd api && DATABASE_URL=postgres://postgres:password@localhost:5433/zazz_board_test npm run db:reset
cd ..
```

## 5) Run API and client (separate terminals)

**Do not** run the full stack in Docker. Run API and client locally in **two terminals** so you see logs and get hot reload.

**Terminal 1 — API**

```bash
npm run dev:api
```

**Terminal 2 — Client**

```bash
npm run dev:client
```

Local URLs:

- API: http://localhost:3030
- Client: http://localhost:3001

**Why separate terminals?** You get live API logs, client build output, and Vite’s hot module replacement so frontend changes auto-reload in the browser.

## 6) Reset dev database

From repo root:

```bash
npm run db:reset
```

## 7) Run tests

From `api/`:

```bash
set -a && source .env && set +a && NODE_ENV=test npm run test
```

Or from root:

```bash
cd api && set -a && source .env && set +a && NODE_ENV=test npm run test
```

## 8) Common DB commands

From repo root:

```bash
npm run db:reset   # Drop tables, push schema, seed (destructive)
npm run db:seed    # Seed only (tables must exist)
npm run db:push    # Push schema changes without dropping (preserves data)
```

Pre-v1 we push the schema directly (`db:push` / `db:reset`), no migration files — schema changes are still frequent. At v1 we'll switch to migrations for production upgrades. See [.zazz/standards/data-architecture.md](.zazz/standards/data-architecture.md) for database design philosophy (schema-first).

## 9) Reset local Docker DB (destructive)

To wipe Postgres data and start fresh:

```bash
docker compose down -v
npm run docker:up:db
npm run db:reset
```

Re-run step 4 if you need the test database again.

## Worktree workflow (mandatory)

This repo uses **worktrees** for feature work. See [AGENTS.md](./AGENTS.md) and `.cursor/rules/worktree-workflow.mdc`:

- Main worktree is read-only.
- Create a worktree per branch: `git worktree add -b <branch> ../<worktree-name> main`
- Copy `api/.env` from main into the new worktree.
- Push branch → merge on GitHub → pull main locally. Never merge into main locally.

## Notes

- Dev Postgres runs on port **5433** (prod uses 5432) so you can run both dev and production on the same machine without port conflicts.
- Default DB password is `password`.
- In worktrees, avoid manual `node_modules` symlinks. If `drizzle-kit` complains about `drizzle-orm`, re-run `npm install` at repo root plus `npm install --workspace=api`.
- If client dependencies fail due to peer resolution, re-run with `--legacy-peer-deps`.
- Port in use: `lsof -ti:3030 | xargs kill -9` (API), `lsof -ti:3001 | xargs kill -9` (client).
- Manual API token (seed): `550e8400-e29b-41d4-a716-446655440000`
