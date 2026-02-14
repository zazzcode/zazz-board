# Task Graph MVP — Implementation Plan

## 1. Problem Statement
Task Blaster currently manages tasks via a flat Kanban board. There is no way to express or visualize dependencies between tasks, parallel execution paths, coordination requirements (e.g., "these 3 PRs must merge together"), or synchronization points. This feature adds task relations (DEPENDS_ON, COORDINATES_WITH) to the data model, exposes them through the REST API, and renders an interactive left-to-right graph view alongside the existing Kanban board.

**PRD Reference**: `/Users/michael/Dev/task-blaster/docs/task-graphs-PRD.md`

## 2. Current State Summary
### Database (Drizzle ORM — pure JavaScript, no TypeScript)
- Schema: `api/lib/db/schema.js` — Drizzle `pgTable` definitions
- Tables: `USERS`, `PROJECTS`, `TASKS`, `TAGS`, `TASK_TAGS`, `STATUS_DEFINITIONS`, `TRANSLATIONS`, `IMAGE_METADATA`, `IMAGE_DATA`
- `TASK_TAGS` junction table uses **no integer PK** (just `task_id` + `tag` columns) — we follow this pattern for `TASK_RELATIONS`
- All DB operations go through `api/src/services/databaseService.js` (class with explicit snake_case → camelCase aliasing)
- Schema push via `drizzle-kit push` (`npm run db:push`) — no incremental migrations for this branch
- Reset script: `api/scripts/reset-and-seed.js` — drops all tables, pushes schema, seeds

### API (Fastify — JavaScript ES modules)
- Route files: `api/src/routes/{tasks,projects,tags,users,images,statusDefinitions,translations}.js`
- Route index: `api/src/routes/index.js` — creates `DatabaseService` instance, passes as `{ dbService }` option
- Auth: `authMiddleware` on all protected routes; validates `TB_TOKEN` header via `tokenService`
- Validation: Fastify built-in JSON Schema (AJV) in `api/src/schemas/validation.js`

### Client (React — JavaScript, Vite)
- UI library: Mantine v8 (`@mantine/core`, `@mantine/hooks`, `@mantine/modals`)
- Drag-and-drop: `@dnd-kit/core`, `@dnd-kit/sortable`
- Routing: `react-router-dom` v7 — `<Route path="/projects/:projectCode/kanban">`
- Hooks: `useTasks`, `useDragAndDrop`, `useTaskActions`, `useModalManager`, etc.
- Pages: `HomePage.jsx` (project list), `KanbanPage.jsx` (board)
- Kanban: `KanbanBoard.jsx`, `KanbanColumn.jsx`, `TaskCard.jsx`, `TaskDetailModal.jsx`

### Tests (Vitest + PactumJS)
- Config: `api/vitest.config.mjs` — setup file `__tests__/setup.pactum.mjs`
- Setup: starts real Fastify server on port 3031 against `task_blaster_test` database
- Test DB helpers: `__tests__/helpers/testDatabase.js` — `validateTestEnvironment()`, `clearTaskData()`, `createTestTask()`
- Test files: `__tests__/routes/*.test.mjs` — PactumJS `spec()` style
- Safety: multi-layer validation that `NODE_ENV=test` and `DATABASE_URL_TEST` points to `task_blaster_test`

### Development Database (Docker Desktop)
- Container: `task_blaster_postgres` (PostgreSQL 15)
- Host port: **5433** (maps to container port 5432)
- Dev database: `task_blaster_dev` — `DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_dev`
- Test database: `task_blaster_test` — `DATABASE_URL_TEST=postgres://postgres:password@localhost:5433/task_blaster_test`
- Reset workflow: `npm run db:reset` (in `api/`) — drops all tables, pushes schema, seeds

---

## 3. Database Changes

### 3.1 New Table: `COORDINATION_REQUIREMENT_DEFINITIONS`
Reference table for coordination types. Uses `code` as natural PK (same pattern as `STATUS_DEFINITIONS`).

```javascript
// api/lib/db/schema.js
export const COORDINATION_REQUIREMENT_DEFINITIONS = pgTable('COORDINATION_REQUIREMENT_DEFINITIONS', {
  code: varchar('code', { length: 25 }).primaryKey().notNull(),
  description: varchar('description', { length: 200 }),
  created_by: integer('created_by').references(() => USERS.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_by: integer('updated_by').references(() => USERS.id, { onDelete: 'set null' }),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

### 3.2 New PostgreSQL ENUMs
These are the first `pgEnum` definitions in the schema, establishing the pattern: **system-controlled keywords → ENUM; user-definable values → varchar**.

```javascript
import { pgEnum } from 'drizzle-orm/pg-core';

// Enum for task relation types
export const taskRelationTypeEnum = pgEnum('task_relation_type', ['DEPENDS_ON', 'COORDINATES_WITH']);

// Enum for graph layout direction
export const graphLayoutDirectionEnum = pgEnum('graph_layout_direction', ['LR', 'TB']);
```

### 3.3 New Columns on `PROJECTS`
```javascript
// Add to existing PROJECTS pgTable definition
completion_criteria_status: varchar('completion_criteria_status', { length: 25 })
  .references(() => STATUS_DEFINITIONS.code, { onDelete: 'set null' }),
task_graph_layout_direction: graphLayoutDirectionEnum('task_graph_layout_direction').default('LR'),
```
- `completion_criteria_status` — nullable; defaults to `null` meaning "DONE" semantics. **FK to `STATUS_DEFINITIONS.code`** ensures the value is a valid status code at the DB level. Additional API-level validation checks that it also exists in the project's `status_workflow` array.
- `task_graph_layout_direction` — PostgreSQL ENUM (`'LR'` or `'TB'`). Default `'LR'` for MVP. DB-level enforcement via enum type.

### 3.4 New Column on `TASKS`
```javascript
// Add to existing TASKS pgTable definition
coordination_code: varchar('coordination_code', { length: 25 })
  .references(() => COORDINATION_REQUIREMENT_DEFINITIONS.code, { onDelete: 'set null' }),
```

### 3.5 New Table: `TASK_RELATIONS`
**Composite primary key** — consistent with the `TASK_TAGS` pattern (no surrogate integer PK). The unique constraint from the PRD becomes the composite PK itself.

```javascript
export const TASK_RELATIONS = pgTable('TASK_RELATIONS', {
  task_id: integer('task_id').notNull().references(() => TASKS.id, { onDelete: 'cascade' }),
  related_task_id: integer('related_task_id').notNull().references(() => TASKS.id, { onDelete: 'cascade' }),
  relation_type: taskRelationTypeEnum('relation_type').notNull(), // PostgreSQL ENUM: 'DEPENDS_ON' or 'COORDINATES_WITH'
  updated_by: integer('updated_by').references(() => USERS.id, { onDelete: 'set null' }),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.task_id, table.related_task_id, table.relation_type] }),
]);
```

**Indexes** (created via Drizzle `index()` or raw SQL in push):
- `idx_task_relations_task_id` on `(task_id)` — primary read pattern
- `idx_task_relations_related_task_id` on `(related_task_id)` — reverse lookups
- The composite PK already covers `(task_id, related_task_id, relation_type)`

**Constraints**:
- `relation_type` — enforced by PostgreSQL ENUM type (only `'DEPENDS_ON'` or `'COORDINATES_WITH'` allowed)
- `task_id != related_task_id` — enforced at API level (no self-relations)
- Both tasks must belong to the same project — enforced at API level
- No circular dependencies (for DEPENDS_ON) — enforced at API level

**Storage rules**:
- `DEPENDS_ON` is directional: one row `(task_id=5, related_task_id=3, 'DEPENDS_ON')` means task 5 depends on task 3
- `COORDINATES_WITH` is symmetric: store both directions `(A,B)` and `(B,A)` so either task sees the relation

### 3.6 Drizzle Relations
```javascript
export const taskRelationsRelations = relations(TASK_RELATIONS, ({ one }) => ({
  task: one(TASKS, {
    fields: [TASK_RELATIONS.task_id],
    references: [TASKS.id],
    relationName: 'taskRelations',
  }),
  relatedTask: one(TASKS, {
    fields: [TASK_RELATIONS.related_task_id],
    references: [TASKS.id],
    relationName: 'relatedTaskRelations',
  }),
}));
```
Update existing `tasksRelations` to include:
```javascript
relations: many(TASK_RELATIONS, { relationName: 'taskRelations' }),
relatedRelations: many(TASK_RELATIONS, { relationName: 'relatedTaskRelations' }),
```

### 3.7 Update `reset-and-seed.js`
Add `DROP TABLE IF EXISTS "TASK_RELATIONS" CASCADE` and `DROP TABLE IF EXISTS "COORDINATION_REQUIREMENT_DEFINITIONS" CASCADE` **before** the TASKS drop (dependency order).
Also drop the enum types after dropping tables: `DROP TYPE IF EXISTS task_relation_type CASCADE` and `DROP TYPE IF EXISTS graph_layout_direction CASCADE`.

---

## 4. Seed Data

### 4.1 `seedCoordinationRequirementDefinitions.js` (new)
Seed the `COORDINATION_REQUIREMENT_DEFINITIONS` table:
| code | description |
|------|-------------|
| MERGE_TOGETHER | All PRs must merge to dev together |
| DEPLOY_TOGETHER | Changes must be deployed together to avoid breaking changes |
| MIGRATE_TOGETHER | Database migration and API changes must merge simultaneously |
| RELEASE_TOGETHER | All changes must be released to production together |
| TEST_TOGETHER | Changes must be tested together before deployment |

### 4.2 `seedTaskRelations.js` (new)
Seed relations for the **APIMOD** project (project_id=3) which already has 6 tasks (APIMOD-1 through APIMOD-6). This gives us a realistic graph:

**Dependency Graph for APIMOD project:**
```
APIMOD-1 (Audit API)     APIMOD-5 (Write docs) [solo — already DONE]
     │
     ├──→ APIMOD-2 (Design new API) ──→ APIMOD-3 (Implement auth middleware)
     │                                         │
     │                                         ▼
     │                                   APIMOD-6 (Perf testing)
     │
     └──→ APIMOD-4 (DB migration scripts)
```

**Seed rows for TASK_RELATIONS** (using internal IDs — APIMOD tasks are ids 5-10 based on seed order):
- APIMOD-2 depends on APIMOD-1: `(task_id=6, related_task_id=5, 'DEPENDS_ON')`
- APIMOD-3 depends on APIMOD-2: `(task_id=7, related_task_id=6, 'DEPENDS_ON')`
- APIMOD-4 depends on APIMOD-1: `(task_id=8, related_task_id=5, 'DEPENDS_ON')`
- APIMOD-6 depends on APIMOD-3: `(task_id=10, related_task_id=7, 'DEPENDS_ON')`
- APIMOD-3 and APIMOD-4 coordinate: `(7, 8, 'COORDINATES_WITH')` and `(8, 7, 'COORDINATES_WITH')` with `coordination_code = 'TEST_TOGETHER'` on both tasks

**Note:** `seedTaskRelations.js` also UPDATEs `TASKS` rows for ids 7 and 8 to set `coordination_code = 'TEST_TOGETHER'` (keeps all coordination logic in one seed file).

**Coordination requirements** are not about production readiness — they define what must happen together before the *next task in the graph* can proceed (e.g., "these changes must be tested together before the dependent integration task can start").

**Update APIMOD project seed**: Set `completion_criteria_status: 'IN_REVIEW'` and `task_graph_layout_direction: 'LR'`.

### 4.3 Update ALL Project Status Workflows
All projects must include both `TO_DO` and `READY` in their `status_workflow`, with `READY` immediately after `TO_DO`. This is required for the auto-promotion flow (see §5.5). Update `seedProjects.js`:

- WEBRED: `['TO_DO', 'READY', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']`
- MOBDEV: `['TO_DO', 'READY', 'IN_PROGRESS', 'TESTING', 'DONE']`
- APIMOD: `['ICEBOX', 'TO_DO', 'READY', 'IN_PROGRESS', 'IN_REVIEW', 'READY_FOR_DEPLOY', 'DONE']`
- DATAMIG: `['TO_DO', 'READY', 'IN_PROGRESS', 'DONE']`
- SECURE: `['AWAITING_APPROVAL', 'TO_DO', 'READY', 'IN_PROGRESS', 'TESTING', 'READY_FOR_DEPLOY', 'DONE']`

Seed APIMOD task statuses remain as-is. Notably, APIMOD-4 (id=8) is `IN_REVIEW` while its dependency APIMOD-1 (id=5) is only `IN_PROGRESS` — this intentionally demonstrates the yellow outline on a task that is past READY but blocked (dependency not yet at completion criteria).

### 4.4 Seed Execution Order Update
In `seed-all.js` and `reset-and-seed.js`:
1. Step 1 (base entities): add `seedCoordinationRequirementDefinitions()` alongside `seedStatusDefinitions()`
2. New Step 5 (after task-tags): `seedTaskRelations()` — depends on tasks existing

---

## 5. API Endpoints

### 5.1 New Route File: `api/src/routes/taskGraph.js`
Follows existing Fastify plugin pattern. Registered in `routes/index.js` with `{ dbService }`.

All endpoints require `authMiddleware`.

#### `GET /projects/:code/task-graph/structure`
Returns the full graph structure for chart rendering.

**Graph Scope — Excluded Statuses:**
The graph shows tasks with "active" statuses — tasks that are planned for the current sprint or groomed for work. Statuses `BACKLOG` and `ICEBOX` are excluded by default. `TO_DO` and `READY` are included because they represent the starting tasks in the graph flow.

Exclusion logic: hardcoded list of excluded status codes `['BACKLOG', 'ICEBOX']`. Tasks whose status is in this list are filtered out. All other tasks in the project's `status_workflow` are included. This list can be made configurable per-project in a future iteration.

- Query all tasks in the project whose status is NOT in the excluded list
- Query all relations from `TASK_RELATIONS` filtered to tasks in scope
- Return:
```json
{
  "projectId": 3,
  "projectCode": "APIMOD",
  "layoutDirection": "LR",
  "completionCriteriaStatus": "IN_REVIEW",
  "tasks": [ /* task objects */ ],
  "dependencies": [
    { "taskId": 6, "dependsOnTaskId": 5 }
  ],
  "coordinationGroups": [
    { "taskIds": [7, 8], "coordinationCode": "TEST_TOGETHER" }
  ]
}
```
`coordinationGroups` are derived by grouping COORDINATES_WITH relations — each group is a set of mutually coordinated task IDs plus the shared `coordinationCode`. React Flow does not require a specific structure; this is transformed to nodes/edges on the client.

#### `GET /tasks/:id/relations`
Returns all relations for a specific task (both DEPENDS_ON and COORDINATES_WITH).
- Response: `{ taskId, dependencies[], dependents[], coordinatedTasks[], coordinationCode }`

#### `POST /tasks/:id/relations`
Add a relation (dependency or coordination).
- Body: `{ relatedTaskId, relationType, coordinationCode? }` where `relationType` is `'DEPENDS_ON'` or `'COORDINATES_WITH'`
- For `COORDINATES_WITH`: auto-creates the reverse row AND auto-sets `coordination_code` on both TASKS rows (if `coordinationCode` is provided in the body)
- Validates: same project, no self-reference, no circular dependencies (for DEPENDS_ON)
- Returns the created relation(s)

#### `DELETE /tasks/:id/relations/:relatedTaskId`
Remove a relation.
- Query param or path: `?relationType=DEPENDS_ON` (required)
- For `COORDINATES_WITH`: auto-deletes the reverse row
- Returns 204 on success

#### `GET /tasks/:id/readiness`
Check if a task is ready to work on.
- Fetches all DEPENDS_ON relations for this task
- For each dependency, checks if its status meets or exceeds the project's `completion_criteria_status` position in the workflow
- Returns: `{ taskId, isReady, blockingTasks[], completedDependencies[], completionCriteriaStatus }`

#### `GET /tasks/:id/dependency-status`
Summary of dependency completion progress.
- Returns: `{ taskId, totalDependencies, completedDependencies, remainingDependencies, isReady, prerequisiteTasks[] }`

### 5.2 Extend Existing Endpoints

#### `GET /projects/:id` and `GET /projects` (projects.js)
- Add `completionCriteriaStatus` and `taskGraphLayoutDirection` to the select aliasing in `databaseService.getProjectById()`, `getProjectByCode()`, and `getProjectsWithDetails()`

#### `PUT /projects/:id` (projects.js)
- Accept optional `completionCriteriaStatus` and `taskGraphLayoutDirection` in request body
- Validate `completionCriteriaStatus` exists in the project's `status_workflow` if provided
- Validate `taskGraphLayoutDirection` is `'LR'` or `'TB'`

#### `POST /tasks` and `PUT /tasks/:id`
- No changes to the task creation/update endpoints for MVP — relations are managed via the dedicated `/tasks/:id/relations` endpoints
- Future: accept `dependsOnTaskIds[]` and `coordinateWithTaskIds[]` arrays for batch creation

### 5.3 Validation Schema Updates (`api/src/schemas/validation.js`)
Add schemas for:
- `taskRelationSchemas.getGraphStructure` — params: `code` pattern
- `taskRelationSchemas.getRelations` — params: `id`
- `taskRelationSchemas.createRelation` — body: `relatedTaskId` (integer), `relationType` (enum), optional `coordinationCode`
- `taskRelationSchemas.deleteRelation` — params: `id`, `relatedTaskId`, querystring: `relationType`
- `taskRelationSchemas.getReadiness` — params: `id`
- `taskRelationSchemas.getDependencyStatus` — params: `id`
- Extend `projectSchemas.updateProject` body to include optional `completionCriteriaStatus` and `taskGraphLayoutDirection`

### 5.4 DatabaseService Methods (new)
Add to `api/src/services/databaseService.js`:

```
// ==================== TASK RELATION OPERATIONS ====================

getTaskRelations(taskId)
getTaskDependencies(taskId)        // DEPENDS_ON where task_id = taskId
getTaskDependents(taskId)          // DEPENDS_ON where related_task_id = taskId
getTaskCoordinatedTasks(taskId)    // COORDINATES_WITH where task_id = taskId
createTaskRelation(taskId, relatedTaskId, relationType)
deleteTaskRelation(taskId, relatedTaskId, relationType)
getProjectTaskGraphData(projectId) // All tasks + relations for graph rendering
checkTaskReadiness(taskId)         // Check if all dependencies met completion criteria
detectCircularDependency(taskId, dependsOnTaskId) // BFS/DFS cycle detection
checkAndPromoteDependents(taskId, projectId) // Auto-promote TO_DO → READY (see §5.5)
```

### 5.5 Auto-Promotion: TO_DO → READY

**Enforced methodology**: Tasks with unmet dependencies sit in `TO_DO` (blocked, not yet actionable). The system auto-promotes them to `READY` when all `DEPENDS_ON` predecessors reach the project's `completion_criteria_status`. Both humans and agents follow the same flow — agents pick up work from the `READY` column only.

**Trigger**: Runs after any task status change (`PUT /tasks/:id` or `PATCH /tasks/:id/status`). Add a post-update hook in `tasks.js`:

1. After the status update succeeds, call `dbService.checkAndPromoteDependents(taskId, projectId)`
2. That method queries all tasks that `DEPENDS_ON` the updated task
3. For each dependent task currently in `TO_DO`:
   a. Check if ALL of its `DEPENDS_ON` predecessors now have a status at or past the project's `completion_criteria_status` in the `status_workflow` array
   b. If yes → update that task's status to `READY`, set position to bottom of the READY column
4. Return the list of promoted task IDs (logged for traceability)

**"At or past" logic**: Compare the index of the task's current status in the project's `status_workflow` array against the index of `completion_criteria_status`. If `currentIndex >= criteriaIndex`, the dependency is met.

**Coordination group interaction**: For downstream tasks that depend on a coordination group, ALL tasks in the group must individually meet the completion criteria before the downstream task auto-promotes. The coordination constraint doesn't block the coordinated tasks themselves — it blocks what comes *after* them in the graph.

---

## 6. Client Implementation

### 6.1 New Dependency: React Flow
```bash
cd client && npm install @xyflow/react
```
Note: The package is now `@xyflow/react` (v12+), not the older `reactflow`. Use the latest docs.

### 6.2 Navigation Between Kanban and Graph
The Kanban board and task graph are **separate pages** with their own routes, following the existing routing pattern:

- `/projects/:projectCode/kanban` → `KanbanPage.jsx` (existing)
- `/projects/:projectCode/taskGraph` → `TaskGraphPage.jsx` (new)

A `SegmentedControl` (or similar toggle) in the project header navigates between views using `react-router-dom`'s `useNavigate()` — not local state. This ensures each view has a distinct, shareable URL that another user can open directly. Both pages receive the `selectedProject` prop and can independently fetch their data.

### 6.3 New Hook: `useTaskGraph(projectCode)` — `client/src/hooks/useTaskGraph.js`
- Fetches `GET /projects/:code/task-graph/structure`
- Returns `{ graphData, loading, error, refreshGraph }`
- `graphData` contains `{ tasks, dependencies, coordinationGroups, layoutDirection, completionCriteriaStatus }`

### 6.4 New Page: `TaskGraphPage.jsx` — `client/src/pages/TaskGraphPage.jsx`
Top-level graph page (rendered at `/projects/:projectCode/taskGraph`):
- Uses `useTaskGraph(projectCode)` to fetch data
- Transforms API data into React Flow nodes and edges via `graphLayoutUtils.js`
- Renders `<ReactFlow>` with custom node types and edge types
- Includes `<Background>`, `<Controls>`, `<MiniMap>` from React Flow
- Click handler on nodes opens `TaskDetailModal`
- Header includes navigation back to Kanban view

### 6.5 Graph Layout Algorithm — `client/src/utils/graphLayoutUtils.js`
Pure function: `generateGraphLayout(tasks, dependencies, coordinationGroups, direction)` → `{ nodes[], edges[] }`

**Layout Logic (LR — left-to-right, MVP default)**:
1. Identify starting tasks (no DEPENDS_ON relationships as task_id)
2. Assign columns (X-axis) based on topological sort / dependency depth
3. Within each column, assign rows (Y-axis) — coordinated tasks get the same Y
4. Place sync-point diamond nodes where a task has 2+ dependencies
5. Generate edges: single arrows for DEPENDS_ON, double-stroke for COORDINATES_WITH
6. Constants: `NODE_WIDTH = 200`, `NODE_HEIGHT = 80`, `X_GAP = 250`, `Y_GAP = 120`

### 6.6 Blocked Task Visual — Yellow Outline (Kanban + Graph)
The existing `TaskCard.jsx` uses a small red `IconLock` inline with the title for blocked tasks. Replace this with a **yellow border outline** on the card itself — more scannable and consistent across both views.

**When does the yellow outline appear?**
A task is "blocked" for yellow-outline purposes ONLY when it has unmet dependencies AND its status is past `READY` in the workflow (e.g., `IN_PROGRESS`, `IN_REVIEW`). Tasks in `TO_DO` with unmet dependencies are simply waiting — that's the normal state, not an alert.

This is intentionally **rare** and signals something unexpected that may require human intervention:
- **Dependency regression** — a predecessor was meeting criteria but got moved backward (e.g., failed review)
- **New dependency added mid-flight** — a DEPENDS_ON relation was added to a task already in progress
- **Coordination partner regression** — a downstream task was promoted because all coordination group members met criteria, then one partner regressed

**Change in `TaskCard.jsx`**:
- Remove the `IconLock` icon from the title text (line 112-114 currently)
- Add a yellow border to the `<Card>` when the task is blocked past READY:
  - `border: '2px solid var(--mantine-color-yellow-5)'`
  - Optional: light yellow background tint for additional emphasis
- The blocked check: task has unmet dependencies AND task's status index > READY's index in the project's `status_workflow`
- Keep the `blockedReason` visible in the `TaskDetailModal` (no change there)

**Apply the same yellow outline to graph `TaskNode`** — both views share the visual language.

### 6.7 Custom React Flow Node Types
- **`TaskNode`** — `client/src/components/graph/TaskNode.jsx`
  - Displays: task ID badge (`PROJ-123`), title (truncated), status color indicator, priority badge
  - Status colors match Kanban card colors (from existing theme)
  - Border highlight: **yellow = blocked** (same as Kanban card), blue = coordinated
  - Uses Mantine `Paper`, `Badge`, `Text` components for consistency

- **`SyncPointNode`** — `client/src/components/graph/SyncPointNode.jsx`
  - Small diamond/rhombus shape
  - Tooltip: "Waiting for N tasks"

### 6.8 Custom React Flow Edge Types
- **`DependencyEdge`** — default animated arrow edge (React Flow built-in, styled)
- **`CoordinationEdge`** — double-stroke line, no arrow, connects coordinated tasks horizontally

### 6.9 Routing
Add new route in `App.jsx`:
```javascript
<Route path="/projects/:projectCode/kanban" element={<KanbanPage />} />
<Route path="/projects/:projectCode/taskGraph" element={<TaskGraphPage />} />
```
Both views are top-level pages with their own routes, consistent with the `/projects/:projectCode/*` pattern.

---

## 7. Testing

### 7.1 API Integration Tests (Vitest + PactumJS)
Follow existing patterns in `api/__tests__/routes/*.test.mjs`.

#### New Test File: `api/__tests__/routes/taskRelations.test.mjs`
Test categories:
1. **Authentication** — 401 without token, 401 with invalid token, 200 with valid token
2. **GET /projects/:code/task-graph/structure**
   - Returns graph data for project with relations
   - Returns empty graph for project with no relations
   - Excludes backlog tasks
   - Returns correct layoutDirection from project settings
3. **POST /tasks/:id/relations**
   - Creates DEPENDS_ON relation
   - Creates COORDINATES_WITH relation (bidirectional)
   - Rejects self-reference
   - Rejects cross-project relation
   - Rejects circular dependency
   - Rejects duplicate relation
   - Validates relationType enum
4. **DELETE /tasks/:id/relations/:relatedTaskId**
   - Deletes DEPENDS_ON relation
   - Deletes COORDINATES_WITH relation (both directions)
   - Returns 404 for non-existent relation
5. **GET /tasks/:id/readiness**
   - Returns ready when all dependencies met completion criteria
   - Returns not ready with blocking tasks list
   - Returns ready when task has no dependencies
6. **GET /tasks/:id/dependency-status**
   - Returns correct counts
   - Returns empty for task with no dependencies
7. **GET /tasks/:id/relations**
   - Returns all relation types
   - Returns empty arrays for unconnected task
8. **Cascade deletion** — when a task is deleted, its relations are removed
9. **Auto-promotion** — update a dependency's status to meet completion criteria → verify dependent task auto-promotes from TO_DO to READY
10. **Auto-promotion skips non-TO_DO** — dependent task in IN_PROGRESS is not touched by auto-promotion
11. **Auto-promotion partial** — dependent has 2 dependencies, only 1 meets criteria → stays in TO_DO

#### New Test File: `api/__tests__/routes/projectGraphSettings.test.mjs`
Test the updated project endpoints:
1. **PUT /projects/:id** with `completionCriteriaStatus` — validates against workflow
2. **PUT /projects/:id** with `taskGraphLayoutDirection` — validates `LR`/`TB`
3. **GET /projects/:id** — returns new fields

### 7.2 Test Database Helpers
Add to `api/__tests__/helpers/testDatabase.js`:
```javascript
async function createTestRelation(taskId, relatedTaskId, relationType)
async function clearRelationData()  // Called from clearTaskData()
```
Update `clearTaskData()` to also clear `TASK_RELATIONS` before clearing `TASKS` (FK dependency).

### 7.3 Test Seed Fixtures
Add `api/__tests__/fixtures/taskRelations.js` with factory functions for test data.

---

## 8. Parallelization Opportunities

The following work streams can be developed **concurrently by separate agents** after the DB schema is in place:

### Stream A: Database Layer (prerequisite for all other streams)
- Schema changes in `schema.js`
- Seed data files
- `reset-and-seed.js` updates
- DatabaseService methods
- **Must complete first** — all other streams depend on this

### Stream B: API Routes + Validation (depends on Stream A)
- `taskGraph.js` route file
- Validation schemas
- Route registration in `index.js`
- Project endpoint extensions

### Stream C: API Tests (depends on Stream A + B)
- Test helpers
- `taskRelations.test.mjs`
- `projectGraphSettings.test.mjs`
- Can start test skeleton while Stream B is in progress

### Stream D: Client — Graph Layout + Components (depends on Stream A for data shape)
- `npm install @xyflow/react`
- `graphLayoutUtils.js`
- `TaskGraphView.jsx`, `TaskNode.jsx`, `SyncPointNode.jsx`
- `useTaskGraph.js` hook
- Can mock API responses and develop independently

### Stream E: Client — View Toggle + Integration (depends on Stream D)
- `KanbanPage.jsx` toggle
- `TaskCard.jsx` blocked yellow outline
- Wire up hook to real API
- End-to-end testing

```
Stream A (DB) ──────► Stream B (API) ──────► Stream C (Tests)
                 │
                 └──► Stream D (Client Graph) ──► Stream E (Integration)
```

---

## 9. Implementation Order (Sequential for Single Agent)

1. **Schema** — Update `api/lib/db/schema.js` with new tables and columns
2. **Reset script** — Update `api/scripts/reset-and-seed.js` with new DROP statements
3. **Seed data** — Create `seedCoordinationRequirementDefinitions.js` and `seedTaskRelations.js`; update `seed-all.js` execution order; update `seedProjects.js` with new columns and READY in all workflows
4. **Push & verify** — Run `npm run db:reset` against `task_blaster_dev` on Docker (`localhost:5433`) to verify schema and seeds
5. **DatabaseService** — Add all new methods to `databaseService.js` including `checkAndPromoteDependents()`
6. **Validation schemas** — Add to `api/src/schemas/validation.js`
7. **API routes** — Create `taskGraph.js`, register in `index.js`, extend project routes
8. **Auto-promotion hook** — Add post-update call in `tasks.js` (`PUT` and `PATCH /status`) to trigger `checkAndPromoteDependents()`
9. **Test helpers** — Update `testDatabase.js`, add fixtures
10. **API tests** — Write `taskRelations.test.mjs` and `projectGraphSettings.test.mjs` (including auto-promotion tests)
11. **Run tests** — `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test`
12. **Client dependency** — `cd client && npm install @xyflow/react`
13. **Graph layout utility** — `client/src/utils/graphLayoutUtils.js`
14. **React Flow components** — `TaskGraphPage.jsx`, `TaskNode.jsx`, `SyncPointNode.jsx`, edge types
15. **useTaskGraph hook** — `client/src/hooks/useTaskGraph.js`
16. **Routing + navigation** — Add `/projects/:projectCode/taskGraph` route in `App.jsx`, add Kanban↔Graph navigation links
17. **Blocked visual** — Update `TaskCard.jsx` with yellow outline for blocked-past-READY tasks (remove IconLock)
18. **Manual integration test** — Start dev, verify graph renders with seed data, verify auto-promotion by advancing APIMOD-1 to IN_REVIEW and checking that APIMOD-2 and APIMOD-4 move to READY

---

## 10. Files Modified / Created

### Modified
- `api/lib/db/schema.js` — new tables, columns, relations
- `api/src/services/databaseService.js` — new DB methods, updated project methods
- `api/src/schemas/validation.js` — new validation schemas, extended project schemas
- `api/src/routes/index.js` — register `taskGraph` routes
- `api/src/routes/projects.js` — extend PUT to accept new fields
- `api/src/routes/tasks.js` — add auto-promotion hook after status updates
- `api/scripts/reset-and-seed.js` — new DROP statements, new seed calls
- `api/scripts/seed-all.js` — new seed step
- `api/scripts/seeders/seedProjects.js` — add `completion_criteria_status`, `task_graph_layout_direction` to APIMOD; add READY to all project workflows
- `api/__tests__/helpers/testDatabase.js` — new helpers, update `clearTaskData()`
- `client/src/pages/KanbanPage.jsx` — add navigation link to task graph
- `client/src/App.jsx` — add `/projects/:projectCode/taskGraph` route
- `client/src/components/TaskCard.jsx` — yellow blocked outline (replace IconLock)
- `client/package.json` — add `@xyflow/react`

### Created
- `api/scripts/seeders/seedCoordinationRequirementDefinitions.js`
- `api/scripts/seeders/seedTaskRelations.js`
- `api/src/routes/taskGraph.js`
- `api/__tests__/routes/taskRelations.test.mjs`
- `api/__tests__/routes/projectGraphSettings.test.mjs`
- `api/__tests__/fixtures/taskRelations.js`
- `client/src/hooks/useTaskGraph.js`
- `client/src/pages/TaskGraphPage.jsx`
- `client/src/components/graph/TaskNode.jsx`
- `client/src/components/graph/SyncPointNode.jsx`
- `client/src/components/graph/CoordinationEdge.jsx`
- `client/src/utils/graphLayoutUtils.js`

---

## 11. Out of Scope (Post-MVP)
- Top-to-bottom (`TB`) graph layout rendering (DB column exists, UI toggle deferred)
- `TaskGraphEditor.jsx` — visual drag-to-create-dependency editor
- `TaskDependenciesPanel.jsx` — dedicated dependencies list panel
- Batch creation of relations via `POST /tasks` (accept `dependsOnTaskIds[]`)
- Real-time WebSocket graph updates
- Graph layout caching in database
- "Show on Graph" from task detail modal (navigate + highlight)
- Context menu integration
- Breadcrumb navigation in graph view
- Gantt-style milestone views
- DB migrations (using nuke-and-rebuild for this branch)
- i18n translations for coordination requirement descriptions
- TaskCard dependency badges on Kanban view (graph view shows dependencies; Kanban stays clean)
- Per-project configurable excluded status list (hardcoded `BACKLOG`/`ICEBOX` for MVP)
