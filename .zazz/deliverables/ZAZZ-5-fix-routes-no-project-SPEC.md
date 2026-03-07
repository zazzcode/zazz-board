# Fix Routes No Project Specification

## 1. Problem Statement

**What**: Several API routes operate on project-scoped data (task graph, images) without consistent project-code scoping. The Task Graph UI also includes a project-wide graph mode that is not desired.

**Why**: Authorization should be constrained to a specific project. Inconsistent route scoping and project-wide graph behavior create ambiguous access patterns and increase risk of cross-project data exposure.

**Who**: Agents using the zazz-board-api skill; any client with a valid token.

**Current state**:
- The UI Task Graph page includes an `All tasks (project-wide)` option that calls `GET /projects/{code}/graph`.
- Image routes are not project-code-scoped:
  - `GET /tasks/{taskId}/images`
  - `POST /tasks/{taskId}/images/upload`
  - `DELETE /tasks/{taskId}/images/{imageId}`
  - `GET /images/{id}`
  - `GET /images/{id}/metadata`
- Images are currently task-only. Deliverable-card images are planned but not yet supported by dedicated routes.

**Desired state**:
- Remove `GET /projects/{code}/graph` and remove the `All tasks (project-wide)` UI option.
- Task graph UI must be deliverable-driven: user explicitly selects a deliverable.
- Image APIs must be project-code-scoped and support both task images and deliverable images, with strict project ownership validation.
- Existing internal project-id routes not exposed in normal browser navigation may remain unchanged in this deliverable.

---

## 2. Standards Applied

- **testing.md** — PactumJS for API tests; every route needs happy path, edge cases, 401/403/404; tests must be written before or alongside implementation
- **system-architecture.md** — API layer, auth middleware
- **data-architecture.md** — Tasks belong to deliverables; deliverables belong to projects; images currently belong to tasks
- **coding-styles.md** — Project-scoped handler pattern and business logic validation rules

---

## 3. Scope

### In Scope

- Remove project-wide graph route and behavior:
  - Remove API route `GET /projects/{code}/graph`
  - Remove `All tasks (project-wide)` UI option
  - Require explicit deliverable selection for graph rendering
- Keep these project-id routes unchanged for now (explicitly accepted in this deliverable):
  - `/projects/{id}`
  - `/projects/{id}/kanban/tasks/column/{status}`
  - `/projects/{id}/tasks`
- **Remove legacy image routes and all API usage**: Delete the following routes from the API and remove any code that calls them (client, databaseService, zazz-board-api skill, etc.):
  - `GET /tasks/{taskId}/images`
  - `POST /tasks/{taskId}/images/upload`
  - `DELETE /tasks/{taskId}/images/{imageId}`
  - `GET /images/{id}`
  - `GET /images/{id}/metadata`
- Introduce project-scoped image route design for task and deliverable images:
  - Task image routes under `/projects/{code}/deliverables/{delivId}/tasks/{taskId}/images...`
  - Deliverable image routes under `/projects/{code}/deliverables/{delivId}/images...`
  - Image fetch/metadata routes scoped under `/projects/{code}/images/{id}...`
- Update image data model to single-owner ownership:
  - `IMAGE_METADATA.task_id` becomes nullable
  - Add `IMAGE_METADATA.deliverable_id` (nullable FK to `DELIVERABLES.id`)
  - Enforce exactly one owner (`task_id` XOR `deliverable_id`) with DB constraint
  - Keep `IMAGE_DATA` as image binary payload store keyed by image metadata id
  - **Schema change scope**: Modify only the `IMAGE_METADATA` table (and rebuild it). There is no image data in seed data. Do **not** perform a full database reset or replace other tables—only alter/rebuild `IMAGE_METADATA`.
- Add authorization checks so tokens cannot access images from other projects
- Add PactumJS tests for route behavior and cross-project authorization
- Update zazz-board-api skill/docs for new image and graph route expectations
- Update Swagger/OpenAPI route documentation and schemas for all changed/added image and graph endpoints

### Out of Scope

- Tags (`/tags`) — design decision: tags may be global or project-scoped; defer to separate deliverable
- Project-level access control (USER_PROJECTS, membership) — see future-fixes.md #5
- Standardizing all `:id` vs `:code` project params across every route
- UI image components on cards (actual card feature work comes after route/API capability is in place)

---

## 4. Features & Requirements

- **F1 (Graph route removal)**: Remove `GET /projects/{code}/graph` from API and OpenAPI output.
- **F2 (Graph UI behavior)**: On the Task Graph page, remove the `All tasks (project-wide)` dropdown option; the dropdown must list only deliverables; require explicit deliverable selection before fetching graph data; when none selected, show a prompt and do not call the graph API.
- **F3 (Task image scoping)**: Remove legacy task image routes and add project+deliverable+task scoped routes:
  - `GET /projects/{code}/deliverables/{delivId}/tasks/{taskId}/images`
  - `POST /projects/{code}/deliverables/{delivId}/tasks/{taskId}/images/upload`
  - `DELETE /projects/{code}/deliverables/{delivId}/tasks/{taskId}/images/{imageId}`
- **F4 (Deliverable image capability)**: Add deliverable image routes:
  - `GET /projects/{code}/deliverables/{delivId}/images`
  - `POST /projects/{code}/deliverables/{delivId}/images/upload`
  - `DELETE /projects/{code}/deliverables/{delivId}/images/{imageId}`
- **F5 (Project-scoped image fetch by id)**: Remove global image fetch routes and add project-scoped equivalents:
  - `GET /projects/{code}/images/{id}`
  - `GET /projects/{code}/images/{id}/metadata`
- **F6 (Authorization guarantees)**: For all image endpoints, verify resource belongs to the specified project; return 403 for cross-project access.
- **F7 (Cloud-ready behavior continuity)**: Keep storage abstraction behavior compatible with local DB now and object-storage backends (e.g., S3/GCS) later.
- **F8 (Single-owner image model)**: Implement a single-owner model in `IMAGE_METADATA` so an image belongs to exactly one owner type:
  - owner is either task (`task_id`) or deliverable (`deliverable_id`)
  - never both and never neither (DB-enforced)
  - `IMAGE_DATA` remains linked 1:1 to image metadata
- **F9 (Swagger/OpenAPI updates)**: Update Fastify schemas/OpenAPI generation to document:
  - removed `GET /projects/{code}/graph`
  - new/updated project-scoped task image routes
  - new deliverable image routes
  - project-scoped image fetch/metadata routes

---

## 5. Acceptance Criteria

- **AC1**: `GET /projects/{code}/graph` is removed from API and OpenAPI spec — Verified by: API/OpenAPI test
- **AC2**: Task Graph UI is deliverable-only: the center dropdown must not offer `All tasks (project-wide)`; it must list only deliverables; user must select a deliverable before any graph data is fetched; when no deliverable is selected, show a prompt (e.g. "Select a deliverable to view the task graph") and do not call any graph API — Verified by: Owner sign-off + UI behavior test/manual verification
- **AC3**: New task image routes under `/projects/{code}/deliverables/{delivId}/tasks/{taskId}/images...` support happy-path access for same-project token — Verified by: API test
- **AC4**: New deliverable image routes under `/projects/{code}/deliverables/{delivId}/images...` support happy-path access for same-project token — Verified by: API test
- **AC5**: `GET /projects/{code}/images/{id}` and `GET /projects/{code}/images/{id}/metadata` return 403 when image belongs to a different project — Verified by: API test
- **AC6**: All scoped image mutation routes return 403 when token project does not match resource project — Verified by: API test
- **AC7**: Legacy non-project-scoped image routes are **removed** from the API, and all callers (client, databaseService, zazz-board-api skill) are updated to use the new project-scoped routes — Verified by: API test (legacy routes return 404) + grep/audit for no remaining usage
- **AC8**: The three accepted project-id routes remain unchanged and functional:
  - `/projects/{id}`
  - `/projects/{id}/kanban/tasks/column/{status}`
  - `/projects/{id}/tasks`
  — Verified by: API regression test
- **AC9**: `IMAGE_METADATA` supports single-owner association with DB-level constraint that exactly one of `task_id` or `deliverable_id` is set — Verified by: DB constraint validation + API integration tests
- **AC10**: Swagger/OpenAPI reflects all graph/image endpoint removals and additions with accurate params/body/response schemas — Verified by: OpenAPI test + Owner review in `/docs`

---

## 6. Definition of Done

- [ ] All AC satisfied
- [ ] All PactumJS tests passing
- [ ] Route/schema changes for this deliverable are not considered complete without corresponding PactumJS and OpenAPI coverage
- [ ] No regression in existing deliverable-scoped graph route (`/projects/{code}/deliverables/{delivId}/graph`)
- [ ] zazz-board-api skill/docs updated for route removals/additions
- [ ] Owner sign-off for UI graph behavior and route removal choices

---

## 7. Test Requirements

### API Tests (PactumJS)

- **TDD policy for this deliverable**:
  - For each added/changed route, write failing PactumJS coverage first or in the same implementation step before completion.
  - Do not merge route/schema changes without corresponding PactumJS and OpenAPI test updates.

- **Graph route removal**:
  - `GET /projects/{code}/graph` must return 404 after removal (route deleted, not deprecated)
  - `GET /projects/{code}/deliverables/{delivId}/graph` remains 200 for valid project/deliverable pair
- **Task image routes** (new scoped routes):
  - Happy path: token for project A, task in project A → 200/201
  - Cross-project: token for project A, task in project B → 403
  - No auth: missing/invalid token → 401
  - Not found: invalid project/deliverable/task/image ids → 404
- **Deliverable image routes** (new):
  - Happy path: token for project A, deliverable in project A → 200/201
  - Cross-project: token for project A, deliverable in project B → 403
  - No auth: missing/invalid token → 401
  - Not found: invalid deliverable/image ids → 404
- **Single-owner data model checks**:
  - Creating task image writes `task_id` and leaves `deliverable_id` null
  - Creating deliverable image writes `deliverable_id` and leaves `task_id` null
  - Attempts to persist both owner columns set fail DB constraint
  - Attempts to persist neither owner column set fail DB constraint
- **Image-by-id project-scoped fetch**:
  - `GET /projects/{code}/images/{id}` and `/metadata` return 200 for same project, 403 for cross-project, 404 for missing image
- **Project-id route regression checks**:
  - Verify `/projects/{id}`, `/projects/{id}/kanban/tasks/column/{status}`, `/projects/{id}/tasks` still function as before
- **Legacy route removal checks**:
  - `GET /tasks/{taskId}/images`, `POST /tasks/{taskId}/images/upload`, `DELETE /tasks/{taskId}/images/{imageId}`, `GET /images/{id}`, `GET /images/{id}/metadata` all return 404 (routes removed)
- **OpenAPI/Swagger checks**:
  - Generated OpenAPI contains all new image paths and omits removed graph and legacy image paths
  - Route params and request/response schemas match implementation
- **Setup**:
  - Use ZAZZ and MOBDEV projects (seeded); create deliverables/tasks/images in each as needed
  - Use tokens scoped to each project to verify cross-project denial paths

---

## 8. Agent Constraints & Guidelines

### Always Do

- Follow testing.md: PactumJS tests for new/updated routes
- Resolve resource ownership before responding:
  - Task image: image/task → deliverable → project
  - Deliverable image: image/deliverable → project
- Ensure UI graph view is deliverable-selected only (no project-wide fallback mode)

### Ask First (Escalate When)

- Any schema changes beyond the documented `IMAGE_METADATA` single-owner model

### Never Do

- Return project B's data to a token scoped to project A
- Reintroduce an implicit project-wide graph view without explicit Owner approval

### Prefer When Multiple Options

- Prefer explicit project-code-scoped route paths for image operations over global-id routes
- Prefer consistent route composition with existing deliverable/task route conventions

---

## 9. Decomposition (if complex)

### Components

- Remove project-wide graph API route and related schema/docs references
- Update Task Graph UI to deliverable-only selection mode
- Implement scoped task and deliverable image routes
- Add/adjust image ownership validation logic
- PactumJS coverage for new scoped routes and removed routes
- Update zazz-board-api skill/docs

### Break Patterns for Planner

- Phase 1: Graph route/UI cleanup (`/projects/{code}/graph` removal + dropdown behavior)
- Phase 2: Image route expansion and project-scoped authorization for task + deliverable images
- Phase 3: Tests, OpenAPI updates, docs/skill updates

---

## 10. Evaluation

- **Functional**:
  - Project-wide graph endpoint is removed
  - Graph UI requires explicit deliverable selection
  - Image routes are project-scoped and enforce project authorization
- **Quality**: Tests pass; no new lint issues
- **Completeness**: DoD checklist satisfied
- **Owner verification**: Graph UX matches expectation; route scope decisions accepted

---

## 11. Technical Context

- **Integration**:
  - Task Graph UI currently calls `/projects/{code}/graph` when no deliverable is selected (via `useTaskGraph(projectCode, null)`); this behavior will be removed. `useTaskGraph` must not fetch when `deliverableId` is null—only call `/projects/{code}/deliverables/{delivId}/graph` when a deliverable is selected.
  - Existing graph endpoint `/projects/{code}/deliverables/{delivId}/graph` remains the supported path.
  - Image handling must remain compatible with DB storage now and object storage backends later.
- **Likely modified**:
  - `api/lib/db/schema.js`
  - `api/src/services/databaseService.js`
  - `api/src/routes/taskGraph.js`
  - `api/src/routes/images.js`
  - `api/src/schemas/images.js` and OpenAPI-related tests
  - `client/src/hooks/useTaskGraph.js`
  - `client/src/App.jsx` and `client/src/pages/TaskGraphPage.jsx`
  - `.agents/skills/zazz-board-api/SKILL.md`
- **Dependencies**:
  - Schema change for `IMAGE_METADATA` only: add `deliverable_id`, make `task_id` nullable, add XOR constraint. Rebuild that table; no full DB reset. Seed data has no images.

---

## 12. Edge Cases & Constraints

- **Task/deliverable not found**: Return 404
- **Cross-project resource**: Return 403 for valid resource in another project when authorization context differs
- **Image ownership checks**: Ensure image lookup path includes ownership validation before returning binary/metadata
- **Ownership model**: Single-owner invariant must be enforced in DB and respected in service layer logic
- **Legacy routes**: Removed entirely; no backward-compatible aliases. All callers must use new project-scoped routes.
- **Performance**: Additional ownership lookups per image request are acceptable for this deliverable
