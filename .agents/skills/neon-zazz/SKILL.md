---
name: neon-zazz
description: Operate against the Neon platform for this repo — run safe Postgres diagnostics against Neon endpoints, manage projects, branches, databases, buckets and objects with the neon CLI or Management API, pull connection strings and storage credentials with env pull, and avoid Neon-specific traps (pooled vs direct endpoints, autosuspend cold starts, the console.neon.tech API base, us-east-2 storage beta). Use whenever the task mentions Neon, the Neon database or its connection strings, buckets or object storage for attachments, NEON_API_KEY, or configuring and verifying the Neon backend. This is the primary skill for Neon work in this repo; Neon's official agent skills (github.com/neondatabase/agent-skills) are upstream reference only — where they disagree with this skill or repo policy (AGENTS.md, .zazz/docs/zb-agent-orientation.md), this skill and repo policy win.
---

# neon-zazz

Use this skill when the task touches the Neon backend. Neon serves this
repo in two planes — serverless Postgres (standard wire protocol) and
Object Storage (S3-compatible) — plus a Management API/CLI. Deep facts
live in `.zazz/docs/neon-db-reference.md`; onboarding walkthrough in
`.zazz/docs/neon-setup.md`. Load those only when the task needs them.

## Companions — load only what the task needs

- `neon-operations.md` — hands-on operations: neon CLI patterns, psql
  diagnostics, pooled-vs-direct endpoint selection, repo recipe behavior
  (db:push/db:seed/db:reset guards), and Neon traps discovered in this
  repo. Load for any task that runs commands against Neon.
- `neon-platform.md` — distilled platform reference: fetching current
  Neon docs as markdown, connection failure signatures, storage client
  specifics, observability, and what this repo deliberately does not
  use. Load for setup help, diagnostics, or refreshing our Neon docs.

Neon's full official skill set is NOT vendored (Owner direction: no
skill bloat). Unmodified copies are kept as machine-local reference in
`.skills-reference/` (git-excluded); cite them for anything not covered
by the companions.

## Safety Defaults

- Read-only by default: list, inspect, and query before any write. Never
  create, mutate, or delete Neon resources (branches, databases, buckets,
  objects) unless the user asked for it or you surfaced the plan first.
- Never run destructive SQL (`DROP`, `TRUNCATE`, wide `DELETE`) or
  `db:reset` against a Neon target. `db:reset` and re-seeding are for the
  local Docker dev/test databases only; Neon holds real data.
- Never print secret values: `DATABASE_URL` (contains the password),
  `NEON_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. Verify env
  files by listing variable names (`grep -oE '^[A-Z_]+' api/.env`), never
  by catting them.
- `neon env pull` writes real secrets into `.env.local` in the current
  directory. Always run it inside a scratch directory (`mktemp -d`),
  merge values programmatically, then delete the scratch.
- Each `env pull` issues fresh credentials; previous ones remain valid.
  Tell the user when new keys are issued.

## Environment Layout

Credentials come from the repo's env files, not from flags:

- root `.env` — `NEON_API_KEY` (CLI/Management API only; the app never
  uses it for SQL).
- `api/.env` — `DATABASE_URL` (pooled endpoint, app runtime),
  `DATABASE_URL_UNPOOLED` (direct endpoint, DDL/diagnostics),
  `STORAGE_BACKEND`, `NEON_STORAGE_BUCKET`, and the AWS SDK v3 storage
  vars (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
  `AWS_ENDPOINT_URL_S3`, `AWS_REGION`).

Canonical sourcing shapes:

```bash
# CLI (root .env)
cd <worktree> && set -a && source .env && set +a && \
  PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH" npx --yes neon@latest <command>

# psql / app env (api/.env)
cd <worktree>/api && set -a && source .env && set +a && psql -X "$DATABASE_URL_UNPOOLED" ...
```

## Output

Report the command shape used, which endpoint class (pooled/direct) a
query targeted, whether the run was read-only, and any credential issue
encountered — without printing secret values. For performance findings,
state whether the evidence predates a compute wake.

## Source Notes

Behavior verified against the `zazz-board` project (`cool-mud-16591433`,
region `aws-us-east-2`) on 2026-08-22 and the Neon docs summarized in
`.zazz/docs/neon-db-reference.md`. Companion content distilled from
Neon's official agent skills (Apache-2.0) on 2026-08-23; see each
companion's provenance note.
