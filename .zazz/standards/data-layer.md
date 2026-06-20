---
last_updated_at: 2026-06-19
status: active
---

# Data layer (Drizzle + PostgreSQL)

## Scope

This standard governs the data access layer: the `databaseService` DB seam, Drizzle
query composition, the schema in `api/lib/db/schema.js`, and the snake_case to
camelCase field mapping.

## Schema source of truth

Database shape MUST come from `api/lib/db/schema.js`. Services, route schemas, shared
JSDoc typedefs, and tests MUST derive field names and enum-like values from that schema
and the existing mapper boundary, not from a parallel hand-written model
([data-architecture.md](./data-architecture.md#design-philosophy-schema-first)).

Schema changes MUST follow the current pre-v1 workflow in
[data-architecture.md](./data-architecture.md#development-workflow-pre-v1-vs-v1). Schema
changes MUST NOT add migration files or generated schema artifacts until the project
switches to the v1 migration workflow.

## Database access boundary

Runtime DB access MUST go through `api/src/services/databaseService.js`. Fastify route
modules, middleware, and other services MUST NOT import the Drizzle `db` instance or table
objects directly unless a dedicated standard or approved design introduces a narrower
exception ([system-architecture.md](./system-architecture.md#patterns)).

### Desired ✅

```javascript
const project = await dbService.getProjectByCode(code);
```

## Query composition

Drizzle queries MUST use schema imports from `api/lib/db/schema.js` and Drizzle helpers
such as `eq`, `and`, `or`, `like`, `inArray`, `asc`, and `sql` where they make the query
contract explicit (`api/src/services/databaseService.js`). Query filters SHOULD be built
from small condition arrays when optional filters are present.

Insert, update, and delete methods that return changed rows MUST use `.returning()` and
MUST normalize not-found outcomes to `null` when the service contract returns a nullable
single entity. Multi-step writes that allocate sequence numbers, validate related rows, or
update multiple tables SHOULD run in a Drizzle transaction.

## Field mapping and aliases

Database columns MUST remain snake_case and JavaScript objects MUST expose camelCase
fields. Select maps SHOULD alias DB columns directly to camelCase when shaping service
results. Mapper utilities in `api/src/utils/propertyMapper.js` MAY convert plain nested
objects and arrays at the DB/API boundary, but they MUST NOT be treated as semantic
disambiguation.

Join projections MUST alias ambiguous fields with table-scoped names. Use `projectCode`,
`deliverableCode`, `projectId`, `deliverableId`, `taskId`, and similar explicit names
when more than one table contributes the same semantic column
([data-architecture.md](./data-architecture.md#conventions)).

### Desired ✅

```javascript
db.select({
  projectId: PROJECTS.id,
  projectCode: PROJECTS.code,
  deliverableId: DELIVERABLES.id,
  deliverableCode: DELIVERABLES.code,
});
```

## Domain values and ordering

Fixed system enums MUST use PostgreSQL `pgEnum`; user-definable values MUST use `varchar`
([data-architecture.md](./data-architecture.md#conventions)). Status codes, priorities,
deliverable types, coordination types, and other enum-like values MUST be UPPER_SNAKE_CASE
because the DB, API, and i18n keys share the same codes
([coding-styles.md](./coding-styles.md#upper_snake_case-for-status-codes-and-enum-like-values)).

Task and deliverable ordering SHOULD preserve sparse numeric positions. Reordering logic
MUST update positions without requiring every row in the project to be renumbered unless
the existing gaps are exhausted.

## Review evidence

PRs that change data access MUST include the relevant API test evidence from
[testing.md](./testing.md#commands). Schema or mapper changes MUST include evidence that
camelCase API responses, explicit join aliases, and not-found/null service contracts still
match existing callers.

## Halt conditions

Agents MUST stop and ask for direction when a data-layer change requires direct DB access
from a route, changes API response shape only to satisfy a type annotation, introduces
generated schema artifacts, or requires a broad query refactor unrelated to the task.

## Related standards

- [data-architecture.md](./data-architecture.md) - schema shape, naming, and the DB seam.
- [service-layer.md](./service-layer.md) - service contracts consumed by routes and
  middleware.
- [jsdoc-typing.md](./jsdoc-typing.md) - typedefs and check-only type gates for data
  contracts.
- [http-layer.md](./http-layer.md) - the routes that consume `databaseService`.
- [testing.md](./testing.md) - real test DB and API verification.
