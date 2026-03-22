# ZAZZ-7 Worker File Locking PLAN

SPEC Reference: `.zazz/deliverables/ZAZZ-7-worker-file-locking-SPEC.md`  
Status: Execution Plan  
Date: 2026-03-07

## 1) Implementation Strategy

Deliver Phase 1 end-to-end in this order:

1. DB schema + service layer
2. API route plugin + validation/OpenAPI schemas
3. Tests
4. Worker skill updates

## 2) Phase Breakdown

### Phase 1.1 — Data Model

Objective: Add `FILE_LOCKS` table to the Drizzle schema.

Changes:

- `api/lib/db/schema.js`
  - add `FILE_LOCKS` with:
    - `id` serial PK
    - `project_id` FK -> `PROJECTS.id`
    - `deliverable_id` FK -> `DELIVERABLES.id`
    - `task_id` FK -> `TASKS.id`
    - `phase_step` varchar(20) nullable
    - `agent_name` varchar(100) not null
    - `file_path` varchar(1000) not null
    - `acquired_at`, `heartbeat_at`, `lease_expires_at`
    - `created_by`, `updated_by`, `updated_at`
  - unique constraint `(deliverable_id, file_path)`
  - indexes for `(deliverable_id, lease_expires_at)` and `(task_id)`

Acceptance:

- Table is generated via `drizzle-kit push --force`.

### Phase 1.2 — Database Service Lock Operations

Objective: Implement lock lease operations in `DatabaseService`.

Changes:

- `api/src/services/databaseService.js`
  - add methods:
    - `listActiveFileLocks({ projectId, deliverableId })`
    - `acquireFileLocks({ projectId, deliverableId, taskId, phaseStep, agentName, filePaths, ttlSeconds, userId })`
    - `heartbeatFileLocks({ projectId, deliverableId, taskId, agentName, filePaths, ttlSeconds, userId })`
    - `releaseFileLocks({ projectId, deliverableId, taskId, agentName, filePaths })`
    - internal expiry reclaim helper used by all methods

Behavior rules:

- reclaim expired rows (`lease_expires_at <= now`) at start of operations
- acquire is atomic per request
- conflict detection ignores locks owned by same `(taskId, agentName)`

Acceptance:

- Methods return deterministic payloads for success/conflict.

### Phase 1.3 — Routes + OpenAPI

Objective: Add project+deliverable lock endpoints.

Changes:

- `api/src/routes/fileLocks.js` (new)
  - `GET /projects/:code/deliverables/:delivId/locks`
  - `POST /projects/:code/deliverables/:delivId/locks/acquire`
  - `POST /projects/:code/deliverables/:delivId/locks/heartbeat`
  - `POST /projects/:code/deliverables/:delivId/locks/release`
- `api/src/routes/index.js`
  - register `fileLocksRoutes`
- `api/src/schemas/fileLocks.js` (new)
  - request/response schemas with summaries and descriptions
- `api/src/schemas/index.js` + `api/src/schemas/validation.js`
  - export `fileLockSchemas`

Acceptance:

- OpenAPI contains all 4 routes with request/response shapes.

### Phase 1.4 — Tests

Objective: Validate lock lifecycle and conflict behavior.

Changes:

- `api/__tests__/routes/file-locks.test.mjs` (new)
  - auth required
  - acquire success
  - conflict (`409 FILE_LOCK_CONFLICT`)
  - release then acquire succeeds for other task
  - expiry reclaim (short TTL)
- `api/__tests__/helpers/testDatabase.js`
  - clear `FILE_LOCKS` in `clearTaskData`
- `api/__tests__/routes/openapi.test.mjs`
  - assert lock routes are documented

Acceptance:

- Targeted route tests pass.

### Phase 1.5 — Worker Skill Update

Objective: Align worker behavior with lock API.

Changes:

- `.agents/skills/worker/SKILL.md`
  - before `READY -> IN_PROGRESS`, worker must acquire file locks via API
  - on conflict, set `isBlocked=true` and `blockedReason='FILE_LOCK'` (not workflow status)
  - poll every 3 seconds and retry acquire
  - on acquire success, clear block flags and continue execution

Acceptance:

- Skill text explicitly defines lock API workflow and polling interval.

## 3) Verification Commands

```bash
cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- __tests__/routes/file-locks.test.mjs __tests__/routes/openapi.test.mjs
```

## 4) Post-Phase-1 Follow-up (Not in this execution)

1. Add Redis cache for lock read throughput.
2. Add pub/sub + SSE push notifications for lock release events.
3. Keep PostgreSQL as canonical lock state.
