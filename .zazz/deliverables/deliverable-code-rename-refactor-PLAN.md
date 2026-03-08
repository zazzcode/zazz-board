# Deliverable `deliverable_code` -> `code` Refactor Plan

## Objective
Hard-cut rename of the deliverable identifier field across the full application stack:
- Database column: `DELIVERABLES.deliverable_code` -> `DELIVERABLES.code`
- API contract field: `deliverableCode` -> `code`
- Seed snapshot keys aligned to `code`
- OpenAPI/Swagger docs updated to only expose `code`
- Client updated to consume only `code`

No migration files. Apply via schema change + database reset/reseed.

## Scope
- DB schema (Drizzle)
- API service layer and route response payloads
- Seed scripts and seed snapshot JSON
- OpenAPI schema definitions and route descriptions
- API tests + OpenAPI tests
- Client deliverable list/card rendering and sorting

## Out of Scope
- Backward compatibility for `deliverableCode` (explicitly not allowed)
- Data migration for existing DB rows

## Implementation Steps

1. Schema-first rename
- File: `api/lib/db/schema.js`
- Rename `deliverable_code` column definition to `code` on `DELIVERABLES`.
- Keep all existing constraints (not null + unique).

2. Service layer hard-cut
- File: `api/src/services/databaseService.js`
- Replace all `DELIVERABLES.deliverable_code` references with `DELIVERABLES.code`.
- Rename returned API response field from `deliverableCode` to `code`.
- In create flow, persist `code` instead of `deliverable_code`.

3. OpenAPI contract updates
- Files:
  - `api/src/schemas/common.js`
  - `api/src/schemas/deliverables.js`
  - `api/src/schemas/projects.js`
- Replace response property `deliverableCode` with `code`.
- Update route descriptions to mention `code` only.

4. Seed pipeline updates
- Files:
  - `api/scripts/seeders/seedDeliverables.js`
  - `api/scripts/seeders/seedTasks.js`
  - `api/scripts/seeders/seedTaskTags.js`
  - `api/scripts/seeders/seedTaskRelations.js`
  - `api/scripts/seeders/data/zazz-project-snapshot.json`
- Rename seed JSON keys:
  - `deliverable_code` -> `code`
  - `from_deliverable_code` -> `from_code`
  - `to_deliverable_code` -> `to_code`
- Update lookup/join logic in seeders to use renamed keys.

5. Test suite updates
- Files:
  - `api/__tests__/helpers/testDatabase.js`
  - `api/__tests__/routes/deliverables.test.mjs`
  - `api/__tests__/routes/openapi.test.mjs`
- Replace all deliverable field assertions from `deliverableCode` to `code`.
- Ensure helper inserts use `code` column.

6. Client updates
- Files:
  - `client/src/components/DeliverableCard.jsx`
  - `client/src/pages/DeliverableListPage.jsx`
- Replace `deliverable.deliverableCode` with `deliverable.code`.
- Replace sort key from `deliverableCode` to `code`.

7. Optional standards doc alignment
- File: `.zazz/standards/data-architecture.md`
- Align key-table description to current `DELIVERABLES.code` naming.

## Verification Plan

1. Static grep gates
- `rg -n "deliverable_code|deliverableCode" api client`
- Expect no runtime references after refactor.

2. Recreate dev DB (schema push + full seed)
- `npm run db:reset`

3. Recreate test DB and reseed
- Ensure `zazz_board_test` exists
- `cd api && DATABASE_URL=postgres://postgres:password@localhost:5433/zazz_board_test npm run db:reset`

4. Thorough API test run (includes OpenAPI validation tests)
- `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test`

5. Focused OpenAPI test confirmation
- `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- __tests__/routes/openapi.test.mjs`

## Acceptance Criteria
- `DELIVERABLES` schema column is `code` (no `deliverable_code`)
- Deliverable API payloads expose `code` and do not expose `deliverableCode`
- Seed scripts and snapshot complete successfully using new key names
- Client deliverable UI renders/sorts by `code`
- API and OpenAPI tests pass after DB reset/reseed
- No backward compatibility layer remains for `deliverableCode`
