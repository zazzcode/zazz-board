# Neon Setup (zazz-board)

Purpose: initial setup for running zazz-board on Neon — serverless
Postgres plus S3-compatible Object Storage for attachments — written for
two audiences at once: a human following the steps, and an agent
executing them on a user's behalf. Facts and behavior live in
`neon-db-reference.md`; day-to-day operational commands will live in the
`neon` agent skill.

Status: the account-side configuration in this guide is complete and
valid now. The application code that reads `STORAGE_BACKEND`,
`DATABASE_URL_UNPOOLED`, and the `AWS_*` storage variables is delivered
by the `mw-neon-db-integration` branch; until it lands, only local
Docker Postgres mode runs.

## What you are configuring

| Plane | Mechanism | Variables |
| --- | --- | --- |
| Relational data | Standard Postgres wire protocol (postgres.js + Drizzle) | `DATABASE_URL` (pooled — runtime), `DATABASE_URL_UNPOOLED` (direct — drizzle-kit push, seeds, psql) |
| Attachments | Neon Object Storage (S3-compatible) via AWS SDK v3 | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `NEON_STORAGE_BUCKET` |
| Management (setup, diagnostics) | Neon CLI (`npx --yes neon@latest`) or REST API | `NEON_API_KEY` (root `.env`) |

One Neon credential system covers all three planes: `neon env pull`
issues the Postgres connection strings and the scoped storage keys.

## Prerequisites

- A Neon project in region `aws-us-east-2` — the Object Storage beta is
  us-east-2 only during beta. The existing `zazz-board` project
  (`cool-mud-16591433`) already qualifies.
- A Neon API key (console → account → API keys; organization keys work).
  Put `NEON_API_KEY=<key>` in the worktree's **root `.env`** — it is for
  CLI/agent use only; the application never needs it for SQL.
- Node 24 per `.nvmrc`; run CLI commands through
  `PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH" npx --yes neon@latest ...`.

## Setup steps

1. **Pull branch credentials.** In a scratch directory:
   `npx --yes neon@latest env pull --project-id <project-id>`. This
   writes `.env.local` containing `DATABASE_URL` (pooled host),
   `DATABASE_URL_UNPOOLED` (direct host), and `NEON_BRANCH`. Console
   alternative: Dashboard → Connection Details (includes the password;
   the pooled host adds `-pooler` to the endpoint hostname).

2. **Create the application database.**
   `npx --yes neon@latest databases create --name zazz_board_db
   --project-id <project-id>` — name parity with local Docker keeps
   seed guards and docs aligned. Then point both connection URLs at it
   (replace the trailing `/neondb` with `/zazz_board_db`).

3. **Create the attachments bucket.**
   - CLI/agent: `npx --yes neon@latest buckets create
     zazz-board-attachments --project-id <project-id>` (defaults to
     private access).
   - Console: Storage → Create bucket → name it, keep it private.
   Buckets are branch-scoped: the bucket belongs to the branch the app
   runs on (`production` in our project).

4. **Pull storage credentials.** Run `neon env pull` again — now that a
   bucket exists it additionally emits `AWS_ACCESS_KEY_ID`,
   `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, and `AWS_REGION`.
   These are standard AWS SDK v3 environment variables; the application
   storage client reads them natively, no custom auth code.

5. **Fill `api/.env`.** Keep the local block commented for switch-back;
   activate the Neon block (template below). `DATABASE_URL_TEST` stays
   local — tests always run against Docker Postgres.

6. **Root `.env`** holds `NEON_API_KEY` only (step under Prerequisites).

7. **Push schema and seed** (requires this branch's code):
   `cd api && set -a && source .env && set +a` then
   `DATABASE_URL=$DATABASE_URL_UNPOOLED npm run db:push` — DDL goes
   through the direct endpoint, never the pooled one. Seeding a remote
   database additionally requires the explicit opt-in guard this branch
   adds.

8. **Run and verify.** `npm run dev:api`, then hit an API route. Expect
   ~0.5 s of first-query latency after 5+ minutes idle (compute
   autosuspend wake) — that is normal, not a fault.

## `api/.env` template (Neon active)

```text
# local Docker Postgres (default mode — swap blocks to go local)
# DATABASE_URL=postgres://postgres:password@localhost:5433/zazz_board_db
DATABASE_URL_TEST=postgres://postgres:password@localhost:5433/zazz_board_test

DATABASE_URL=postgresql://<user>:<password>@<endpoint-id>-pooler.<cluster>.<region>.aws.neon.tech/zazz_board_db?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://<user>:<password>@<endpoint-id>.<cluster>.<region>.aws.neon.tech/zazz_board_db?sslmode=require

STORAGE_BACKEND=neon
NEON_STORAGE_BUCKET=zazz-board-attachments

AWS_ACCESS_KEY_ID=<from neon env pull>
AWS_SECRET_ACCESS_KEY=<from neon env pull>
AWS_ENDPOINT_URL_S3=https://<branch-id>.storage.<cluster>.<region>.aws.neon.tech
AWS_REGION=us-east-2
```

## Agent execution notes

- Explore read-only first (`projects list`, `branches list`,
  `neon api /projects/<id>/endpoints`); surface findings before any
  write such as bucket or database creation.
- Never print values of `DATABASE_URL`, `AWS_SECRET_ACCESS_KEY`,
  `AWS_ACCESS_KEY_ID`, or `NEON_API_KEY`. Move them between files
  programmatically (grep/cut/append), verify with name-only listings.
- `neon env pull` writes real secrets into `.env.local` in the current
  directory (plus a local `.gitignore`). Run it in a scratch directory,
  merge the values, then delete the scratch.
- Each fresh pull issues new credentials ("Issued a new branch
  credential") — old ones keep working; rotate by deleting in console if
  needed.
- The storage endpoint is branch-scoped. Creating a new branch means a
  new storage namespace and new keys — re-run `neon env pull` after
  branching.

## For contributors: Neon MCP server (optional)

The Neon MCP server (`https://mcp.neon.tech/mcp`) lets an AI assistant
manage Neon — projects, branches, databases, and SQL — through natural
language. It is developer tooling only: Neon scopes it to "development
and testing", and running zazz-board needs none of it (the app consumes
only the env vars above). Production operators can skip this section.

- Full wiring (creates an API key if needed, configures MCP with API-key
  auth, installs Neon agent skills): `npx neonctl@latest init`
- MCP config only: `npx add-mcp https://mcp.neon.tech/mcp` — add
  `--header "Authorization: Bearer $NEON_API_KEY"` for key auth instead
  of OAuth, and `-g` to configure at user level
- Manual config for clients not on add-mcp's list (ZCode included) —
  local stdio server:

```json
"neon": {
  "command": "npx",
  "args": ["-y", "@neondatabase/mcp-server-neon", "start", "<NEON_API_KEY>"]
}
```

Keep the API key in user-level client config, never in tracked files.
If remote OAuth fails with `invalid redirect uri`, clear the cached
credentials (`rm -rf ~/.mcp-auth`) and retry.

## Troubleshooting

- `Could not resolve host: api.neon.tech` — outdated hostname. The
  Management API base URL is `https://console.neon.tech/api/v2`.
- First query after idle is slow — autosuspend wake plus cold buffers;
  expected on the free plan (always-on compute is paid).
- Client rejects `channel_binding=require` (present in pulled URLs) —
  drop that parameter and keep `sslmode=require`; confirm behavior with
  postgres.js during implementation.
- drizzle-kit push or seeds fail through the pooled URL — run them
  against `DATABASE_URL_UNPOOLED`.
- Branch or compute shows `archived`/`idle` after long inactivity —
  connecting wakes it automatically.
- "organization API keys" error from `neon me` — harmless; org keys
  cannot call the user endpoint. `projects list` works fine.
- Free-plan AI Gateway warnings from `env pull` are unrelated to this
  setup; ignore them.
