# Standards contextual split

This note explains how the standards in this repo are split and how the team should
maintain that split. It is written for humans. `index.yaml` is the machine-readable
source agents use to decide which standards to load.

This repo's DOCS_ROOT is `.zazz/` (not `docs/`). All standards live under
`.zazz/standards/`.

## Why split standards

Standards have to be usable during implementation and review. When one file covers too
many topics, agents load rules unrelated to the task, humans scan too much text, and
edits to unrelated rules collide in the same document.

The goal is contextual loading: an agent working on Fastify response schemas should
load the schema/response rules, not auth or OpenAPI test guidance unless the task also
touches those areas. A reviewer should be able to point to the specific standard for
the work under review.

Line-count thresholds are a reviewability signal:

- Under 400 lines is preferred. A file this size usually fits in agent context
  alongside the code, tests, specs, and command output for the task.
- Up to 500 lines is acceptable when the topic is still cohesive and another split
  would make discovery worse.
- Over 600 lines should block review unless the file is split or an explicit exception
  is accepted. At that size, the file is probably mixing contexts.

Splits should follow work areas, not arbitrary halves. Do not create `part-1` /
`part-2` files. Use names that describe the context: schemas, authorization,
migrations, hook design, and similar.

## Provenance requirement

Splitting a standard must not remove hard references. Each normative standard keeps
clickable citations to the PR comment, precedent file, or established best-practice
source that justifies the rule. The citation requirement comes from the docs-hygiene
standard.

This file is a map of the split. The rule text and its citations remain in the
individual standards listed below.

## Repo-specific standards (take precedence)

This repo carries standards that are specific to its stack (JavaScript / Fastify /
React / PostgreSQL + Drizzle). These take precedence over any generic or placeholder
standard when they overlap:

- `system-architecture.md`: stack, layers (API/Services/Client), and optional cloud
  deployment. Use for orientation on what runs where.
- `data-architecture.md`: schema-first design, Drizzle/PostgreSQL conventions, the
  `databaseService` DB seam, UPPER_SNAKE_CASE codes, sparse task positions, and key
  tables. Use for database shape and naming.
- `testing.md`: Vitest + PactumJS integration tests, the real `zazz_board_test` DB,
  TDD rules, and the "every route needs PactumJS API tests" standard. Use for test
  shape and TDD.
- `coding-styles.md`: Prettier/ESLint, camelCase JS vs snake_case DB columns, API
  validation separation from business logic, schema organization, the project-scoped
  handler pattern, the client mutation pattern (no stale UI after save),
  UPPER_SNAKE_CASE enums, and i18n. Use for naming, conventions, and patterns.

## HTTP layer (Fastify) — placeholder, to be expanded

- `http-layer.md`: Fastify route layout, endpoint file naming, plugin registration,
  JSON Schema validation wiring, and the handler/schema boundary. Use for endpoint
  structure and route registration.

This is a placeholder stub for the Node/Fastify stack. It should be expanded into a
real baseline by inspecting `api/src/routes/` and `api/src/schemas/` via the
`standard-builder` skill. Until then, the Fastify-relevant rules already captured in
`coding-styles.md` (API validation separation, schema organization, project-scoped
handler pattern, business error mapping) take precedence.

## Data layer (Drizzle) — placeholder, to be expanded

- `data-layer.md`: the `databaseService` DB seam, Drizzle query composition, the
  snake_case ↔ camelCase field mapping via `keysToCamelCase`, and the rule that routes
  never touch the DB directly. Use for data access shape.

This is a placeholder stub for the Drizzle/PostgreSQL stack. It should be expanded via
the `standard-builder` skill against `api/src/services/databaseService.js` and
`api/lib/db/schema.js`. Until then, `data-architecture.md` takes precedence.

## Frontend (React + Vite + Mantine) — placeholder, to be expanded

- `frontend.md`: React hook design, Mantine component usage, the client mutation
  pattern, drag-and-drop (@dnd-kit), the task graph (@xyflow/react), and i18n. Use for
  client data flow and UI behavior.

This is a placeholder stub for the React+Mantine stack. It should be expanded via the
`standard-builder` skill against `client/src/`. Until then, the client mutation
pattern and i18n rules already captured in `coding-styles.md` take precedence.

## Cross-cutting (generic methodology, vendored from zazz-skills)

These are stack-agnostic methodology standards copied from the upstream `zazz-skills`
repository. They apply to authored source files, tests, scripts, standards docs, and
agent skills regardless of language:

- `code-structure.md`: file-size thresholds, contextual splitting, module cohesion,
  incrementally discoverable skills and docs, agentic slop patterns, and compute-once
  guidance.
- `docs-hygiene.md`: voice (RFC-2119), paired Desired/Not-desired examples, MCP/tool
  references, database-table references, cross-document links, cleanup discipline, and
  banned transient identifiers.
- `docs-hygiene-reference-structure.md`: what standards docs do not contain, citation
  formats, section ordering, and a worked well-formed section.
- `spec-hygiene.md`: specification path/link portability and the content-quality bar
  for SPECs (testable acceptance criteria, proportional test plan, decisions with
  rationale, explicit scope/exclusions).
- `pr-process.md`: PR title scope labels, one logical change per PR, legacy-replacement
  evidence, no transitional cruft, CVE title format, and repo hygiene.

## Maintenance rules

When adding a rule, put it in the file whose context an agent would naturally load for
the task. If a rule spans contexts, keep the normative rule in the most specific file
and add a short cross-reference only where it prevents missed discovery.

When a file approaches 400 lines, look for a contextual boundary. Split by task area,
artifact type, or review question. Do not split by page count alone.

After adding, moving, or renaming a standards file, update `index.yaml` with:

- the file name
- the paths or activities that should trigger the file
- a concise purpose that names the decisions the file governs

## Sync discipline

The generic methodology standards (`code-structure`, `docs-hygiene`,
`docs-hygiene-reference-structure`, `spec-hygiene`, `pr-process`) are vendored from
upstream `zazz-skills` and should be refreshed from there periodically. The
repo-specific standards (`system-architecture`, `data-architecture`, `testing`,
`coding-styles`) are owned by this repo and must not be clobbered by an upstream sync.
The placeholder stack standards (`http-layer`, `data-layer`, `frontend`) are owned by
this repo and intended to be expanded into real baselines; once expanded they are also
repo-owned and must not be clobbered.
