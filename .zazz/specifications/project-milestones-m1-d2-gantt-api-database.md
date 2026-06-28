# Project Milestones M1 D2 — Gantt API And Database Persistence Specification

**Worktree / branch:** `mw-mvp-milestone-gannt`  
**Feature:** Project Milestones  
**Milestone:** M1: Gantt MVP And Persistence Foundation  
**Deliverable:** D2 Gantt API and database persistence  
**Delivery topology:** milestone branch  
**Review artifact:** one milestone PR with sibling D1 and D2 specifications  
**Approved review shape:** milestone PR  
**Decomposition rationale:** D2 follows D1 because persistence should implement the
Gantt JSON contract proven against SVAR React Gantt. D2 is intentionally captured now so
schema/API recommendations are not lost, but it must be revised after D1 records the
final mocked contract.  
**Integration branch:** `main` per `AGENTS.md`  
**Merge policy:** PR review required; agents commit/push feature branches only  
**Drafted:** 2026-06-27  
**Shared run log:** `.zazz/execution/project-milestones-m1-run-log.md` (`D2` section)

---

## 0. Capability

Implement production project milestones behind the `GET /projects/:code/gantt` contract
proven by D1. This deliverable replaces D1's mock-data backing source with database-backed
services, then adds database schema, databaseService methods, production milestone CRUD,
project-level Gantt settings, deliverable schedule timestamps, seed/reset support, API
tests, and realtime events needed for the Gantt UI to persist and reload milestone data.
The production Gantt endpoint returns the full project Gantt planning projection in one
response; it does not require one query or route call per milestone. The production D2
Gantt chart surfaces milestone and deliverable rows; tasks remain dynamic execution
detail and are not required as chart rows.

---

## 1. Required Reading For The Implementor

Read this specification end to end before editing.

### 1.a Feature / Milestone Context

- `.zazz/features/project-milestones-feature.md` — read `Concepts`,
  `M1: Gantt MVP And Persistence Foundation`, and `M1 Data Model Recommendation`.
- `.zazz/specifications/project-milestones-m1-d1-svar-gantt-ui-contract.md` —
  read all sections.
- `.zazz/execution/project-milestones-m1-run-log.md` — read D1 `Final Mocked Gantt
  Contract`, `SVAR Documentation Research`, and D1 deviations before coding.
- [SVAR React Gantt backend guide](https://docs.svar.dev/react/gantt/guides/working_with_server/) —
  read the `RestDataProvider`, request/provide data, and API interception sections only
  if D1 recommends using SVAR's provider/action model for production persistence.

### 1.b Standards

Verify these against `.zazz/standards/index.yaml` before coding:

| Standard | What it governs here |
| --- | --- |
| `.zazz/standards/data-architecture.md` | schema-first implementation, table/column naming, pre-v1 db push/reset workflow. |
| `.zazz/standards/data-layer.md` | Drizzle schema, databaseService DB seam, camelCase API contracts. |
| `.zazz/standards/service-layer.md` | service contracts and realtime event boundaries. |
| `.zazz/standards/coding-styles.md` | route validation, project-scoped handler pattern, business error mapping. |
| `.zazz/standards/http-layer.md` | placeholder Fastify route guidance; coding-styles remains authoritative. |
| `.zazz/standards/testing.md` | PactumJS API tests with real test DB. |
| `.zazz/standards/spec-hygiene.md` | specification quality and path portability. |

If another indexed standard matches the touched file list, stop and surface it before
proceeding.

### 1.c Existing Code References

- `api/lib/db/schema.js` — Drizzle schema source of truth.
- `api/src/services/databaseService.js` — project, deliverable, task, task relation data
  access patterns.
- `api/src/routes/deliverables.js` — project-scoped deliverable CRUD.
- `api/src/routes/taskGraph.js` — project-scoped dependency route patterns and error
  mapping.
- `api/src/routes/projects.js` — SSE route and project-scoped utility routes.
- `api/src/schemas/` — domain schema split and validation barrel.
- `api/src/mockData/gantt/` — D1 mock data to replace with database-backed projection.
- `api/scripts/seeders/` — seed/reset snapshot conventions.
- `api/__tests__/routes/task-graph-scoping.test.mjs` and
  `api/__tests__/routes/deliverables.test.mjs` — PactumJS patterns.

### 1.d Project Orientation

- `AGENTS.md` — worktree workflow, JavaScript-only constraint, DB reset/test commands.

---

## 2. Invariants

### INVARIANT 1 — D2 Implements The D1 Contract

D2 must implement the Gantt JSON contract recorded by D1 unless the Owner approves a
specification revision. Schema/API decisions should serve that contract, not redesign it.

### INVARIANT 2 — Project Code Is The Access Boundary

Every Gantt and milestone route must include `/projects/:code/...`. Handlers must resolve
the project by code and reject cross-project milestone/deliverable access. D2 must keep
D1's `GET /projects/:code/gantt` path stable while replacing the mock backing source.

### INVARIANT 2a — Gantt Initial Load Is One Planning Projection

`GET /projects/:code/gantt` returns all milestones, deliverables, and initial
deliverable-level links needed for the first chart render in one response. The service
may use multiple database queries internally for correctness or performance, but the HTTP
contract is one project-scoped planning projection payload. Production D2 does not need
to fetch or render task rows inside the Gantt chart.

### INVARIANT 3 — Database Access Stays In `databaseService`

Routes must not import Drizzle tables or the DB instance directly.

### INVARIANT 4 — Tasks Inherit Milestones Through Deliverables

M1 must not add `TASKS.milestone_id`. A task belongs to a milestone through its
deliverable.

### INVARIANT 4a — Deliverables Belong To Exactly One Milestone

Every deliverable belongs to exactly one project-owned milestone after D2 seed/reset and
project creation rules run. New deliverables start in the project default milestone until
an owner assigns them to a planned milestone. A deliverable must never appear under more
than one milestone in the Gantt projection.

### INVARIANT 5 — Existing Deliverables Always Fit The Hierarchy

Every project must have a default milestone, and existing/seed deliverables must be
associated with it unless explicitly assigned elsewhere.

### INVARIANT 6 — Timeline Settings Are Project-Owned

Sprint/week numbering and timeline display mode belong to the project, not to individual
milestones or deliverables. The Gantt projection returns resolved timeline metadata, but
milestone, deliverable, and task dates remain date-driven.

### INVARIANT 7 — Gantt Settings Are Edited From Project Configuration

Project Gantt settings belong in the existing Edit Project modal as a Gantt
Configuration tab. The tab follows the same project leader edit rule as Project Details
and Status Workflow. Non-leaders may inspect the settings in read-only mode but must not
be able to update the canonical project timeline.

---

## 3. Scope

### Approved Review Shape

This specification is approved as one deliverable inside a milestone PR with D1.

**Rationale.** D2 is the production persistence slice for the D1 UI contract. It is large
enough to deserve its own implementation contract but tightly coupled enough to review in
the same milestone PR.

**Review unit owned by this specification.**

- D2 Gantt API and database persistence — schema, seed/reset baseline, service methods,
  routes, validation schemas, realtime events, and API tests.

### Strict Scope Constraint

Every product-code change for this specification lives under `api/`, except client hook
updates needed to switch D1 from mock data to the production `GET /projects/:code/gantt`
endpoint. If implementation requires broad UI redesign or widget remapping beyond the D1
contract, stop and revise D1/D2 with Owner sign-off.

### In Scope

| Path | New / Modified | Reason |
| --- | --- | --- |
| `api/lib/db/schema.js` | Modified | Add `MILESTONES`, relations, `DELIVERABLES.milestone_id`, milestone-scoped deliverable order, deliverable schedule timestamp fields, deliverable dependency persistence, and project Gantt settings persistence. |
| `api/src/services/databaseService.js` | Modified | Add milestone CRUD, default milestone creation, ordered assignment, deliverable dependency projection, Gantt settings, and Gantt projection methods. |
| `api/src/routes/gantt.js` | Modified | Replace mock-backed projection with database-backed projection and add production Gantt/settings operations. |
| `api/src/routes/milestones.js` | New if separated from `gantt.js` | Project-scoped milestone CRUD routes. |
| `api/src/routes/index.js` | Modified | Register new route plugin. |
| `api/src/schemas/gantt.js` or `api/src/schemas/milestones.js` | New | JSON schemas for Gantt/milestone routes. |
| `api/src/schemas/index.js` and `api/src/schemas/validation.js` | Modified | Export new schemas. |
| `api/scripts/seeders/*` and snapshot data | Modified | Create default milestones and assign seeded deliverables. |
| `api/__tests__/routes/gantt.test.mjs` | New | PactumJS coverage for hierarchy, CRUD, scoping, and assignment. |
| `api/src/mockData/gantt/` | Deleted or ignored by production code | D1 mock data must not remain the production Gantt source. |
| `client/src/hooks/useProjectGantt.js` | Modified if D1 shipped first | Replace mock source with production `GET /projects/:code/gantt`. |
| `client/src/components/ProjectModal.jsx` | Modified if settings UI is wired in D2 | Persist the existing Gantt Configuration tab through project-scoped settings routes. |
| `.zazz/execution/project-milestones-m1-run-log.md` | Modified | Record D2 OQ resolutions, schema evidence, tests, and deviations. |

### Out Of Scope

- task-level milestone foreign key
- deliverable dependency authoring/editing UI
- rich milestone editor UX beyond what D1/D2 needs for MVP persistence
- importing Git-authored feature documents
- sync between `.zazz/features/` and database milestones
- production migration files; this repo is pre-v1 and uses schema push/reset
- replacing existing task graph routes

---

## 4. Decisions

### D-1 — Add Project-Owned `MILESTONES` Between Project And Deliverable

**Decision.** Add `MILESTONES.project_id`, `DELIVERABLES.milestone_id`, and a
milestone-scoped deliverable order field such as `DELIVERABLES.milestone_position`.
`MILESTONES.project_id` is required because project code is the route and authorization
boundary for current and future role-based access control. Milestone service methods
must validate that the milestone and deliverable both belong to the project resolved
from `/projects/:code/...`.

**Why.** The product hierarchy is project -> milestone -> deliverable -> task. Keeping the
task relationship unchanged preserves the existing agent execution model. The additional
position field lets owners order deliverables inside a milestone without adding manual
ordering to the milestones themselves.

### D-1.1 — Persist Deliverable Schedule Timestamps For The Gantt Projection

**Decision.** Add deliverable schedule timestamp fields on `DELIVERABLES`, recommended
as `planned_start_at`, `planned_completion_at`, `actual_start_at`, and
`actual_completion_at` using the existing `timestamp(..., { withTimezone: true })`
pattern. Expose the planned values as `startDate` and `endDate` on deliverable Gantt rows
to preserve the D1 client contract. Use the actual values for completion/progress
metadata and future schedule variance indicators. If legacy deliverables lack planned
timestamps during reset/backfill, assign a conservative default inside the default
milestone or derive a temporary projection timestamp in the service and make the fallback
visible in tests.

**Why.** The D1 Gantt contract requires deliverable `startDate` and `endDate`, but the
current `DELIVERABLES` table only has lifecycle timestamps such as `created_at`,
`updated_at`, and `approved_at`. Those are audit facts, not schedule intent. Persisting
explicit schedule timestamps keeps the Gantt view driven by owner planning and execution
data without overloading audit timestamps as roadmap dates. The `*_at` suffix matches
the existing schema convention for datetime fields.

### D-1.2 — Do Not Add Task Scheduling Or Task Rows In M1

**Decision.** D2 should keep task milestone membership implicit through deliverables and
should not add task-specific planned date columns. Production D2 also should not require
expanded task rows in the Gantt chart. Task data may still inform deliverable-level
metadata such as task counts, completion counts, or status rollups where the current
service layer already supports that safely.

**Why.** Agent tasks are execution detail and can change rapidly. Adding a full task
scheduling model or task-row chart surface in the persistence slice would broaden M1
beyond project milestone planning. Deliverables are the planning unit the Gantt chart
needs; tasks remain operational detail in task Kanban and task graph views.

### D-1a — Sort Milestones Chronologically

**Decision.** Milestone display order is computed by `start_date`, then `end_date`, then
stable tie-breakers such as ordinal and `id`; do not add a milestone `position` column in
the initial schema.

**Why.** The Gantt tree is a time view. Manual milestone ordering would let the tree
contradict the timeline and make project planning harder to interpret. If D1 proves SVAR
requires an explicit order field, treat that as a widget adapter concern first and revise
this specification before adding persistence.

### D-1b — Generate MVP Milestone Display Labels

**Decision.** M1 does not require owner-authored milestone names. The API should support
generated display metadata for the default milestone and chronological numbered
milestones, allowing the client to render localized labels such as `Default`,
`Milestone 1`, `Hito 1`, `Meilenstein 1`, and `Jalon 1`.

**Why.** The first MVP needs grouping, dates, completion, and dependency visibility more
than custom naming. Generated labels keep the schema smaller and avoid storing localized
text in the database. If custom names are approved later, add them as a deliberate M2+
extension.

### D-1c — Use A Milestone-Specific Planning Status Model

**Decision.** Persist or project milestone status using a small milestone lifecycle:
`PLANNING`, `PENDING`, `IN_PROGRESS`, and `DONE`. `PLANNING` represents a future
milestone whose dates or contents are still tentative. `PENDING` represents a
planned/locked milestone whose start date is still in the future. `IN_PROGRESS`
represents a milestone that has started and still contains incomplete work. `DONE`
represents a completed milestone, normally derived from contained deliverables unless a
later owner close action is introduced.

**Why.** Milestones are planning containers, not execution cards. Reusing the full
deliverable status workflow would blur the difference between schedule state and
implementation state. A small milestone lifecycle gives the Gantt view clearer labels
while allowing deliverables to keep their richer project workflow statuses.

### D-2 — Use A Default Milestone Per Project

**Decision.** Each project gets exactly one default milestone for existing, seeded, or
newly created deliverables until an owner assigns them to a planned milestone. Its
display label is generated from the default milestone translation key.

**Why.** The Gantt tree needs every deliverable under a milestone row, and existing seed
data already has deliverables that predate milestones.

### D-2a — Treat Default As The Assignment Intake Pool

**Decision.** The default milestone is the first production source for add/remove flows
in the milestone editor. Adding to a planned milestone selects deliverables from the
default milestone. Removing from a planned milestone moves the deliverable back to the
default milestone. The default milestone must not allow removing deliverables from the
milestone hierarchy; every deliverable remains associated with exactly one milestone.
The MVP API should not silently move a deliverable from one planned milestone to another
as a side effect of editing a different milestone.

**Why.** This keeps milestone editing legible and avoids accidental reassignment from a
different owner-planned milestone. A later explicit move flow can support direct planned
milestone-to-planned-milestone moves.

### D-2a.1 — Use "Planned Milestone" For Non-Default Milestones

**Decision.** Use `default milestone` for the system-created assignment bucket and
`planned milestone` for owner-created, dated roadmap milestones. Avoid `active
milestone` and `real milestone` in the API/spec language because they imply lifecycle
state rather than membership type.

**Why.** A planned milestone may be `PLANNING`, `PENDING`, `IN_PROGRESS`, or `DONE`.
Calling it active would conflict with those statuses, while calling it real would make
the default milestone sound fake even though it is durable database state.

### D-2b — Persist Default Milestone Visibility As A Project Gantt Setting

**Decision.** Store default milestone visibility with project Gantt settings as a boolean
such as `show_default_milestone`, exposed to the client as `showDefaultMilestone`. The
default value is `false`, so the main Gantt chart hides the default milestone and its
children unless the project owner enables the setting.

**Why.** The default milestone is necessary data, but it is often an intake bucket rather
than roadmap content. Making visibility a project-level setting keeps the shared view
consistent for the project while preserving a deliberate inspection/testing path.

### D-3 — Implement `/projects/:code/gantt` As A Projection Endpoint

**Decision.** Keep D1's `GET /projects/:code/gantt` path and replace the mock backing
source with a database-backed projection that returns the ready-to-render milestone and
deliverable hierarchy plus links in one HTTP response. The D1 deliverable task expansion
path does not need to become part of the production D2 Gantt contract; if the route is
kept for compatibility during the transition, it must not drive the main production
chart.

**Why.** The client should not assemble milestones and deliverables from several
endpoints on initial load. A projection endpoint keeps the widget fast and reduces client
coupling to table structure. SVAR React Gantt accepts `tasks` and `links` arrays, so the
Zazz API should assemble the initial planning projection before the client adapter
converts it to the SVAR shape. Task detail is more volatile during agent execution and
belongs in task-focused views unless a later feature deliberately designs task scheduling
for the Gantt.

The implementation priority is:

1. inventory the mock Gantt payload and client adapter fields
2. create schema/seed/service support for those fields
3. make `databaseService.getProjectGantt(...)` produce the same projection from real data
4. replace the mock-backed `GET /projects/:code/gantt` route with that service
5. then implement or harden mutation/CRUD routes around the proven projection

### D-3.1 — Prove Field-Level Parity With The Mock Contract

**Decision.** D2 must reconcile the production Gantt projection against the current mock
payload and client adapter before implementation. The database-backed response must
continue to provide every field the frontend uses from the mock contract: project code,
project name, range, resolved timeline settings, row hierarchy fields, row status,
progress, completion flag, generated label metadata, deliverable code/title, task count,
milestone order, deliverable order, and link fields. D2 may add fields the frontend now
needs, especially the four deliverable schedule timestamps and normalized status
metadata, but it must not silently drop a mock-backed field that the adapter or page
consumes.

**Why.** D2 is not only a schema task. It is the production backing source for an
already-proven UI contract. A field-level parity pass keeps the database design honest
against the actual Gantt screen and gives the frontend room to add color-coding and
schedule variance without another database redesign.

### D-3.2 — Return Raw And Normalized Status Metadata For Gantt Styling

**Decision.** Milestone and deliverable rows must include the raw domain `status`,
`completed`, and `progress` fields already present in the mock contract. They should also
include normalized styling metadata such as `statusCategory` and `blocked`, where
`statusCategory` uses a small stable set like `NOT_STARTED`, `IN_PROGRESS`,
`COMPLETED`, and `BLOCKED`. Deliverable `blocked` may be derived from blocked child
tasks or a later deliverable-level blocked signal. Because production D2 does not render
task rows in the Gantt chart, task status should be returned as aggregate metadata such
as `taskCount`, `completedTaskCount`, `blockedTaskCount`, and `taskStatusCounts` rather
than one row per task.

**Why.** Project workflows can use different status codes over time, while the Gantt
needs stable visual categories. Returning both raw status and normalized status metadata
lets the frontend show exact workflow state in text while color-coding bars consistently.

### D-3a — Use Server-Authoritative Save And Projection Replacement

**Decision.** D2 should treat the API/database as durable truth and the Gantt projection
as the client render contract. Mutations for milestone dates, ordered milestone
deliverable membership, and project Gantt settings should validate permissions and
business rules on the server, persist the change, and return the updated Gantt projection
or enough updated projection data for the client to replace/reconcile its page state.
The first production version should prefer save-and-replace over optimistic auto-merge
for ordered milestone lists.

The synchronization contract is:

- API/database = durable truth
- `GET /projects/:code/gantt` = render projection
- page hook = current projection plus request/version guards
- modal = temporary draft
- mutation = server validation plus save plus updated projection
- SSE = debounce and refetch
- `localStorage` = harmless UI preferences only

**Why.** Multiple users may edit the same project. Ordered deliverable membership and
milestone dates are human planning decisions, so server validation and projection
replacement are easier to reason about than hidden browser state or client-side
auto-merging. SSE remains useful for cross-user revalidation but should not be required
for the initiating user's save feedback.

### D-3b — Add Projection Versioning For Conflict Handling

**Decision.** The production Gantt projection should include a monotonic version or
equivalent concurrency marker, such as `version` plus `updatedAt`. Mutations should be
able to accept an `expectedVersion` once conflict handling is implemented. If another
user saves first, the API should return `409 Conflict` with the latest projection or
enough detail for the client to prompt the user to reload/review.

**Why.** Project planning can involve several humans. A version marker gives the client a
straightforward way to detect stale modal drafts and avoid silently overwriting another
planner's milestone or deliverable-order changes.

### D-4 — Keep Milestone CRUD Separate From Gantt Projection

**Decision.** Milestone CRUD uses `/projects/:code/milestones`, while Gantt-specific
projection/move operations use `/projects/:code/gantt`.

**Why.** Milestones are domain records; Gantt is a view contract. Separating them keeps
future non-Gantt milestone UI possible.

### D-5 — Persist Deliverable Dependencies For Gantt Link Lines

**Decision.** D2 adds first-class deliverable dependency persistence so
`GET /projects/:code/gantt` can return deliverable-to-deliverable links in the same
`links[]` shape proven by the mock API. The recommended schema is a join table such as
`DELIVERABLE_RELATIONS` with `deliverable_id`, `related_deliverable_id`,
`relation_type`, and audit fields, modeled after `TASK_RELATIONS`. `DEPENDS_ON` is the
required relation type for M1. The service must validate that both deliverables belong to
the project resolved from `/projects/:code/...` and must reject self-dependencies.
Dependency editing UI is out of scope, but seed/reset and tests must create enough
deliverable dependency records for the database-backed Gantt chart to draw the same kind
of connector lines shown by the mock data.

**Why.** The Gantt screenshot and mock payload show dependency lines between deliverable
bars, including planned/proposed deliverables that may not have task rows yet. Deriving
all Gantt links from `TASK_RELATIONS` would make future planning dependencies disappear
until tasks exist. Deliverable dependencies are planning data, while task relations remain
execution-detail data for task graph surfaces.

### D-6 — Treat SVAR Backend Helpers As Optional

**Decision.** D2 implements Zazz project-scoped routes first and uses SVAR
`RestDataProvider` or action conventions only if D1 proves they fit the desired contract.

**Why.** Zazz already has authentication headers, project-code scoping, `databaseService`,
and SSE refresh semantics. The API should serve the product contract rather than mirror a
widget helper if that helper makes project scoping or testing less clear.

### D-7 — Persist Project-Level Gantt Settings

**Decision.** D2 persists project-owned Gantt settings and resolves them into the
`timeline` object returned by `GET /projects/:code/gantt`. The first settings contract
supports timeline mode, date-label visibility, period start date, sprint length,
starting period number, sprint label prefix, week label prefix, and default milestone
visibility.

**Why.** Sprint numbering is shared planning context. If it lived only in the client or
mock payload, each project would have an implicit calendar that could drift from owner
intent. Persisting settings at the project level lets D2 keep real dates as the
authoritative schedule while allowing the UI to show calendar dates, project weeks, or
sprints.

### D-8 — Prefer A Dedicated Settings Record Unless A JSON Column Is Clearly Better

**Decision.** Prefer a dedicated project-owned settings table, such as
`PROJECT_GANTT_SETTINGS`, with one row per project. A validated JSON column on
`PROJECTS` is acceptable only if it keeps route validation, defaults, and future
evolution equally clear.

**Why.** The settings are domain data, not arbitrary UI state. A dedicated row makes
defaults, tests, and future fields easier to review without bloating the project table or
hiding schema inside untyped JSON.

---

## 5. Agent Implementation Rules

### Team Integration

Commit and push only to the feature branch. Do not merge directly to `main`; all
integration happens through human PR review.

### Command Working Directory

Use stable backend commands:

```bash
cd api && set -a && source .env && set +a && NODE_ENV=test npm run test
cd api && npm run lint
cd api && npm run typecheck
```

Use the DB reset/push workflow from `AGENTS.md` and `.zazz/standards/data-architecture.md`.

### Commit And Push

Default to one coherent green commit per specification after the DoD and verifier pass.

### Scope Verification

Because this is a milestone branch with D1 and D2, verify this slice with changed paths
and commit inspection. D2 product changes should stay in `api/`, plus a narrow client
hook switch if D1 exists.

### Autonomy Boundaries

Hard constraints:

- Invariants in §2.
- Scope in §3.
- Acceptance criteria in §6.
- D1 final contract from the run log.
- Project-scoped access checks.

Adaptive guidance:

- whether route plugin is named `gantt.js` or `milestones.js`
- exact helper names in `databaseService`
- exact seed helper organization
- whether default milestone backfill is in seed reset or a dedicated helper
- whether D1 mock data files are deleted after D2 or kept as test fixtures outside
  production route execution

### Run Log

Maintain `.zazz/execution/project-milestones-m1-run-log.md`, section `D2`. Record:

- D1 contract revision consumed
- mock field inventory and D2 production field contract
- schema decisions and any changes from this specification
- deliverable dependency schema and `links[]` projection evidence
- DB reset/push evidence
- API test evidence
- manual OpenAPI/Swagger evidence if used

### Halt Conditions

The agent must stop and surface to the Owner if:

1. D1 final contract is missing or contradicts this specification.
2. Any Open Question in §10 is unresolved before code change.
3. Cross-project milestone assignment requires a schema rule Drizzle cannot express
   cleanly without a service-level check.
4. Existing seed snapshot structure makes default milestone backfill ambiguous.
5. Same automated test fails 3 iterations in a row.
6. Scope verification shows broad client UI redesign.
7. A standard not prescribed in §1.b matches the touched file list.

---

## 6. Acceptance Criteria

- **AC1 — Schema supports milestones.** `api/lib/db/schema.js` defines `MILESTONES`,
  required project relation, deliverable relation, default milestone uniqueness, date
  fields, and `DELIVERABLES.milestone_id` plus milestone-scoped deliverable ordering; it
  does not add a persisted manual milestone position or require localized milestone names
  for the MVP. Milestone status is represented or projected with the milestone lifecycle
  `PLANNING`, `PENDING`, `IN_PROGRESS`, and `DONE`, separate from the deliverable
  workflow. Verified by DB push/reset and schema review.
- **AC1a — Deliverable schedule timestamps support Gantt rows.**
  `api/lib/db/schema.js` adds `planned_start_at`, `planned_completion_at`,
  `actual_start_at`, and `actual_completion_at` to `DELIVERABLES`, or this
  specification is revised with an Owner-approved alternative. Database-backed
  `GET /projects/:code/gantt` returns deliverable `startDate` and `endDate` from the
  planned timestamp fields or from a documented temporary fallback for legacy rows.
  Completion/progress metadata may use the actual timestamp fields alongside existing
  deliverable status. Verified by DB push/reset and
  `api/__tests__/routes/gantt.test.mjs`.
- **AC2 — Default milestone behavior.** Project creation and seed/reset create one default
  milestone per project, and seeded deliverables are assigned to it. The API provides
  enough metadata, such as `labelKey: "gantt.defaultMilestone"`, for the client to
  display the localized default milestone label. API routes do not allow removing a
  deliverable from the milestone hierarchy; removing from a planned milestone reassigns
  the deliverable to Default.
  Verified by PactumJS API test and/or database assertion in test setup.
- **AC3 — Gantt projection endpoint.** D1's `GET /projects/:code/gantt` route is now
  database-backed and returns the D1 JSON contract with milestones, deliverables,
  completion metadata, display-label metadata such as `labelKey`/`labelParams`, and
  initial deliverable-level links for the whole project in one response. The response
  includes resolved project timeline metadata from persisted Gantt settings and does not
  require task rows for the production Gantt chart. The response includes a projection
  version or equivalent `updatedAt` marker so the client can guard stale modal saves.
  Verified by `api/__tests__/routes/gantt.test.mjs`.
- **AC3a — Mock contract parity.** Before replacing the mock backing source, the
  implementor inventories `api/src/mockData/gantt/`, `api/src/schemas/gantt.js`, and
  `client/src/utils/ganttAdapter.js`, then records the D2 production field contract in
  the run log. Database-backed `GET /projects/:code/gantt` returns every mock-backed
  field the client consumes, including `projectCode`, `projectName`, `range`, `timeline`,
  `rows`, `links`, row `id`, `entityType`, `parentId`, `labelKey`, `labelParams`,
  `displayName`, `isDefault`, `deliverableId`, `deliverableCode`, `startDate`,
  `endDate`, `status`, `progress`, `completed`, `taskCount`, and link
  `sourceId`/`targetId`/`type`/`relationType`. Any deliberately removed mock field must
  be approved as a spec revision. Verified by `api/__tests__/routes/gantt.test.mjs` and
  run-log contract evidence.
- **AC3b — Gantt status and styling metadata.** Milestone and deliverable rows expose
  raw `status`, `completed`, and `progress` values plus stable visual-state metadata
  such as `statusCategory` and `blocked`. Deliverable rows expose task status aggregate
  fields needed for display or styling, such as `taskCount`, `completedTaskCount`,
  `blockedTaskCount`, and `taskStatusCounts`, without requiring one Gantt row per task.
  Status categories cover at least `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, and
  `BLOCKED`, with mapping rules documented in the service or tests. Verified by
  `api/__tests__/routes/gantt.test.mjs`.
- **AC3c — Deliverable dependency links.** `api/lib/db/schema.js` persists
  deliverable-to-deliverable dependencies, and database-backed
  `GET /projects/:code/gantt` returns those dependencies in `links[]` using the
  mock-compatible fields `id`, `sourceId`, `targetId`, `type`, and `relationType`.
  `sourceId` and `targetId` point at deliverable row IDs such as `deliverable:<id>` so
  SVAR can draw connector lines between deliverable bars. The service rejects
  cross-project dependencies and self-dependencies. Verified by
  `api/__tests__/routes/gantt.test.mjs`.
- **AC4 — Milestone CRUD.** Project-scoped create, list, update, and delete behavior
  works for non-default milestones, validates date range/name, deletes only empty
  non-default milestones in M1, and rejects deleting the default milestone. Verified by
  `api/__tests__/routes/gantt.test.mjs`.
- **AC5 — Deliverable reassignment.** `PATCH /projects/:code/gantt/deliverables/:id/milestone`
  moves a deliverable to another milestone in the same project and rejects cross-project
  or missing milestone IDs. Verified by PactumJS tests.
- **AC6 — Ordered milestone deliverable list.** `PUT
  /projects/:code/milestones/:milestoneId/deliverables` replaces the milestone's ordered
  deliverable list. The request accepts deliverables already in that milestone and
  deliverables currently in the default milestone. Deliverables removed from a planned
  milestone move back to the default milestone. The route rejects cross-project IDs,
  duplicate IDs, and attempts to pull deliverables directly from another planned
  milestone. The Gantt projection returns deliverables in the saved milestone order.
  The route accepts an `expectedVersion` when conflict handling is enabled and rejects
  stale updates with `409 Conflict` plus the latest projection or reload/review detail.
  Verified by PactumJS tests.
- **AC7 — Realtime events.** Creating/updating/deleting milestones and reassigning
  deliverables publishes project-scoped realtime events with stable `eventType` values.
  Verified by route tests or realtime-events test extension.
- **AC8 — Mock backing removed from production path.** Production `GET /projects/:code/gantt`
  no longer reads from `api/src/mockData/gantt/`; D1 mock files are deleted or retained
  only as explicit test fixtures. Verified by code inspection and route tests.
- **AC9 — Project Gantt settings.** Project-scoped settings routes return and update
  Gantt display settings. Valid settings can switch timeline mode among dates, weeks,
  and sprints; sprint settings validate period start date, sprint length, and starting
  number; default milestone visibility defaults off and can be enabled with
  `showDefaultMilestone`; invalid settings return documented validation errors; and
  `GET /projects/:code/gantt` reflects the updated settings in its resolved `timeline`
  metadata without changing milestone/deliverable/task dates. Verified by
  `api/__tests__/routes/gantt.test.mjs`.
- **AC10 — Owner-only project configuration UI.** The Edit Project modal exposes a Gantt
  Configuration tab. Project leaders can edit settings and save them through
  `GET/PUT /projects/:code/gantt/settings`; non-leaders see read-only controls and no
  settings update is submitted. Verified by focused client tests or manual QA if the D2
  implementation remains API-heavy.
- **AC11 — Verification clean.** Backend tests, lint, and typecheck pass. Verified by
  `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test`,
  `cd api && npm run lint`, and `cd api && npm run typecheck`.
- **AC12 — Scope clean.** Verified by D2 slice inspection showing only approved backend
  and narrow client hook changes.

---

## 7. Test Plan

Reference data sources:

- D1 final mocked Gantt contract in `.zazz/execution/project-milestones-m1-run-log.md`
- existing seeded `ZAZZ` project data
- synthetic PactumJS test project, deliverables, and optional tasks created in test setup

Automated tests:

- `gantt.test.mjs should return default milestone hierarchy for seeded deliverables` —
  verifies AC2 and AC3 by asserting project, milestone, deliverable, completion, and
  link fields match the revised D1/D2 contract, and by confirming seeded/new deliverables
  remain under the default milestone until assigned to a planned milestone.
- `gantt.test.mjs should preserve the mock Gantt field contract from the database` —
  verifies AC3a by asserting the database-backed projection includes every
  client-consumed mock field, plus approved D2 additions.
- `gantt.test.mjs should return deliverable schedule timestamps in Gantt rows` —
  verifies AC1a by asserting deliverable rows expose `startDate` and `endDate` values
  derived from persisted `planned_start_at` and `planned_completion_at`, plus completion
  metadata from status and/or actual timestamp fields.
- `gantt.test.mjs should return normalized status metadata for Gantt styling` —
  verifies AC3b by asserting milestone/deliverable raw status, `statusCategory`,
  `blocked`, completion/progress fields, and deliverable task status aggregates.
- `gantt.test.mjs should return deliverable dependency links for the chart` — verifies
  AC3c by creating or seeding deliverable dependencies and asserting `links[]` contains
  mock-compatible source/target deliverable IDs, link type, and `DEPENDS_ON`
  `relationType`.
- `gantt.test.mjs should create update and list project milestones` — verifies AC4 with
  valid date behavior, generated display-label metadata, and chronological milestone
  ordering.
- `gantt.test.mjs should project milestone planning statuses` — verifies AC1 and AC3 by
  asserting `PLANNING`, `PENDING`, `IN_PROGRESS`, and `DONE` milestone states are
  derived or persisted separately from deliverable workflow statuses.
- `gantt.test.mjs should return and update project Gantt settings` — verifies AC9 by
  asserting defaults, valid sprint/week/date modes, validation errors, and projection
  metadata after update.
- `gantt.test.mjs should reject invalid milestone payloads and default milestone delete`
  — verifies AC4 negative cases.
- `gantt.test.mjs should move deliverable between milestones within the same project` —
  verifies AC5 happy path.
- `gantt.test.mjs should replace milestone deliverable list and preserve order` —
  verifies AC6 by adding default deliverables to a planned milestone, removing a
  deliverable back to default, moving rows up/down through ordered IDs, and asserting the
  Gantt projection order.
- `gantt.test.mjs should reject invalid ordered milestone deliverable updates` —
  verifies AC6 by rejecting cross-project IDs, duplicate IDs, attempts to remove from the
  default milestone hierarchy, and direct pulls from another planned milestone.
- `gantt.test.mjs should reject cross-project milestone assignment` — verifies AC5 and
  the project-scoped access invariant.
- `realtime-events.test.mjs milestone cases` or equivalent — verifies AC7 event names
  and project code scope.
- `ProjectModal.gantt test` or equivalent — verifies AC10 by asserting owner-editable
  Gantt Configuration controls, read-only non-owner behavior, and no settings update
  submission for non-owners.

Manual verification:

- Swagger/OpenAPI route visibility for `/projects/:code/gantt` and milestone endpoints
  if the docs server is running.
- Browser smoke with D1 client switched to production endpoint.

Existing coverage intentionally reused:

- Existing deliverables/task graph tests continue to prove task CRUD and relation
  semantics; D2 tests should not duplicate every task graph edge case.

---

## 8. TDD Entry Point + Prescriptive Execution Sequence

### TDD Entry Point

Add the first failing API test:

```javascript
it('returns a project Gantt hierarchy with the default milestone', async () => {
  await spec()
    .get('/projects/ZAZZ/gantt')
    .withHeaders('TB_TOKEN', TEST_TOKEN)
    .expectStatus(200)
    .expectJsonLike({
      projectCode: 'ZAZZ',
      rows: [
        { entityType: 'milestone', isDefault: true },
      ],
    });
});
```

### Prescriptive Execution Sequence

**Phase 1: Contract reconciliation**

1.1. Read D1 final mocked contract from the run log.  
1.2. Inventory `api/src/mockData/gantt/`, `api/src/schemas/gantt.js`, and
`client/src/utils/ganttAdapter.js`; record client-consumed fields in the run log.
1.3. Revise this specification if the contract materially differs.
1.4. Add failing PactumJS tests that prove `GET /projects/:code/gantt` no longer returns
D1's fixed mock data and instead reflects seeded/test database state.

**Phase 2: Schema and seed foundation**

2.1. Add `MILESTONES`, `DELIVERABLES.milestone_id`,
`DELIVERABLES.milestone_position` or equivalent milestone-scoped order field, and
deliverable schedule timestamp fields to `api/lib/db/schema.js`.
2.1a. Add deliverable dependency persistence such as `DELIVERABLE_RELATIONS`, including
same-project validation support, self-dependency protection, indexes, and Drizzle
relations.
2.2. Add project Gantt settings persistence with one settings record per project or an
approved validated project-owned JSON alternative.  
2.3. Add relations.  
2.4. Update seed/reset to create default milestones, assign seeded deliverables, create
deliverable dependency records that exercise `links[]`, and create default Gantt
settings.
2.5. Run DB reset against test DB.

**Phase 3: Data/service projection**

3.1. Add `databaseService` milestone CRUD methods.  
3.2. Add default milestone helper.  
3.3. Add `getProjectGantt(projectId)` projection matching D1; it returns all milestones,
deliverables, and initial deliverable-level links for the project in one service
response.  
3.4. Add deliverable dependency query/projection helpers that map persisted dependency
records into mock-compatible `links[]` rows.
3.5. Add deliverable-level task count/status rollup helpers only if needed by the
projection; do not add a production task-row Gantt surface in D2.
3.6. Add Gantt settings get/update helpers and resolve settings into projection
`timeline` metadata.  
3.7. Add deliverable milestone reassignment with same-project validation.
3.8. Add ordered milestone deliverable-list replacement, using the default milestone as
the initial source/destination for add/remove flows.

**Phase 4: Routes, schemas, realtime**

4.1. Add route schemas.  
4.2. Replace D1's mock-backed `GET /projects/:code/gantt` implementation with the
database-backed projection.  
4.3. Add `GET /projects/:code/gantt/settings` and
`PUT /projects/:code/gantt/settings`.  
4.4. Add deliverable milestone reassignment route.  
4.5. Add `PUT /projects/:code/milestones/:milestoneId/deliverables` for ordered
assignment list replacement.  
4.6. Publish milestone/gantt realtime events.

**Phase 5: Client switch and verification**

5.1. If D1 client code exists, switch `useProjectGantt` from mock to production endpoint
by default.  
5.2. Run full backend verification and relevant client smoke.  
5.3. Record evidence in the run log.

### Skeleton: `api/src/routes/gantt.js`

```javascript
import { authMiddleware } from '../middleware/authMiddleware.js';
import { ganttSchemas } from '../schemas/validation.js';

export default async function ganttRoutes(fastify, options) {
  const { dbService, realtimeService } = options;

  const publishEvent = (projectCode, payload) => {
    if (!realtimeService) return;
    realtimeService.publish(projectCode, payload);
  };

  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/projects/:code/gantt', {
    schema: ganttSchemas.getProjectGantt,
  }, async (request, reply) => {
    const project = await dbService.getProjectByCode(request.params.code);
    if (!project) return reply.code(404).send({ error: 'Project not found' });
    const gantt = await dbService.getProjectGantt(project.id);
    reply.send({ projectCode: project.code, ...gantt });
  });
}
```

---

## 9. Definition Of Done

- [ ] All §1 required reading consumed; standards-index verification performed.
- [ ] D1 final contract consumed and any needed spec revision completed before coding.
- [ ] All §10 Open/Resolved Questions handled with the Owner and logged.
- [ ] DB reset/push evidence recorded.
- [ ] Scoped tests green:
  `cd api && set -a && source .env && set +a && NODE_ENV=test npm run test`.
- [ ] `cd api && npm run lint` exits 0.
- [ ] `cd api && npm run typecheck` exits 0.
- [ ] Manual OpenAPI/browser smoke complete where applicable.
- [ ] Scope verification matches §3 for the D2 slice.
- [ ] All AC1-AC12 verified, with evidence cited.
- [ ] Run-log section for D2 is up to date.
- [ ] Verifier sub-agent dispatched and returned all-pass.
- [ ] PR draft body links this specification and lists each AC's verification.

---

## 10. Open And Resolved Questions

Resolve these before code is written. Log each answer in the run log.

- **OQ-1** — What exact D1 JSON contract is final?
- **RQ-2** — Milestone date boundaries remain the milestone planning fields
  `start_date` and `end_date`. Deliverable schedule values are timestamp fields on
  `DELIVERABLES`; task schedule values are not added for D2. The adapter handles the
  public Gantt `startDate`/`endDate` display contract.
- **RQ-3** — Deleting a non-default milestone is rejected unless the milestone is empty
  in M1. A later guided delete/archive flow may move deliverables back to the default
  milestone before deletion.
- **OQ-4** — Should project creation immediately create a default milestone, or should it
  be lazily created on first Gantt access? Recommendation: create immediately.
- **RQ-5** — Initial Gantt load contains milestones and deliverables. Production D2 does
  not need to load, timestamp, or render task rows in the Gantt chart.
- **RQ-6** — Gantt timeline configuration is project-level. D2 should persist settings
  for timeline mode, date label visibility, period start date, sprint length, starting
  period number, and display prefixes. The projection returns resolved timeline metadata
  while rows retain `startDate`/`endDate` fields derived from milestone boundaries and
  deliverable schedule timestamps.
- **RQ-7** — Use `default milestone` for the system-created assignment bucket and
  `planned milestone` for non-default, owner-created roadmap milestones. Avoid
  `active milestone` and `real milestone` in D2 API/spec language.
- **RQ-8** — D2 persists deliverable schedule timestamps on `DELIVERABLES` as
  `planned_start_at`, `planned_completion_at`, `actual_start_at`, and
  `actual_completion_at`. Use Drizzle `timestamp(..., { withTimezone: true })`, matching
  the existing schema convention for datetime fields. The API may still expose
  Gantt-facing `startDate` and `endDate` names in the JSON contract.
- **RQ-9** — D2 does not add task schedule fields or a task-row date projection for the
  production Gantt chart. Tasks remain dynamic execution data surfaced through task views;
  the Gantt uses deliverable rows and deliverable status/completion metadata.
- **RQ-10** — D2 persists deliverable-to-deliverable dependencies as planning data and
  returns them through the Gantt projection `links[]`. Do not rely exclusively on
  `TASK_RELATIONS` for Gantt dependency lines because planned/proposed deliverables may
  need dependency lines before tasks exist.

---

## 11. Run Log Protocol

This specification uses the shared run log:

`.zazz/execution/project-milestones-m1-run-log.md`

Required `D2` sections:

- Standards Verification
- OQ/RQ Resolutions
- D1 Contract Consumed
- Schema Evidence
- Phase Completions
- Deviations
- Manual Evidence Locations
- QA Findings & Rework
- Issues & Recoveries
- Verifier Sub-Agent Report

---

## 12. Appendix — Agent Implementation Prompt

Paste this into a fresh implementation session:

```text
You are starting fresh in the worktree at the repository root.
Your task is to implement Project Milestones M1 D2: Gantt API and database persistence.

Specification: .zazz/specifications/project-milestones-m1-d2-gantt-api-database.md
Shared run log: .zazz/execution/project-milestones-m1-run-log.md

Read the specification end to end before editing. Then read the D1 final contract and D2
run-log section.

NON-NEGOTIABLE RULES
1. Follow the specification's Agent Implementation Rules.
2. Resolve every Open Question before writing code; log answers in the run log.
3. Verify standards via .zazz/standards/index.yaml before writing code.
4. Implement the D1 Gantt JSON contract unless the Owner approves a spec revision.
5. Keep all runtime DB access in databaseService.
6. Tests and verification are not optional.

ORDER OF WORK
1. Read the specification, feature doc, D1 spec, D1 run-log contract, standards, and code references.
2. Resolve OQs.
3. Start with the failing PactumJS test in §8.
4. Implement schema, seed/reset, service methods, routes, schemas, realtime, and client hook switch if applicable.
5. Run verification and complete the DoD.
6. Dispatch a verifier sub-agent.
7. Prepare PR-ready output. Do not merge to main.

VERIFIER SUB-AGENT
After your own DoD checklist is green, dispatch a fresh sub-agent:

  "You are verifying Project Milestones M1 D2 in this worktree. Read
  .zazz/specifications/project-milestones-m1-d2-gantt-api-database.md,
  .zazz/specifications/project-milestones-m1-d1-svar-gantt-ui-contract.md, and
  .zazz/execution/project-milestones-m1-run-log.md. For each AC, independently verify
  the cited test or command. Confirm D2 implements the D1 contract and keeps access
  project-scoped. Do not modify code or the run log. Return PASS/FAIL per AC with evidence."

Only declare done after the verifier reports all-pass.
```

---

*End of specification. Implementation proceeds from this specification and the run log;
no separate plan is created.*
