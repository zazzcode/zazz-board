# Contributor setup

This guide is for developers/committers working on the codebase locally. **Only the database runs in Docker**; the API and client run natively so you get visible logs and hot reload on frontend changes.

To just try the app without a dev environment, use the [Quick start (Docker)](./README.md#quick-start-docker) in the README instead.

## Prerequisites

- Node.js 24 LTS (`v24.18.0`) and npm 11+
- Docker Desktop or Colima (for Postgres only)

## Setup

### 1) Install dependencies

From repo root:

```bash
nvm use
npm install
npm install --workspace=api
cd client && npm install --legacy-peer-deps && cd ..
cp api/.env.example api/.env
```

The project `.nvmrc` is pinned to `v24.18.0`; `nvm use` should report Node.js `v24.18.0` and npm `11.16.0`.

The root `npm install` step also installs the Git hooks for this repo. Pre-commit checks are intentionally lightweight:

- staged backend JavaScript gets ESLint
- staged frontend JavaScript/JSX gets ESLint
- staged Markdown gets markdownlint

Full backend tests remain a manual/CI step rather than a pre-commit requirement.

### 2) Configure environment

Edit `api/.env` and ensure both URLs use port **5433** and password `password`:

```
DATABASE_URL=postgres://postgres:password@localhost:5433/zazz_board_db
DATABASE_URL_TEST=postgres://postgres:password@localhost:5433/zazz_board_test
```

(To run against Neon instead, see [Neon backend (optional)](#neon-backend-optional) below — swapping env blocks is all it takes.)

### 3) Start the database (Docker)

From repo root:

```bash
npm run docker:up:db
```

Verify Postgres is running:

```bash
docker ps | grep zazz_board_postgres
```

### 4) Create test database (one-time)

Tests use a separate DB. Create it and apply schema once:

```bash
docker exec zazz_board_postgres psql -U postgres -c "CREATE DATABASE zazz_board_test;" 2>/dev/null || true
npm run db:reset
cd api && DATABASE_URL=postgres://postgres:password@localhost:5433/zazz_board_test npm run db:reset
cd ..
```

## Daily workflow

### 5) Run API and client (separate terminals)

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

### 6) Run tests

From `api/`:

```bash
set -a && source .env && set +a && NODE_ENV=test npm run test
```

Or from root:

```bash
cd api && set -a && source .env && set +a && NODE_ENV=test npm run test
```

Tests always run against the local Docker test database (`zazz_board_test`), never against Neon. See [api/__tests__/README.md](./api/__tests__/README.md) for the test-writing guide.

### 7) Database commands and resets

From repo root:

```bash
npm run db:reset   # Drop tables, push schema, seed (destructive)
npm run db:seed    # Seed only (tables must exist)
npm run db:push    # Push schema changes without dropping (preserves data)
```

Pre-v1 we push the schema directly (`db:push` / `db:reset`), no migration files — schema changes are still frequent. At v1 we'll switch to migrations for production upgrades. See [.zazz/standards/data-architecture.md](.zazz/standards/data-architecture.md) for database design philosophy (schema-first).

For a full destructive wipe of the local Docker Postgres (drops the volume):

```bash
docker compose down -v
npm run docker:up:db
npm run db:reset
```

Re-run step 4 if you need the test database again.

## Environment notes

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

## Neon backend (optional)

The app can run on [Neon](https://neon.tech) (serverless Postgres + S3-compatible Object Storage for attachments) instead of local Docker Postgres — selected purely by `api/.env` configuration. Local Docker remains the default, and this guide's flow is all you need for regular contributor work.

If you want to develop against Neon or work on the Neon integration:

- Full setup walkthrough (project, database, bucket, credentials, `api/.env` template): [`.zazz/docs/neon-setup.md`](./.zazz/docs/neon-setup.md). Neon facts and traps live in [`.zazz/docs/neon-db-reference.md`](./.zazz/docs/neon-db-reference.md).
- Agents (or humans driving the Neon CLI): the repo-curated **`neon-zazz`** skill at `.agents/skills/neon-zazz/` covers this repo's CLI patterns, safe defaults, and endpoint selection (pooled vs direct), with companions for operations and distilled platform reference. Neon's official agent skills ([neondatabase/agent-skills](https://github.com/neondatabase/agent-skills)) are upstream reference only — not vendored; the `neon-zazz` companions distill what this repo needs.
- Contributors using AI assistants may also wire the optional Neon MCP server — see the "For contributors: Neon MCP server (optional)" section of the setup guide.
- Guardrails to know: `db:push` automatically targets the direct (`DATABASE_URL_UNPOOLED`) endpoint when set; seeding a remote database requires `ALLOW_REMOTE_SEED=true`; `db:reset` refuses non-local database hosts outright.
- Automated tests always run against the local Docker test DB (`zazz_board_test`) — the api test scripts pin `STORAGE_BACKEND=local` so the suite stays hermetic regardless of your active env block.

## AI tool files and the shared skills home

This repo standardizes where agent tooling lives so contributors' personal AI-tool state never lands in PRs:

- **`.agents/skills/` is the single skills home.** ZCode, Codex, and Cursor read it natively; Claude Code reads it through the committed `.claude/skills` symlink. Add or edit skills there — never inside a tool-specific directory.
- **`AGENTS.md` is the single instructions file** all four tools read. (`WARP.md` remains for Warp.)
- **AI vendor directories are ignored by default** (`.cursor/`, `.zcode/`, `.warp/`, `.windsurf/`, `.continue/`, `.gemini/`, `.aider*`, and everything under `.claude/` except the skills symlink). What your tools write there — local settings, histories, session state — is machine-local, like `.env`: it belongs to your checkout, not the repository.
- **To deliberately share something from an ignored directory** (e.g. project-wide Cursor rules or a Claude Code hook), add a negation pattern to `.gitignore` next to the existing ones — `.claude/skills` and `.codex/config.toml` + `.codex/roles/` are the worked examples of that shape.

## Worktree workflow (mandatory)

This repo uses **worktrees** for feature work. See [AGENTS.md](./AGENTS.md), [`.zazz/docs/worktree-setup.md`](./.zazz/docs/worktree-setup.md), and the `worktree` skill (`.agents/skills/worktree/`):

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
- Sample agent API token for the reference `ZAZZ` project: `660e8400-e29b-41d4-a716-446655440101`
