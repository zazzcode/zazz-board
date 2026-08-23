# AGENTS.md

Reference for AI agents and developers. **Legacy**: If you see "Task Blaster" or `task_blaster_`* (e.g. in DB names, container names, docs), treat it as Zazz Board / `zazz_board_*`.

## CRITICAL — Worktree Workflow (MANDATORY)

- **Main worktree is read-only.** Never edit or merge in main.
- **Work only in feature worktrees.** Create a worktree per branch.
- **Flow:** Work in feature worktree → push branch to GitHub → merge on GitHub → pull main locally.
- **Never merge into main locally.** Main must reflect GitHub after pull.

### New worktree setup (MANDATORY)

When creating a new feature worktree, always do all of the following:

1. Create the worktree from `main`:
   - `git worktree add -b <branch> ../<worktree-name> main`
2. Copy root env file from main:
   - `cp ../main/.env ./.env`
3. Copy API env file from main:
   - `cp ../main/api/.env ./api/.env`
4. Verify both files match main:
   - `cmp -s ../main/.env ./.env`
   - `cmp -s ../main/api/.env ./api/.env`

Optional: if the developer/contributor uses Worktrunk, create the worktree with `wt` instead of plain `git worktree`.
Worktrunk is optional, not mandatory. Assume most contributors use plain `git worktree` unless they say otherwise.

- Worktrunk local hook config lives in the base worktree at `.config/wt.toml` and is ignored by Git.
- The Worktrunk `copy-ignored` hook copies `.env`, `api/.env`, and `.config/wt.toml` into new `wt`-created worktrees.
- Do not require non-Worktrunk contributors to copy `.config/wt.toml`.

### Env changes made in a feature worktree (MANDATORY)

If any branch/worktree adds or changes settings in `.env` or `api/.env`:

- The agent must explicitly ask the user whether those env changes should also be applied to the `main` worktree.
- Do not assume automatic propagation without user confirmation.
- If the user confirms, copy the updated env files into `main` and verify parity with `cmp -s`.

---

## Standards

Consult `.zazz/standards/` for authoritative project rules. Index: [.zazz/standards/index.yaml](.zazz/standards/index.yaml). See [.zazz/standards/contextual-split.md](.zazz/standards/contextual-split.md) for how the standards are tiered and synced.

This project's `DOCS_ROOT` is `.zazz`.

Three tiers: **repo-specific** (take precedence), **generic methodology** (vendored from zazz-skills), and **placeholder stack standards** (to be expanded via the `standard-builder` skill).

Repo-specific (take precedence):

| Standard                                                         | Use when                            |
| ---------------------------------------------------------------- | ----------------------------------- |
| [system-architecture.md](.zazz/standards/system-architecture.md) | Stack, layers, cloud deployment     |
| [data-architecture.md](.zazz/standards/data-architecture.md)     | Schema, DB conventions, key tables  |
| [testing.md](.zazz/standards/testing.md)                         | Test patterns, PactumJS, TDD rules  |
| [coding-styles.md](.zazz/standards/coding-styles.md)             | Naming, i18n, conventions, patterns |

Generic methodology (vendored from zazz-skills): [code-structure.md](.zazz/standards/code-structure.md), [docs-hygiene.md](.zazz/standards/docs-hygiene.md), [docs-hygiene-reference-structure.md](.zazz/standards/docs-hygiene-reference-structure.md), [spec-hygiene.md](.zazz/standards/spec-hygiene.md), [pr-process.md](.zazz/standards/pr-process.md), [contextual-split.md](.zazz/standards/contextual-split.md).

Placeholder stack standards (to be expanded): [http-layer.md](.zazz/standards/http-layer.md) (Fastify), [data-layer.md](.zazz/standards/data-layer.md) (Drizzle/PostgreSQL), [frontend.md](.zazz/standards/frontend.md) (React+Mantine). Until expanded, `coding-styles.md` and `data-architecture.md` take precedence.

---

## Overview

**Zazz Board** is a Kanban-style orchestration app for coordinating AI agents and humans on software work.

**Stack**: Fastify API · React client (Vite, Mantine) · PostgreSQL 15 · Drizzle ORM. JavaScript only (no TypeScript).

### Dogfooding context

This repo **dogfoods** the Zazz Framework: Zazz Board is built with Zazz Board. For implementation methodology, load the repo-local `worker` and `spec-driven-development` skills; `AGENTS.md` only points agents to the right operating surface. The recursion is intentional.

---

## Zazz Board Agent Skills

Repo-local agent skills live in `.agents/skills/`. Each skill declares its own `name` and `description` in `SKILL.md`;
use that metadata as the source of truth for when the skill applies.

Many skills started from [zazz-skills](https://github.com/zazzcode/zazz-skills), but this repo's checked-in skill files
are curated locally and may diverge for project-specific behavior. Compare upstream files manually when useful; do not
blindly refresh local skills from upstream. See [README §Updating vendored skills and standards](./README.md#updating-vendored-skills-and-standards).

Ignored upstream skills include `sqlcmd` (SQL Server; we use PostgreSQL) and `jira-api` (we use Zazz Board).

---

## Handoff Documents

Handoff documents are platform-neutral working notes for any agent or developer, not Codex-specific artifacts.

- Store temporary handoff documents under `.zazz/ephemeral/` unless the user explicitly asks for a tracked project document.
- Name every handoff document with a timestamp down to seconds so ordering is obvious: `<topic>-handoff-YYYY-MM-DD-HHMMSS.md`.
- Use local time for the timestamp unless the user requests another timezone.
- Do not commit handoff documents from `.zazz/ephemeral/`; the directory is intentionally ignored except for its README.

Example: `.zazz/ephemeral/gantt-ui-handoff-2026-07-02-132600.md`.

---

## Repo layout

```
├── .agents/skills/     # Zazz agent skills
├── .zazz/              # project.md, standards/, deliverables/, docs/ (guides), execution/ (gitignored)
├── api/                # Fastify, routes/, services/, lib/db/schema.js, __tests__/
├── client/             # React, Vite, Mantine
├── docker-compose.yml   # Postgres 5433
└── package.json
```

**Worktree**: `git worktree add -b <branch> ../<worktree-name> main`; copy `api/.env` from main. See [CONTRIBUTOR_SETUP.md](CONTRIBUTOR_SETUP.md).

---

## API

**Auth**: `TB_TOKEN` or `Authorization: Bearer <token>`. **Spec**: [http://localhost:3030/docs](http://localhost:3030/docs) (Swagger).

**Key routes**: `GET/POST/PUT/DELETE /projects/:code/deliverables`, `PATCH .../status`, `PATCH .../approve`, `POST/GET/PUT/PATCH/DELETE .../deliverables/:delivId/tasks`, `GET .../graph`, `POST .../tasks/:taskId/relations`. Use `:code` (e.g. ZAZZ).

---

## Setup & run

**Setup**: See [CONTRIBUTOR_SETUP.md](CONTRIBUTOR_SETUP.md). TL;DR: Node.js 24 LTS (`v24.18.0`), Docker (Postgres only), `npm run docker:up:db`, run API and client in separate terminals.

**Run**: `npm run dev:api` + `npm run dev:client` (or `npm run dev`). API :3030, client :3001.

**Token**: `550e8400-e29b-41d4-a716-446655440000`

---

## Database

**Schema**: `api/lib/db/schema.js`. Pre-v1: push directly (`db:reset` / `db:push`). See [data-architecture.md](.zazz/standards/data-architecture.md).

**Reset dev**: `npm run db:reset` (from root or api/). Refuses non-local
database hosts outright; seeding a remote host requires
`ALLOW_REMOTE_SEED=true`.

**Neon (optional)**: the app runs unchanged on Neon (Postgres + Object
Storage) selected by `api/.env`. Setup:
[.zazz/docs/neon-setup.md](.zazz/docs/neon-setup.md); agent operations:
the `neon-zazz` skill (`.agents/skills/neon-zazz/`). Tests always run on
local Docker Postgres.

**Test DB**: `zazz_board_test`. Create: `docker exec zazz_board_postgres psql -U postgres -c "CREATE DATABASE zazz_board_test;" 2>/dev/null || true` then `cd api && DATABASE_URL=postgres://postgres:password@localhost:5433/zazz_board_test npm run db:reset`.

---

## Testing

Vitest + PactumJS. See [testing.md](.zazz/standards/testing.md) and [api/**tests**/README.md](api/__tests__/README.md).

**Run**: `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test`

---

## Troubleshooting

- **drizzle-kit "drizzle-orm"**: Run `npm install` from repo root and `npm install --workspace=api`. Do not create manual `node_modules` symlinks in worktrees.
- **DATABASE_URL_TEST not set**: Source `api/.env` before running tests
- **SAFETY CHECK FAILED**: Ensure `zazz_board_test` exists; recreate test DB
- **Port in use**: `lsof -ti:3030 | xargs kill -9` (API), `lsof -ti:3001 | xargs kill -9` (client), `lsof -ti:3031 | xargs kill -9` (test)
- **Postgres not running**: `npm run docker:up:db`
- **Neon: first query slow after idle**: autosuspend wake (~0.5 s) plus
  cold buffers — expected, not a fault; run the query again

---

## Quick reference

```bash
npm run docker:up:db
npm run db:reset
docker exec zazz_board_postgres psql -U postgres -c "DROP DATABASE IF EXISTS zazz_board_test; CREATE DATABASE zazz_board_test;"
cd api && DATABASE_URL=postgres://postgres:password@localhost:5433/zazz_board_test npm run db:reset
cd api && set -a && source .env && set +a && NODE_ENV=test npm run test
npm run dev
```
