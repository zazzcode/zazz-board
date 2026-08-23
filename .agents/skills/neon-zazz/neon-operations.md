# Neon operations (this repo)

Companion to `SKILL.md`. CLI patterns, query diagnostics, repo recipe
behavior, and traps for hands-on work against this repo's Neon project.
The safety defaults in `SKILL.md` apply to everything here.

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
safety defaults in `SKILL.md` apply unchanged. See
`.zazz/docs/neon-setup.md` §"For contributors" for connection.

## Querying Postgres on Neon

Prefer repo recipes (`npm run db:push`, tests, seed scripts) when they
already cover the task; use psql only for diagnostics. Reuse the `psql`
skill's safety flags (`-X`, `-v ON_ERROR_STOP=1`, short
`statement_timeout`, wrapped write-diagnostics in `begin; ... rollback`).

Repo recipe behavior:

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
