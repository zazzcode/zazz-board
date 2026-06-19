---
last_updated_at: 2026-06-19
status: placeholder
---

# Data layer (Drizzle + PostgreSQL)

> **Status: placeholder stub — to be expanded.**
> This is an analogous standard for the Drizzle ORM / PostgreSQL stack, created as a
> placeholder so the standards index structure exists. It should be expanded into a
> real baseline by inspecting `api/src/services/databaseService.js` and
> `api/lib/db/schema.js` via the `standard-builder` skill. Until then,
> [data-architecture.md](./data-architecture.md) takes precedence.

## Scope

This standard governs the data access layer: the `databaseService` DB seam, Drizzle
query composition, the schema in `api/lib/db/schema.js`, and the snake_case ↔
camelCase field mapping.

## Intended coverage (to be drafted from the codebase)

- All DB access goes through `databaseService`; routes never touch the DB directly
  (see [data-architecture.md](./data-architecture.md) and
  [system-architecture.md](./system-architecture.md)).
- Schema-first: schema lives in `api/lib/db/schema.js` (Drizzle); services and routes
  are built against it.
- Field mapping: snake_case DB columns ↔ camelCase JS via `keysToCamelCase`
  (`api/src/utils/propertyMapper.js`); explicit aliasing for ambiguous join columns
  (`projectCode` vs `deliverableCode`, `projectId` vs `taskId`).
- Table names UPPER_CASE; columns snake_case; pgEnum for fixed system enums; varchar
  for user-definable values.
- Sparse numbering for task positions.
- Drizzle `eq()`, `and()`, `or()` query composition; `.returning()` for
  insert/update.
- Pre-v1 vs v1 migration workflow (`db:reset` / `db:push` / `db:seed` today;
  migrations at v1).

## Related standards

- [data-architecture.md](./data-architecture.md) — currently authoritative for schema
  shape, naming, and the DB seam.
- [system-architecture.md](./system-architecture.md) — layers and the
  `databaseService`/`tokenService` services.
- [http-layer.md](./http-layer.md) — the routes that consume `databaseService`.
- [testing.md](./testing.md) — real test DB, no mocking.

## Drafting this standard

Run the `standard-builder` skill against `api/src/services/databaseService.js` and
`api/lib/db/schema.js` to extract observed patterns, then move the data-access rules
currently in `data-architecture.md` here where they belong and leave cross-links.
