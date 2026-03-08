# Multiple Agent Tokens Feature Specification

**Project**: Zazz Board
**Deliverable**: multiple-agent-tokens-feature
**Created**: 2026-03-03
**Status**: Draft
**Mode**: Development (SPEC only, no API sync)

---

## 1. Problem Statement

Zazz Board currently uses a single token per user (`USERS.access_token`). Both human users and AI agents share that token. This creates several problems:

- **No project isolation**: An agent token can access any project the user can access. There is no way to scope an agent to a specific project.
- **No multi-agent separation**: Multiple agents (planner, worker, QA, etc.) for the same user must share one token; there is no way to distinguish or revoke individual agent credentials.
- **Audit and security**: Revoking one agent's access requires changing the user's token, which affects all agents and the human user.

**Desired state**: Each user can create multiple **agent tokens**, each tied to a specific project. Agent tokens are scoped to **both user and project**—a token belongs to one user and is authorized for one project only (token for user A + project X cannot access project Y). The user's **user token** (existing `USERS.access_token`) remains for human use and grants full access to all projects the user can access. Agent tokens are stored separately and managed per-project.

**User/beneficiary**: Users who run multiple agents (planner, worker, QA, coordinator) and want to assign agents to specific projects with revocable credentials.

**Current state**: Single token per user; no agent token table; no project-scoping in auth.

---

## 2. Standards Applied

- [data-architecture.md](../standards/data-architecture.md) — Schema-first, Drizzle, table/column naming (UPPER_CASE tables, snake_case columns)
- [testing.md](../standards/testing.md) — PactumJS API tests; every route needs happy path, edge cases, negative tests
- [coding-styles.md](../standards/coding-styles.md) — Prettier, ESLint, camelCase in JS, i18n translations

---

## 3. Scope

### In Scope

- New `AGENT_TOKENS` table: user_id, project_id, token (UUID, indexed), label (optional), created_at (no updated_at—tokens are created or deleted only)
- Seed data for AGENT_TOKENS (seedAgentTokens.js); add to reset-and-seed flow
- Agent tokens scoped to **user + project**—belongs to one user, authorized for one project only
- `USERS.access_token` repurposed as **user token** (human only, full project access)
- `tokenService` and `authMiddleware` extended to support both token types and user+project-scope validation for agent tokens
- **In-memory cache**: Expand existing user-token cache to include agent tokens and project code/id lookup maps; single Map lookup for token validation (no DB hit). Cache populated on startup. **On create**: add new token to cache as part of the create route (no full refresh). **On delete**: remove token from cache as part of the delete route (no full refresh). Assume single API instance for now; multi-instance shared cache is future work.
- API routes: list agent tokens (project + user scoped), create agent token, delete agent token (hard delete)
- Agent token records are immutable after create (no PATCH/PUT update endpoint in API)
- Route protection: agent token must match both user context and project in URL
- UI: new icon on project row (agent or gear) → modal to manage agent tokens
- **Project leader** (PROJECTS.leader_id): sees all users + all their tokens for this project
- **Non-leader**: sees only their own tokens for this project
- Create token: optional label (e.g. "For all agents access token", "Spec builder agent ONLY access token"); token UUID generated on create
- Delete token: two-step confirmation—(1) "Are you sure?" dialog, (2) user must type exact string `delete this token` (lowercase); OK disabled until match; then hard delete
- Token display: full token visible; copy icon copies to clipboard

### Out of Scope

- Fine-grained permissions (all tokens have full access to their scope)
- Token expiration or rotation
- Editing existing token records (including label changes) after creation
- USER_PROJECTS or other project access model changes (use current model; see Project Access below)
- Migration of existing agent usage to new tokens (existing `USERS.access_token` becomes user-only; agents must be reconfigured to use new agent tokens)

### Future Fixes (Identified During Spec Interview)

Cleanup items identified during the specification interview but **outside the scope** of this deliverable are documented in [future-fixes.md](../future-fixes.md). Includes: project route param inconsistency (`:id` vs `:code`), legacy naming (task_blaster vs zazz_board), non-project route behavior for agent tokens, project-level access restrictions, multi-instance cache.

**Non-project routes (agent tokens)**: Non-project routes just work—no restriction. Agent tokens receive the same response as user tokens. Authorization is limited to project-scoped routes. When routes gain project scoping in the future, add agent-token authorization there.

---

## 4. Data Model

### 4.1 Token Types

| Type | Storage | Scope | Use |
|------|---------|-------|-----|
| User token | `USERS.access_token` | All projects user can access | Human users |
| Agent token | `AGENT_TOKENS` table | User + project (belongs to user, authorized for one project) | AI agents |

### 4.2 New Table: AGENT_TOKENS

Agent tokens are scoped to **user + project**: each token belongs to one user and is authorized for one project only. Keys: `user_id`, `project_id`, plus `token` (UUID) for lookup. No `created_by`—tokens are always created by the user they belong to (`user_id`), so it would be redundant.

```sql
CREATE TABLE AGENT_TOKENS (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES USERS(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES PROJECTS(id) ON DELETE CASCADE,
  token      VARCHAR(36) NOT NULL UNIQUE,   -- UUID, indexed for fast lookup
  label      VARCHAR(100),                   -- Optional: "For all agents access token", "Spec builder agent ONLY access token"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_agent_tokens_token ON AGENT_TOKENS(token);
CREATE INDEX idx_agent_tokens_user_project ON AGENT_TOKENS(user_id, project_id);
```

**Drizzle schema** (in `api/lib/db/schema.js`):

```javascript
export const AGENT_TOKENS = pgTable('AGENT_TOKENS', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => USERS.id, { onDelete: 'cascade' }),
  project_id: integer('project_id').notNull().references(() => PROJECTS.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 36 }).notNull().unique(),
  label: varchar('label', { length: 100 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_agent_tokens_token').on(table.token),
  index('idx_agent_tokens_user_project').on(table.user_id, table.project_id),
]);
```

**Key design**:
- Scope: `user_id` + `project_id`—token belongs to user, authorized for project
- `token` and `label` are separate columns; token is indexed for fast auth lookup
- No `created_by`—token is always created by the user it belongs to
- No `updated_at`—tokens are created or deleted only, never updated
- Delete removes the row (hard delete)

### 4.3 USERS Table (Unchanged)

`USERS.access_token` remains. It is repurposed as the **user token** (human only). No schema change.

### 4.4 Seed Data for AGENT_TOKENS

New seeder: `api/scripts/seeders/seedAgentTokens.js`. Add to `reset-and-seed.js` after `seedProjects` (AGENT_TOKENS requires users and projects to exist). Add `DROP TABLE IF EXISTS "AGENT_TOKENS" CASCADE` before PROJECTS in the drop order.

**Seed data** (user_id and project_id reference seeded users and projects):

| user_id | project_id | token | label |
|---------|------------|-------|-------|
| 5 (Michael) | 1 (ZAZZ) | `660e8400-e29b-41d4-a716-446655440101` | For all agents access token |
| 5 (Michael) | 1 (ZAZZ) | `660e8400-e29b-41d4-a716-446655440102` | Spec builder agent ONLY access token |
| 2 (Jane) | 2 (ZED_MER) | `660e8400-e29b-41d4-a716-446655440103` | For all agents access token |
| 2 (Jane) | 2 (ZED_MER) | `660e8400-e29b-41d4-a716-446655440104` | Spec builder agent ONLY access token |
| 3 (Steve) | 2 (ZED_MER) | `660e8400-e29b-41d4-a716-446655440105` | For all agents access token |
| 3 (Steve) | 2 (ZED_MER) | `660e8400-e29b-41d4-a716-446655440106` | Spec builder agent ONLY access token |

**Rationale**: Michael (user 5) has the known user token `550e8400-e29b-41d4-a716-446655440000`; agent tokens use a similar prefix for easy identification. Fixed UUIDs allow PactumJS tests to use a known agent token (e.g. `660e8400-e29b-41d4-a716-446655440101`) for ZAZZ project requests.

**Test stability**: Seeded tokens must stay **consistent** across runs—same UUIDs, same projects—so all API tests can rely on them. Agent token tests use these fixed values. Tokens are seeded only in projects used by agent tests (ZAZZ, ZED_MER).

**USERS seed alignment note**: In `seedUsers`, rename `Mike Johnson` to `Steve Johnson`. Add `Jonathon` as an additional seeded user (new row only) so AGENT_TOKENS seed references remain stable (`user_id` 2/3/5 unchanged).

**Seeder implementation**:
```javascript
// api/scripts/seeders/seedAgentTokens.js
import { db } from '../../lib/db/index.js';
import { AGENT_TOKENS } from '../../lib/db/schema.js';

export async function seedAgentTokens() {
  console.log('  📝 Seeding agent tokens...');
  await db.insert(AGENT_TOKENS).values([
    { user_id: 5, project_id: 1, token: '660e8400-e29b-41d4-a716-446655440101', label: 'For all agents access token' },
    { user_id: 5, project_id: 1, token: '660e8400-e29b-41d4-a716-446655440102', label: 'Spec builder agent ONLY access token' },
    { user_id: 2, project_id: 2, token: '660e8400-e29b-41d4-a716-446655440103', label: 'For all agents access token' },
    { user_id: 2, project_id: 2, token: '660e8400-e29b-41d4-a716-446655440104', label: 'Spec builder agent ONLY access token' },
    { user_id: 3, project_id: 2, token: '660e8400-e29b-41d4-a716-446655440105', label: 'For all agents access token' },
    { user_id: 3, project_id: 2, token: '660e8400-e29b-41d4-a716-446655440106', label: 'Spec builder agent ONLY access token' },
  ]);
  console.log('  ✅ Agent tokens seeded successfully');
}
```

---

## 5. Authentication Logic

### 5.1 In-Memory Token Cache

The existing `tokenService` caches user tokens on startup. **Expand the cache** to include agent tokens and project code/id maps so requests can validate token + project scope from memory.

**Cache structure**:
- `token → { type: 'user'|'agent', userId, projectId?, projectCode?, email?, fullName? }`
- `projectIdByCode: Map<projectCode, projectId>`
- `projectCodeById: Map<projectId, projectCode>`

- **Startup**: Load USERS (access_token → user), AGENT_TOKENS (token → user+project), and PROJECTS (`code ↔ id`) into memory maps
- **Per request**: `tokenService.validateToken(token)` does one token Map lookup; project param normalization uses cached `code ↔ id` maps
- **On agent token create**: Add new token to cache as part of the create route (e.g. `tokenService.addAgentTokenToCache(...)`) — no full refresh
- **On agent token delete**: Remove token from cache as part of the delete route (e.g. `tokenService.removeAgentTokenFromCache(token)`) — no full refresh

**Single instance assumption**: This deliverable assumes one API process. Multi-instance deployments would need a shared cache (e.g. Redis) so all instances see token create/delete; that is future work.

### 5.2 Token Resolution Order

1. Extract token from `TB_TOKEN` or `Authorization: Bearer` header
2. Look up token in cache (single Map lookup)
3. If miss → 401 Unauthorized
4. Read cached token type (`'user' | 'agent'`) and set request token context
5. For user-token-only endpoints: if cached type is `agent`, return `403` immediately (no further auth checks)
6. If token type is `user`: full access (current model). If `agent`: project-scoped checks apply.

### 5.3 Request Context

After validation, attach to `request`:
- `request.user`: { id, email, fullName } (from USERS via user_id)
- `request.tokenType`: `'user'` | `'agent'`
- `request.agentTokenProjectId`: (only if agent) — project_id the token is authorized for
- `request.agentTokenProjectCode`: (only if agent) — project_code the token is authorized for
- `request.agentTokenUserId`: (only if agent) — user_id the token belongs to

### 5.4 Project-Scoped Route Protection

For routes under `/projects/:param/...` (where param may be `:id` or `:code`):
- **User token**: allowed if user has access to the project (per current access model)
- **Agent token**: allowed **only if** `request.agentTokenProjectId` matches the project identified by the route param

If agent token is used for a different project → 403 Forbidden.

**Route param support**: Some routes use `:id` (numeric), others use `:code` (e.g. ZAZZ). Auth middleware must support **both** and normalize via in-memory project maps:
- `:id` → compare directly to `request.agentTokenProjectId` (and optionally derive code via `projectCodeById`)
- `:code` → resolve `projectIdByCode.get(code)` then compare to `request.agentTokenProjectId`
Do not expand scope to standardize routes; add inconsistency to future-fixes.

**Agent route convention**: Agent-usable routes must include project code context (`:code` or `:projectCode`) so auth checks are consistent. If a route has no project context, treat it as user-token-only unless explicitly defined otherwise.

### 5.5 Project Access (Current Model)

**Explicit for this deliverable**: All authenticated users currently have access to all projects. There are no project-level restrictions (no USER_PROJECTS or membership model). The only distinction is **project leader** (`PROJECTS.leader_id === user.id`): one leader per project; leaders have additional capabilities (e.g. manage agent tokens for all users in the project, update status workflows). Non-leaders see only their own agent tokens. Add to future-fixes: project-level access restrictions, multi-leader support.

**Authorization summary**:
- User token (`USERS.access_token`): full project access (current model).
- Agent token (`AGENT_TOKENS.token`): restricted to one project only; any other project returns `403`.

**Routes using `:id`** (projects.js): `GET /projects/:id`, `PUT /projects/:id`, `DELETE /projects/:id`, `GET /projects/:id/tasks`, `GET /projects/:id/kanban/tasks/column/:status`

**Routes using `:code` or `:projectCode`**: All other project-scoped routes (deliverables, tasks, kanban positions, statuses, task graph, etc.)

---

## 6. API Specification

All routes require authentication.

- For general project-scoped routes, user token or matching-project agent token is valid.
- For **agent-token management routes in section 6.1**, **user token only** is valid. Agent tokens are forbidden (`403`) on these routes.

### 6.1 Agent Token CRUD

Agent-token management is intentionally **list/create/delete only**. There is **no PATCH/PUT update endpoint** for agent tokens.

#### GET /projects/:code/users/:userId/agent-tokens

List agent tokens for a **user** within a **project**. Both project and user are in the route path.
This endpoint is **human user token only** (agent tokens forbidden).

- **userId**: Use `me` for the current user, or a numeric user ID. Non-leader: can only use `me` (403 if numeric userId ≠ self). Leader: can use `me` or any user ID.
- **Project leader**: Can request any user's tokens. To get the full tree (all users + tokens), use `GET /projects/:code/agent-tokens` instead.
- **Non-leader**: Must use `me`; returns own tokens only.

**Response 200**:
```json
{
  "userId": 5,
  "userName": "Michael Woytowitz",
  "userEmail": "michael@example.com",
  "tokens": [
    {
      "id": 1,
      "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "label": "For all agents access token",
      "createdAt": "2026-03-03T10:00:00Z"
    }
  ]
}
```

**403**: Agent token used (forbidden on token-management routes); or non-leader requesting another user's tokens.
**404**: Project or user not found.

#### GET /projects/:code/agent-tokens

List all agent tokens for the project. **Project leader only.** Returns a tree: each user with their tokens (labels included). Used for the expandable table/tree UI.
This endpoint is **human user token only** (agent tokens forbidden).

**Response 200**:
```json
{
  "users": [
    {
      "userId": 5,
      "userName": "Michael Woytowitz",
      "userEmail": "michael@example.com",
      "tokens": [
        {
          "id": 1,
          "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          "label": "For all agents access token",
          "createdAt": "2026-03-03T10:00:00Z"
        },
        {
          "id": 2,
          "token": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
          "label": "Spec builder agent ONLY access token",
          "createdAt": "2026-03-03T11:00:00Z"
        }
      ]
    },
    {
      "userId": 2,
      "userName": "Jane Doe",
      "userEmail": "jane@example.com",
      "tokens": [
        {
          "id": 3,
          "token": "c3d4e5f6-a7b8-9012-cdef-345678901234",
          "label": "For all agents access token",
          "createdAt": "2026-03-03T12:00:00Z"
        }
      ]
    }
  ]
}
```

**403**: Non-leader (only project leader can call this); or agent token used (forbidden on token-management routes).
**404**: Project not found.

#### POST /projects/:code/users/:userId/agent-tokens

Create a new agent token for a user and this project. **userId** must be `me` (current user) or, for leaders, the target user's ID. Non-leader can only create for `me`.
This endpoint is **human user token only** (agent tokens forbidden).

**Request body:**
```json
{
  "label": "For all agents access token"
}
```

`label` is optional. Token UUID is generated server-side (e.g. `crypto.randomUUID()`).

**Response 201**:
```json
{
  "id": 1,
  "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "label": "For all agents access token",
  "createdAt": "2026-03-03T10:00:00Z"
}
```

**Note**: Full token is returned on create **and in token list responses** for authorized human users (no masking). Client should show copy-to-clipboard. **Cache**: After creating, call `tokenService.addAgentTokenToCache(token, data)` so the new token is valid on the next request.

**403**: Agent token used (forbidden on token-management routes); or user does not have access to project.
**404**: Project not found.

#### DELETE /projects/:code/users/:userId/agent-tokens/:id

Hard-delete an agent token (remove row). Token becomes invalid immediately. **userId** in path: `me` for self, or numeric ID for leader deleting another user's token.
This endpoint is **human user token only** (agent tokens forbidden).

- **Project leader**: Can delete any token for this project (any user's)
- **Non-leader**: Can delete only their own tokens

**Response 200**: `{ "message": "Token revoked" }`

**Cache**: After deleting, call `tokenService.removeAgentTokenFromCache(token)` so the revoked token is rejected immediately on the next request.

**Response 403**: Agent token used (forbidden on token-management routes), or not authorized to delete this token (e.g. non-leader trying to delete another user's token)
**Response 404**: Token or project not found

---

## 7. UI Specification

### 7.1 Project List — New Icon

**Location**: `ProjectList.jsx` — each project row. Add a new icon at the end of the row (after the Edit icon).

**Icon**: Agent icon (e.g. `IconRobot` from Tabler) or gear (`IconSettings`). Tooltip: "Manage agent tokens" or similar.

**Action**: Click opens the Agent Tokens modal for that project.

### 7.2 Agent Tokens Modal

**Trigger**: Click on the new icon in the project row.

**Content**:
- **Title**: "Agent Tokens for [Project Name]" (or project code)
- **Project leader view**: Expandable tree or table. One row per user; each user row expands to show rows for each of their tokens (label, token, copy icon, delete button). Data from `GET /projects/:code/agent-tokens`. Structure: User row → token rows (indented or nested).
- **Non-leader view**: Same expandable structure but only current user. Data from `GET /projects/:code/users/me/agent-tokens`; display as single user with token rows.
- **Create**: Button "Create token". Optional label field (placeholder: "e.g. For all agents access token"). On submit, POST to `.../users/me/agent-tokens`; show new token with copy icon and "Copied!" feedback on first copy.

### 7.3 Delete Token Flow (Two Steps, Same Modal)

Within the Agent Tokens modal, the delete flow has two steps—both in the same modal, not separate dialogs.

**Step 1**: User clicks delete on a token row. Modal content switches to show: "Are you sure you want to revoke this token? Agents using it will no longer have access." with Cancel / Continue buttons.

**Step 2**: If user clicks Continue, modal content updates in place: "Type 'delete this token' to confirm." Text input. OK button disabled until user types exactly `delete this token` (lowercase, trimmed). On OK, call DELETE API; token is deleted; modal returns to token list view and refreshes.

**Cancel**: At either step, Cancel returns to the token list view without deleting.

### 7.4 Token Display

- Full token (UUID) visible in list
- Copy icon: clicking copies token to clipboard; show brief "Copied!" tooltip
- No masking (per user preference)

### 7.5 i18n

Add translation keys for:
- `agentTokens.title`, `agentTokens.manageAgentTokens`, `agentTokens.createToken`, `agentTokens.tokenLabel`, `agentTokens.deleteToken`, `agentTokens.deleteConfirmStep1`, `agentTokens.deleteConfirmStep2`, `agentTokens.typeToConfirm`, `agentTokens.copiedToClipboard`, `agentTokens.tokenRevoked`, etc.

---

## 8. Acceptance Criteria

### AC-1: Schema
- [ ] `AGENT_TOKENS` table exists with columns: id, user_id, project_id, token, label, created_at
- [ ] `token` is VARCHAR(36) UNIQUE, indexed for fast lookup
- [ ] `label` is optional VARCHAR(100)
- [ ] `USERS.access_token` unchanged (repurposed as user token)
- [ ] `seedAgentTokens.js` seeds 6 agent tokens; reset-and-seed includes it; AGENT_TOKENS dropped in reset order

**Verified by**: schema migration; seed script run; db:reset succeeds

### AC-2: Token Service & Cache
- [ ] Cache expanded to include both user tokens and agent tokens; single Map lookup per request
- [ ] Project code/id maps loaded in memory (`projectIdByCode`, `projectCodeById`) for `:code` route normalization
- [ ] `validateToken(token)` returns `{ type, userId, projectId?, projectCode?, ... }` from cache; no DB hit
- [ ] Returns `tokenType: 'user' | 'agent'`, `agentTokenProjectId`, `agentTokenProjectCode`, and `agentTokenUserId` when agent
- [ ] User-only endpoint checks use cached `tokenType` and reject agent tokens with immediate `403`
- [ ] `addAgentTokenToCache(token, data)` adds new token on create; `removeAgentTokenFromCache(token)` removes on delete
- [ ] Cache loaded on startup; no full refresh on create/delete

**Verified by**: unit test or integration test

### AC-3: Auth Middleware
- [ ] For project-scoped routes: agent token must have matching project_id (and belongs to user via user_id)
- [ ] Agent token used for wrong project → 403 Forbidden
- [ ] Support both `:id` and `:code` route params using in-memory project code/id maps; agent token's project_id must match
- [ ] Agent-usable routes consistently include project code context (`:code` / `:projectCode`) for authorization
- [ ] User token: full access (per current project access model)
- [ ] Agent tokens are rejected with 403 on agent-token management endpoints (`/projects/:code/agent-tokens` and `/projects/:code/users/:userId/agent-tokens*`)
- [ ] User-only endpoint guard runs before project/user ownership checks (tokenType-first gating)

**Verified by**: PactumJS test (agent token wrong project → 403)

### AC-4: API — GET /projects/:code/users/:userId/agent-tokens
- [ ] Returns tokens for specified user in project; `me` resolves to current user
- [ ] Non-leader: 403 if userId ≠ me
- [ ] Leader: can request any user's tokens
- [ ] User token required; agent token gets 403
- [ ] 404 if project or user not found

**Verified by**: PactumJS test

### AC-4b: API — GET /projects/:code/agent-tokens (leader only)
- [ ] Project leader receives all users + their tokens (tree format)
- [ ] Non-leader: 403
- [ ] User token required; agent token gets 403
- [ ] 404 if project not found

**Verified by**: PactumJS test

### AC-5: API — POST /projects/:code/users/:userId/agent-tokens
- [ ] Creates token for current user + project; UUID generated
- [ ] Calls `tokenService.addAgentTokenToCache()` after create so new token is valid immediately
- [ ] Optional label in body
- [ ] Returns full token on create
- [ ] User token required; agent token gets 403
- [ ] 403/404 as above

**Verified by**: PactumJS test

### AC-6: API — DELETE /projects/:code/users/:userId/agent-tokens/:id
- [ ] Hard delete (remove row)
- [ ] Calls `tokenService.removeAgentTokenFromCache(token)` after delete so revoked token is rejected immediately
- [ ] Project leader can delete any token for project
- [ ] Non-leader can delete only own tokens
- [ ] User token required; agent token gets 403
- [ ] 403 if not authorized; 404 if not found

**Verified by**: PactumJS test

### AC-6b: API Immutability — No Update Endpoint
- [ ] No PATCH/PUT endpoint exists for agent tokens
- [ ] Attempting token update routes returns 404 (route not found)
- [ ] OpenAPI does not document PATCH/PUT for agent-token paths

**Verified by**: PactumJS + OpenAPI tests

### AC-7: UI — Project Row Icon
- [ ] New icon (agent or gear) at end of each project row
- [ ] Click opens Agent Tokens modal for that project

**Verified by**: Owner sign-off (visual/UX)

### AC-8: UI — Agent Tokens Modal
- [ ] Project leader: expandable tree/table — user row → token rows (label, token, copy, delete)
- [ ] Non-leader: same structure, single user with token rows
- [ ] Create token with optional label; new token shown with copy icon
- [ ] Copy icon copies token to clipboard; "Copied!" feedback

**Verified by**: Owner sign-off (visual/UX)

### AC-9: UI — Delete Flow (same modal, two steps)
- [ ] Step 1: "Are you sure?" — modal content updates in place; Cancel returns to list
- [ ] Step 2: "Type 'delete this token'" — text input; OK disabled until exact match (lowercase)
- [ ] On OK, token revoked; modal returns to list view and refreshes

**Verified by**: Owner sign-off (visual/UX)

### AC-10: Tests
- [ ] PactumJS tests for GET/POST/DELETE agent-tokens (happy path, 401, 403, 404)
- [ ] GET .../users/me/agent-tokens and GET .../users/:id/agent-tokens (leader)
- [ ] GET .../agent-tokens: leader gets tree; non-leader gets 403
- [ ] Auth tests: agent token wrong project → 403
- [ ] Auth tests: agent token calling token-management routes (`GET/POST/DELETE agent-tokens`) → 403
- [ ] Immutability tests: PATCH/PUT token update paths are not available (404) and not in OpenAPI
- [ ] Cache invalidation: after DELETE, revoked token returns 401 on next request
- [ ] **Agent persona tests**: Update `agent-workflow.test.mjs` to use agent token (`660e8400-e29b-41d4-a716-446655440101`) instead of user token—proves agents can perform full workflow (create deliverable, tasks, set status, append notes) with agent token. Add test: agent token for ZAZZ used on `/projects/ZED_MER/...` → 403
- [ ] **Planner-sequence tests**: Update `deliverables-approval.test.mjs` and/or `deliverables-status.test.mjs` to use agent token where they simulate planner behavior (approve plan, transition PLANNING → IN_PROGRESS, create non-dependent tasks). These sequential tests validate agent tokens for planner persona.
- [ ] **Wrong-project tests**: Agent token for ZED_MER (`660e8400-e29b-41d4-a716-446655440103`) used on `/projects/ZAZZ/deliverables` or `/projects/ZAZZ/deliverables/1/approve` → 403. Agent token for ZAZZ used on `/projects/ZED_MER/...` → 403.

**Verified by**: PactumJS tests

### Test Strategy: Agent Persona

**Relevant existing tests**:
- `agent-workflow.test.mjs` — leader creates deliverable + tasks; worker/QA agents set status, append notes. All against ZAZZ. **Update to use agent token** `660e8400-e29b-41d4-a716-446655440101` (Michael, ZAZZ).
- `deliverables-approval.test.mjs` — approve plan, transition PLANNING → IN_PROGRESS. Sequential planner flow. **Update to use agent token** where simulating planner.
- `deliverables-status.test.mjs` — "should transition from PLANNING to IN_PROGRESS after approval", "should track status history". **Update to use agent token** for planner sequence.

**Wrong-project tests**: Add tests (in agent-tokens.test.mjs or deliverables tests) that use agent tokens tied to a different project:
- Token for ZED_MER (`660e8400-e29b-41d4-a716-446655440103`) on `/projects/ZAZZ/...` → 403
- Token for ZAZZ on `/projects/ZED_MER/...` → 403

**No need to update** every route test—agent-workflow, deliverables-approval, and deliverables-status cover agent persona. Other route tests can continue using user token.

---

## 9. Definition of Done

- [ ] All AC satisfied
- [ ] All tests passing
- [ ] Schema pushed via db:reset; agent tokens seeded
- [ ] No API calls to Zazz Board for deliverable sync (development mode)

---

## 10. Agent Constraints & Guidelines

### Always Do
- Follow data-architecture.md (schema-first, databaseService)
- Follow testing.md (PactumJS for new routes)
- Use existing authMiddleware pattern; extend, don't replace

### Ask First
- Changing project access model (who can see which projects)
- Adding token expiration or rotation

### Never Do
- Mask tokens in token list responses for authorized human users
- Allow agent tokens to call token-management routes
- Add PATCH/PUT token update routes
- Skip user+project scope check for agent tokens on project routes

---

## 11. Technical Context

- **tokenService**: `api/src/services/tokenService.js` — expand cache to include agent tokens plus `projectIdByCode`/`projectCodeById`; add `addAgentTokenToCache()` and `removeAgentTokenFromCache()`; call on create/delete
- **authMiddleware**: `api/src/middleware/authMiddleware.js` — attach tokenType, agentTokenProjectId, agentTokenProjectCode; add project-scope check for project routes (support both `:id` and `:code` params via cache)
- **Project routes**: Normalize `:id` or `:code` via in-memory project maps; agent token's project_id must match
- **Agent token routes**: `GET/POST /projects/:code/users/:userId/agent-tokens`, `GET /projects/:code/agent-tokens` (leader tree), `DELETE .../users/:userId/agent-tokens/:id`; `userId` = `me` or numeric ID
  - User token only for these routes; agent token must return 403
  - No update route (`PATCH`/`PUT`) for agent tokens by design
- **Client**: `ProjectList.jsx` — add icon; new `AgentTokensModal.jsx` component (expandable tree/table)

---

## 12. Edge Cases & Constraints

- **Token format**: UUID (v4) via `crypto.randomUUID()`
- **Delete confirmation**: Exact string `delete this token` (lowercase, trim input before compare)
- **Project leader**: Defined as `PROJECTS.leader_id === request.user.id`; one leader per project
- **User access to project**: All authenticated users have access to all projects. No project-level restrictions (no USER_PROJECTS). See future-fixes for project-level access control.
