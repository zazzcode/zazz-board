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

This repo **dogfoods** the Zazz Framework: Zazz Board is built with Zazz Board. Framework agents (planner, coordinator, worker, qa) create deliverables and tasks via the API—tracking work on this repo. The recursion is intentional.

---

## Zazz agent skills

**Skills** (`.agents/skills/`): Role-specific capabilities for framework agents. Framework skills are vendored from [zazz-skills](https://github.com/zazzcode/zazz-skills); refresh via `./scripts/sync-skills-from-zazz-skills.sh` (see [README §Updating skills](./README.md#updating-skills-from-zazz-skills)).

| Skill                    | When it applies                                        |
| ------------------------ | ------------------------------------------------------ |
| **zazz-board-api**       | Required by all framework agents — API auth, endpoints |
| proposal-builder         | Owner/stakeholder proposal discovery and recommendations |
| feature-doc-builder      | Product/Project Owner feature requirements authoring  |
| architecture-doc-builder | Project/feature-level architecture documents           |
| spec-builder             | Owner + agent creating deliverable specification       |
| standard-builder         | Inspects the codebase and drafts repo-specific standards |
| qa-testing               | Verifies AC, frontend/backend behavior, evidence quality (replaces the former qa/qa-backend/qa-frontend skills) |
| pr-builder               | Packages reviewer-ready PR titles and bodies           |
| pr-review                | Automated self-review of PRs/local diffs              |
| conformance              | One focused standards-alignment change + verified PR evidence |
| doc-check                | Repo-local formatting/linting checks for doc changes   |
| gh-stack                 | Manages stacked branches and dependent PRs             |
| worktree                 | Sets up/manages the Zazz worktree model via Worktrunk  |
| psql                     | Safe PostgreSQL diagnostic/profiling command guidance  |
| worker *(local-only)*    | Implements tasks — core to zazz-board's dogfooded workflow; not in upstream |
| database-baseline-refresh *(local-only)* | Preserves live dev DB data while upgrading schema and refreshing the canonical seed baseline |

Ignored upstream skills (not vendored here): `sqlcmd` (SQL Server; we use PostgreSQL), `jira-api` (we use Zazz Board). See `IGNORE_SKILLS` in `scripts/sync-skills-from-zazz-skills.sh`.

**Rules** (`.cursor/rules/`): Always-applied for Cursor (e.g. worktree workflow).

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
├── .cursor/rules/      # Cursor always-apply (worktree)
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

**Reset dev**: `npm run db:reset` (from root or api/).

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
