---
last_updated_at: 2026-06-19
status: placeholder
---

# HTTP layer (Fastify)

> **Status: placeholder stub — to be expanded.**
> This is an analogous standard for the Node.js / Fastify stack, created as a
> placeholder so the standards index structure exists. It should be expanded into a
> real baseline by inspecting `api/src/routes/` and `api/src/schemas/` via the
> `standard-builder` skill. Until then, the Fastify-relevant rules already captured in
> [coding-styles.md](./coding-styles.md) take precedence.

## Scope

This standard governs the Fastify HTTP layer under `api/src/routes/`: route file
layout, endpoint naming, plugin registration, JSON Schema validation wiring, and the
boundary between schema validation and business logic.

## Intended coverage (to be drafted from the codebase)

- Route file organization: one file per domain under `api/src/routes/` (see
  [coding-styles.md §File organization](./coding-styles.md)).
- Plugin-based route registration and shared `dbService` instance.
- JSON Schema validation via Fastify + AJV: `params`, `body`, `querystring`,
  `response` schemas; `additionalProperties: false` for bodies.
- Schema validation (request shape) runs before the handler; business-logic validation
  lives in the handler (see
  [coding-styles.md §API validation](./coding-styles.md#api-validation-separate-from-business-logic)).
- The project-scoped handler pattern for `/projects/:code/...` routes (see
  [coding-styles.md §Project-scoped handler pattern](./coding-styles.md#project-scoped-handler-pattern)).
- Business error mapping to HTTP codes (see
  [coding-styles.md §Business error mapping](./coding-styles.md#business-error-mapping)).
- Auth middleware: `TB_TOKEN` or `Authorization: Bearer` validation; `request.user`
  context.
- Correlation IDs and Pino logging.
- OpenAPI 3.1 generation from route schemas; `/openapi.json` and `/docs`.

## Related standards

- [coding-styles.md](./coding-styles.md) — currently authoritative for API validation,
  schema organization, handler patterns, and error mapping.
- [system-architecture.md](./system-architecture.md) — stack and layer overview.
- [data-layer.md](./data-layer.md) — the `databaseService` seam routes use.
- [testing.md](./testing.md) — PactumJS API test requirements for every route.

## Drafting this standard

Run the `standard-builder` skill against `api/src/routes/` and `api/src/schemas/` to
extract observed patterns into Desired/Not-desired examples with citations, then move
the Fastify-specific rules currently in `coding-styles.md` here and leave cross-links.
