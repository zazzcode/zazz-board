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
- **Task positions**: sparse numbering (e.g. 10, 20) for reordering
- **System enums**: PostgreSQL `pgEnum` for fixed values (e.g. `task_relation_type`, `deliverable_type`); user-definable values use `varchar`
- **UPPER_SNAKE_CASE codes**: Status codes, priorities, and enum-like values use UPPER_SNAKE_CASE. Used in: `STATUS_DEFINITIONS.code`, `TASKS.status`, `PROJECTS.status_workflow` / `deliverable_status_workflow`, `DELIVERABLES.status` / `deliverable_type`, `COORDINATION_TYPES.code`. These codes also serve as i18n keys (see [coding-styles.md](./coding-styles.md)).

## Key tables

- `PROJECTS` — `id` (serial PK), `code`, `deliverable_status_workflow`, `status_workflow`, `next_deliverable_sequence`
- `DELIVERABLES` — `id` (serial PK), `deliverable_id` (varchar, e.g. ZAZZ-1), `ded_file_path`, `plan_file_path`, `prd_file_path`, `status_history`
- `TASKS` — `id` (serial PK), `deliverable_id` FK; no separate `task_id` varchar
- `TASK_RELATIONS` — `DEPENDS_ON`, `COORDINATES_WITH`
- `USERS`, `TAGS`, `STATUS_DEFINITIONS`, `COORDINATION_TYPES`, `TRANSLATIONS`, `IMAGE_METADATA`, `IMAGE_DATA`

Full schema: [api/lib/db/schema.js](../../api/lib/db/schema.js) (from repo root)
