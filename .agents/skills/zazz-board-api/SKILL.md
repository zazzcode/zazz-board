---
name: "Zazz Board API"
type: "rule"
description: "Required API skill for agents to create and manage deliverables and tasks. Uses live OpenAPI spec; only agent-relevant routes are needed."
required_for: ["planner", "coordinator", "worker", "qa", "spec-builder"]
---

# Zazz Board API (Agent Routes)

**Purpose**: Agents use this API to create deliverables, create tasks, update content, and change statuses. Projects and users are pre-configured; agents do not create them.

---

## Authentication

All API requests (except `/openapi.json`, `/health`, `/`, `/db-test`, `/token-info`) require:
- **Header**: `TB_TOKEN: <uuid>` or `Authorization: Bearer <uuid>`
- **Token**: `ZAZZ_API_TOKEN` or fallback `550e8400-e29b-41d4-a716-446655440000`

---

## Environment variables

| Variable | Fallback | Purpose |
|----------|----------|---------|
| `ZAZZ_API_BASE_URL` | `http://localhost:3030` | API base; spec at `{base}/openapi.json` |
| `ZAZZ_API_TOKEN` | `550e8400-e29b-41d4-a716-446655440000` | Auth token |
| `ZAZZ_PROJECT_CODE` | `ZAZZ` | Default project code |

---

## Source of truth: OpenAPI spec

**Fetch the live spec for request/response schemas.** The spec is at `{ZAZZ_API_BASE_URL}/openapi.json`. No auth required for the spec. Parse as JSON; use `paths` for routes.

**Agent routes only** — When using the spec, extract only these paths. Ignore projects, users, tags, and other non-agent routes.

| Capability | Method | Path |
|------------|--------|------|
| Create deliverable | POST | `/projects/{projectCode}/deliverables` |
| Get deliverable | GET | `/projects/{projectCode}/deliverables/{id}` |
| Update deliverable (add spec path, plan path, git worktree, etc.) | PUT | `/projects/{projectCode}/deliverables/{id}` |
| Change deliverable status | PATCH | `/projects/{projectCode}/deliverables/{id}/status` |
| Approve deliverable (required before creating tasks) | PATCH | `/projects/{projectCode}/deliverables/{id}/approve` |
| List deliverables | GET | `/projects/{projectCode}/deliverables` |
| Create task | POST | `/projects/{code}/deliverables/{delivId}/tasks` |
| Get task | GET | `/projects/{code}/deliverables/{delivId}/tasks/{taskId}` |
| Update task | PUT | `/projects/{code}/deliverables/{delivId}/tasks/{taskId}` |
| Change task status | PATCH | `/projects/{code}/deliverables/{delivId}/tasks/{taskId}/status` |
| Append note to task | PATCH | `/projects/{code}/deliverables/{delivId}/tasks/{taskId}/notes` |
| List deliverable tasks | GET | `/projects/{projectCode}/deliverables/{id}/tasks` |
| Get deliverable graph | GET | `/projects/{code}/deliverables/{delivId}/graph` |
| Check task readiness | GET | `/projects/{code}/tasks/{taskId}/readiness` |
| Get deliverable statuses | GET | `/projects/{code}/deliverable-statuses` |
| List task images | GET | `/tasks/{taskId}/images` |
| Upload task images | POST | `/tasks/{taskId}/images/upload` |
| Get image binary | GET | `/images/{id}` |
| Get image metadata | GET | `/images/{id}/metadata` |

---

## Fetch spec

**URL**: `{ZAZZ_API_BASE_URL}/openapi.json` (see Environment variables for base URL)

Filter `spec.paths` to the agent paths in the table above before reading schemas.

---

## Create deliverable

**POST** `/projects/{projectCode}/deliverables`

- **Required body**: `name` (string, 1–30 chars), `type` (enum: `FEATURE`, `BUG_FIX`, `REFACTOR`, `ENHANCEMENT`, `CHORE`, `DOCUMENTATION`).
- **Optional body**: `description`, `dedFilePath`, `planFilePath`, `prdFilePath`, `gitWorktree`, `gitBranch`, `pullRequestUrl`.
- **Response (201)**: `id` (numeric, for API paths), `deliverableId` (e.g. `ZAZZ-4`, for display). Return `deliverableId` to the user.

**Before creating:** Ensure you have `name`, `type`, and `projectCode` (path; from user or `PROJECT_CODE` env). If any are missing, ask the human. Do not infer or invent.

---

## Create task

**POST** `/projects/{code}/deliverables/{delivId}/tasks`

- **Path params**: `code` = project code, `delivId` = numeric deliverable id from create deliverable response.
- **Required body**: `title` (string, 1–255 chars).
- **Optional body**: `description`, `status`, `priority`, `agentName`, `storyPoints`, `position`, `phase`, `phaseTaskId`, `prompt`, `dependencies`, `gitWorktree`.
- **Prerequisite**: Deliverable must be approved (PATCH `.../approve`) before creating tasks.
- **Response (201)**: `id` (numeric task id). Return `id` to the user.

**Before creating:** Ensure you have `code`, `delivId`, and `title`. If any are missing, ask the human. Do not infer or invent.

---

## Missing data — do not invent

If required fields are missing, **do not make up values**. Ask the human (or surface through the agent so the human can provide them). Example: "To create the deliverable, I need the type. Please choose: FEATURE, BUG_FIX, REFACTOR, ENHANCEMENT, CHORE, DOCUMENTATION."

---

## Key conventions

- **`id` / `delivId`**: Numeric ids for API paths. `deliverableId` (e.g. ZAZZ-4) is display-only.
- **Update deliverable**: PUT to add `dedFilePath`, `planFilePath`, `gitWorktree`, `gitBranch`, `pullRequestUrl` after creation.
- **Append note**: PATCH `.../tasks/{taskId}/notes` — body `{ "note": "...", "agentName": "..." }`.
- **Claim task**: Include `agentName` when PATCHing status to IN_PROGRESS.
- **Upload images**: POST `/tasks/{taskId}/images/upload` — body `{ images: [{ originalName, contentType, fileSize, base64Data }] }`, `contentType` must be `image/*`.

---

## Workflow

1. Fetch spec from `/openapi.json`.
2. Extract only the agent paths listed above from `spec.paths`.
3. For each operation, read `requestBody.content.application/json.schema` and `responses.201` (or 200) from the spec.
4. Make requests to `{ZAZZ_API_BASE_URL}{path}` with `TB_TOKEN` header and JSON body per spec.

---

## Error handling

200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 409 Conflict, 500 Internal Server Error. Response bodies may include `error` field.
