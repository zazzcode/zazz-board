# ZAZZ-6 Multiple Agent Tokens Feature PLAN

## 1. Header Metadata
- Project Code: `ZAZZ`
- Deliverable Code: `ZAZZ-6`
- Deliverable ID: `4`
- SPEC Reference: `.zazz/deliverables/ZAZZ-6-multiple-agent-tokens-feature-SPEC.md`
- Status: `DRAFT`
- Planning basis (standards/docs reviewed):
  - `README.md`
  - `AGENTS.md`
  - `.zazz/standards/index.yaml`
  - `.zazz/standards/system-architecture.md`
  - `.zazz/standards/data-architecture.md`
  - `.zazz/standards/coding-styles.md`
  - `.zazz/standards/testing.md`
  - `.agents/skills/planner/SKILL.md`
  - `.agents/skills/zazz-board-api/SKILL.md`
  - Live OpenAPI: `GET http://localhost:3030/openapi.json` (verified 2026-03-08)

## 2. Scope Guardrails
### In scope
- Add `AGENT_TOKENS` persistence, seed data, and reset integration.
- Expand token/auth stack to support both token types with in-memory cache and project `code↔id` maps.
- Add human-user-token-only cache refresh endpoint (`POST /token-cache/refresh`) to resync token/project maps during test/admin flows.
- Enforce project-scoped agent-token authorization for project routes (`:id` and `:code`).
- Enforce authorization model: user tokens can access all projects (current model), agent tokens only their bound project.
- Enforce authenticated non-project routes as user-token-only; agent tokens `403` unless route is explicitly public.
- Keep agent-usable routes project-code scoped (`:code` / `:projectCode`) for consistent authorization checks.
- Add agent-token CRUD/list API routes and OpenAPI schemas.
- Enforce **user-token-only** access for agent-token management endpoints (agent tokens must be `403`).
- Add client UI for project-level agent token management.
- Add/adjust PactumJS tests and OpenAPI tests for new behavior.
- Manual UI verification is required for AC-7/8/9 in this deliverable.

### Out of scope
- Token rotation/expiration and fine-grained permissions.
- Multi-instance distributed token cache.
- Changes to project membership/access model (`USER_PROJECTS` etc.).
- Legacy route cleanup unrelated to this deliverable.
- UI automation framework adoption (e.g., Playwright) is deferred to a future deliverable.

### Explicit non-goals from SPEC
- Do not migrate existing external agents automatically.
- Do not add project-level restrictions beyond existing leader/non-leader behavior.

## 3. Verified Current State (Repository Reality)
- `api/lib/db/schema.js` has `USERS.access_token` but no `AGENT_TOKENS` table.
- `api/src/services/tokenService.js` caches only user tokens (`token -> { userId, email, fullName }`) and returns no token type/project scope or cached project `code↔id` map.
- `api/src/middleware/authMiddleware.js` authenticates token but does not attach `tokenType`/agent scope or enforce project match.
- `api/scripts/reset-and-seed.js` has no `AGENT_TOKENS` drop/seed integration.
- No agent-token routes/schemas exist in `api/src/routes/*` or `api/src/schemas/*`.
- No token-cache refresh endpoint exists.
- Live OpenAPI has no `/projects/{code}/agent-tokens` or `/projects/{code}/users/{userId}/agent-tokens` paths.
- Existing route surface includes both project param styles (`/projects/{id}` and `/projects/{code}`), so middleware must resolve both.
- Existing authenticated non-project routes (e.g. `/users/*`) do not enforce user-token-only access.
- Existing tests use user token `550e8400-e29b-41d4-a716-446655440000` in agent persona suites:
  - `api/__tests__/routes/agent-workflow.test.mjs`
  - `api/__tests__/routes/deliverables-approval.test.mjs`
  - `api/__tests__/routes/deliverables-status.test.mjs`
- UI currently has project row edit icon only (`client/src/components/ProjectList.jsx`); no agent-token management modal.

## 4. Contract Delta (Current -> Target)
| Surface | Current | Target |
|---|---|---|
| DB schema | No `AGENT_TOKENS` | `AGENT_TOKENS(id, user_id, project_id, token, label, created_at)` + indexes |
| Token cache | User-token only map | Unified map for user + agent tokens with token type/scope plus in-memory project `code↔id` maps |
| Cache refresh API | None | `POST /token-cache/refresh` (user token only; agent token `403`) to reload cache/maps from DB |
| Auth request context | `request.user` only | `request.user`, `request.tokenType`, `request.agentTokenProjectId`, `request.agentTokenProjectCode`, `request.agentTokenUserId` |
| Project-route auth | Any valid token accepted | Agent token must match normalized project id (from `:id` or cached `:code -> id` lookup) else `403` |
| Authenticated non-project routes | Any valid token accepted | User-token-only (`403` for agent token), except explicitly public endpoints |
| Agent route shape | Mixed assumptions | Agent-usable routes must carry project code context (`:code`/`:projectCode`) for auth consistency |
| Token-management endpoint auth | No special split | `/projects/:code/agent-tokens` and `/projects/:code/users/:userId/agent-tokens*` require user token; agent token always `403` |
| Agent-token APIs | None | `GET /projects/:code/users/:userId/agent-tokens`, `GET /projects/:code/agent-tokens`, `POST /projects/:code/users/:userId/agent-tokens`, `DELETE /projects/:code/users/:userId/agent-tokens/:id` (no PATCH/PUT update endpoint) |
| Token value visibility | Unspecified/ambiguous | Authorized GET list responses return full token values (same model as UI requirement; not one-time display) |
| Token record mutability | Unspecified | Immutable after create; only list/create/delete operations are supported |
| OpenAPI | No agent-token ops | Full schemas/tags/response docs for new routes |
| Client UX | No project token management | Project-row manage icon + modal (leader tree view, non-leader self view, create/copy/delete-confirm flow) |
| Test coverage | No agent-token route/auth coverage | Pactum + OpenAPI + agent-persona regression tests for new semantics |

## 5. Parallelization Strategy
- Stream A: Data/Auth foundation
  - `api/lib/db/schema.js`, `api/scripts/reset-and-seed.js`, new seeder, `api/src/services/tokenService.js`, `api/src/middleware/authMiddleware.js`, `api/src/services/databaseService.js`
- Stream B: API surface
  - `api/src/schemas/*` and route plugin(s), `api/src/routes/index.js`
- Stream C: Backend tests
  - `api/__tests__/routes/agent-tokens.test.mjs` (new), updates to existing route tests, `openapi.test.mjs`, helper updates
- Stream D: Client UX
  - `client/src/components/ProjectList.jsx`, new modal component, hooks, i18n locales

Serialization hotspots:
- `api/src/services/databaseService.js`
- `api/src/middleware/authMiddleware.js`
- `api/src/routes/index.js`
- `client/src/components/ProjectList.jsx`
- `client/src/i18n/locales/*.json`

Merge points:
- Merge Point 1: Stream A complete before Stream B route handler wiring.
- Merge Point 2: Streams A+B complete before Stream C assertions stabilize.
- Merge Point 3: Stream B contract stable before Stream D hook integration.

## 6. AC Traceability Matrix
| AC | Implementation step IDs | Tests/evidence |
|---|---|---|
| AC-1 Schema | `1.1` | Schema push/reset output + seeded data query + route behavior relying on table |
| AC-2 Token Service & Cache | `1.2` | New tokenService tests and route integration tests validating add/remove cache behavior |
| AC-2b Cache Refresh Endpoint | `2.3`, `3.1` | `agent-tokens.test.mjs` coverage for `POST /token-cache/refresh` (200/401/403) |
| AC-3 Auth Middleware | `1.3` | Pactum wrong-project `403` tests across `:code` and `:id` routes |
| AC-4 GET user tokens | `2.2`, `3.1` | `agent-tokens.test.mjs` happy/403/404/401 |
| AC-4b GET project tree | `2.2`, `3.1` | Leader/non-leader coverage in `agent-tokens.test.mjs` |
| AC-5 POST token | `2.2`, `1.2`, `3.1` | Create returns token + immediate auth usability check |
| AC-6 DELETE token | `2.2`, `1.2`, `3.1` | Delete + immediate `401` on revoked token |
| AC-6b API Immutability | `2.2`, `3.1`, `3.3` | PATCH/PUT absent in routes and OpenAPI, explicit `404` assertions |
| AC-7 UI icon | `4.1` | Manual owner verification checklist |
| AC-8 UI modal behaviors | `4.2` | Manual owner verification checklist (leader/non-leader flows) |
| AC-9 UI delete confirmation flow | `4.2` | Manual owner verification checklist (exact phrase gating) |
| AC-10 Tests | `3.1`, `3.2`, `3.3` | Full route/openapi/persona/wrong-project + non-project-guard + cache-refresh suite |

## 7. Phased Execution Plan
### Phase 1 - Data/Auth foundation

#### 1.1 Add AGENT_TOKENS schema + seed integration
- Objective: Introduce persistent agent-token storage and deterministic seed data.
- Files affected:
  - `api/lib/db/schema.js`
  - `api/scripts/seeders/seedAgentTokens.js` (new)
  - `api/scripts/reset-and-seed.js`
  - `api/scripts/seed-all.js` (if required by current seed entrypoint)
- Deliverables/output:
  - New `AGENT_TOKENS` table definition and indexes.
  - Seeder with fixed UUID values from SPEC.
  - Reset flow drops/seeds `AGENT_TOKENS` in correct order.
- DEPENDS_ON: `none`
- COORDINATES_WITH: `2.2`
- Parallelizable with: `4.1`
- TDD: tests to write first:
  - Add/extend API test that expects seeded agent token to authenticate successfully on allowed project route.
- TDD: tests to run for completion:
  - `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- __tests__/routes/agent-tokens.test.mjs`
- Acceptance criteria mapped: `AC-1`, partial `AC-10`
- Completion signal: `AGENT_TOKENS` exists after reset; seed rows present with expected UUID values.

#### 1.2 Expand tokenService cache to user+agent token model
- Objective: Support single-map in-memory validation for both token types and cache mutation on create/delete.
- Files affected:
  - `api/src/services/tokenService.js`
  - `api/src/services/databaseService.js`
  - `api/__tests__/helpers/testServer.js`
  - `api/__tests__/helpers/testServerWithSwagger.js`
- Deliverables/output:
  - Cache entries include `{ type, userId, projectId?, projectCode?, email?, fullName? }`.
  - Project maps loaded at startup: `projectIdByCode` and `projectCodeById`.
  - `addAgentTokenToCache()` and `removeAgentTokenFromCache()` implemented.
  - `refreshCache()` remains callable for explicit cache reload route.
  - Startup initialization includes users + agent tokens + project `code↔id` maps.
- DEPENDS_ON: `1.1`
- COORDINATES_WITH: `2.2`, `3.1`
- Parallelizable with: `4.2`
- TDD: tests to write first:
  - New tests asserting `validateToken()` returns `type='agent'` and project scope for seeded agent token.
  - Tests asserting cached `:code -> id` normalization path for project-scoped auth checks.
  - Create/delete route tests asserting immediate cache effect.
- TDD: tests to run for completion:
  - `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- __tests__/routes/agent-tokens.test.mjs __tests__/routes/agent-workflow.test.mjs`
- Acceptance criteria mapped: `AC-2`, partial `AC-5`, partial `AC-6`, partial `AC-10`
- Completion signal: New token works immediately post-create; revoked token fails next request with `401`.

#### 1.3 Extend authMiddleware with project-scope enforcement for agent tokens
- Objective: Enforce agent-token project scoping while preserving user-token behavior and blocking agent tokens from token-management endpoints.
- Files affected:
  - `api/src/middleware/authMiddleware.js`
  - `api/src/routes/projects.js` (only if minimal hook adjustments required)
  - Shared helper file if created for project resolution.
- Deliverables/output:
  - Middleware uses cached `request.tokenType` (`user`/`agent`) as primary gate for user-only endpoints.
  - Middleware resolves project context from `:code`, `:projectCode`, or `:id` on project routes using cached project maps.
  - Agent token mismatch returns `403`; user token behavior unchanged.
  - Agent token on authenticated non-project routes returns `403` (public routes excluded).
  - Agent token on token-management endpoints returns `403` even when project matches.
  - Request context fields populated for downstream handlers (`agentTokenProjectCode` included).
  - Agent-usable route audit confirms project code context is present where agents are expected to operate.
- DEPENDS_ON: `1.2`
- COORDINATES_WITH: `2.2`, `3.1`, `3.2`
- Parallelizable with: `4.1`
- TDD: tests to write first:
  - Wrong-project tests for both route param styles.
  - User-only endpoint test proving agent token is rejected by tokenType-first check (`403`) before ownership/path checks.
  - Non-project route test proving agent token is rejected on authenticated non-project routes (`/users/me`), while public routes stay accessible.
  - Tests asserting agent-token access is only exercised on project-scoped routes carrying `:code`/`:projectCode`.
- TDD: tests to run for completion:
  - `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- __tests__/routes/agent-tokens.test.mjs __tests__/routes/project-id-routes-regression.test.mjs`
- Acceptance criteria mapped: `AC-3`, partial `AC-10`
- Completion signal: Agent token succeeds only on matching project routes; mismatch reliably `403`.

### Phase 2 - API surface and OpenAPI contracts

#### 2.1 Add agent-token validation schemas and exports
- Objective: Define request/response schema contracts for new agent-token APIs.
- Files affected:
  - `api/src/schemas/agentTokens.js` (new)
  - `api/src/schemas/index.js`
  - `api/src/schemas/validation.js`
- Deliverables/output:
  - Schema sets for leader/non-leader behavior, `userId=me|number`, create/delete payloads.
  - OpenAPI-ready summaries/descriptions/responses.
- DEPENDS_ON: `1.1`
- COORDINATES_WITH: `2.2`, `3.3`
- Parallelizable with: `3.2`, `4.1`
- TDD: tests to write first:
  - OpenAPI assertions for required new paths and schemas.
- TDD: tests to run for completion:
  - `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- __tests__/routes/openapi.test.mjs`
- Acceptance criteria mapped: partial `AC-4`, partial `AC-4b`, partial `AC-5`, partial `AC-6`, partial `AC-10`
- Completion signal: OpenAPI includes all new agent-token operations with documented request/response shapes.

#### 2.2 Implement agent-token routes + DB service methods
- Objective: Deliver list/create/delete endpoints with role-based visibility, immutability, and cache updates.
- Files affected:
  - `api/src/routes/agentTokens.js` (new) or `api/src/routes/projects.js` (if colocated)
  - `api/src/routes/index.js`
  - `api/src/services/databaseService.js`
- Deliverables/output:
  - `GET /projects/:code/users/:userId/agent-tokens`
  - `GET /projects/:code/agent-tokens`
  - `POST /projects/:code/users/:userId/agent-tokens`
  - `DELETE /projects/:code/users/:userId/agent-tokens/:id`
  - Both GET list routes return full token values for authorized user-token callers.
  - Leader/non-leader and ownership enforcement.
  - User-token-only enforcement on all token-management endpoints.
  - No PATCH/PUT token route implementation.
  - Create/delete call tokenService cache mutation methods.
- DEPENDS_ON: `1.2`, `1.3`, `2.1`
- COORDINATES_WITH: `3.1`, `4.2`
- Parallelizable with: `4.1`
- TDD: tests to write first:
  - Route tests for happy path + `401/403/404` for each endpoint.
  - Route tests proving PATCH/PUT token-update paths are unavailable (`404`).
- TDD: tests to run for completion:
  - `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- __tests__/routes/agent-tokens.test.mjs`
- Acceptance criteria mapped: `AC-4`, `AC-4b`, `AC-5`, `AC-6`, partial `AC-10`
- Completion signal: All new endpoints pass Pactum coverage and return spec-compliant payloads.

#### 2.3 Add user-token-only token-cache refresh endpoint
- Objective: Provide explicit cache resync capability for tests/admin flows after DB reset/direct DB changes.
- Files affected:
  - `api/src/routes/index.js` (or dedicated core/auth route plugin)
  - `api/src/schemas/core.js` (or new auth schema file)
  - `api/src/schemas/index.js`
  - `api/src/schemas/validation.js`
- Deliverables/output:
  - `POST /token-cache/refresh`
  - User token required (`200`), missing/invalid token (`401`), agent token (`403`)
  - Endpoint calls `tokenService.refreshCache()` and returns success payload
- DEPENDS_ON: `1.2`, `1.3`
- COORDINATES_WITH: `3.1`, `3.3`
- Parallelizable with: `4.1`
- TDD: tests to write first:
  - Route tests for refresh success (`200`) with user token and failure (`401`/`403`)
- TDD: tests to run for completion:
  - `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- __tests__/routes/agent-tokens.test.mjs`
- Acceptance criteria mapped: `AC-2b`, partial `AC-10`
- Completion signal: Refresh endpoint reliably reloads cache and enforces tokenType gating.

### Phase 3 - Test updates and regression protection

#### 3.1 Add dedicated Pactum suite for agent-token endpoints and auth scope
- Objective: Cover new API behavior thoroughly (happy, edge, negative).
- Files affected:
  - `api/__tests__/routes/agent-tokens.test.mjs` (new)
  - `api/__tests__/helpers/testDatabase.js` (if helper additions needed)
- Deliverables/output:
  - End-to-end tests for list/create/delete and leader tree route.
  - Explicit assertions that list responses include full token values for authorized users.
  - Wrong-project `403`, revoked-token `401`, non-leader restrictions.
  - Agent token forbidden (`403`) on all token-management endpoints.
  - Immutability guard tests for non-existent PATCH/PUT token routes.
- DEPENDS_ON: `2.2`
- COORDINATES_WITH: `1.2`, `1.3`
- Parallelizable with: `3.2`
- TDD: tests to write first:
  - Failing route tests before implementing handlers.
- TDD: tests to run for completion:
  - `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- __tests__/routes/agent-tokens.test.mjs`
- Acceptance criteria mapped: `AC-3`, `AC-4`, `AC-4b`, `AC-5`, `AC-6`, `AC-10`
- Completion signal: Dedicated agent-token suite passes with explicit status-code coverage.

#### 3.2 Update existing agent persona and planner-sequence tests to use agent tokens
- Objective: Prove real agent workflows run with scoped agent tokens.
- Files affected:
  - `api/__tests__/routes/agent-workflow.test.mjs`
  - `api/__tests__/routes/deliverables-approval.test.mjs`
  - `api/__tests__/routes/deliverables-status.test.mjs`
- Deliverables/output:
  - Replace user token usage with seeded ZAZZ agent token where persona simulation applies.
  - Add wrong-project checks for ZAZZ vs ZED_MER token misuse.
- DEPENDS_ON: `1.3`, `2.2`
- COORDINATES_WITH: `3.1`
- Parallelizable with: `2.1`
- TDD: tests to write first:
  - Wrong-project assertions expected to fail prior to middleware enforcement.
- TDD: tests to run for completion:
  - `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- __tests__/routes/agent-workflow.test.mjs __tests__/routes/deliverables-approval.test.mjs __tests__/routes/deliverables-status.test.mjs`
- Acceptance criteria mapped: partial `AC-3`, `AC-10`
- Completion signal: Persona/sequence suites pass using agent token and fail correctly cross-project.

#### 3.3 Extend OpenAPI tests for new agent-token capabilities
- Objective: Keep OpenAPI as enforceable contract for agent-token routes.
- Files affected:
  - `api/__tests__/routes/openapi.test.mjs`
- Deliverables/output:
  - Assertions for new agent-token paths, schema fields, and tags.
  - Assertions that agent-token paths do not expose PATCH/PUT operations.
- DEPENDS_ON: `2.1`, `2.2`
- COORDINATES_WITH: `3.1`
- Parallelizable with: `4.1`
- TDD: tests to write first:
  - Path-existence and requestBody schema assertions for each new operation.
- TDD: tests to run for completion:
  - `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- __tests__/routes/openapi.test.mjs`
- Acceptance criteria mapped: partial `AC-10`
- Completion signal: OpenAPI suite passes and documents all new capabilities.

### Phase 4 - Client UX and i18n

#### 4.1 Add project-row manage-agent-tokens trigger
- Objective: Expose entry point to token management from project list.
- Files affected:
  - `client/src/components/ProjectList.jsx`
- Deliverables/output:
  - New action icon per project row with tooltip and modal trigger wiring.
- DEPENDS_ON: `none`
- COORDINATES_WITH: `4.2`
- Parallelizable with: `1.1`, `1.3`, `2.1`
- TDD: tests to write first:
  - Define manual verification steps for icon presence and click callback/modal opening.
- TDD: tests to run for completion:
  - Manual smoke against running client/API.
- Acceptance criteria mapped: `AC-7`
- Completion signal: Clicking icon opens agent token modal for selected project.

#### 4.2 Implement Agent Tokens modal, API calls, copy/delete UX, and translations
- Objective: Deliver leader/non-leader token management experience with two-step delete confirmation.
- Files affected:
  - `client/src/components/AgentTokensModal.jsx` (new)
  - `client/src/App.jsx` or relevant state owner for modal wiring
  - `client/src/hooks/*` (new hook or existing hook extension for agent-token API calls)
  - `client/src/i18n/locales/en.json`
  - `client/src/i18n/locales/es.json`
  - `client/src/i18n/locales/fr.json`
  - `client/src/i18n/locales/de.json`
- Deliverables/output:
  - Leader tree view (`GET /projects/:code/agent-tokens`)
  - Non-leader self view (`GET /projects/:code/users/me/agent-tokens`)
  - Create token with optional label and copy feedback.
  - Two-step in-modal delete flow with exact phrase `delete this token`.
- DEPENDS_ON: `2.2`, `4.1`
- COORDINATES_WITH: `3.1`
- Parallelizable with: `3.3`
- TDD: tests to write first:
  - Define manual verification checklist for leader/non-leader list behavior and confirmation phrase gating.
- TDD: tests to run for completion:
  - Manual owner sign-off for modal flows.
- Acceptance criteria mapped: `AC-8`, `AC-9`
- Completion signal: End-to-end modal flows work for leader and non-leader views with correct API calls.

## 8. Test Command Matrix
1. `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- __tests__/routes/agent-tokens.test.mjs`
2. `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- __tests__/routes/agent-workflow.test.mjs __tests__/routes/deliverables-approval.test.mjs __tests__/routes/deliverables-status.test.mjs`
3. `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- __tests__/routes/project-id-routes-regression.test.mjs`
4. `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- __tests__/routes/openapi.test.mjs`
5. `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test`
6. Manual UI verification on `http://localhost:3001` with leader and non-leader tokens for modal behavior and i18n text presence.

## 9. Risks and Mitigations
- Risk: Auth middleware project resolution can break existing routes due to mixed `:id`/`:code` param conventions.
  - Mitigation: Add explicit resolution helper + regression tests covering both param types before rollout.
- Risk: Token cache drift after create/delete in long-running process.
  - Mitigation: Route handlers must call cache mutation methods synchronously after DB success; add immediate-use and immediate-revoke tests.
- Risk: Leader/non-leader authorization bugs may leak token visibility.
  - Mitigation: Centralize leader check via `PROJECTS.leader_id` and enforce in service/route layer with dedicated `403` tests.
- Risk: UI delete confirmation may allow accidental revocation if phrase check is weak.
  - Mitigation: Exact normalized match (`trim()` + lowercase equality) and disabled confirm button until match.
- Risk: A future refactor accidentally adds token-update endpoint (PATCH/PUT), violating immutable token policy.
  - Mitigation: Keep explicit negative route tests (`404`) plus OpenAPI assertions that PATCH/PUT are absent.

## 10. Approval Checklist
- [ ] Confirm route placement preference: dedicated `agentTokens` route plugin vs extending `projects.js` (recommended: dedicated plugin for lower file-lock contention).
- [ ] Confirm manual UI verification checklist is complete for AC-7/8/9 (automation deferred to future deliverable).
- [ ] Confirm seeded agent token UUIDs in SPEC are final and must remain immutable for test stability.
- [ ] Confirm no additional project-access restrictions are expected in this deliverable beyond leader/non-leader token management rules.
