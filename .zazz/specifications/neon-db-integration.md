# Neon Backend Support — Deliverable Specification

**Worktree / branch:** `mw-neon-db-integration`
**Feature:** neon-db-integration
**Milestone:** N/A
**Deliverable:** Neon backend support (Neon Postgres + Neon Object Storage)
**Delivery topology:** single-deliverable branch
**Review artifact:** one PR for this specification
**Approved review shape:** one PR
**Decomposition rationale:** the work is one cohesive configuration seam
(env → connection → storage service → docs); the phases share the same files
and reviewers, so one PR reviews honestly. Milestone split and stacked lanes
were rejected as overhead with no review-boundary payoff.
**Integration branch:** `main` (confirmed with Owner)
**Merge policy:** PR review required — agents commit/push feature branches only
**Drafted:** 2026-08-22
**Shared run log:** `.zazz/execution/neon-db-integration-run-log.md` (local-only,
gitignored via `.zazz/.gitignore` + bare-repo exclude) — section
`neon-db-integration`.

---

## 0. Capability

Run zazz-board unchanged on either local Docker Postgres (the default) or
Neon, selected purely by environment configuration: relational data in Neon
Postgres under the same Drizzle schema, and attachments in Neon Object
Storage (S3-compatible, private bucket) with each object's storage key
recorded in the relational database. Local mode remains byte-identical to
today. Includes a `neon` agent skill and README documentation of both modes.

---

## 1. Required Reading For The Implementor

### 1.a This Specification

Read this specification end to end first.

### 1.b Feature / Milestone Context

- `.zazz/docs/neon-db-reference.md` — all sections; verified Neon facts
  (connection strings, pooling, compute lifecycle, storage endpoint and
  credentials, CLI, traps) plus this project's live values.
- `.zazz/docs/neon-setup.md` — all sections; the account-side setup is
  already executed (project `zazz-board` / `cool-mud-16591433`, database
  `zazz_board_db`, bucket `zazz-board-attachments`, worktree env files
  configured).

### 1.c Prior Specifications In This Delivery Effort

N/A — first specification in this effort.

### 1.d Standards

This specification deliberately does not prescribe a standards list.
Before writing code, read `.zazz/standards/index.yaml` and load only the
standards whose `applies_to` matches the §3 file set — the index is the
methodology's selection mechanism and the implementer owns the lookup.
Every sub-agent dispatched during this effort (including the verifier)
repeats the same lookup before acting. If a selected standard conflicts
with anything in this specification, halt and surface it to the Owner
instead of choosing a side.

### 1.e Existing Code References

- `api/lib/db/index.js` — the connection seam to modify (whole file, 33 lines).
- `api/src/services/databaseService.js` — image functions
  (`storeTaskImage` :2107, `storeDeliverableImage` :2151, `getImageWithData`
  :2192, `deleteImage` :2239, list/metadata functions :2059-2234) — the
  storage seam slots in here.
- `api/src/routes/images.js` — route contracts (unchanged in this deliverable).
- `api/src/schemas/images.js` — upload body schema (unchanged).
- `api/drizzle.config.js` — DDL URL selection.
- `api/scripts/seed-all.js` — existing seed guards (:5-28).
- `api/scripts/reset-and-seed.js` — destructive reset (no guard today).
- `api/scripts/bootstrap-first-run.js` — first-run push/seed flow.
- `api/__tests__/setup.pactum.mjs`, `api/__tests__/helpers/testDatabase.js` —
  test DB guards (unchanged; tests stay local).
- `api/__tests__/routes/image-scoping.test.mjs` — the local-mode contract
  tests and the 1x1 PNG fixture to reuse.

### 1.f Project Orientation

- `.zazz/docs/zb-agent-orientation.md` — branch scope discipline,
  command-shape discipline, local verification, database safety rules.
- `AGENTS.md` — DB setup, route list, troubleshooting.

---

## 2. Invariants

### INVARIANT 1 — One schema

`api/lib/db/schema.js` is the single source of database shape for both
providers. No provider-specific tables, columns, or migration files.

### INVARIANT 2 — Local mode is the default and unchanged

With `STORAGE_BACKEND` unset (or `local`) and local `DATABASE_URL`, all
behavior — including attachments in `IMAGE_DATA` — is identical to `main`.

### INVARIANT 3 — Storage identifiers live in the relational DB

Every attachment records its storage backend and object key in
`IMAGE_METADATA` (`storage_type`, `url`). Object bytes are reachable only
through that record.

### INVARIANT 4 — Reads dispatch per row

Image reads consult `IMAGE_METADATA.storage_type` per row: `local` rows
decode `IMAGE_DATA`; `neon` rows fetch from Object Storage. A database may
contain both kinds simultaneously.

### INVARIANT 5 — Service seam preserved

All DB access stays inside `databaseService`; route modules never import the
Drizzle `db` instance (data-layer standard).

### INVARIANT 6 — No secrets in tracked files

Tracked files contain placeholders only. Real credentials live in the
gitignored root `.env` and `api/.env`.

### INVARIANT 7 — Destructive tooling never touches Neon

`db:reset` / `reset-and-seed` refuse any non-local database host outright.
Seeding a remote database requires the explicit opt-in of D-9.

### INVARIANT 8 — Pooled for runtime, direct for DDL

Application queries use the pooled endpoint; `drizzle-kit push`, seeds, and
session-level diagnostics use the direct endpoint.

---

## 3. Scope

### Approved Review Shape

One PR to `main`. If implementation surfaces a need to split, stack, or grow
this, stop and revise the specification with Owner sign-off.

**Rationale.** One configuration seam reviewed whole; alternatives (milestone
branch, stacked lane) rejected — no independent review boundaries exist
between the phases.

**Review units owned by this specification.**

- One PR — connection layer, storage backend, guards, skill refresh, docs.

### Strict Scope Constraint

All modifications live under `api/`, `README.md`, `CONTRIBUTOR_SETUP.md`,
`.agents/skills/neon/`, and `.zazz/docs/`. Anything else: stop and surface
to the Owner.

### In Scope

| Path | New / Modified | Reason |
| --- | --- | --- |
| `api/lib/db/index.js` | Modified | Provider-aware connection options (ssl, `prepare: false`, pool bounds) |
| `api/lib/db/connectionOptions.js` | New | Pure function building postgres.js options from the URL (testable) |
| `api/drizzle.config.js` | Modified | Prefer `DATABASE_URL_UNPOOLED` for DDL |
| `api/src/services/objectStorageService.js` | New | S3-compatible client (AWS SDK v3): put/get/delete + config validation |
| `api/src/services/databaseService.js` | Modified | Image store/read/delete dispatch through the storage seam |
| `api/src/routes/images.js` | Modified | Binary download endpoint consumes normalized bytes from the service seam (HTTP contract unchanged) |
| `api/package.json` | Modified | Add `@aws-sdk/client-s3` |
| `api/.env.example` | Modified | Neon template (already drafted on this branch; verify final state) |
| `api/scripts/seed-all.js` | Modified | Remote-seed opt-in guard (D-9) |
| `api/scripts/reset-and-seed.js` | Modified | Refuse non-local hosts (INVARIANT 7) |
| `api/__tests__/services/objectStorage.test.mjs` | New | Storage service contract (mocked S3 client) |
| `api/__tests__/services/imageStorageDispatch.test.mjs` | New | Neon/local write + per-row read dispatch + delete |
| `api/__tests__/lib/connectionOptions.test.mjs` | New | Provider detection and options |
| `api/__tests__/scripts/guards.test.mjs` | New | Seed/reset guard behavior |
| `.agents/skills/neon/SKILL.md` | Modified | Refresh if implementation changes any documented command |
| `.zazz/docs/neon-setup.md` | Modified | Final-state corrections after implementation |
| `README.md` | Modified | Document both run modes for users and link the setup guide (final phase) |
| `CONTRIBUTOR_SETUP.md` | Modified | Point contributors at the Neon docs, `neon` skill, and the MCP section |

### Out Of Scope

- Any `client/` change (upload UI, presigned direct upload/download)
- GCS or any second provider beyond the reserved flag value
- Backfill/migration of existing `IMAGE_DATA` rows to Object Storage
- Relaxing the image-only attachment validation (`^image/` content
  types) — attaching general documents to tickets is a separate future
  deliverable
- `docker-compose*.yml` changes (local deployment stays as-is)
- Neon branching automation or preview environments
- CI changes (tests remain local Docker Postgres)
- `@aws-sdk/s3-request-presigner` (no presigned URL use in v1)

---

## 4. Decisions

### D-1 — Keep postgres.js as the driver

**Decision.** No driver change; connect postgres.js to Neon via URL.

**Why.** Neon supports postgres.js over standard TCP; the serverless driver
exists for edge runtimes without TCP. Zero-dependency change for the
relational plane.

### D-2 — Two URLs: pooled runtime, direct DDL

**Decision.** `DATABASE_URL` (pooled, `-pooler` host) for the app;
`DATABASE_URL_UNPOOLED` (direct host) for `drizzle-kit push`, seeds, and
session-level diagnostics.

**Why.** Neon documents that DDL through the pooled endpoint can fail
(PgBouncer transaction mode). A single-URL design was rejected for that
failure mode. The names match Neon's own `env pull` output exactly.

### D-3 — Provider selected by `DATABASE_URL` alone

**Decision.** No `DB_PROVIDER` flag; host inspection (`*.neon.tech`)
selects Neon-specific client options.

**Why.** The URL already encodes the provider; a second flag creates a
disagreeable second source of truth.

### D-4 — `STORAGE_BACKEND=local|neon`, default `local`

**Decision.** One flag for the attachment byte store; `neon` names the
actual provider (Neon Object Storage); `gcs` reserved for a future GCP
equivalent.

**Why.** Standards pre-authorize a `STORAGE_BACKEND` env. A single
"neon mode" flag coupling DB and storage was rejected: it duplicates
provider state and blocks testing storage against local Postgres. The value
`s3` was rejected as misleading — there is no AWS account in this design;
storage is issued by Neon under one credential system.

### D-5 — AWS SDK v3 S3 client reading `AWS_*` env vars

**Decision.** `@aws-sdk/client-s3` configured by the standard credential
chain (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`,
`AWS_REGION`) exactly as `neon env pull` emits them.

**Why.** Env-native auth, zero custom credential code, portable to any
S3-compatible endpoint. The Neon Files SDK was rejected to keep the
dependency standard and the seam mockable.

### D-6 — API contract unchanged; server-side relay

**Decision.** Uploads keep the base64 JSON contract; the API relays bytes to
Object Storage with `PutObject` and serves downloads by proxying
`GetObject` bytes with the existing headers.

**Why.** No client upload UI exists; contract stability beats scaling we do
not need yet. Presigned direct upload/redirect is the natural follow-up when
a client needs it.

### D-7 — Private bucket, keys derived from the row

**Decision.** Bucket `zazz-board-attachments` (private). Object key =
`attachments/{image_metadata_id}` (the uuid PK).

**Why.** Private keeps reads access-controlled through the app. Deterministic
keys from the PK are collision-free and need no extra index; the original
filename already lives in metadata.

### D-8 — Fail fast on incomplete storage config

**Decision.** `STORAGE_BACKEND=neon` with missing bucket/AWS env aborts
startup naming the missing variables. No silent fallback to DB storage.

**Why.** Silent fallback would write blobs to Postgres while the operator
believes they are in Object Storage — the one unacceptable mixed state.

### D-9 — Remote-seed opt-in; reset refuses remote outright

**Decision.** `seed-all.js` keeps the `zazz_board_*` name allowlist for
local targets and additionally requires `ALLOW_REMOTE_SEED=true` for any
other host. `reset-and-seed.js` refuses non-local hosts with no override.

**Why.** Neon holds real data; seeding is a write, resetting is
destructive. The existing `NODE_ENV=production` block stays as a backstop.

### D-10 — Accept autosuspend cold starts

**Decision.** No keep-alive pings; document the ~0.5 s first-query wake.

**Why.** Scale-to-zero is the cost win. Keep-alive (or paid always-on) can
be added later without contract change.

### D-11 — Skill named `neon`

**Decision.** `.agents/skills/neon/` covering queries, CLI/API, and storage.

**Why.** The platform is named Neon; the skill spans all three planes.
`neon-db` undersells it and collides with nothing either way; docs
terminology wins.

---

## 5. Agent Implementation Rules

### Team Integration

Commit and push only to `mw-neon-db-integration`. Do not merge to `main`;
all integration happens through human PR review.

### Command Working Directory

```bash
# API tests (scoped first, full suite before PR)
cd api && set -a && source .env && set +a && npm run test -- __tests__/<path>
cd api && set -a && source .env && set +a && npm run test

# Lint (scoped)
npm run lint:client -- -- src/<path>      # client-only if ever needed
npx markdownlint-cli2 <changed>.md

# DB (local Docker only)
npm run docker:up:db
npm run db:reset
```

### Commit And Push

One coherent green commit for the implementation after DoD and verifier
pass; waypoint commits only at green recovery points; push at completion.

### Scope Verification

`git diff main --stat` must list exactly the §3 files (this branch also
carries the pre-implementation docs/skill/env-example commit — the diff
union of both commits must still match §3).

### Autonomy Boundaries

Hard constraints: §3 scope, §2 invariants, §6 ACs, §1.d standards, halt
conditions. Adaptive guidance: helper names, internal mechanics, test
organization, skeleton bodies.

### Run Log

Maintain `.zazz/execution/neon-db-integration-run-log.md` (append-only):
OQ resolutions, phase completions with SHAs and command outcomes,
deviations, manual evidence paths, verifier report.

### Halt Conditions

1. Any Open Question in §10 unresolved before code change.
2. Same automated test fails 3 iterations in a row.
3. Lint/format failure not fixed by the obvious fix in 2 iterations.
4. `git diff main --stat` shows a file outside §3.
5. A standard selected via the `.zazz/standards/index.yaml` lookup
   conflicts with this specification or cannot be followed — surface it
   to the Owner rather than choosing a side.
6. A needed deviation changes scope, public contract, ACs, or an invariant.
7. Any command would run destructive SQL or `db:reset` against a non-local
   database — stop; this is never sanctioned remotely.
8. postgres.js fails to connect with Neon's pulled URL parameters
   (`channel_binding`) or pooled-endpoint prepared statements misbehave:
   apply only the spec-sanctioned mitigations (strip `channel_binding` in
   the options builder; `prepare: false` on the pooled client), then
   surface results in the run log before proceeding.

---

## 6. Acceptance Criteria

- **AC1 — Local mode unchanged.** With local env and `STORAGE_BACKEND`
  unset, the full existing suite is green and uploads still write
  `IMAGE_DATA`. Verified by: full `npm run test` in `api`.
- **AC2 — Provider-aware connection options.** For `*.neon.tech` URLs the
  client is built with TLS, `prepare: false`, bounded `max` and
  `idle_timeout`; for local URLs options match today's behavior. Verified
  by: `__tests__/lib/connectionOptions.test.mjs`.
- **AC3 — DDL uses the direct endpoint.** `drizzle.config.js` prefers
  `DATABASE_URL_UNPOOLED` when set. Verified by:
  `__tests__/lib/connectionOptions.test.mjs` (config unit) plus the AC9
  live push.
- **AC4 — Neon upload path.** With `STORAGE_BACKEND=neon`, image stores
  call the storage service, write `IMAGE_METADATA` with
  `storage_type='neon'` and the object key in `url`, and write no
  `IMAGE_DATA` row. Verified by:
  `__tests__/services/imageStorageDispatch.test.mjs` (mocked storage seam).
- **AC5 — Per-row read dispatch.** Reads return bytes for `local` rows
  from `IMAGE_DATA` and for `neon` rows from the storage service, including
  mixed result sets. Verified by: same test file, table-driven cases.
- **AC6 — Neon delete path.** Deleting a `neon` image removes the object
  and both row records. Verified by: same test file.
- **AC7 — Fail-fast storage config.** `STORAGE_BACKEND=neon` with missing
  storage env aborts with an error naming each missing variable;
  `local`/unset requires nothing. Verified by:
  `__tests__/services/objectStorage.test.mjs` config cases.
- **AC8 — Guards.** `seed-all.js` refuses remote targets without
  `ALLOW_REMOTE_SEED=true` and admits them with it;
  `reset-and-seed.js` refuses non-local hosts unconditionally. Verified
  by: `__tests__/scripts/guards.test.mjs`.
- **AC9 — Live smoke against real Neon.** Push schema via
  `DATABASE_URL_UNPOOLED`, seed with the opt-in guard, then through the
  running API: create a deliverable titled "Neon storage backend
  support", attach a real image file to it (a repo SVG asset works —
  `image/svg+xml` passes validation; content types are image-only by
  contract), and verify end to end: the `IMAGE_METADATA` row records
  `storage_type='neon'` with the object key in `url`,
  `neon buckets object list` lists the key with matching size, and the
  binary download is byte-identical to the source file (`cmp`). Leave
  the deliverable and attachment in place as living evidence. Evidence
  paths recorded in the run log.
- **AC10 — Docs and skill current.** README documents both run modes for
  application users and links `.zazz/docs/neon-setup.md`;
  `CONTRIBUTOR_SETUP.md` points contributors at the Neon docs, skill, and
  MCP section; skill and setup doc match implemented behavior. Verified
  by: Owner review + markdownlint clean.
- **AC11 — Verification clean.** Full API suite, `npm run lint`, and
  markdownlint on changed markdown all pass; `git diff main --stat`
  matches §3. Verified by: cited command outputs in the run log.

---

## 7. Test Strategy

Reference data sources:

- The 1x1 PNG base64 fixture in `__tests__/routes/image-scoping.test.mjs`
  — reused for dispatch tests; no new fixtures.
- The canonical seed snapshot contains zero `image_metadata` and
  `image_data` rows — attachment coverage comes from tests and the
  Phase 4 live upload, never from seeding.
- A mocked S3 client at the `objectStorageService` boundary — testing.md
  pre-authorizes mocking this path; nothing below that boundary is mocked.
- Dispatch tests isolate `STORAGE_BACKEND` (save/restore around neon
  cases) and mock the storage seam through module import (`vi.mock` of
  `objectStorageService`).

Automated tests:

- `connectionOptions.test.mjs` — proves AC2/AC3: neon URL → ssl +
  `prepare:false` + bounded pool; local URL → today's options; config URL
  precedence.
- `objectStorage.test.mjs` — proves AC7 and the storage contract:
  put/get/delete invoked with `NEON_STORAGE_BUCKET` + derived key; missing
  env aborts naming every missing variable.
- `imageStorageDispatch.test.mjs` — proves AC4/AC5/AC6 against the real
  test database with the storage seam mocked: neon write (metadata row,
  key in `url`, no `IMAGE_DATA`), mixed-row reads, delete removes object
  and rows.
- `guards.test.mjs` — proves AC8: seed/reset host decisions across
  local/remote × opt-in matrices.

Existing coverage intentionally reused:

- `image-scoping.test.mjs` and the rest of the suite already prove AC1;
  no duplication.

Manual verification:

- AC9 live smoke (commands in §8 Phase 4) with outputs captured under
  `.zazz/execution/`.

---

## 8. TDD Entry Point + Prescriptive Execution Sequence

TDD entry point — first failing test in
`__tests__/lib/connectionOptions.test.mjs`:

```js
test('neon URLs get ssl, prepare:false, and bounded pool', () => {
  const opts = buildConnectionOptions(
    'postgresql://u:p@ep-x-pooler.c-5.us-east-2.aws.neon.tech/zazz_board_db?sslmode=require',
  );
  expect(opts.ssl).toBeDefined();
  expect(opts.prepare).toBe(false);
  expect(opts.max).toBeLessThanOrEqual(10);
});
```

**Phase 1 — Connection layer**

1.1. Extract `buildConnectionOptions(url)` into
`api/lib/db/connectionOptions.js`; wire into `api/lib/db/index.js`;
prefer `DATABASE_URL_UNPOOLED` in `api/drizzle.config.js`.
1.2. Run: `cd api && set -a && source .env && set +a && npm run test --
__tests__/lib/connectionOptions.test.mjs`. Expect green.

**Phase 2 — Guards**

2.1. `seed-all.js` remote opt-in; `reset-and-seed.js` non-local refusal.
2.2. Run guards test file. Expect green.

**Phase 3 — Storage seam**

3.1. `objectStorageService.js` + `databaseService` dispatch (write, read,
delete) + `@aws-sdk/client-s3` dependency + fail-fast config.
3.2. Run the three storage/dispatch test files, then the full suite
(AC1 regression). Expect green.

**Phase 4 — Live smoke + verify-items**

4.1. Service lifecycle: if `http://localhost:3030/health` already
responds, reuse that running instance (the Owner may have started it and
must not have it stopped). Otherwise start the API yourself in the
background (`npm run dev:api`), poll the health endpoint until OK, and
stop only the process you started when the smoke completes. Record the
log path in the run log.
4.2. `db:push` via `DATABASE_URL_UNPOOLED`; seed with
`ALLOW_REMOTE_SEED=true`.
4.3. Through the API: create the "Neon storage backend support"
deliverable, attach a real image file (a repo SVG asset or generated
PNG — content types are image-only), then verify per AC9: metadata row
(`storage_type='neon'`, key in `url`), `neon buckets object list` entry
with matching size, byte-identical download (`cmp`). Capture evidence.
4.4. Record `channel_binding`/pooled-prepare behavior in the run log
(halt condition 8 applies).

**Phase 5 — Docs and skill (final phase)**

5.1. README documents both run modes for users, linking
`.zazz/docs/neon-setup.md`; add a Neon pointer section to
`CONTRIBUTOR_SETUP.md`; setup/reference/skill corrections to match
implemented behavior. Audience placement within the docs is editorial
judgment — follow the README's existing user/contributor structure.
5.2. `npx markdownlint-cli2` on changed markdown; full lint; full suite;
scope verification; DoD; verifier sub-agent; PR draft.

### Skeleton: `api/lib/db/connectionOptions.js`

```js
// Pure function: URL -> postgres.js options. Neon hosts (*.neon.tech)
// get TLS + prepare:false (PgBouncer transaction mode) + bounded pool.
export function buildConnectionOptions(connectionString) { /* ... */ }
export function isNeonHost(connectionString) { /* ... */ }
```

### Skeleton: `api/src/services/objectStorageService.js`

```js
// AWS SDK v3 S3 client over env config; validates at boot (fail fast).
export function validateStorageConfig(env) { /* throws naming missing vars */ }
export function createObjectStorageService(env = process.env) {
  // putObject(key, buffer, contentType), getObject(key) -> Buffer,
  // deleteObject(key); bucket from NEON_STORAGE_BUCKET.
}
```

### Skeleton: `databaseService` dispatch

```js
// In storeXImage: if storage backend is 'neon' -> objectStorage.putObject(
//   `attachments/${metadata.id}`, buffer, contentType)
//   insert IMAGE_METADATA { storage_type: 'neon', url: key }, skip IMAGE_DATA.
// In getImageWithData/deleteImage: switch on row.storage_type per INVARIANT 4;
// getImageWithData returns normalized bytes (local base64 decoded internally)
// so the binary route sends them without branching.
```

---

## 9. Definition Of Done

- [ ] All §1 required reading consumed; standards-index verification performed.
- [ ] All §10 Open Questions resolved with the Owner and logged.
- [ ] Scoped tests green during development; full suite green before PR:
      `cd api && set -a && source .env && set +a && npm run test`.
- [ ] `npm run lint` exits 0; markdownlint clean on changed markdown.
- [ ] AC9 manual evidence captured in the run log.
- [ ] `git diff main --stat` matches §3 exactly.
- [ ] All AC1-AC11 verified with cited evidence in the run log.
- [ ] Run-log section current through final phase.
- [ ] Verifier sub-agent dispatched and returned all-pass.
- [ ] PR draft body links this specification and lists each AC's
      verification.

---

## 10. Open Questions

None blocking. Resolved with the Owner on 2026-08-22 (logged in the run
log on implementation start):

- Topology: one spec, one PR to `main`.
- Object Storage beta + us-east-2: accepted; existing project qualifies.
- Bucket mode: private, reads through the app.
- API contract: unchanged, server-side relay.
- Flag naming: `STORAGE_BACKEND=local|neon`; skill named `neon`.
- Storage credential/endpoint contract: verified live via `neon env pull`.

Implementation-time verify-items (not Owner questions) are encoded in AC9
and halt condition 8.

---

## 11. Run Log Protocol

Run log: `.zazz/execution/neon-db-integration-run-log.md` (gitignored;
keep the file machine-local). Append entries after OQ resolutions, phase
completions (SHA + verifying command outcomes), deviations with
confirmation status, manual evidence paths, QA findings, and the verifier
report. Do not rewrite prior entries.

Session start protocol: read this specification end to end; read the run
log in full; confirm the next phase from the last Phase Completion entry;
resolve open questions before writing code.

---

## 12. Appendix — Agent Implementation Prompt

```text
You are starting fresh in the worktree at
/Users/michael/Dev/zazzcode/zazz-board/mw-neon-db-integration.
Your task is to implement Neon backend support (Neon Postgres + Neon
Object Storage), unattended, through completion including tests.

Specification: .zazz/specifications/neon-db-integration.md
Shared run log: .zazz/execution/neon-db-integration-run-log.md

Read the specification end to end before doing anything else. Then read
the run log in full and the required reading in spec §1 (especially
.zazz/docs/neon-db-reference.md and .zazz/docs/neon-setup.md).

ENVIRONMENT PREP (before coding)
- This is an unattended run: do not pause between phases for Owner
  input. A §5 halt condition is the only reason to stop.
- §10 has no blocking Open Questions; do not wait on the Owner for them.
- The worktree env files are already configured and live (Neon active in
  this worktree; local Docker remains the default on main). Never print
  or commit their values.
- Local Docker Postgres is required for the test suite:
  npm run docker:up:db — and ensure the zazz_board_test database exists
  (create it once via psql if missing; see README "Running tests").
- The canonical seed contains no image rows; attachment coverage comes
  from the tests you write and the Phase 4 live upload.

NON-NEGOTIABLE RULES
1. Follow the specification's Agent Implementation Rules (§5), including
   every halt condition.
2. Select standards yourself via .zazz/standards/index.yaml against the
   §3 file list before writing code; every sub-agent you dispatch
   repeats the same lookup before acting.
3. Tests and verification are not optional; every AC needs evidence.
4. Never run destructive SQL or db:reset against a non-local database.
5. Never print or commit secret values (DATABASE_URL passwords,
   NEON_API_KEY, AWS_* keys).

ORDER OF WORK
1. Read specification, run log, docs, and code references.
2. Start with the TDD entry point in §8; follow the phase order —
   connection layer, guards, storage seam, live smoke, docs+skill last.
3. After your own DoD checklist is green, dispatch a verifier sub-agent:

   "You are verifying Neon backend support in
   /Users/michael/Dev/zazzcode/zazz-board/mw-neon-db-integration. Read
   .zazz/specifications/neon-db-integration.md and the run log at
   .zazz/execution/neon-db-integration-run-log.md. Select standards via
   .zazz/standards/index.yaml against the spec §3 file list before
   acting. For each AC, independently verify it by running the cited
   test or command. Cross-check logged deviations against the code.
   Verify the branch diff matches §3. Do not modify code or the run
   log. Return PASS/FAIL per AC with evidence."

4. Only declare done after the verifier reports all-pass. Do not merge to
   main; integration happens through human PR review.
```

---

*End of specification. Implementation proceeds from this specification and
the run log; no separate execution document is created.*
