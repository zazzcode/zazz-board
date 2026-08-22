---
name: neon-zazz
description: Operate against the Neon platform for this repo — run safe Postgres diagnostics against Neon endpoints, manage projects, branches, databases, buckets and objects with the neon CLI or Management API, pull connection strings and storage credentials with env pull, and avoid Neon-specific traps (pooled vs direct endpoints, autosuspend cold starts, the console.neon.tech API base, us-east-2 storage beta). Use whenever the task mentions Neon, the Neon database or its connection strings, buckets or object storage for attachments, NEON_API_KEY, or configuring and verifying the Neon backend. This is the primary skill for Neon work in this repo; Neon's official vendored `neon` and `neon-postgres` skills (also under .agents/skills/) are platform reference — where they disagree with this skill or repo policy (AGENTS.md, .zazz/docs/zb-agent-orientation.md), this skill and repo policy win.
---

# neon-zazz

Use this skill when the task touches the Neon backend. Neon serves this
repo in two planes — serverless Postgres (standard wire protocol) and
Object Storage (S3-compatible) — plus a Management API/CLI. Deep facts
live in `.zazz/docs/neon-db-reference.md`; onboarding walkthrough in
`.zazz/docs/neon-setup.md`. Load those only when the task needs them.

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

## CLI Patterns

The CLI authenticates via `NEON_API_KEY`. Discover IDs rather than
hardcoding them; the examples below show our usual values for reference.

```bash
npx --yes neon@latest projects list
# Id                 Name        Region Id
# cool-mud-16591433  zazz-board  aws-us-east-2

npx --yes neon@latest branches list --project-id cool-mud-16591433
npx --yes neon@latest api /projects/cool-mud-16591433/endpoints   # hosts: read_write_host + read_write_pooled_host
npx --yes neon@latest buckets list --project-id cool-mud-16591433
npx --yes neon@latest buckets object list <bucket> --project-id cool-mud-16591433          # folders only
npx --yes neon@latest buckets object list <bucket>/<prefix>/ --project-id cool-mud-16591433  # lists keys (trailing slash required)
npx --yes neon@latest connection-string --project-id cool-mud-16591433   # direct host, includes channel_binding=require
```

Writes (surface the plan to the user first):

```bash
npx --yes neon@latest buckets create zazz-board-attachments --project-id <id>   # private by default
npx --yes neon@latest databases create --name zazz_board_db --project-id <id>
```

Use `-o json` for machine-readable output when scripting.

The Neon MCP server (`https://mcp.neon.tech/mcp`) offers these management
operations to AI assistants as an alternative to the CLI — development
and testing only per Neon. When available it can replace CLI calls; the
safety defaults above apply unchanged. See
`.zazz/docs/neon-setup.md` §"For contributors" for connection.

## Querying Postgres on Neon

Prefer repo recipes (`npm run db:push`, tests, seed scripts) when they
already cover the task; use psql only for diagnostics. Reuse the `psql`
skill's safety flags (`-X`, `-v ON_ERROR_STOP=1`, short
`statement_timeout`, wrapped write-diagnostics in `begin; ... rollback`).

Repo recipe behavior (implemented on `mw-neon-db-integration`):

- `npm run db:push` automatically targets `DATABASE_URL_UNPOOLED` when it
  is set (`api/drizzle.config.js` prefers the direct endpoint for DDL);
  under `NODE_ENV=test` it always resolves `DATABASE_URL_TEST` so test
  schema pushes can never reach Neon.
- `npm run db:seed` refuses any non-local host unless
  `ALLOW_REMOTE_SEED=true` is set; `npm run db:reset` refuses non-local
  hosts outright with no override.
- The app runtime connects with postgres.js options built from the URL:
  neon hosts get TLS (`ssl: 'require'`), `prepare: false` (PgBouncer
  transaction mode), and a bounded pool — `api/lib/db/connectionOptions.js`.

Endpoint selection matters:

- One-shot `SELECT`/`EXPLAIN` diagnostics: `DATABASE_URL` (pooled) works.
- Anything session-level (`SET`, SQL-level `PREPARE`, `WITH HOLD`
  cursors, advisory locks) or DDL/seed work: `DATABASE_URL_UNPOOLED`
  (direct). DDL through the pooled endpoint can fail — PgBouncer
  transaction mode.
- Do not diagnose slowness on the first query after idle: Neon suspends
  compute after ~5 minutes and the wake costs a few hundred ms plus cold
  buffers. Run the diagnostic twice; judge the second run.
- Branch or compute showing `idle` or `archived` is normal; connecting
  wakes it.

```bash
cd <worktree>/api && set -a && source .env && set +a && \
  psql -X "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 -A -t \
  -c "select current_database(), current_user;"
```

If `psql` is not installed locally, `npx --yes neon@latest psql [branch]`
is the fallback.

## Neon Traps

- `api.neon.tech` does not resolve — the Management API base is
  `https://console.neon.tech/api/v2` with
  `Authorization: Bearer $NEON_API_KEY`.
- Organization API keys cannot call `/users/me` ("not allowed for
  organization API keys") — use `projects list` to verify auth instead.
- Pulled connection strings include `channel_binding=require`; if a
  client rejects it, drop that parameter and keep `sslmode=require`.
- Storage is branch-scoped: the S3 endpoint URL contains the branch id,
  and a new branch needs a fresh `env pull` for new storage keys. Storage
  vars appear only after a bucket exists on the branch.
- Object Storage is in beta and us-east-2 only — the `zazz-board` project
  is already in `aws-us-east-2`; do not create projects elsewhere for
  attachment storage.
- Data-plane hostnames use `neon.tech` even though docs live at
  `neon.com`. Both are correct; do not rewrite one to the other.
- `neon buckets object list <bucket>` without a prefix shows only folder
  names ("No objects found" even when keys exist). List keys with a
  trailing-slash prefix: `<bucket>/<prefix>/`, e.g.
  `zazz-board-attachments/attachments/`. The AWS CLI
  (`aws s3api list-objects-v2 --endpoint-url $AWS_ENDPOINT_URL_S3`) does
  not have this quirk and is a good cross-check.

## Output

Report the command shape used, which endpoint class (pooled/direct) a
query targeted, whether the run was read-only, and any credential issue
encountered — without printing secret values. For performance findings,
state whether the evidence predates a compute wake.

## Source Notes

Behavior verified against the `zazz-board` project (`cool-mud-16591433`,
region `aws-us-east-2`) on 2026-08-22 and the Neon docs summarized in
`.zazz/docs/neon-db-reference.md`.
