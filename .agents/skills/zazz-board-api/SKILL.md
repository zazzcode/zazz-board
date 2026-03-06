---
name: "Zazz Board API"
type: "rule"
description: "Required API skill for agents to create and manage deliverables/tasks using live OpenAPI. OpenAPI is source of truth; resolve routes by capability instead of brittle hardcoded full path lists."
required_for: ["planner", "coordinator", "worker", "qa", "spec-builder"]
---

# Zazz Board API (Agent Routes)
## Purpose
Agents use this API to create/manage deliverables and tasks, update statuses, append notes, and inspect task graph/readiness. Projects and users are pre-configured; agents do not create them.

---

## Authentication
All API requests (except `/openapi.json`, `/health`, `/`, `/db-test`, `/token-info`) require:
- Header: `TB_TOKEN: <uuid>` or `Authorization: Bearer <uuid>`
- Token: `ZAZZ_API_TOKEN` or fallback `550e8400-e29b-41d4-a716-446655440000`

---

## Environment variables
- `ZAZZ_API_BASE_URL` (fallback: `http://localhost:3030`)
- `ZAZZ_API_TOKEN` (fallback: `550e8400-e29b-41d4-a716-446655440000`)
- `ZAZZ_PROJECT_CODE` (fallback: `ZAZZ`)

---

## Source of truth: OpenAPI
Always fetch the live spec from:
`{ZAZZ_API_BASE_URL}/openapi.json`

Rules:
- Parse `paths` + operation metadata (`tags`, `summary`, `description`, params, requestBody, responses).
- Do not trust stale hardcoded route lists when OpenAPI differs.
- Do not invent routes; derive from live spec.

---

## Capability-first routing model (hybrid)
Use capability names as the stable contract, then resolve concrete routes from OpenAPI.

Core capabilities:
- Create/list/get/update/approve/status-change deliverable
- Create/list/get/update/delete/status-change task (deliverable-scoped)
- Append notes to task
- Get deliverable graph
- Check task readiness
- Get deliverable status workflow
- Image operations (list/upload/delete/fetch/metadata), preferring project-scoped contracts when available

---

## Deterministic route resolution rules
For each capability:
1. Filter operations by tags relevant to agent workflows: `deliverables`, `projects`, `task-graph`, `images`.
2. Match method + intent keywords in `summary`/`description`.
3. Prefer project/deliverable-scoped routes over global/legacy routes.
4. If multiple matches remain, choose the most specific path (more scoped params).
5. Read request/response schemas from OpenAPI before constructing requests.
6. If no match is found, stop and report missing capability + method + candidates.

Image routing policy:
- Prefer project-scoped image routes when present in OpenAPI.
- Fallback to legacy image routes only if project-scoped routes are absent.

---

## Minimal critical assertions (guardrails)
These capabilities must resolve for normal agent workflows:
- Create deliverable
- Update deliverable
- Change deliverable status
- Approve deliverable
- Create task in deliverable
- Change task status in deliverable
- Get deliverable graph
- Check task readiness

If a critical capability cannot be resolved, stop and surface the mismatch.

---

## Request construction rules
- Never infer body fields from memory; derive from OpenAPI schema.
- Never invent required user inputs; ask the human for missing data.
- Use numeric IDs where path schema expects numeric IDs (`id`, `delivId`, `taskId`).
- Treat `deliverableId` (e.g., `ZAZZ-4`) as display-only unless schema says otherwise.

---

## Practical workflow
1. Fetch OpenAPI spec.
2. Resolve routes for required capabilities using deterministic rules.
3. Validate required path/query/body schema for each operation.
4. Execute request with `TB_TOKEN`.
5. On errors, report capability + path + status + API error payload.

---

## Capability-specific guidance
- Create deliverable:
  - Required inputs: `projectCode`, `name`, `type`
  - Return both numeric `id` and display `deliverableId`
- Create task:
  - Required inputs: `code`, `delivId`, `title`
  - Respect deliverable approval prerequisites
- Append note:
  - Include `note` and optional `agentName`
- Status changes:
  - Validate allowed values with workflow/status endpoints when needed
- Images:
  - Prefer project-scoped routes when available
  - Validate upload payload schema + content type from OpenAPI

---

## Error handling
Expected statuses: `200`, `201`, `400`, `401`, `403`, `404`, `409`, `500`.
- Include API `error` payload when present.
- Do not retry with guessed alternate routes; re-resolve from OpenAPI first.
