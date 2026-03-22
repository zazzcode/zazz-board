# Future Fixes

Cleanup and improvements **outside the scope** of current deliverables. Add items here for later.

---

## 1. Project route param inconsistency: `:id` vs `:code`

**Current state**: Mixed usage across project-scoped routes.

| Route pattern | Param | Resolution |
|---------------|-------|-------------|
| `GET /projects/:id` | `:id` (numeric) | `getProjectById(parseInt(id))` |
| `GET /projects/:id/tasks` | `:id` (numeric) | `projectId: parseInt(id)` |
| `GET /projects/:id/kanban/tasks/column/:status` | `:id` (numeric) | `getProjectById` |
| `PATCH /projects/:code/kanban/...` | `:code` | `getProjectByCode(code)` |
| `PATCH /projects/:code/tasks/:taskId/status` | `:code` | `getProjectByCode` |
| `GET /projects/:code/deliverables/...` | `:projectCode` | `getProjectByCode` |

**DB schema**: All child tables use `project_id` (integer FK to `PROJECTS.id`). `PROJECTS` has both `id` and `code`.

**Design intent**: Auth is project-based; routes validate access via project. Agent tokens scope to `project_id`.

**Routes using `:id`** (projects.js): `GET /projects/:id`, `PUT /projects/:id`, `DELETE /projects/:id`, `GET /projects/:id/tasks`, `GET /projects/:id/kanban/tasks/column/:status`

**Routes using `:code` or `:projectCode`**: All other project-scoped routes (deliverables, kanban positions, statuses, task graph, etc.)

**Fix**: Standardize project-scoped routes on `:code` (human-readable, e.g. ZAZZ, MOBDEV). Migrate `:id` routes to `:code` and use `getProjectByCode` everywhere. Update client and tests accordingly.

---

## 2. Legacy naming: task_blaster_* vs zazz_board_*

**Current state**: Some docs and env examples still reference `task_blaster_dev`, `task_blaster_test`, `task_blaster_postgres`.

**Fix**: Update `api/__tests__/README.md` and any `.env.example` to use `zazz_board_*` consistently. AGENTS.md already uses `zazz_board_test`.

---

## 3. Seeded agent tokens — project scope

**Current state**: multiple-agent-tokens-feature seeds 5 tokens across ZAZZ, MOBDEV, APIMOD.

**Design**: Seeded tokens must stay **consistent** (fixed UUIDs) so API tests can rely on them. Tests use known tokens (e.g. `660e8400-e29b-41d4-a716-446655440001` for ZAZZ) for agent-workflow, deliverables-approval, wrong-project 403, etc.

**Optional cleanup**: Restrict seeded agent tokens to 1–2 projects (ZAZZ, MOBDEV) if APIMOD is not needed for agent tests. Keeps seed data minimal.

---

## 5. Project-level access restrictions

**Current state**: All authenticated users have access to all projects. No USER_PROJECTS or membership model. No project-level restrictions.

**Limitation**: One leader per project (`PROJECTS.leader_id`); leaders have additional capabilities (manage agent tokens for all users, update status workflows). Non-leaders see only their own agent tokens.

**Fix**: Implement project-level access control (e.g. USER_PROJECTS, membership, invite flow). Consider multi-leader support if needed.

---

## 6. Multi-instance token cache

**Current state**: In-memory token cache; single API instance assumed. On agent token create/delete, add/remove from local cache.

**Limitation**: With multiple API instances (horizontal scaling), token create/delete on instance A is not visible to instance B. Revoked tokens may still work until instance B restarts.

**Fix**: Shared cache (e.g. Redis) so all instances see token create/delete. Or pub/sub invalidation. Document and implement when scaling.

## 4. Non-project routes and agent tokens

**Current state**: Routes without project in path: `GET /projects`, `GET /users`, `GET /users/me`, `GET /tags`, `GET /images`, `GET /status-definitions`, `GET /coordination-types`, `GET /translations/:language`, `GET /health`, etc.

**Design**: Non-project routes just work—no agent-token restriction. Authorization is limited to project-scoped routes. When a route gains project scoping (e.g. images become project-scoped), add agent-token authorization there. Authorization follows route scoping; don't restrict until the route has project context.

 use **Dredd/Schemathesis** only if you need full contract testing.

 need to fix  dedFilePath to **specFilePath**

 we are going to need to create new seed data for these two deliverables before fix the column
