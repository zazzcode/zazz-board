# Fix Routes No Project Specification

## 1. Problem Statement

**What**: Several API routes operate on project-scoped data (tasks, images) but do not include project in the path or verify that the requested resource belongs to a project the caller is authorized to access.

**Why**: An agent token scoped to project A could access or modify data belonging to project B (e.g. task images, task metadata). This is a data isolation and authorization gap.

**Who**: Agents using the zazz-board-api skill; any client with a valid token.

**Current state**: Routes such as `GET /tasks/:taskId/images`, `POST /tasks/:taskId/images/upload`, `GET /images/:id`, `GET /images/:id/metadata` accept a taskId or imageId without project context. The auth middleware validates the token but does not verify the resource belongs to the token's project.

**Desired state**: All routes that operate on project-scoped resources must either (a) include project in the path and verify access, or (b) resolve the resource's project and verify the token has access before returning data.

---

## 2. Standards Applied

- **testing.md** — PactumJS for API tests; every route needs happy path, edge cases, 401/403/404
- **system-architecture.md** — API layer, auth middleware
- **data-architecture.md** — Tasks belong to deliverables; deliverables belong to projects; images belong to tasks

---

## 3. Scope

### In Scope

- Audit all API routes to identify which operate on project-scoped data without project filtering
- Fix image routes: `/tasks/:taskId/images`, `/tasks/:taskId/images/upload`, `/images/:id`, `/images/:id/metadata`, `DELETE /tasks/:taskId/images/:imageId` — add project verification
- Add PactumJS tests for cross-project access (403 when token for project A accesses project B's data)
- Update zazz-board-api skill if route paths change (e.g. images under `/projects/:code/...`)

### Out of Scope

- Tags (`/tags`) — design decision: tags may be global or project-scoped; defer to separate deliverable
- Project-level access control (USER_PROJECTS, membership) — see future-fixes.md #5
- Standardizing `:id` vs `:code` for project params — see future-fixes.md #1

---

## 4. Features & Requirements

- **F1**: Identify all routes that operate on project-scoped data (tasks, deliverables, images) but lack project in path or project verification
- **F2**: For image routes: verify the task (and thus its project) belongs to a project the token can access before returning data or performing mutations
- **F3**: Return 403 Forbidden when a valid token attempts to access another project's data
- **F4**: Add PactumJS tests: happy path (same project), 403 (cross-project), 401 (no/invalid token), 404 (resource not found)

---

## 5. Acceptance Criteria

- **AC1**: `GET /tasks/:taskId/images` returns 403 when the task belongs to a project different from the token's project — Verified by: API test
- **AC2**: `POST /tasks/:taskId/images/upload` returns 403 when the task belongs to a different project — Verified by: API test
- **AC3**: `GET /images/:id` returns 403 when the image's task belongs to a different project — Verified by: API test
- **AC4**: `GET /images/:id/metadata` returns 403 when the image's task belongs to a different project — Verified by: API test
- **AC5**: `DELETE /tasks/:taskId/images/:imageId` returns 403 when the task belongs to a different project — Verified by: API test
- **AC6**: All image routes return 200/201 as before when the task belongs to the token's project — Verified by: API test
- **AC7**: Document the list of routes that were audited and which were fixed vs deferred — Verified by: Owner sign-off

---

## 6. Definition of Done

- [ ] All AC satisfied
- [ ] All PactumJS tests passing
- [ ] No regression in existing image route tests
- [ ] zazz-board-api skill updated if paths change
- [ ] Owner sign-off for AC7 (audit list)

---

## 7. Test Requirements

### API Tests (PactumJS)

- **Image routes**: For each of GET/POST /tasks/:taskId/images, GET /images/:id, GET /images/:id/metadata, DELETE /tasks/:taskId/images/:imageId:
  - Happy path: token for project A, task in project A → 200/201
  - Cross-project: token for project A, task in project B → 403
  - No auth: missing/invalid token → 401
  - Not found: valid taskId/imageId that doesn't exist → 404
- **Setup**: Create deliverables and tasks in ZAZZ and APIMOD (or MOBDEV); use seeded tokens for each project; attempt cross-project access

---

## 8. Agent Constraints & Guidelines

### Always Do

- Follow testing.md: PactumJS tests for new/updated routes
- Resolve task → deliverable → project to verify project ownership before returning image data

### Ask First (Escalate When)

- Whether to change route paths (e.g. `/projects/:code/tasks/:taskId/images`) vs. keep paths and add project verification in handler
- Tags or other non-image routes that might need project scoping

### Never Do

- Return project B's data to a token scoped to project A
- Skip the 403 cross-project tests

### Prefer When Multiple Options

- Prefer adding project verification in the handler (resolve task → project, check token) over changing route paths, to minimize client/skill churn. If path change is cleaner, do it.

---

## 9. Decomposition (if complex)

### Components

- Route audit (manual/code review)
- Image route handlers: add project verification
- PactumJS tests for cross-project 403
- zazz-board-api skill update (if paths change)

### Break Patterns for Planner

- Phase 1: Audit and document routes; implement project verification for image routes
- Phase 2: Add PactumJS tests; update skill if needed

---

## 10. Evaluation

- **Functional**: All image routes return 403 for cross-project access; existing same-project flows unchanged
- **Quality**: Tests pass; no new lint issues
- **Completeness**: DoD checklist satisfied
- **Owner verification**: Audit list (AC7) reviewed

---

## 11. Technical Context

- **Integration**: Auth middleware provides `request.user` and project context from token. Image routes need to resolve task → project and compare with token's project.
- **Modified**: `api/src/routes/images.js`; possibly `api/src/middleware/authMiddleware.js` if shared helper for project verification
- **Dependencies**: None

---

## 12. Edge Cases & Constraints

- **Task not found**: Return 404 before 403 (don't leak existence of tasks in other projects)
- **Image not found**: Return 404; if we resolve image → task → project for 403, ensure we don't leak image existence across projects
- **Performance**: Resolving task → project adds one DB lookup per request; acceptable for image routes
