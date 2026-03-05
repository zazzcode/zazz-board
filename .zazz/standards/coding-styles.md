# Coding Styles

- Prettier for formatting
- ESLint for linting
- Consistent naming: camelCase for JS, snake_case for DB columns

## File organization: avoid large files spanning multiple areas of functionality

**Why**: Agents lock files when editing. Splitting by domain or responsibility enables parallel work—multiple agents can edit different files without blocking each other.

**How**: Keep files focused. Avoid large files that encompass many routes, functions, or areas of functionality. Split by domain or responsibility so work stays scoped. Applied to: `api/src/schemas/` (one file per domain), `api/src/routes/` (one file per domain).

## API validation (separate from business logic)

**Schema validation** (request shape, types, patterns) runs **before** the route handler via Fastify + AJV. It validates `params`, `body`, `querystring` against JSON Schema. Invalid requests return 400 without reaching the handler.

**Business logic validation** (e.g. "resource belongs to project", "deliverable must be approved before creating tasks") lives **in the route handler**. It uses `databaseService` to resolve resources and returns 403/404 when authorization or existence checks fail.

- **Do not** put business rules in schema (e.g. "task must belong to project") — schemas describe structure, not cross-resource relationships.
- **Do** use schema for: required fields, types, patterns (e.g. `^\\d+$` for numeric ids), enums, min/max length.
- **Prefer schema** over handler checks for request validation; avoid redundant validation in handlers when schema already covers it.

### Schema organization (`api/src/schemas/`)

Schemas are split into **separate domain files** per the file organization principle above.

- **common.js** — Shared params (`idParam`, `codeParam`, `taskIdParam`), response shapes (`deliverableResponseSchema`, `taskResponseSchema`), patterns (`tagNamePattern`)
- **Domain files** — One per domain: `deliverables.js`, `projects.js`, `tasks.js`, `taskGraph.js`, `tags.js`, `users.js`, `images.js`, `core.js`
- **Each route schema** — `params` (property names must match route param names, e.g. `:projectCode` → `projectCode`), `body` (if applicable), `querystring` (optional filters), `response` (status code → schema)
- **Body schemas** — Use `additionalProperties: false` to reject unknown fields (see deliverables, projects, tags)
- **Import** — Routes use `import { deliverableSchemas } from '../schemas/validation.js'` (barrel re-exports from `index.js`)

New routes: add schema to the appropriate domain file; compose from `common.js` when possible. The OpenAPI spec is generated from these schemas; `api/__tests__/routes/openapi.test.mjs` validates spec correctness.

### Project-scoped handler pattern

For routes under `/projects/:code/...` that operate on project-owned resources (deliverables, tasks, relations):

1. `const project = await dbService.getProjectByCode(code)`; if `!project` → 404
2. Resolve the resource (e.g. `getDeliverableById`, `getTaskById`)
3. Verify `resource.projectId === project.id`; if not → 404 (or 403 for cross-project access)
4. Proceed with operation

See `deliverables.js`, `taskGraph.js`, `projects.js` for examples.

### Business error mapping

Map service/database errors to appropriate HTTP codes in the handler: business rule violations (cycle, self-ref, not found) → 400; duplicate/conflict → 409; authorization failure → 403. See `taskGraph.js` createTaskRelation for error-mapping pattern.

## UPPER_SNAKE_CASE for status codes and enum-like values

Status codes, priorities, and other enum-like values use **UPPER_SNAKE_CASE** (e.g. `TO_DO`, `IN_PROGRESS`, `QA`, `COMPLETED`, `LOW`, `MEDIUM`, `FEATURE`, `BUG_FIX`). These values are stored in the DB, used in the API, and double as i18n translation keys.

## i18n (translatable items)

- Use the `useTranslation` hook (`client/src/hooks/useTranslation.js`): `translateStatus`, `translateDeliverableStatus`, `translatePriority`, `translateDeliverableType`
- Translation keys follow `{domain}.{category}.{CODE}`: `tasks.statuses.TO_DO`, `deliverables.statuses.IN_PROGRESS`, `tasks.priorities.HIGH`, `deliverables.types.FEATURE`
- Fallback: if a key is missing, the raw code is shown (e.g. `t(\`tasks.statuses.${status}\`, status)`)
- Locale files: `client/src/i18n/locales/*.json`; API `TRANSLATIONS` table stores JSON per language
