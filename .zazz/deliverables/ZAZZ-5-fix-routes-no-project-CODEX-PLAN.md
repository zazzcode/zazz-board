# CODEX Implementation Plan: Fix Routes No Project
Project Code: `ZAZZ`  
Deliverable Code: `ZAZZ-5`  
Deliverable ID (integer): `8`  
SPEC Reference: `.zazz/deliverables/ZAZZ-5-fix-routes-no-project-SPEC.md`  
Status: `IMPLEMENTED_COMPLETED`  
Planning basis: repository audit + standards (`testing.md`, `coding-styles.md`, `system-architecture.md`, `data-architecture.md`) + API skill constraints from `.agents/skills/zazz-board-api/SKILL.md`

## 1. Scope Guardrails
In scope:
- Remove project-wide graph route and project-wide graph UI mode.
- Replace all legacy image routes with project-code-scoped routes supporting task and deliverable images.
- Introduce single-owner image model (`task_id XOR deliverable_id`) in `IMAGE_METADATA`.
- Add TDD-first API/OpenAPI regression coverage for all route contract changes.
- Update API skill/docs to reflect the final route contract.

Out of scope (must not be pulled into this plan):
- SPEC changes.
- Project membership/access-control redesign (`USER_PROJECTS` style token-project mapping).
- Global normalization of every `:id` vs `:code` route.
- Building card-image UI components.

## 2. Verified Current State (Repository Reality)
- `api/src/routes/taskGraph.js` currently exposes `GET /projects/:code/graph` and `GET /projects/:code/deliverables/:delivId/graph`.
- `client/src/App.jsx` currently renders `All tasks (project-wide)` in Task Graph center selector and passes `null` deliverable.
- `client/src/hooks/useTaskGraph.js` currently falls back to `/projects/{code}/graph` when `deliverableId` is null.
- `api/src/routes/images.js` currently exposes only legacy non-project-scoped routes:
  - `/tasks/:taskId/images`
  - `/tasks/:taskId/images/upload`
  - `/tasks/:taskId/images/:imageId`
  - `/images/:id`
  - `/images/:id/metadata`
- `api/lib/db/schema.js` currently enforces task-only image ownership (`IMAGE_METADATA.task_id` is `NOT NULL`; no `deliverable_id`).
- `api/src/services/databaseService.js` currently has task/global image methods only (`getTaskImages`, `storeTaskImage`, `getImageWithData`, `getImageMetadata`, `deleteImage`) and URL generation tied to `/images/{id}`.
- Route-test reality: there are no dedicated image route tests in `api/__tests__/routes/`; graph behavior is covered indirectly in `agent-workflow.test.mjs`.
- `api/__tests__/helpers/testDatabase.js` does not clear image tables; image tests would currently leak state across tests.
- `api/__tests__/routes/openapi.test.mjs` does not assert removal of `/projects/{code}/graph` or removal/addition of legacy/new image paths.
- `.agents/skills/zazz-board-api/SKILL.md` still allows legacy image fallback if project-scoped routes are absent.

## 3. Contract Delta (Target API)
| Capability | Current | Target |
| --- | --- | --- |
| Project-wide graph | `GET /projects/{code}/graph` | Removed (404) |
| Deliverable graph | `GET /projects/{code}/deliverables/{delivId}/graph` | Unchanged |
| Task image list/upload/delete | `/tasks/{taskId}/images...` | `/projects/{code}/deliverables/{delivId}/tasks/{taskId}/images...` |
| Deliverable image list/upload/delete | Not available | `/projects/{code}/deliverables/{delivId}/images...` |
| Image binary + metadata | `/images/{id}`, `/images/{id}/metadata` | `/projects/{code}/images/{id}`, `/projects/{code}/images/{id}/metadata` |
| Legacy image routes | Active | Removed (404) |

Behavior requirements:
- Cross-project resource access for image routes returns `403`.
- Missing project/resource returns `404`.
- Missing/invalid token returns `401`.

## 4. Parallelization Strategy (Shared Worktree Safe)
Parallel streams:
- Stream A: Graph API + Graph UI (`taskGraph.js`, client graph files, graph tests).
- Stream B: Image schema + service + routes (`schema.js`, `databaseService.js`, `images.js`, `schemas/images.js`).
- Stream C: Test harness + regression tests + OpenAPI assertions (new route test files + `openapi.test.mjs`).
- Stream D: Skill/docs updates (`.agents/skills/zazz-board-api/SKILL.md`, optional docs note).

Serialization hotspots:
- `api/lib/db/schema.js`
- `api/src/services/databaseService.js`
- `api/src/routes/images.js`
- `api/src/schemas/images.js`
- `api/__tests__/routes/openapi.test.mjs`

Merge points:
- Stream C depends on final contracts from Stream A + Stream B.
- Stream D should run after Stream A/B contracts stabilize and OpenAPI assertions are green.

### Mandatory Dependency Edge Sync (Live Task Graph)
- `DEPENDS_ON` in this plan must be reflected as explicit `TASK_RELATIONS` rows (`relation_type = DEPENDS_ON`).
- Do not rely on task-create payload `dependencies` to draw graph lines; create each edge explicitly via:
  - `POST /projects/{code}/tasks/{taskId}/relations`
  - body: `{ "relatedTaskId": <upstreamTaskId>, "relationType": "DEPENDS_ON" }`
- Verification gate for every phase transition:
  - Query DB directly with `psql`:
  - `SELECT task_id, related_task_id, relation_type FROM "TASK_RELATIONS" WHERE task_id BETWEEN <min> AND <max> ORDER BY task_id, related_task_id;`
  - Ensure every non-`none` `DEPENDS_ON` line in this plan has a matching DB row.

## 5. AC Traceability Matrix
| AC | Implementation steps | Tests/evidence |
| --- | --- | --- |
| AC1 | 1.2, 3.4 | `task-graph-scoping.test.mjs` + `openapi.test.mjs` path absence assertion |
| AC2 | 1.3, 3.5 | Manual owner sign-off checklist + client behavior verification (no fetch on null selection) |
| AC3 | 2.3, 3.1 | `image-scoping.test.mjs` task route happy path |
| AC4 | 2.3, 3.1 | `image-scoping.test.mjs` deliverable route happy path |
| AC5 | 2.2, 2.3, 3.1 | `image-scoping.test.mjs` binary/metadata cross-project 403 assertions |
| AC6 | 2.2, 2.3, 3.1 | `image-scoping.test.mjs` mutation route 403 assertions |
| AC7 | 2.3, 3.1, 3.4 | Legacy route 404 tests + grep/audit + skill/doc updates |
| AC8 | 3.2 | `project-id-routes-regression.test.mjs` |
| AC9 | 2.1, 3.1 | DB constraint insert-fail tests (both-set and neither-set) |
| AC10 | 2.3, 3.4 | OpenAPI path add/remove + schema assertions |

## 6. Phased Execution Plan
### Phase 1 - Graph De-Scope + Test Harness Foundation
#### Step 1.1
Objective: Prepare test harness for image-route work and deterministic cleanup.

Files affected:
- `api/__tests__/helpers/testDatabase.js`
- `api/lib/db/schema.js` (imports used by helper only, if needed)

Deliverables/output:
- `clearTaskData()` (or new helper) also clears `IMAGE_DATA` and `IMAGE_METADATA` to prevent image-state bleed.
- Add helper utilities for image test setup (task image + deliverable image seed helpers) if needed.

DEPENDS_ON: none  
COORDINATES_WITH: none  
Parallelizable with: Step `1.2`

TDD: tests to write first:
- Add a basic image fixture cleanup assertion in new `image-scoping.test.mjs` setup section (failing until helper is updated).

TDD: tests to run for completion:
- `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- image-scoping.test.mjs`

Acceptance criteria mapped:
- AC3, AC4, AC5, AC6, AC9 (test infrastructure prerequisite)

Completion signal:
- Image test suite can create/delete fixture images across tests without cross-test contamination.

#### Step 1.2
Objective: Remove project-wide graph endpoint and enforce API contract at test level.

Files affected:
- `api/src/routes/taskGraph.js`
- `api/src/schemas/taskGraph.js`
- `api/__tests__/routes/task-graph-scoping.test.mjs` (new)

Deliverables/output:
- Remove `GET /projects/:code/graph` route and schema export usage.
- Add focused tests:
  - removed route returns `404`
  - `GET /projects/:code/deliverables/:delivId/graph` remains `200`
  - invalid deliverable/project combinations return expected `404`

DEPENDS_ON: none  
COORDINATES_WITH: Step `1.3`  
Parallelizable with: Step `1.1`

TDD: tests to write first:
- Create `task-graph-scoping.test.mjs` with failing assertions for removed route and preserved deliverable route.

TDD: tests to run for completion:
- `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- task-graph-scoping.test.mjs`

Acceptance criteria mapped:
- AC1

Completion signal:
- Removed graph route is unreachable, and deliverable route remains stable under tests.

#### Step 1.3
Objective: Make Task Graph UI strictly deliverable-driven (no project-wide fallback call path).

Files affected:
- `client/src/App.jsx`
- `client/src/hooks/useTaskGraph.js`
- `client/src/pages/TaskGraphPage.jsx` (prompt behavior if no deliverable selected)

Deliverables/output:
- Remove `All tasks (project-wide)` option from selector.
- Selector contains only deliverables.
- `useTaskGraph` does not fetch when `deliverableId` is `null`.
- Task Graph page shows explicit prompt when no deliverable is selected.

DEPENDS_ON: Step `1.2`  
COORDINATES_WITH: none  
Parallelizable with: Step `2.1`

TDD: tests to write first:
- If client test harness is available, add hook/component tests for null-selection no-fetch behavior.
- If no client test harness exists, add a manual verification checklist artifact in this step.

TDD: tests to run for completion:
- `cd client && npm run lint`
- Manual check in running UI:
  - no project-wide selector option
  - no graph API call before deliverable selection
  - clear guidance text shown

Acceptance criteria mapped:
- AC2

Completion signal:
- UI cannot trigger removed project-wide graph API path.

### Phase 2 - Image Ownership Model + Scoped Route Migration
#### Step 2.1
Objective: Implement `IMAGE_METADATA` single-owner model (`task_id XOR deliverable_id`) with DB enforcement.

Files affected:
- `api/lib/db/schema.js`

Deliverables/output:
- Add nullable `deliverable_id` FK to `DELIVERABLES.id`.
- Make `task_id` nullable.
- Add DB check constraint enforcing exactly one owner (`task_id IS NOT NULL` xor `deliverable_id IS NOT NULL`).
- Keep `IMAGE_DATA` unchanged.

DEPENDS_ON: Step `1.1`  
COORDINATES_WITH: Step `2.2`  
Parallelizable with: Step `1.3`

TDD: tests to write first:
- In `image-scoping.test.mjs`, add failing direct DB write cases for:
  - both owner columns set
  - neither owner column set

TDD: tests to run for completion:
- `cd api && npm run db:push`
- `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- image-scoping.test.mjs`

Acceptance criteria mapped:
- AC9

Completion signal:
- Constraint violations are test-proven; valid task/deliverable owner rows insert successfully.

#### Step 2.2
Objective: Refactor image service layer to explicit project-scoped resolution and ownership checks.

Files affected:
- `api/src/services/databaseService.js`

Deliverables/output:
- Replace legacy generic methods with scoped methods for:
  - task image list/upload/delete under project+deliverable+task context
  - deliverable image list/upload/delete under project+deliverable context
  - project-scoped image binary + metadata fetch
- Add project ownership resolution for each operation.
- Standardize error semantics for service consumers (`not found` vs `forbidden` conditions).

DEPENDS_ON: Step `2.1`  
COORDINATES_WITH: Step `2.3`  
Parallelizable with: none (high-conflict file)

TDD: tests to write first:
- Add failing assertions in `image-scoping.test.mjs` for cross-project `403` and missing-resource `404`.

TDD: tests to run for completion:
- `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- image-scoping.test.mjs`

Acceptance criteria mapped:
- AC5, AC6, AC9

Completion signal:
- Service APIs provide all scoped operations needed by routes with correct auth/error behavior.

#### Step 2.3
Objective: Replace legacy image routes/schemas with project-code-scoped contracts and deliverable image support.

Files affected:
- `api/src/routes/images.js`
- `api/src/schemas/images.js`
- `api/src/schemas/validation.js` (if export surface changes)

Deliverables/output:
- Remove:
  - `GET /tasks/:taskId/images`
  - `POST /tasks/:taskId/images/upload`
  - `DELETE /tasks/:taskId/images/:imageId`
  - `GET /images/:id`
  - `GET /images/:id/metadata`
- Add:
  - `GET /projects/:code/deliverables/:delivId/tasks/:taskId/images`
  - `POST /projects/:code/deliverables/:delivId/tasks/:taskId/images/upload`
  - `DELETE /projects/:code/deliverables/:delivId/tasks/:taskId/images/:imageId`
  - `GET /projects/:code/deliverables/:delivId/images`
  - `POST /projects/:code/deliverables/:delivId/images/upload`
  - `DELETE /projects/:code/deliverables/:delivId/images/:imageId`
  - `GET /projects/:code/images/:id`
  - `GET /projects/:code/images/:id/metadata`
- Route handlers enforce project-resource ownership (`403` on cross-project).

DEPENDS_ON: Step `2.2`  
COORDINATES_WITH: none  
Parallelizable with: none (shared route/schema files)

TDD: tests to write first:
- Build full failing endpoint matrix in `image-scoping.test.mjs` for `200/201`, `401`, `403`, `404`, and legacy-route `404`.

TDD: tests to run for completion:
- `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- image-scoping.test.mjs`

Acceptance criteria mapped:
- AC3, AC4, AC5, AC6, AC7

Completion signal:
- Only scoped image routes remain exposed; legacy routes are absent.

#### Step 2.4
Objective: Align core API metadata text with new image contract language.

Files affected:
- `api/src/routes/index.js`
- `api/src/server.js` (tag/description text only, if needed)

Deliverables/output:
- Root endpoint docs/list no longer imply legacy `/images` global usage.
- Tag descriptions reflect scoped task/deliverable image operations.

DEPENDS_ON: Step `2.3`  
COORDINATES_WITH: Step `3.4`  
Parallelizable with: Step `3.2`

TDD: tests to write first:
- Add/adjust OpenAPI assertions first (Step `3.4`) for updated descriptions when practical.

TDD: tests to run for completion:
- `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- openapi.test.mjs`

Acceptance criteria mapped:
- AC10

Completion signal:
- Generated OpenAPI/service metadata no longer references legacy image behavior.

### Phase 3 - Regression Net, OpenAPI Contract, and Skill/Docs
#### Step 3.1
Objective: Add comprehensive image scoping integration tests.

Files affected:
- `api/__tests__/routes/image-scoping.test.mjs` (new)
- `api/__tests__/helpers/testDatabase.js` (if additional helpers are needed)

Deliverables/output:
- Pactum tests cover:
  - task image routes (`200/201`, `401`, `403`, `404`)
  - deliverable image routes (`200/201`, `401`, `403`, `404`)
  - project-scoped image fetch + metadata (`200`, `403`, `404`)
  - legacy route removal (`404`)
  - DB ownership constraint behavior

DEPENDS_ON: Steps `2.1`, `2.3`  
COORDINATES_WITH: Step `3.4`  
Parallelizable with: Step `3.2`

TDD: tests to write first:
- This step is test-authoring itself; create exhaustive failing suite before final route/service edits close.

TDD: tests to run for completion:
- `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- image-scoping.test.mjs`

Acceptance criteria mapped:
- AC3, AC4, AC5, AC6, AC7, AC9

Completion signal:
- Image route behavior and ownership invariants are fully test-enforced.

#### Step 3.2
Objective: Lock regression behavior for accepted unchanged project-id routes.

Files affected:
- `api/__tests__/routes/project-id-routes-regression.test.mjs` (new)

Deliverables/output:
- Regression tests for:
  - `GET /projects/:id`
  - `GET /projects/:id/kanban/tasks/column/:status`
  - `GET /projects/:id/tasks`

DEPENDS_ON: none  
COORDINATES_WITH: none  
Parallelizable with: Step `3.1`

TDD: tests to write first:
- Add failing assertions (if route behavior drifted during refactor).

TDD: tests to run for completion:
- `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- project-id-routes-regression.test.mjs`

Acceptance criteria mapped:
- AC8

Completion signal:
- These three routes are protected against accidental refactor regression.

#### Step 3.3
Objective: Finalize graph removal regression tests.

Files affected:
- `api/__tests__/routes/task-graph-scoping.test.mjs`

Deliverables/output:
- Confirm removed project graph route remains absent while deliverable graph path remains healthy.

DEPENDS_ON: Step `1.2`  
COORDINATES_WITH: Step `3.4`  
Parallelizable with: Step `3.2`

TDD: tests to write first:
- Done in Step `1.2`; extend edge-case matrix here if needed.

TDD: tests to run for completion:
- `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- task-graph-scoping.test.mjs`

Acceptance criteria mapped:
- AC1

Completion signal:
- Graph contract regression is permanently enforced.

#### Step 3.4
Objective: Harden OpenAPI tests for all route removals/additions and schema shape.

Files affected:
- `api/__tests__/routes/openapi.test.mjs`

Deliverables/output:
- Add assertions that OpenAPI:
  - omits `/projects/{code}/graph`
  - omits all legacy image paths
  - includes all new scoped task/deliverable/project image paths
  - includes expected params/body/response schema references for new routes

DEPENDS_ON: Steps `1.2`, `2.3`  
COORDINATES_WITH: Step `2.4`  
Parallelizable with: Step `3.3`

TDD: tests to write first:
- Add failing path presence/absence assertions before route/schema edits finalize.

TDD: tests to run for completion:
- `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- openapi.test.mjs`

Acceptance criteria mapped:
- AC1, AC7, AC10

Completion signal:
- OpenAPI contract and docs are test-locked to final intended route set.

#### Step 3.5
Objective: Update API skill/docs and perform final verification gate.

Files affected:
- `.agents/skills/zazz-board-api/SKILL.md`
- `docs/swagger-for-agent-enhancement.md` (if examples reference removed routes)

Deliverables/output:
- Remove/replace legacy image route guidance and project-wide graph references.
- Route resolution guidance prefers only scoped image routes for this repo contract.
- Final verification record with command outputs and manual UI sign-off notes.

DEPENDS_ON: Steps `1.3`, `2.4`, `3.1`, `3.2`, `3.3`, `3.4`  
COORDINATES_WITH: none  
Parallelizable with: none

TDD: tests to write first:
- N/A (docs step), but verify against generated OpenAPI.

TDD: tests to run for completion:
- `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test`
- `cd client && npm run lint`
- Manual owner sign-off checklist for AC2

Acceptance criteria mapped:
- AC2, AC7, AC10

Completion signal:
- Automated checks pass, docs/skills match implementation, and owner confirms graph UX behavior.

### Phase 4 - Worktree Dependency Hardening (Post-Plan Improvement)
#### Step 4.1
Objective: Remove manual `drizzle-orm` symlink workaround and harden worktree dependency setup.

Files affected:
- `package.json`
- `package-lock.json`
- `AGENTS.md`
- `CONTRIBUTOR_SETUP.md`

Deliverables/output:
- Root dependency install path supports `drizzle-kit` execution without manual symlinks.
- Troubleshooting/setup docs explicitly direct install workflow and prohibit manual `node_modules` symlink hacks.
- DB reset/push commands succeed without symlink dependency.

DEPENDS_ON: Step `3.5`  
COORDINATES_WITH: none  
Parallelizable with: none

TDD: tests to write first:
- N/A (operational hardening/documentation step).

TDD: tests to run for completion:
- `cd api && DATABASE_URL=postgres://postgres:password@localhost:5433/zazz_board_test npm run db:push`
- `cd api && DATABASE_URL=postgres://postgres:password@localhost:5433/zazz_board_test npm run db:reset`

Acceptance criteria mapped:
- Operational hardening (worktree setup reliability)

Completion signal:
- Database lifecycle commands run successfully without symlink creation.

## Implementation Status Snapshot (2026-03-07)
| Step | Live Task ID | Status | DEPENDS_ON plan | DB relation check |
| --- | --- | --- | --- | --- |
| 1.1 | 13 | COMPLETED | none | N/A |
| 1.2 | 14 | COMPLETED | none | N/A |
| 1.3 | 15 | COMPLETED | 1.2 | `15 -> 14` |
| 2.1 | 16 | COMPLETED | 1.1 | `16 -> 13` |
| 2.2 | 17 | COMPLETED | 2.1 | `17 -> 16` |
| 2.3 | 18 | COMPLETED | 2.2 | `18 -> 17` |
| 2.4 | 20 | COMPLETED | 2.3 | `20 -> 18` |
| 3.1 | 21 | COMPLETED | 2.1, 2.3 | `21 -> 16`, `21 -> 18` |
| 3.2 | 19 | COMPLETED | none | N/A |
| 3.3 | 22 | COMPLETED | 1.2 | `22 -> 14` |
| 3.4 | 23 | COMPLETED | 1.2, 2.3 | `23 -> 14`, `23 -> 18` |
| 3.5 | 24 | COMPLETED | 1.3, 2.4, 3.1, 3.2, 3.3, 3.4 | `24 -> 15/20/21/19/22/23` |
| 4.1 | 25 | COMPLETED | 3.5 | `25 -> 24` |
| 4.2 | 26 | COMPLETED | 1.3 | `26 -> 15` |
| 4.3 | 27 | COMPLETED | 4.2 | `27 -> 26` |

DB verification command used:
- `docker exec zazz_board_postgres psql -U postgres -d zazz_board_db -c "SELECT task_id, related_task_id, relation_type, updated_at FROM \"TASK_RELATIONS\" WHERE task_id BETWEEN 13 AND 30 ORDER BY task_id, related_task_id;"`

## 7. Test Command Matrix (Execution Order)
1. `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- task-graph-scoping.test.mjs`
2. `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- image-scoping.test.mjs`
3. `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- project-id-routes-regression.test.mjs`
4. `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- openapi.test.mjs`
5. `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test`
6. `cd client && npm run lint`

## 8. Risks and Mitigations
- Risk: Existing tests do not currently cover image routes.
  - Mitigation: Add dedicated `image-scoping.test.mjs` before finalizing route changes.
- Risk: No token-to-project mapping exists today, while SPEC asks for cross-project denial.
  - Mitigation: Enforce project ownership via route path/resource relationship and assert `403` for cross-project resource access attempts.
- Risk: Schema changes can drift from OpenAPI docs.
  - Mitigation: add explicit OpenAPI path-add/path-remove assertions and keep schema-first edits in `api/src/schemas/images.js`.

## 9. Approval Checklist
- [ ] Owner accepts the AC traceability matrix and phase structure.
- [ ] Owner accepts assumption that cross-project checks are route/resource-ownership based (not membership system redesign).
- [ ] Owner approves proceeding with this CODEX plan as implementation source.
