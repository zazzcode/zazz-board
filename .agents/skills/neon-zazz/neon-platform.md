# Neon platform reference (distilled)

Companion to `SKILL.md`. Holds the parts of Neon's official agent skills
and docs that matter to this repo, distilled so contributors and users
can set up and operate our integration without vendoring the full
platform skill set. Load this file only when a task needs one of its
sections.

Provenance: distilled 2026-08-22 from
[neondatabase/agent-skills](https://github.com/neondatabase/agent-skills)
(Apache-2.0; official skills: `neon`, `neon-postgres`,
`neon-object-storage`) and the Neon docs. Re-verify against the official
sources before relying on a detail for a new decision; do not vendor the
full skills into this repo (Owner direction: no skill bloat —
`.agents/skills/neon-zazz/` is the only Neon skill home).

## Keeping Neon knowledge fresh

The Neon docs are the source of truth and can be fetched as markdown:

- Docs index with every page URL: `https://neon.com/docs/llms.txt`
- Any page as markdown: append `.md` to the URL, or send
  `Accept: text/markdown` on the standard URL.

Use this when refreshing `.zazz/docs/neon-db-reference.md` instead of
guessing URLs from training data.

## Terminology

Upstream now brands the database **Lakebase Postgres** (Neon was
repositioned as a full backend-primitives platform, from Databricks).
This repo's docs predate that and keep saying "Neon Postgres" — same
product, do not rewrite repo terminology, and do not treat the
rebranding as a migration task.

## Connection gotchas (pooled vs direct)

The app uses the pooled endpoint (`DATABASE_URL`, `-pooler` host) and
DDL/seeds use the direct endpoint (`DATABASE_URL_UNPOOLED`) — wired in
`api/lib/db/connectionOptions.js` and `api/drizzle.config.js`. When a
tool hits the wrong endpoint through PgBouncer transaction mode, the
failure never names pooling. Signatures to recognize:

- `prepared statement "s0" already exists` — migration tool reusing
  prepared statements through the pooler.
- `relation "..." does not exist` right after a `SET search_path` —
  session state does not survive its transaction on the pooler.
- `SQLSTATE 25006` (read-only transaction) intermittently — a pooled
  backend inherited session state from an earlier client.

Fix: point the tool at the direct URL. Tools that accept two URLs
(Prisma `directUrl` style) should take the direct one there rather than
swapping `DATABASE_URL` and losing pooling for the app.

## Storage client specifics

- Raw S3 clients **must** set `forcePathStyle: true` (path-style
  addressing, SigV4 only) — our `objectStorageService.js` does; verified
  live against the real bucket.
- The upstream-canonical pattern is exactly our INVARIANT shape: store
  the object **key** (not bytes) in Postgres, serve through the app.
- Presigned URLs (future direct upload/download deliverable; explicitly
  out of scope for the current integration): `@aws-sdk/s3-request-presigner`
  `getSignedUrl(s3, new GetObjectCommand({ Bucket, Key }), { expiresIn })`,
  or the Neon Files SDK — the Files SDK was rejected for v1 to keep the
  seam standard and mockable.

## Observability

Branch-scoped logs exist for **storage and functions only** today
(us-east-2, Neon CLI ≥ 3.1):

```bash
neon logs query --branch production --source storage --since 1h
```

An empty result is more often the wrong branch than missing logs — pass
`--branch` explicitly. Postgres compute logs are not emitted yet.

## What this repo deliberately does not use

Neon Auth, Compute Functions, AI Gateway, `neon.ts` infrastructure-as-
code, `neon link`/`checkout` branch-first flows, and database branching
automation are all out of scope for this repo's integration (fixed
`production` branch; tests always run on local Docker Postgres). If a
task seems to need one of them, stop and confirm with the Owner instead
of installing official skills or running bootstrap commands (`neon init`
et al.) that write into the workspace. The official skill set lives at
[neondatabase/agent-skills](https://github.com/neondatabase/agent-skills)
for reference only.
