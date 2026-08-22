# Neon Postgres Reference (zazz-board)

Purpose: local reference of Neon behavior that affects zazz-board, captured
from the Neon docs during the `mw-neon-db-integration` research phase
(2026-08-22) so the source docs do not need to be re-read for every task.
Neon docs evolve — re-verify a detail against the linked page before relying
on it for implementation decisions.

Status: research notes. Nothing here is implemented yet.

## What Neon is

Neon is serverless Postgres: stateless Postgres computes that autoscale and
can suspend, backed by separated durable storage. Projects can be branched
(database copies addressable by their own connection strings); Neon calls
the default branch `main`, and production usage simply points the
connection string at whatever branch you choose — the app never needs to
know branching exists. zazz-board's goal: run the same schema on either
local Docker Postgres or a Neon project, selected purely by configuration.

Neon's product surface (per the docs introduction, captured 2026-08-22)
extends beyond Postgres: Auth, a Data API, Functions, an AI Gateway,
Search, and **Object Storage** (beta). zazz-board uses only the Postgres
service and, per the decision below, Object Storage.

## Management API and CLI (verified against our account, 2026-08-22)

- Management API base URL: `https://console.neon.tech/api/v2` with
  `Authorization: Bearer $NEON_API_KEY`. `api.neon.tech` does not exist
  in DNS — do not use it. Organization API keys cannot call `/users/me`.
- Official CLI: `npx --yes neon@latest ...` (auth via `NEON_API_KEY` env
  var). Key commands: `projects list`, `branches list`, `databases
  create --name <db>`, `buckets create/list/delete`, `buckets object
  list/get/put/delete`, `connection-string [branch]` (defaults to the
  direct host, includes `channel_binding=require`), `env pull` (writes
  branch env vars to `.env.local` in cwd), `api <path>` (authenticated
  passthrough for any API route), plus `psql`, `inspect`, `logs`,
  `snapshots` for diagnostics.
- `neon env pull` emits: `NEON_BRANCH`, `DATABASE_URL` (pooled host),
  `DATABASE_URL_UNPOOLED` (direct host) — exactly the env convention
  this integration uses — and, once a bucket exists on the branch, the
  AWS SDK v3 variables `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
  `AWS_ENDPOINT_URL_S3`, `AWS_REGION`. Each pull issues fresh branch
  credentials; storage keys appear only after bucket creation.
- MCP server for AI assistants: `https://mcp.neon.tech/mcp`
  (`@neondatabase/mcp-server-neon` for local stdio). Neon scopes it to
  development and testing only; management plane, never needed at
  runtime. See `.zazz/docs/neon-setup.md` §"For contributors".

## Object Storage (beta)

Captured from the storage docs overview and verified live against our
project on 2026-08-22.

- S3-compatible object storage built into the Neon backend; every branch
  gets its own isolated storage namespace, and buckets branch with the
  database (copy-on-write).
- Data-plane endpoint (from `neon env pull`, as `AWS_ENDPOINT_URL_S3`):
  `https://<branch-id>.storage.<cluster>.<region>.aws.neon.tech`.
- Auth: the standard AWS SDK v3 credential chain — scoped
  `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` issued by Neon. No AWS
  account, no separate cloud credentials.
- Works with standard S3 clients (AWS SDK for JavaScript/Python, AWS
  CLI) and any S3-compatible tool; a Neon Files SDK also exists.
- Bucket access modes: `private` (auth for all operations; default in
  CLI) and `public_read` (anonymous reads, authenticated writes).
- Presigned URLs are supported — docs examples generate them for upload
  and download.
- Beta limitation: buckets live in AWS `us-east-2` only during beta.
- The docs' `ai-sdk` example matches zazz-board's target pattern exactly:
  store the object in a private bucket via the AWS S3 SDK, record its key
  and metadata in Postgres, serve it back through a presigned URL.
- Design impact: attachments stay entirely within Neon under a single
  provider credential, so `STORAGE_BACKEND=neon` is an honest flag value.

## Connection strings

Two endpoints exist per Neon branch; all Neon URLs require
`?sslmode=require`:

- **Pooled** — hostname gains a `-pooler` suffix
  (`ep-xxx-pooler.<region>.aws.neon.tech`). Routes through PgBouncer
  (transaction mode). Use for application runtime.
- **Direct (unpooled)** — plain hostname. Required for schema migrations,
  `drizzle-kit` operations, `pg_dump`/`pg_restore`, logical replication, and
  session-level admin features. Neon's Drizzle guide names this
  `DATABASE_URL_UNPOOLED` and warns that running migrations through the
  pooled URL can error.

Shape:

```text
postgresql://<user>:<password>@ep-xxx-pooler.<region>.aws.neon.tech/<db>?sslmode=require
postgresql://<user>:<password>@ep-xxx.<region>.aws.neon.tech/<db>?sslmode=require
```

## Pooling behavior (PgBouncer, transaction mode)

- Pooling mode is fixed (transaction); not user-configurable.
- Client connection cap to PgBouncer: 10,000 (`max_client_conn`).
- Per user/database server pool: 90% of `max_connections`; queued queries
  wait up to 120 s (`query_wait_timeout`).
- `max_connections` scales with compute size: 104 at 0.25 CU up to a 4,000
  cap at 9+ CU; 7 slots reserved for superuser.
- **Not supported through the pooler:** `SET`/`RESET`, `LISTEN`/`NOTIFY`,
  `WITH HOLD` cursors, SQL-level `PREPARE`/`DEALLOCATE`, certain temp
  tables, `LOAD`, session advisory locks.
- **Protocol-level prepared statements are supported** (capped at 1,000 per
  connection via `max_prepared_statements`).
- `search_path` needs a direct connection, schema-qualified names, or a
  persisted `ALTER ROLE ... SET search_path`.
- For long-running clients, Neon recommends pools with automatic
  reconnection, health checks, connection-lifetime/idle tuning, and retries
  with exponential backoff.

## Compute lifecycle (autosuspend / cold starts)

- A compute is `Idle` or `Active`; default autosuspend after **5 minutes**
  without active queries.
- Idle-in-transaction connections count as active (suspension is
  conservative).
- Cold start on first connection after suspend: "a few hundred
  milliseconds"; possibly longer after 7+ days idle; memory buffers are cold
  after wake, so the first queries run slower.
- **Holding open pool connections does not keep the compute alive** — only
  active queries do.
- Suspend destroys session state: temp tables, prepared statements, session
  parameters, advisory locks, `LISTEN`/`NOTIFY`.
- Disabling scale-to-zero (always-on) is a paid-plan feature. Periodic
  keep-alive queries work but keep the compute billed.
- Neon may wake idle computes on its own for data-availability checks.

## Drivers: keep postgres.js; skip the serverless driver

- Neon supports four driver paths: `@neondatabase/serverless` (HTTP or
  WebSocket), `pg` (node-postgres), and `postgres` (postgres.js).
- zazz-board already uses **postgres.js** (`postgres@3.4.7`) wrapped by
  `drizzle-orm/postgres-js` — no driver change needed for Neon.
- `@neondatabase/serverless` exists for serverless/edge runtimes without TCP
  sockets: HTTP mode (`neon()`) for one-shot, non-interactive transactions
  (64 MB request cap); WebSocket mode (`Pool`/`Client`) for sessions and
  interactive transactions (needs a WebSocket constructor on Node). A
  long-running Fastify server has TCP, so it gains nothing from this driver.
- Drizzle adapters exist for it (`drizzle-orm/neon-http`,
  `drizzle-orm/neon-serverless`) — not applicable to zazz-board.

## Drizzle + Neon specifics

- Neon's guide: runtime app uses the pooled URL; `drizzle-kit` (generate +
  migrate) uses the direct URL. zazz-board is pre-v1 and uses
  `drizzle-kit push --force` (per `data-architecture.md`) — push should
  also target the direct URL.
- Close cleanly on shutdown: `await db.$client.end()` (non-HTTP drivers).
- Connection strings need `?sslmode=require`.

## zazz-board mapping (verified in repo)

- Connection chokepoint: `api/lib/db/index.js` — builds the URL from
  `DATABASE_URL` (or `DB_*` fallbacks, port 5433), passes **no options** to
  `postgres()` today (no ssl, `max`, `idle_timeout`, `prepare`).
- `api/drizzle.config.js` mirrors the same URL fallback for `db:push`.
- Attachment bytes live only in `IMAGE_DATA.data` as base64 text
  (`api/lib/db/schema.js:307-311`); `IMAGE_METADATA.storage_type`
  ('local'|'s3') already exists but the service hardcodes 'local'
  (`databaseService.js:2117,2160`). `system-architecture.md:24-31`
  pre-authorizes a `STORAGE_BACKEND` env routing to object storage.
- Storage flag decision (2026-08-22, pending spec confirmation):
  `STORAGE_BACKEND` with values `local` (default — current DB storage)
  and `neon` (Neon Object Storage via its S3-compatible API); `gcs`
  reserved for a future GCP equivalent. `IMAGE_METADATA.storage_type`
  values and its schema comment will need matching updates.
- Neon credential convention: `NEON_API_KEY` (Neon's own tooling name) in
  the root `.env`, for management/CLI use only; database connections
  remain `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct).
- Live configuration for this project (verified 2026-08-22): project
  `zazz-board` (`cool-mud-16591433`, region `aws-us-east-2`); default
  branch `production` (`br-withered-waterfall-ayu56bg6`); endpoints
  `ep-snowy-sky-aydv2ely.c-5.us-east-2.aws.neon.tech` (direct) and
  `ep-snowy-sky-aydv2ely-pooler.c-5.us-east-2.aws.neon.tech` (pooled);
  database `zazz_board_db`; bucket `zazz-board-attachments` (private);
  storage endpoint
  `https://br-withered-waterfall-ayu56bg6.storage.c-5.us-east-2.aws.neon.tech`.
  The worktree's `api/.env` and root `.env` are configured with these.
- Setup guide for humans and agents: `.zazz/docs/neon-setup.md`.
- Hardcoded local assumptions to revisit: seed DB-name allowlist
  (`seed-all.js:19`), literal `zazz_board_test` checks
  (`setup.pactum.mjs:23`, `testDatabase.js:88,100`), port-5433 fallbacks
  (`lib/db/index.js:20`, `drizzle.config.js:6`).
- postgres.js options relevant to Neon (verify against the postgres.js
  README during implementation): client `max`, `idle_timeout`,
  `connect_timeout`, and `prepare: false` to disable its automatic prepared
  statements — postgres.js documents that option for transaction-mode
  poolers like PgBouncer, and Neon suspend also destroys prepared
  statements.

## Sources

- Connection pooling: <https://neon.com/docs/connect/connection-pooling>
- Compute lifecycle: <https://neon.com/docs/introduction/compute-lifecycle>
- Serverless driver: <https://neon.com/docs/serverless/serverless-driver>
- Drizzle guide: <https://neon.com/docs/guides/drizzle>
- Introduction (product surface): <https://neon.com/docs/introduction>
- Object Storage overview: <https://neon.com/docs/storage/overview>
- Object Storage launch blog:
  <https://neon.com/blog/building-neon-object-storage>
