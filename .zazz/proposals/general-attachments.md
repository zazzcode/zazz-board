# Proposal: General attachments for deliverables and tasks

**Scope type**: deliverable-scoped (implementation increment; no new feature-document territory — the attachment capability already exists, this generalizes it)
**Status**: draft — awaiting Owner sign-off before spec authoring
**Proposed by**: Owner (Michael), drafted 2026-08-23 via the `proposal-builder` skill
**Sequencing**: depends on `mw-neon-db-integration` merging first (PR zazz-board#27) — the storage seam, guards, and provider work below assume it

## Context and problem statement

Zazz Board has a working attachment pipeline, but every layer names and validates it as **images-only**:

- DB: `IMAGE_METADATA` / `IMAGE_DATA` tables (`api/lib/db/schema.js:289-311`); `storage_type` comment still says `'local' or 's3'` (stale — values are `local|neon` since the Neon integration).
- Validation: upload schema enforces `contentType` pattern `^image/` (`api/src/schemas/images.js`) — general documents (`.md` SPEC/PLAN drafts, `.txt`, `.pdf`) are rejected by contract. The Neon live smoke had to upload an SVG *because* a markdown file could not pass validation.
- Service/routes: `storeTaskImage` / `storeDeliverableImage` / `getImageWithData` / `deleteImage` and `/projects/:code/.../images*` routes; schema file `images.js`; binary serve route decodes/serves per `storage_type`.

The underlying machinery is already content-agnostic: `objectStorageService` puts/gets opaque buffers, object keys are `attachments/<id>` (not image-specific), and the per-row `storage_type` dispatch does not care about content. Only the naming, validation, and vocabulary constrain it to images.

The prior deliverable explicitly deferred this: `.zazz/specifications/neon-db-integration.md` §Out of Scope — "Relaxing the image-only attachment validation (`^image/` content types) — attaching general documents to tickets is a separate future deliverable." This proposal is that deliverable's starting point.

**Why now**: the Neon backend just landed the storage seam and both backends (DB blobs / Object Storage); generalizing now means one rename-and-relax pass instead of a later migration on top of new image-only features, and the dogfooding workflow (SPECs, PLANs, handoffs as deliverable artifacts) wants `.md` attachments today.

## Scope and non-goals

**In scope**: relational rename/generalization (`ATTACHMENT_*`), service and route generalization, content-type allowlist + size limits, schema/route naming, tests, seed compatibility, migration of existing rows (including the live Neon evidence row), API docs.

**Non-goals**: client upload UI (none exists today), presigned direct upload/download, GCS/S3 providers (reserved values only), versioning/locking of attachments, full-text indexing or preview rendering of documents.

## Value proposition and expected outcomes

- Owners and agents can attach SPEC/PLAN drafts, markdown notes, PDFs, and other documents directly to deliverables and tasks through the same pipeline as images.
- Vocabulary stops lying: `ATTACHMENT_*` tables, `/attachments` routes, `storeAttachment` service methods — future contributors don't rediscover the image-only assumption.
- Both storage backends (local DB blobs, Neon Object Storage) serve all content types through the unchanged per-row dispatch.

## Alternatives considered

**A — Full rename & generalize (recommended).** Rename tables to `ATTACHMENT_METADATA`/`ATTACHMENT_DATA`, generalize service methods and routes to `/attachments`, relax validation to an explicit content-type allowlist with a size cap. Migrate existing rows with `ALTER TABLE ... RENAME` (preserves data, including the Neon instance's living-evidence row) rather than relying on a destructive reset.
*Tradeoffs*: breaking API change (route paths and response fields) — cheap today because no client upload UI exists and agent consumers follow the OpenAPI spec; one-time churn across schema/service/routes/tests/docs.

**B — Additive parallel surface.** Keep `IMAGE_*` untouched; add new `ATTACHMENT_*` tables and `/attachments` routes alongside; deprecate image routes later.
*Tradeoffs*: no breakage, but two parallel seams in the schema, service, and test surface for months; violates the one-schema principle and duplicates the storage dispatch; the rename debt the Owner wants gone survives.

**C — Relax validation only, keep IMAGE naming.** Change `^image/` to an allowlist; rename nothing.
*Tradeoffs*: smallest diff, but the naming debt (the stated motivation) persists and every future reader re-learns that "images" means "attachments".

## Data model shape (within Approach A)

Owner question (2026-08-23): one metadata table for images and documents, or separate tables per kind — and what replaces `IMAGE_DATA`?

**Recommendation: one unified `ATTACHMENT_METADATA` for all kinds, `ATTACHMENT_DATA` for local-backend bytes, no `kind` column.**

- `ATTACHMENT_METADATA` is the attachment *entity* (not a join table): single-owner CHECK (task XOR deliverable) carries over unchanged; every current column is kind-agnostic.
- `content_type` is the discriminator: `^image/` prefix determines display class (inline image vs document link vs CSV preview). Display differences are client concerns, not schema concerns — no `kind` column, no per-kind tables.
- Per-kind tables (IMAGE + DOCUMENT side by side) duplicate the service seam, routes, tests, and make "all attachments for deliverable X" a UNION — real cost, no query benefit, since no kind-specific columns exist today.
- `ATTACHMENT_DATA` (replacing `IMAGE_DATA`) holds **local-backend bytes only** — neon rows have no byte row (object lives in the bucket, key in `url`). Name it `ATTACHMENT_DATA` for that reason; `ATTACHMENT_OBJECTS` would imply a registry of all stored objects, which it is not.
- Image-specific metadata (dimensions, thumbnails) is speculative today — `thumbnail_data` is nullable and null since day one. **Drop it in the rename**; if image previews become real, add a 1:0..1 extension table (`ATTACHMENT_IMAGE_INFO`, supertype/subtype) at that time — the extension pattern keeps the base table clean without pre-paying for it.

## Tradeoff analysis

The decisive costs are timing and duplication. The project is pre-v1 with no client upload surface: a breaking rename is as cheap now as it will ever be. Approach A pays once; B pays continuously and defers the same break to a worse moment; C pays nothing but fails the goal. Migration risk in A is low: `ALTER TABLE ... RENAME` + column comment updates are non-destructive, the seed snapshot contains zero attachment rows, and the only production row is the single Neon smoke attachment (which the rename preserves in place).

## Standards and constraints analysis

- **data-architecture.md**: schema-first — the schema edit is the contract change point; pre-v1 push workflow applies (`db:push`); UPPER_SNAKE table names and the image-storage column group order carry over to `ATTACHMENT_*`.
- **data-layer.md**: DB access stays inside `databaseService`; renamed methods keep `.returning()` and null-normalization contracts; snake_case↔camelCase mapping unchanged.
- **service-layer.md**: route contracts change shape (paths) — must stay project-scoped with the existing ownership checks; service returns stay camelCase.
- **coding-styles.md**: content-type allowlist belongs in the JSON Schema (structure), size/executable-blocking rules in handlers (business logic) — validation separation.
- **testing.md**: every changed route needs PactumJS coverage; TDD entry point from a failing allowlist test (a `.md` upload round-trip) mirrors the Neon deliverable's red-green pattern.
- **system-architecture.md**: already updated (2026-08-23) to describe both backends generically for "attachments" — this proposal implements toward that wording.

## Risks and mitigations

- **Breaking agent consumers** (zazzctl, board agents) that hit `/images*` routes: mitigate with a compatibility decision in the spec — either 404 the legacy paths (the repo has precedent: removed legacy image routes return 404 with tests) or alias temporarily; update OpenAPI docs and AGENTS.md route list in the same deliverable.
- **Malicious uploads** once beyond images: allowlist (no executables, no `text/html`), size cap, and `Content-Disposition`/content-type hygiene on the serve route; storage stays in the private bucket with access only through the app.
- **Migration drift** between local Docker and Neon instances: use the same `ALTER TABLE` script path on both; Neon's direct endpoint for DDL; never `db:reset` remotely (guards already enforce).

## Dependencies and sequencing considerations

1. `mw-neon-db-integration` (PR zazz-board#27) merges — storage seam, guards, and Neon mode are prerequisites.
2. This proposal approved → spec via `spec-builder`.
3. Implementation naturally lands as one deliverable/one PR (single cohesive seam, same reviewer set — same rationale as the Neon deliverable's single-PR decision).

## Recommendation

Approach A: rename to `ATTACHMENT_*` + generalize service/routes + allowlist validation, with non-destructive `ALTER TABLE RENAME` migration. Decide the legacy-route strategy (404 vs temporary alias) during spec authoring.

## Decision checklist / approval questions

- Data model shape: unified `ATTACHMENT_METADATA` + `ATTACHMENT_DATA` with `content_type` as discriminator, per the recommendation above — or per-kind tables despite the duplication?
- Content-type allowlist set (proposal: `image/*`, `text/markdown`, `text/plain`, `text/csv`, `application/pdf` to start)?
- Maximum attachment size (proposal: 10 MB)?
- Legacy `/images*` routes: 404 immediately, or temporary alias?
- Drop `thumbnail_data` in the rename (recommended; extension table later if previews become real)?
- Tasks keep general attachments alongside deliverables (current task-image routes generalize too)?

## Open questions

- Should `url` semantics be normalized (object key for every row, local API URL derived) instead of today's split (local rows: API path; neon rows: object key)? Surfaced during the Neon work; cheapest to settle inside this rename.
- Does the serve route need `Content-Disposition: attachment` for non-image types to avoid inline rendering of untrusted HTML-ish content?

## Sign-off outcome and next-phase handoff

Pending Owner sign-off. On approval, hand off to `spec-builder` with: this document, `.zazz/specifications/neon-db-integration.md` (prior art for invariants/guards/test strategy), the Neon run log (`.zazz/execution/neon-db-integration-run-log.md`, machine-local), and the suggested TDD entry point: a failing test that uploads a `text/markdown` document to a deliverable and round-trips it byte-identically on both storage backends.
