# Implementation Plan: Fix Routes No Project
Project Code: `ZAZZ`
Deliverable Code: `ZAZZ-5`
Deliverable ID (integer): `8`
SPEC Reference: `.zazz/deliverables/ZAZZ-5-fix-routes-no-project-SPEC.md`
Status: `IMPLEMENTED_COMPLETED`

## 1. Current State and Repository Impact
The current codebase still supports project-wide graph access and legacy non-project-scoped image routes.
- `api/src/routes/taskGraph.js` still exposes `GET /projects/:code/graph`.
- `client/src/App.jsx` and `client/src/hooks/useTaskGraph.js` still allow an “All tasks (project-wide)” graph path.
- `api/src/routes/images.js`, `api/src/schemas/images.js`, and image methods in `api/src/services/databaseService.js` are task/global-id scoped, not project-code scoped.
- `api/lib/db/schema.js` models images as task-only ownership (`IMAGE_METADATA.task_id` required).
- `.agents/skills/zazz-board-api/SKILL.md` still documents legacy image routes.
- OpenAPI coverage in `api/__tests__/routes/openapi.test.mjs` does not yet assert this deliverable’s graph/image route removals/additions.

Primary files likely affected:
- API/data model:
  - `api/lib/db/schema.js`
  - `api/src/services/databaseService.js`
  - `api/src/routes/images.js`
  - `api/src/routes/taskGraph.js`
  - `api/src/schemas/images.js`
  - `api/src/schemas/taskGraph.js`
- Client:
  - `client/src/App.jsx`
  - `client/src/hooks/useTaskGraph.js`
  - `client/src/pages/TaskGraphPage.jsx`
- Tests:
  - `api/__tests__/helpers/testDatabase.js`
  - `api/__tests__/routes/openapi.test.mjs`
  - `api/__tests__/routes/task-graph-scoping.test.mjs` (new)
  - `api/__tests__/routes/images-scoping.test.mjs` (new)
- Skill/docs:
  - `.agents/skills/zazz-board-api/SKILL.md`

## 2. Dependency and Parallelization Strategy
Critical path:
1. Image ownership schema change
2. Database service ownership/scoping logic
3. Route/schema refactor to new image endpoints
4. Route-level tests + OpenAPI assertions

Parallelization opportunities:
- Graph cleanup and client graph UX work can proceed in parallel with image ownership/service refactor because they touch mostly different files.
- OpenAPI assertion updates can proceed in parallel with route tests once route contracts stabilize.
- API skill documentation update can run in parallel with tests after final endpoint naming is confirmed.

Conflict-prone files (serialize changes):
- `api/src/services/databaseService.js`
- `api/lib/db/schema.js`
- `api/src/routes/images.js`
- `api/src/schemas/images.js`
- `client/src/App.jsx`

## 3. Phased Plan and Task List
### Phase 1 — Remove project-wide graph scope and enforce deliverable-first graph UX
#### Step 1.1
Objective: Remove project-wide graph endpoint and keep only deliverable-scoped graph retrieval.
Files affected:
- `api/src/routes/taskGraph.js`
- `api/src/schemas/taskGraph.js`
Deliverables/output:
- `GET /projects/:code/graph` removed
- deliverable graph endpoint remains and is documented
DEPENDS_ON: none
Parallelizable with: Step `1.2` (different files)
Test requirements:
- Add route test for removed endpoint returning 404
- Add route test for existing deliverable graph endpoint success path
Completion signal:
- Project-wide graph endpoint unreachable and deliverable endpoint intact

#### Step 1.2
Objective: Remove “All tasks (project-wide)” graph mode and require explicit deliverable selection.
Files affected:
- `client/src/App.jsx`
- `client/src/hooks/useTaskGraph.js`
- `client/src/pages/TaskGraphPage.jsx`
Deliverables/output:
- No “All tasks (project-wide)” selector option
- Graph fetch is disabled when no deliverable is selected
- Clear prompt shown when deliverable is not selected
DEPENDS_ON: Step `1.1`
Parallelizable with: Step `2.1`
Test requirements:
- Manual validation of graph page behavior
- Verify no API call to removed project-wide endpoint in this state
Completion signal:
- UI cannot trigger project-wide graph fetch path

#### Step 1.3
Objective: Add/adjust graph scope regression tests and OpenAPI assertions.
Files affected:
- `api/__tests__/routes/openapi.test.mjs`
- `api/__tests__/routes/task-graph-scoping.test.mjs` (new)
Deliverables/output:
- OpenAPI asserts removed project-wide graph path
- Route tests cover 404 removed path + success on deliverable-scoped path
DEPENDS_ON: Step `1.1`
Parallelizable with: Step `2.4`
Test requirements:
- Run targeted route tests and openapi tests
Completion signal:
- Graph scoping behavior is test-enforced

### Phase 2 — Migrate image model and endpoints to project-scoped ownership-aware routes
#### Step 2.1
Objective: Introduce single-owner image model (`task_id XOR deliverable_id`) in image metadata.
Files affected:
- `api/lib/db/schema.js`
- `api/__tests__/helpers/testDatabase.js` (if helper cleanup/setup requires updates)
Deliverables/output:
- `IMAGE_METADATA.task_id` nullable
- `IMAGE_METADATA.deliverable_id` added
- DB-level XOR constraint enforces exactly one owner
DEPENDS_ON: none
Parallelizable with: Step `1.2`
Test requirements:
- Constraint-level validation via integration tests (both-set and neither-set failure)
Completion signal:
- Schema supports task and deliverable image ownership with invariant enforced

#### Step 2.2
Objective: Refactor image service methods for project ownership validation and scoped URL semantics.
Files affected:
- `api/src/services/databaseService.js`
Deliverables/output:
- New/updated service methods for:
  - scoped task image operations
  - scoped deliverable image operations
  - project-scoped image fetch/metadata
- ownership checks resolve project via task/deliverable relationship before read/delete
DEPENDS_ON: Step `2.1`
Parallelizable with: none (same high-conflict service file)
Test requirements:
- Integration tests assert 403 on cross-project resources and 404 on missing entities
Completion signal:
- Service layer can back all new project-scoped image endpoints

#### Step 2.3
Objective: Replace legacy image routes with project/deliverable/task-scoped routes and update schemas.
Files affected:
- `api/src/routes/images.js`
- `api/src/schemas/images.js`
- `api/src/schemas/validation.js` (if exports need adjustment)
Deliverables/output:
- Legacy routes removed:
  - `GET /tasks/:taskId/images`
  - `POST /tasks/:taskId/images/upload`
  - `DELETE /tasks/:taskId/images/:imageId`
  - `GET /images/:id`
  - `GET /images/:id/metadata`
- New routes added:
  - task scoped: `/projects/:code/deliverables/:delivId/tasks/:taskId/images...`
  - deliverable scoped: `/projects/:code/deliverables/:delivId/images...`
  - project image fetch: `/projects/:code/images/:id` and `/metadata`
DEPENDS_ON: Step `2.2`
Parallelizable with: none (shared route/schema files)
Test requirements:
- Route tests for happy path, 401, 403, 404
Completion signal:
- API exposes only project-scoped image routes

#### Step 2.4
Objective: Update skill/docs references from legacy image routes to new project-scoped routes.
Files affected:
- `.agents/skills/zazz-board-api/SKILL.md`
- `docs/swagger-for-agent-enhancement.md` (if route examples must match current API)
Deliverables/output:
- Agent-facing route table aligns with new image + graph contracts
DEPENDS_ON: Steps `1.1`, `2.3`
Parallelizable with: Step `3.1` (different files)
Test requirements:
- Documentation review against generated OpenAPI
Completion signal:
- No legacy image or project-wide graph route references remain in API skill docs

### Phase 3 — Verification, regression safety, and readiness for execution
#### Step 3.1
Objective: Add integration tests for image route scoping and ownership model constraints.
Files affected:
- `api/__tests__/routes/images-scoping.test.mjs` (new)
- `api/__tests__/helpers/testDatabase.js` (if helper methods needed for image setup)
Deliverables/output:
- Coverage for:
  - same-project success paths
  - cross-project 403 paths
  - 401 unauthorized
  - 404 not found
  - single-owner DB invariant behavior
DEPENDS_ON: Steps `2.1`, `2.3`
Parallelizable with: Step `3.2`
Test requirements:
- PactumJS integration tests with seeded projects/tokens
Completion signal:
- Image scope + ownership behavior is enforced by tests

#### Step 3.2
Objective: Strengthen OpenAPI tests for route removals/additions and schema correctness.
Files affected:
- `api/__tests__/routes/openapi.test.mjs`
Deliverables/output:
- Assertions verify:
  - removed `GET /projects/{code}/graph`
  - removed legacy image paths
  - added project-scoped image paths
  - expected summaries/request schemas for new routes
DEPENDS_ON: Steps `1.1`, `2.3`
Parallelizable with: Step `3.1`
Test requirements:
- Run OpenAPI schema validator test suite
Completion signal:
- API contract changes are protected by documentation tests

#### Step 3.3
Objective: Run full validation commands and confirm release readiness for this deliverable.
Files affected:
- No code files; execution/verification commands
Deliverables/output:
- Green test and quality signals for API and client behavior
DEPENDS_ON: Steps `1.3`, `2.4`, `3.1`, `3.2`
Parallelizable with: none (final convergence)
Test requirements:
- API tests:
  - `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test`
- OpenAPI tests included in API test run
- Client lint:
  - `cd client && npm run lint`
- Manual graph UI smoke check:
  - no project-wide option
  - deliverable selection required before graph fetch
Completion signal:
- All required automated checks pass and manual graph behavior matches SPEC

## 4. AC-to-Phase Coverage Mapping
- AC1/AC2 covered by Phase 1 and Phase 3.
- AC3/AC4/AC5/AC6/AC7 covered by Phase 2 and Phase 3.
- AC8 regression covered in Phase 3 integration tests.
- AC9 covered by Step `2.1` and Step `3.1`.
- AC10 covered by Step `3.2`.

## 5. Execution Notes for Coordinator
- Create tasks using `phase.step` IDs aligned to this PLAN (`1.1`, `1.2`, ...).
- For every non-`none` `DEPENDS_ON` entry, create explicit `DEPENDS_ON` relations via `POST /projects/{code}/tasks/{taskId}/relations`; do not rely on task-create `dependencies` payload to render graph edges.
- Validate dependency edges directly in DB with `psql` against `"TASK_RELATIONS"` before final QA closure.
- Run Phase 1 and Phase 2 streams with parallelization noted above, but serialize high-conflict files.
- Preserve SPEC as read-only during execution unless Owner-approved change mechanism is invoked.

## 6. Execution Update (2026-03-07)
- Additional completed post-plan hardening step was executed:
  - Step `4.1` (task `25`): replace manual `drizzle-orm` symlink workaround with worktree-safe dependency setup and documentation updates.
- Additional graph UX follow-up was completed:
  - Step `4.2` (task `26`): persist Task Graph deliverable selection on reload.
- Live task statuses:
  - Completed: `13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26`
- Dependency relations verified in DB (`TASK_RELATIONS`):
  - `15->14`, `16->13`, `17->16`, `18->17`, `20->18`, `21->16`, `21->18`, `22->14`, `23->14`, `23->18`, `24->15`, `24->19`, `24->20`, `24->21`, `24->22`, `24->23`, `25->24`, `26->15`
