# Data Architecture

## Design philosophy: schema-first

**Schema-first** means the database schema is the source of truth and is defined before implementation. The schema defines the data contract; services, routes, and client code are built against it. We do not infer schema from code or evolve it ad hoc.

- Schema lives in `api/lib/db/schema.js` (Drizzle)
- All DB access goes through `databaseService`; routes never touch the DB directly
- New features: define or extend schema first, then implement services and routes

## Technology

- **Engine**: PostgreSQL 15
- **ORM**: Drizzle
- **Schema location**: `api/lib/db/schema.js` (single source of truth)

## Development workflow: pre-v1 vs v1

**Pre-v1** (current): We push the schema directly. No migration files. Schema changes are frequent; reset is the primary way to apply them.

- `npm run db:reset` — drop tables, push schema, seed (destructive)
- `npm run db:push` — push schema changes without dropping (preserves data)
- `npm run db:seed` — seed only (tables must exist)

**At v1**: We will switch to migrations for production upgrades. Migration files will be generated from schema changes and run in order. `db:reset` will remain for local dev; production will use `db:migrate`.

## Conventions

- **Table names**: UPPER_CASE (e.g. `PROJECTS`, `TASKS`)
- **Columns**: snake_case in DB, camelCase in JS
- **Automatic conversion**: `databaseService` converts returned rows via `keysToCamelCase` (`api/src/utils/propertyMapper.js`); the API and client always receive camelCase
- **Ambiguous field naming**: `keysToCamelCase` only converts shape (snake_case -> camelCase). It does not disambiguate duplicate semantic fields from joins. When multiple tables expose the same column name (for example `PROJECTS.code` and `DELIVERABLES.code`), queries/routes must alias explicitly in SQL/Drizzle select maps.
  - Use table-scoped camelCase aliases for ambiguity: `projectCode` for `PROJECTS.code`, `deliverableCode` for `DELIVERABLES.code`.
  - Apply the same rule to duplicate `id` columns from joins: use `projectId`, `deliverableId`, `taskId`, etc. Keep plain `id` only for the primary resource id in that contract.
  - Apply the same rule for route params/bodies/responses when both values are present in one API contract.
- **Task positions**: sparse numbering (e.g. 10, 20) for reordering
- **System enums**: PostgreSQL `pgEnum` for fixed values (e.g. `task_relation_type`, `deliverable_type`); user-definable values use `varchar`
- **UPPER_SNAKE_CASE codes**: Status codes, priorities, and enum-like values use UPPER_SNAKE_CASE. Used in: `STATUS_DEFINITIONS.code`, `TASKS.status`, `PROJECTS.status_workflow` / `deliverable_status_workflow`, `DELIVERABLES.status` / `deliverable_type`, `COORDINATION_TYPES.code`. These codes also serve as i18n keys (see [coding-styles.md](./coding-styles.md)).

## DDL guidelines

Schema DDL lives in `api/lib/db/schema.js` and MUST remain the source of truth for table shape. Pre-v1 schema changes SHOULD update the Drizzle schema and seed/reset behavior together; do not add migration files until the project switches to the v1 migration workflow.

### Column order

Table columns SHOULD be grouped by purpose so schema diffs and database inspection are easy to review. New tables and schema changes SHOULD use this order:

1. Primary key or row identity columns, such as `id` or a composite key's identifying columns.
2. Scope and ownership foreign keys that define where the row belongs, such as `project_id`, `deliverable_id`, `milestone_id`, or `user_id`.
3. Natural identifiers and display fields, such as `code`, `project_code`, `name`, and `title`.
4. Core descriptive fields for the row.
5. Feature-specific column groups, kept together by domain concept. Examples include status/history, approval metadata, Git/PR metadata, ordering, planning/Gantt dates, state flags, file lease fields, and image storage fields.
6. Audit columns, always last.

Not every foreign key belongs at the top. Foreign keys that are part of a feature group SHOULD stay with that group. For example, `approved_by` belongs with approval fields, while `created_by` and `updated_by` belong in the final audit group.

Tables that include the standard audit fields MUST define them as the final columns in this exact order: `created_by`, `created_at`, `updated_by`, `updated_at`. Tables with only a subset of these fields SHOULD preserve the same relative order for the audit fields they include.

### Nullability and defaults

Columns that represent required workflow state or binary flags MUST be `NOT NULL` and SHOULD define a durable default when a sensible system default exists. This includes status columns, status history structures, boolean flags, ordering positions, workflow arrays, and feature settings where `NULL` would create an ambiguous third state.

Boolean columns SHOULD almost always be `NOT NULL` with an explicit default, because nullable booleans force callers to distinguish `false` from unknown. Use nullable booleans only when the domain intentionally has a third "unknown/not recorded" state, and document that meaning near the column definition.

Status-like columns MUST be `NOT NULL` when every row is expected to participate in a lifecycle. Use the appropriate default for new rows, such as `READY` for tasks or `PLANNING` for planning entities.

Nullable columns are appropriate for optional relationships or optional facts, such as `completion_criteria_status`, `approved_at`, `actual_completion_at`, or `blocked_reason`.

## Key tables

- `PROJECTS` — `id` (serial PK), `code`, `deliverable_status_workflow`, `status_workflow`, `next_deliverable_sequence`
- `DELIVERABLES` — `id` (serial PK), `code` (varchar, e.g. ZAZZ-1), `spec_filepath`, `plan_filepath`, `status_history`
- `TASKS` — `id` (serial PK), `deliverable_id` FK; no separate `task_id` varchar
- `TASK_RELATIONS` — `DEPENDS_ON`, `COORDINATES_WITH`
- `USERS`, `TAGS`, `STATUS_DEFINITIONS`, `COORDINATION_TYPES`, `TRANSLATIONS`, `IMAGE_METADATA`, `IMAGE_DATA`

Full schema: [api/lib/db/schema.js](../../api/lib/db/schema.js) (from repo root)
