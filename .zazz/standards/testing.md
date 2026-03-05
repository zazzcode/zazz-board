# Testing

## Frameworks

- **Vitest**: Test runner (ESM-native, Jest-compatible API) for PactumJS integration tests
- **PactumJS**: API integration testing; chainable fluent DSL; tests start Fastify on 3031, Pactum makes real HTTP via `pactum.request.setBaseUrl()`
- **Location**: `api/__tests__/`; DB `zazz_board_test` (port 5433); API on 3031

## Database: real test DB, no mocking

- Real PostgreSQL (`zazz_board_test`); no DB mocking; same Drizzle/databaseService path as production
- Seeded data: users, projects, tags, status definitions
- `beforeEach` clears task-related tables for isolation
- Future: S3/image retrieval could be mocked if we add tests for that path

## Why PactumJS

- **Fluent chainable DSL** — Build requests and assert in one chain (`.get()`, `.withHeaders()`, `.expectStatus()`, `.expectJsonLike()`)
- **Real HTTP** — Actual Fastify server; no mocks; full request/response cycle
- **Lightweight** — Minimal setup, fast execution
- **Partial matching** — `.expectJsonLike()` ignores extra fields; use `.expectJson()` only when exact match needed

## Priority

- End behavior is what matters; API coverage required, unit tests optional

## TDD standards

- Write PactumJS tests for new routes before or alongside implementation; don't merge route changes without tests
- When fixing a bug, add a test that reproduces it first; fix the bug; confirm the test passes
- Tests must not depend on each other; each test must be runnable in isolation
- `it()` strings should describe behavior and expected outcome (e.g. `'should return 404 when deliverable does not exist'`), not implementation
- Tests run in CI on every PR; PRs must pass before merge

## Standard: every route needs PactumJS API tests

For each route, add a PactumJS test file covering:

1. **Happy path** — Valid request succeeds; response shape and status correct
2. **Edge cases** — Boundary conditions, empty results, optional fields
3. **Negative testing** — Auth failures (401), validation errors (400), not found (404), forbidden (403)

- Example: `PUT /projects/:code/deliverables/:id` → success, missing auth, invalid project code, deliverable not found, invalid payload
- Example: Update with nonexistent ID (e.g. `PUT .../deliverables/99999`) → expect 404

## Patterns

- `beforeEach` calls `clearTaskData()` — deletes TASK_RELATIONS, TASK_TAGS, TASKS, DELIVERABLES; ensures isolation
- **OpenAPI spec tests** (`openapi.test.mjs`) — Validates the generated spec is valid OpenAPI 3.x and documents core agent routes (create deliverable, create task). Run with the full test suite.
- Create test data via `createTestDeliverable()`, `createTestTask()`; tasks require `deliverableId`
- Tests use port 3031; API base URL from env
- Token: `550e8400-e29b-41d4-a716-446655440000` (seeded user)
- Use `.expectJsonLike()` for partial matches; `.expectJson()` for exact matches

## Commands

```bash
cd api && set -a && source .env && set +a && NODE_ENV=test npm run test
```

## Reference

Full setup, helpers, and PactumJS usage: [api/__tests__/README.md](../../api/__tests__/README.md)
