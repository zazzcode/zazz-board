# Database

- **Engine**: PostgreSQL 15
- **ORM**: Drizzle
- **Schema**: `api/lib/db/schema.js` (single source of truth)
- **Reset**: `npm run db:reset` (from `api/`) drops and recreates from schema, then seeds

## Key tables

- `PROJECTS` — `deliverable_status_workflow`, `status_workflow`, `next_deliverable_sequence`
- `DELIVERABLES` — `deliverable_id` (e.g. ZAZZ-1), `ded_file_path`, `plan_file_path`, `status_history`
- `TASKS` — `deliverable_id` FK, integer `id` only (no task_id varchar)
