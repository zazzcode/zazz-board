# Project Milestones M1 D1 — SVAR Gantt UI And Mocked Contract Specification

**Worktree / branch:** `mw-mvp-milestone-gannt`  
**Feature:** Project Milestones  
**Milestone:** M1: Gantt MVP And Persistence Foundation  
**Deliverable:** D1 SVAR Gantt UI and mocked API contract  
**Delivery topology:** milestone branch  
**Review artifact:** one milestone PR with sibling D1 and D2 specifications  
**Approved review shape:** milestone PR  
**Decomposition rationale:** D1 and D2 are separate deliverables because D1 must prove
the SVAR React Gantt data contract before D2 freezes backend schema and persistence.
Separate sibling PRs would slow the feedback loop for a small MVP, while one combined
specification would hide the deliberate UI-contract discovery step.  
**Integration branch:** `main` per `AGENTS.md`  
**Merge policy:** PR review required; agents commit/push feature branches only  
**Drafted:** 2026-06-27  
**Shared run log:** `.zazz/execution/project-milestones-m1-run-log.md` (`D1` section)

---

## 0. Capability

Add a first project Gantt page that uses SVAR React Gantt to render a milestone and
deliverable hierarchy from a real Fastify `GET /projects/:code/gantt` route backed by
fixed mock data. Task rows lazy-load when a deliverable expands through a second
mock-backed route. Project-level Gantt settings load and save through mock-backed
settings routes so the Edit Project modal can prove the owner-only configuration
workflow before database persistence exists. This deliverable owns client-side
navigation, mock-backed API routes, the Gantt adapter/hook, JSON contract discovery, and
documentation of the contract D2 must implement. The initial route returns the full
project planning projection in one payload; it does not query or load each milestone
separately. It does not implement production database persistence.

---

## 1. Required Reading For The Implementor

Read this specification end to end before editing.

### 1.a Feature Context

- `.zazz/features/project-milestones-feature.md` — read `Feature
  Summary`, `Concepts`, `SVAR React Gantt Research Notes`, and `M1: Gantt MVP And
  Persistence Foundation`.
- `.zazz/docs/zazz-methodology.md` — read `Progression`, `Core Model`, and `Authority
  Gates`.

### 1.b Library Documentation

- [SVAR React Gantt repository](https://github.com/svar-widgets/react-gantt) — package
  source and examples.
- [SVAR React Gantt docs](https://docs.svar.dev/react/gantt/) — confirm install,
  Vite integration, task/link data shape, tree behavior, columns, scales, styling, and
  editing/action interception before choosing adapter fields.
- [SVAR React Gantt Quickstart](https://docs.svar.dev/react/gantt/getting_started/) —
  confirms `Gantt`, `Willow`, `tasks`, `links`, and `scales` usage.
- [SVAR React Gantt API overview](https://docs.svar.dev/react/gantt/api/overview/api_overview/) —
  confirms properties such as `tasks`, `links`, `columns`, `scales`, `projectStart`,
  `projectEnd`, `readonly`, `taskTemplate`, and action/method surfaces.
- [SVAR React Gantt backend guide](https://docs.svar.dev/react/gantt/guides/working_with_server/) —
  confirms server-saving patterns, `RestDataProvider`, request/provide data actions, and
  API interception concepts.
- [`@svar-ui/react-gantt` npm package](https://www.npmjs.com/package/@svar-ui/react-gantt) —
  current version checked during drafting: `2.7.1`.
- Local package research after installing `@svar-ui/react-gantt@2.7.1` — inspect
  `client/node_modules/@svar-ui/react-gantt/types/index.d.ts`,
  `client/node_modules/@svar-ui/gantt-store/dist/types/types.d.ts`, and
  `client/node_modules/@svar-ui/gantt-data-provider/dist/types/RestDataProvider.d.ts`
  for the installed API shape.

Capture the exact documentation pages and decisions used in the run log.

### 1.c Prior Specifications In This Delivery Effort

N/A.

### 1.d Standards

Verify these against `.zazz/standards/index.yaml` before coding:

| Standard | What it governs here |
| --- | --- |
| `.zazz/standards/system-architecture.md` | React/Vite/Mantine client boundary and JavaScript-only stack. |
| `.zazz/standards/coding-styles.md` | client mutation pattern, i18n keys, route navigation, API validation, project-scoped handler pattern. |
| `.zazz/standards/frontend.md` | placeholder frontend guidance; coding-styles remains authoritative. |
| `.zazz/standards/service-layer.md` | Fastify route-to-service boundary and realtime event shape. |
| `.zazz/standards/http-layer.md` | placeholder route/schema guidance; coding-styles remains authoritative. |
| `.zazz/standards/testing.md` | PactumJS tests for the mock-backed route. |
| `.zazz/standards/code-structure.md` | keep Gantt adapter/hook/component focused. |
| `.zazz/standards/spec-hygiene.md` | keep this contract path-relative and testable. |

If another indexed standard matches the touched file list, stop and surface it before
proceeding.

### 1.e Existing Code References

- `client/src/App.jsx` — project routing, default project navigation, segmented project
  view switcher.
- `client/src/pages/DeliverableKanbanPage.jsx` — existing project page shape to mirror
  for loading state and page ownership.
- `client/src/hooks/useDeliverables.js` — race-safe fetch and mutation owner pattern.
- `client/src/hooks/useProjectEvents.js` — project-scoped realtime subscription.
- `client/src/pages/TaskGraphPage.jsx` — graph data projection and realtime refresh
  pattern.
- `client/src/i18n/locales/en.json` and sibling locales — navigation labels and static
  UI translations.
- `api/scripts/seeders/locales/en.json` and sibling API locale seed files — API-backed
  UI translations loaded at runtime.
- `api/src/routes/deliverables.js` — project-scoped route pattern.
- `api/src/routes/taskGraph.js` — dependency route schema and project-scoped validation
  pattern.
- `api/src/routes/index.js` — route plugin registration.
- `api/src/schemas/` — schema split and validation barrel.
- `api/__tests__/routes/deliverables.test.mjs` — PactumJS route test pattern.

### 1.f Project Orientation

- `AGENTS.md` — worktree workflow, JavaScript-only constraint, commands, and test DB.

---

## 2. Invariants

### INVARIANT 1 — D1 Does Not Freeze Persistence

D1 may define and consume a mocked Gantt JSON contract, but it must not add production
database tables, Drizzle schema changes, or production CRUD routes for milestones.
D1 may add real Fastify mock routes for the Gantt projection, deliverable task
expansion, and project Gantt settings.

### INVARIANT 2 — SVAR Details Stay Behind An Adapter

SVAR row/link shapes must be isolated in a Gantt adapter or hook. General Zazz project
state should not become widget-specific across the app.

### INVARIANT 3 — Project Code Remains The Route Context

The user-visible route is `/projects/:projectCode/gantt`, and every mocked or future API
contract must include the project code context.

### INVARIANT 4 — Gantt Is A Projection Of Existing Work

The page shows milestones, deliverables, lazily loaded tasks, and dependencies as another
view of project work. It must not introduce a second independent task or deliverable
model in the client.

### INVARIANT 5 — Initial Load Is One Project Projection

`GET /projects/:code/gantt` returns the complete project planning payload for initial
render: all milestones, deliverables, and initial deliverable-level links for the
project. D1 must not model initial render as one request per milestone. Task rows load
only when a deliverable expands.

---

## 3. Scope

### Approved Review Shape

This specification is approved as one deliverable inside a milestone PR with the D2 API
and database specification.

**Rationale.** D1 is reviewable as a client/API-contract slice, and D2 is reviewable as
the persistence slice. Keeping them in one milestone PR lets reviewers see the planned
handoff without forcing D1 to commit to premature database shape.

**Review unit owned by this specification.**

- D1 SVAR Gantt UI and mocked contract — route, tab, mock Gantt data, adapter, page,
  realtime refresh behavior, and documented contract evidence.

### Strict Scope Constraint

Product-code changes for this specification live under `client/` and the narrow API
mock-route surface listed below. If implementation surfaces a need for production
database tables, Drizzle schema changes, or milestone CRUD routes, stop and revise this
specification with Owner sign-off.

### In Scope

| Path | New / Modified | Reason |
| --- | --- | --- |
| `client/package.json` | Modified | Add the SVAR React Gantt dependency selected from the upstream docs. |
| `client/package-lock.json` or root `package-lock.json` | Modified if dependency install updates it | Keep npm lockfiles consistent. |
| `client/src/App.jsx` | Modified | Add `/projects/:projectCode/gantt`, default project navigation, and Gantt segmented-control option. |
| `client/src/components/ProjectModal.jsx` | Modified | Add owner-only Gantt Configuration tab and wire it to mock settings routes. |
| `client/src/pages/GanttPage.jsx` | New | Project Gantt page that owns data loading, event refresh, and render states. |
| `client/src/hooks/useProjectGantt.js` | New | Fetch or provide mocked project Gantt contract with race-safety. |
| `client/src/utils/ganttAdapter.js` | New | Convert Zazz Gantt contract to SVAR tasks, links, columns, scales, localized display labels, and styling metadata. |
| `client/src/components/gantt/ProjectGantt.jsx` | New | Thin SVAR React Gantt wrapper. |
| `client/src/i18n/locales/*.json` | Modified | Add `Gantt`, `milestone`, `milestones`, and user-facing Gantt strings. |
| `api/src/mockData/gantt/*.js` | New | Fixed project-scoped mock Gantt data, including default and named milestones. |
| `api/src/routes/gantt.js` | New | Mock-backed `GET /projects/:code/gantt`, deliverable task expansion routes, and `GET/PUT /projects/:code/gantt/settings`. |
| `api/src/routes/index.js` | Modified | Register the mock-backed Gantt route plugin. |
| `api/src/schemas/gantt.js` | New | JSON schema for the mock-backed Gantt and settings responses. |
| `api/src/schemas/index.js` and `api/src/schemas/validation.js` | Modified | Export Gantt schemas. |
| `api/__tests__/routes/gantt-mock.test.mjs` | New | PactumJS coverage for project-scoped mock response and 404 behavior. |
| `api/scripts/seeders/locales/*.json` | Modified | Mirror new Gantt/milestone translation keys for API-loaded translations. |
| `.zazz/execution/project-milestones-m1-run-log.md` | New/Modified | Record SVAR docs research and final D1 JSON contract evidence. |

### Out Of Scope

- production milestone database tables
- production milestone CRUD routes
- seed snapshot changes
- deliverable `milestone_id`
- persistent milestone deliverable assignment ordering
- `databaseService` milestone methods
- persistent drag/drop reassignment
- first-class deliverable dependency records
- broad visual redesign of existing Kanban/list/graph pages
- replacing the existing task graph view

---

## 4. Decisions

### D-1 — Start With A Real Mock-Backed Gantt Route

**Decision.** D1 proves the client and JSON contract with a real Fastify
`GET /projects/:code/gantt` route backed by fixed mock data before production
database implementation.

**Why.** SVAR React Gantt should teach the project what fields, row identities,
parent/child relationships, links, dates, and styling hooks the API must support. Freezing
schema first would risk implementing persistence around the wrong widget contract.
Using the real route shape in D1 also lets the client integrate through the same URL,
auth header, and project-code path D2 will keep.

### D-2 — Put D1 And D2 In The Same Milestone

**Decision.** M1 has two deliverables: D1 client/mock contract and D2 backend
persistence.

**Why.** Both are needed for a real MVP, but separating them lets the team review the
library integration and API shape before building tables and CRUD around it.

### D-2a — Use Fixed Mock Milestones With Real Dates

**Decision.** The mock data uses fixed milestone IDs and generated labels:
`milestone:default` (`Default`), `milestone:one` (`Milestone 1`),
`milestone:two` (`Milestone 2`), `milestone:three` (`Milestone 3`), and optional later
milestones such as `milestone:four` through `milestone:six`. Rows use realistic
date-only ISO ranges rather than placeholder dates.

**Why.** A longer realistic date range proves grouping, sorting, completion styling,
dependency lines, and timeline scaling without pretending the mock data is production
planning truth.

### D-2a.1 — Keep Dates Authoritative And Render Sprints As A View Scale

**Decision.** `GET /projects/:code/gantt` may include a `timeline` object with
`unit: "sprint"`, `sprintStartDate`, `sprintLengthWeeks`, `sprintLabelPrefix`, and
`weekLabelPrefix`. The client renders two-week sprint headers and one-week subheaders
from those dates instead of showing day-number headers.

**Why.** The API should stay date-driven so persistence, validation, dependencies, and
timezone handling remain straightforward. Sprint/week labels are a presentation layer
over those dates; storing generated labels would make updates and localization brittle.

### D-2b — Fetch The Whole Project Gantt In One Payload

**Decision.** `GET /projects/:code/gantt` returns all milestones, deliverables, and
initial deliverable-level links needed for the first Gantt render in one response. Task
rows load separately when the user expands a deliverable.

**Why.** SVAR React Gantt renders from a `tasks` array and a `links` array, with hierarchy
represented by each task row's `parent`. Zazz should assemble the milestone/deliverable
planning projection once in the API layer and let the client adapter convert that payload
to the SVAR shape. Per-milestone loading is unnecessary for the MVP. Task rows are more
volatile during agent execution, so loading them on deliverable expansion keeps the
initial chart lighter and matches how owners usually inspect detail.

### D-2c — Lazy-Load Tasks Under Expanded Deliverables

**Decision.** D1 adds a mock-backed deliverable task expansion route, recommended as
`GET /projects/:code/gantt/deliverables/:deliverableId/tasks`, that returns task rows and
task links for one deliverable.

**Why.** Agent-created tasks may update every second or two during active execution, and
owners will not always expand task detail. Loading tasks only for expanded deliverables
keeps first render focused on milestones and deliverables while preserving the ability to
inspect implementation detail.

### D-3 — Make Gantt The Default Project Landing View

**Decision.** `handleProjectSelect` should navigate to `/projects/:code/gantt`.

**Why.** The Gantt view is the project portal: it shows milestones, deliverables, tasks,
and dependency timing before users choose a more focused execution view.

### D-4 — Use Existing Realtime As Refresh Trigger

**Decision.** D1 subscribes to `/projects/:code/events` and refreshes or patches the
Gantt data on relevant task, deliverable, and relation events.

**Why.** Existing project-scoped SSE is already the app's live-update boundary. Adding a
parallel realtime path for mocked Gantt would create throwaway behavior.

### D-5 — Use A Zazz Hook/Adapter First, Not `RestDataProvider`

**Decision.** D1 should start with a Zazz-owned fetch hook and adapter against
`GET /projects/:code/gantt` rather than wiring SVAR `RestDataProvider` directly to
project routes.

**Why.** The first deliverable is contract discovery, and Zazz needs project-scoped auth,
SSE refresh, completion coloring, and row typing that are easier to reason about in a
local hook/adapter. D1 should still record whether `RestDataProvider` is useful for D2 or
later editing flows.

### D-5.1 — Keep The Page Projection And Modal Drafts Separate

**Decision.** D1 should model the Gantt UI around this synchronization boundary:

- API/mock data is treated as the durable source for the initial projection.
- `useProjectGantt` owns the current page projection and uses request guards for fetch
  race-safety.
- The Gantt page may keep local mock projection state only to demonstrate edit flows
  before D2 persistence exists.
- Milestone modals own temporary draft state and discard it on cancel.
- Save actions close the modal only after a successful local mock save in D1, and later
  after a successful API mutation in D2.
- SSE/project events are debounced refresh triggers, not the primary feedback path for
  the user's own save.
- `localStorage` must not be used for milestone dates, deliverable assignment, row
  order, statuses, or Gantt settings. It remains appropriate only for harmless UI
  preferences and existing auth/theme storage.

**Why.** This keeps the prototype aligned with the production architecture: server data
is authoritative, page hooks own loaded projections, and editors own only unsaved
drafts. It avoids hidden browser-persistent planning data that could disagree with the
API or another user's edits.

### D-5a — Prototype Milestone Editing With Explicit Assignment Controls

**Decision.** D1 may prototype milestone create/edit UI with visible row actions and a
modal, but persistence remains mock/scaffolded. The intended production form is not only
a dropdown: it should show the current deliverables assigned to the milestone as an
ordered list, with add/remove and move up/down affordances. Add candidates come from the
default milestone intake pool, and removing a deliverable from a planned milestone
returns it to the default milestone.

**Why.** Owners need to see and adjust the full milestone membership while editing dates.
A single dropdown hides the current assignment state and does not express the Gantt row
order. Keeping the D1 version scaffolded lets the team evaluate the interaction before
committing to the D2 database/API shape.

### D-5b — Make The Milestone Editor A List Editor, Not A Select-Only Form

**Decision.** The milestone edit modal should be designed around an assigned-deliverables
list. The form should include milestone date fields at the top and a deliverable section
below. In that section, each assigned deliverable appears as a row with code/name/status
context and controls for moving it up or down and removing it from the milestone. An
`Add` affordance opens a selector containing deliverables from the default milestone
intake pool.

**Why.** A multiselect is useful for quick scaffolding but too opaque for production
planning. Owners need to know which deliverables are currently in the milestone, adjust
their order, and make deliberate add/remove choices without accidentally pulling a
deliverable out of another planned milestone.

### D-5b.1 — Treat Default As A Visible, Non-Removable Return Bucket

**Decision.** The D1 prototype should show the current deliverables assigned to any
opened milestone. The default milestone remains in the working Gantt data model, but it
is hidden from the chart by default to reduce roadmap clutter. When the project-level
`Show default milestone` setting is enabled, the chart shows the default milestone and
its children so the owner can inspect the assignment bucket. Removing a deliverable from
a planned milestone should place it back in the default milestone in the local mocked UI
state. The default milestone should not show remove actions for its deliverables.

**Why.** The owner needs to test the actual assignment model before persistence exists:
planned milestones are curated lists, while Default is the safe holding area for
new work awaiting assignment. Hiding Default by default keeps the roadmap focused, while the setting
preserves a deliberate test/inspection path. Showing remove controls on Default would
imply a deliverable can leave the milestone hierarchy entirely, which is not part of the
M1 model.

### D-5b.2 — Normalize Widget Row IDs Before Looking Up Children

**Decision.** The milestone editor should normalize Gantt row ids before finding the
deliverables assigned to the opened milestone. The UI must tolerate the widget passing a
decorated row id while the source contract uses the plain Zazz row id.

**Why.** The modal has to reflect the rows visible in the chart. If the chart library
adds presentation markers to ids, strict string comparison can make the editor look like
an add-only form even when the milestone already has deliverables.

### D-5c — Keep Right-Click/Control-Click Optional In The UI Contract

**Decision.** D1 should not require right-click/control-click as the only way to edit a
milestone, but the UI contract should preserve it as an optional secondary shortcut.
Right-click/control-click on a milestone row or bar may open a context menu with actions
such as `Edit Milestone`, `Assign Deliverables`, and `Zoom to Milestone`, provided the
visible edit action remains available.

**Why.** Context menus can be efficient for power users and may be supported cleanly by
the SVAR integration, but they are less discoverable and more variable across devices and
browsers. Visible row actions give the MVP a reliable path while leaving room for the
shortcut.

### D-6 — Localize Milestone Terms And Generated Labels In Every Supported Locale

**Decision.** D1 adds translation keys for `milestone`, `milestones`, the default
milestone display label, and the numbered milestone label pattern to all supported static
and seeded locales: `en`, `de`, `es`, and `fr`.

**Why.** Zazz Board is multilingual, and the Gantt page introduces milestone as a new
user-facing concept. Leaving generated labels as raw English strings would regress the
existing translation model. D1 should generate display labels from locale keys rather
than storing translated labels in mock or future database rows.

---

## 5. Agent Implementation Rules

### Team Integration

Commit and push only to the feature branch. Do not merge directly to `main`; all
integration happens through human PR review.

### Command Working Directory

Use stable commands:

```bash
cd api && set -a && source .env && set +a && NODE_ENV=test npm run test -- gantt-mock
cd client && npm run test
cd client && npm run lint
npm run build
```

For docs-only checks after specification edits, use the repo's markdown lint command when
available.

### Commit And Push

Default to one coherent green commit per specification after the DoD and verifier pass.
Waypoint commits are allowed only at coherent green recovery points.

### Scope Verification

Because this is a milestone branch with D1 and D2, verify this slice with changed paths
and commit inspection. D1 product changes should stay in the paths listed in §3,
especially `client/`, the read-only mock Gantt API route surface, package lockfiles,
locale seed JSON, and the M1 run log.

### Autonomy Boundaries

Hard constraints:

- Invariants in §2.
- Scope in §3.
- Acceptance criteria in §6.
- Use SVAR React Gantt as the widget.
- Do not implement production persistence in D1.

Adaptive guidance:

- exact component names
- exact adapter helper names
- whether realtime refresh re-fetches all mock data or patches rows locally
- exact mock data file split under `api/src/mockData/gantt/`
- whether lazy task expansion uses SVAR `request-data` / `provide-data` actions or a
  Zazz-controlled expand handler

### Run Log

Maintain `.zazz/execution/project-milestones-m1-run-log.md`, section `D1`. Record:

- SVAR documentation pages reviewed
- dependency/package name installed; `@svar-ui/react-gantt@2.7.1` was installed during
  specification research and should be verified before implementation
- final mocked JSON contract
- final lazy task expansion contract
- adapter decisions and any widget limitations discovered
- manual screenshots or smoke evidence

### Halt Conditions

The agent must stop and surface to the Owner if:

1. Any Open Question in §10 is unresolved before code change.
2. The chosen SVAR package cannot be installed or imported in Vite.
3. SVAR cannot represent the required hierarchy without a materially different UX.
4. The widget requires backend behavior beyond the read-only mock route that would force
   production API/database work in D1.
5. Same automated test fails 3 iterations in a row.
6. Scope verification shows production backend persistence changes.
7. A standard not prescribed in §1.d matches the touched file list.

---

## 6. Acceptance Criteria

- **AC1 — Default project route.** Clicking a project in `/projects` navigates to
  `/projects/:projectCode/gantt`, and direct navigation to that URL loads the selected
  project. Verified by a client test or manual Playwright/browser smoke evidence.
- **AC2 — Project view switcher.** The segmented control shows `Gantt` immediately before
  `Kanban`, highlights it on `/gantt`, and navigates among `Gantt`, `Kanban`,
  `Task Kanban`, `Graph`, and `Deliverables` without losing selected project context.
  Verified by a client test or manual browser smoke evidence.
- **AC3 — SVAR render.** The Gantt page renders SVAR React Gantt with mocked milestone,
  deliverable rows in a tree hierarchy and at least one dependency link. Expanding a
  deliverable loads task rows beneath it. Verified by a client test where practical plus
  manual screenshot evidence.
- **AC4 — Completion styling.** Mock completed task, deliverable, and milestone rows have
  visibly green completion styling or an equivalent SVAR-supported visual state. Verified
  by adapter test and manual screenshot evidence.
- **AC5 — Contract captured.** The D1 run log records the final mocked JSON contract D2
  must implement, including row ids, parent ids, entity type, start/end dates, status,
  completion flag, dependency links, label keys/parameters for localized milestone
  display, the fact that initial load returns all milestones/deliverables in one payload,
  optional sprint/week timeline metadata, and the lazy task expansion contract. Verified
  by run-log review.
- **AC6 — Realtime refresh hook.** The Gantt page subscribes to project events and
  refreshes or patches data for relevant task, deliverable, and relation event types.
  Verified by hook/component test or manual event smoke evidence.
- **AC7 — Milestone localization.** Static client locales and API locale seed files
  include `milestone`, `milestones`, `defaultMilestone`, and `numberedMilestone`
  translations for `en`, `de`, `es`, and `fr`. Required term values:
  `Milestone`/`Milestones`, `Meilenstein`/`Meilensteine`, `Hito`/`Hitos`, and
  `Jalon`/`Jalons`. Required generated-label values: `Default`,
  `Milestone {number}`; `Standard`, `Meilenstein {number}`; `Predeterminado`,
  `Hito {number}`; and `Par défaut`, `Jalon {number}`. Switching the active locale must
  change the milestone word while preserving the integer ordinal, for example `Hito 1`
  in Spanish and `Meilenstein 1` in German. Verified by file review plus a focused
  locale assertion or component smoke test.
- **AC8 — Mock Gantt route.** `GET /projects/:code/gantt` is a real authenticated
  Fastify route backed by `api/src/mockData/gantt/`, returns project-specific mock data
  for known project codes, and returns 404 for unknown projects. The deliverable task
  expansion route is also real and mock-backed. Verified by
  `api/__tests__/routes/gantt-mock.test.mjs`.
- **AC9 — Mock data coverage.** The mock response contains label metadata that renders as
  `Default`, `Milestone 1`, `Milestone 2`, and `Milestone 3` in English, with additional
  generated milestones allowed for roadmap realism; includes deliverables under both
  `Default` and named milestones; includes enough default deliverables for the owner to
  test assignment into planned milestones; includes at least one completed row and at
  least one dependency link; returns all milestone/deliverable rows in one project-level
  payload; and includes real date ranges plus timeline metadata that the client can
  render as sprint/week headers. Mock task expansion responses include task rows for at
  least two deliverables. Verified by API and adapter tests.
- **AC10 — Mock-backed Gantt configuration.** The Edit Project modal exposes a Gantt
  Configuration tab. Project leaders can load and save timeline settings through
  `GET/PUT /projects/:code/gantt/settings`; non-leaders see read-only controls. Updating
  mock settings changes the timeline metadata returned by `GET /projects/:code/gantt`.
  The configuration includes `Show default milestone`, which defaults off and controls
  whether the Gantt chart displays the default milestone bucket. Verified by client
  component tests and `api/__tests__/routes/gantt-mock.test.mjs`.
- **AC11 — Milestone edit scaffold.** The Gantt view exposes a visible edit action for
  milestone rows and opens a milestone modal with start/end dates plus assigned
  deliverables already visible in the Gantt row hierarchy. The D1 modal may persist only
  to local mock state, but it must prove the intended production behavior: ordered
  deliverable rows, add from default, remove to default, no remove action on the default
  milestone, hide Default from the chart unless the project setting enables it, move
  up/down inside the milestone, and id normalization between widget rows and source
  contract rows. Verified by UI test, manual UI smoke evidence, and file review.
- **AC12 — Milestone assignment UI contract.** The milestone editor design is documented
  as an ordered-list editor: assigned deliverables are visible as rows, rows can be
  moved up/down, remove sends an item back to the default milestone, and add offers
  deliverables from the default milestone intake pool. The default milestone is
  documented as the non-removable fallback bucket and is hidden in the chart unless the
  project-level setting is selected. Right-click/control-click is documented as an
  optional secondary context-menu path, not the only edit path. Verified by specification
  review and the UI implementation test/smoke.
- **AC13 — Build and lint clean.** Verified by `cd client && npm run lint` and
  `npm run build`.
- **AC14 — Scope clean.** Verified by D1 slice inspection showing no production database
  schema, `databaseService` milestone methods, or CRUD route changes.

---

## 7. Test Plan

Reference data sources:

- mocked project Gantt fixture and deliverable task fixtures created in D1 from the
  feature document's required hierarchy
- mock-backed `GET /projects/:code/gantt` route and `api/src/mockData/gantt/`
- SVAR documentation reviewed in the D1 run log
- existing project route/client patterns in `client/src/App.jsx`

Automated tests:

- `ganttAdapter.test` — verifies AC3, AC4, and AC9 by converting a Zazz milestone/deliverable
  fixture into SVAR-compatible rows and links, including parent-child relationships and
  completed styling metadata, and by deriving sprint/week scale labels from real dates.
- `App routing test` or equivalent — verifies AC1 and AC2 by asserting `/gantt` is a
  recognized project route and that the segmented route map includes Gantt before Kanban.
- `useProjectGantt test` if local patterns support it — verifies AC6 by asserting relevant
  project events trigger refresh behavior without stale-response overwrite.
- `gantt-mock.test.mjs` — verifies AC8 and AC9 by calling the real Fastify route with a
  known project code and asserting the default/named milestone rows, grouped
  deliverables, dependency link, lazy task expansion route, task rows for expanded
  deliverables, and 404 for unknown project code.
- `ProjectModal.gantt test` or equivalent — verifies AC10 by asserting Gantt
  Configuration controls load, save, respect read-only owner behavior, and include the
  `Show default milestone` setting.
- `GanttPage milestone modal test` or equivalent — verifies AC11 and AC12 by asserting
  visible milestone edit actions, assigned deliverable rows, add-from-default,
  remove-to-default, default-milestone no-remove behavior, and row move up/down controls.

Manual verification:

- Browser smoke at `/projects` then click project; confirm `/projects/ZAZZ/gantt`.
- Browser screenshot of the Gantt page showing the tree, timeline, and at least one link.
- Trigger or simulate a project event and confirm the page refreshes without reload.

Existing coverage intentionally reused:

- Existing client build/lint coverage remains the broad regression check for import and
  bundling behavior.

---

## 8. TDD Entry Point + Prescriptive Execution Sequence

### TDD Entry Point

Add an adapter test first:

```javascript
it('maps project milestones and deliverables to SVAR task rows and dependency links', () => {
  const result = toSvarGantt(mockProjectGantt);
  expect(result.tasks).toContainEqual(expect.objectContaining({
    id: 'milestone:default',
    type: 'milestone',
  }));
  expect(result.links).toContainEqual(expect.objectContaining({
    type: 'e2s',
  }));
});
```

### Prescriptive Execution Sequence

**Phase 1: SVAR research and dependency**

1.1. Review the SVAR React Gantt repository/docs and record relevant pages in the run log.  
1.2. Verify `@svar-ui/react-gantt`; version installed during spec drafting is `2.7.1`.  
1.3. Run `cd client && npm run lint`; expect either green or only known pre-existing
issues recorded before code changes.

**Phase 2: Mock route, contract fixture, and adapter**

2.1. Create mock Zazz Gantt data and deliverable task expansion data under
`api/src/mockData/gantt/`.  
2.2. Add `api/src/routes/gantt.js`, `api/src/schemas/gantt.js`, schema exports, and
route registration for `GET /projects/:code/gantt`, `GET/PUT
/projects/:code/gantt/settings`, and the deliverable task expansion route.  
2.3. Add PactumJS tests for the mock-backed routes.  
2.4. Create `client/src/utils/ganttAdapter.js`.  
2.5. Add adapter tests, including label-key resolution for `Default`, `Milestone
{number}`, `Hito {number}`, and `Meilenstein {number}`.  
2.6. Run focused API and client tests.

**Phase 3: Page, hook, and route**

3.1. Add `useProjectGantt` that fetches `GET /projects/:projectCode/gantt` and exposes a
task expansion loader for deliverables.  
3.2. Add `ProjectGantt` wrapper and `GanttPage`.  
3.3. Wire `/projects/:projectCode/gantt` and default project navigation in `App.jsx`.  
3.4. Add the owner-only Gantt Configuration tab to the existing Edit Project modal and
wire it to the mock-backed settings routes.  
3.5. Add Gantt and milestone labels to static client locale files and API locale seed
files for `en`, `de`, `es`, and `fr`.

**Phase 4: Realtime refresh and manual evidence**

4.1. Subscribe with `useProjectEvents`.  
4.2. Refresh or patch on relevant task/deliverable/relation events; task events should
update visible task rows for expanded deliverables.  
4.3. Capture browser evidence and final JSON contract in the run log.  
4.4. Run the mock route tests, `cd client && npm run lint`, `cd client && npm run test`,
and `npm run build`.

### Skeleton: `api/src/mockData/gantt/projectGantt.js`

```javascript
export function getMockProjectGantt(projectCode) {
  if (String(projectCode).toUpperCase() !== 'ZAZZ') return null;

  return {
    projectCode: 'ZAZZ',
    rows: [
      {
        id: 'milestone:default',
        entityType: 'milestone',
        labelKey: 'gantt.defaultMilestone',
        isDefault: true,
      },
      {
        id: 'milestone:one',
        entityType: 'milestone',
        labelKey: 'gantt.numberedMilestone',
        labelParams: { number: 1 },
      },
      {
        id: 'milestone:two',
        entityType: 'milestone',
        labelKey: 'gantt.numberedMilestone',
        labelParams: { number: 2 },
      },
      {
        id: 'milestone:three',
        entityType: 'milestone',
        labelKey: 'gantt.numberedMilestone',
        labelParams: { number: 3 },
      },
    ],
    links: [],
  };
}
```

### Skeleton: `api/src/routes/gantt.js`

```javascript
import { authMiddleware } from '../middleware/authMiddleware.js';
import { ganttSchemas } from '../schemas/validation.js';
import { getMockProjectGantt } from '../mockData/gantt/projectGantt.js';

export default async function ganttRoutes(fastify) {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/projects/:code/gantt', {
    schema: ganttSchemas.getProjectGantt,
  }, async (request, reply) => {
    const gantt = getMockProjectGantt(request.params.code);
    if (!gantt) return reply.code(404).send({ error: 'Project Gantt mock not found' });
    reply.send(gantt);
  });

  fastify.get('/projects/:code/gantt/deliverables/:deliverableId/tasks', {
    schema: ganttSchemas.getDeliverableGanttTasks,
  }, async (request, reply) => {
    const tasks = getMockDeliverableGanttTasks(
      request.params.code,
      request.params.deliverableId,
    );
    if (!tasks) return reply.code(404).send({ error: 'Deliverable Gantt mock not found' });
    reply.send(tasks);
  });
}
```

### Skeleton: `client/src/utils/ganttAdapter.js`

```javascript
export function toSvarGantt(projectGantt, t) {
  return {
    tasks: projectGantt.rows.map((row) => toSvarTaskRow(row, t)),
    links: projectGantt.links.map(toSvarLink),
    scales: buildScales(projectGantt),
    columns: buildColumns(),
  };
}

function toSvarTaskRow(row, t) {
  return {
    id: row.id,
    text: getRowText(row, t),
    parent: row.parentId || 0,
    start: row.startDate,
    end: row.endDate,
    progress: row.completed ? 100 : row.progress || 0,
    type: row.entityType,
    css: row.completed ? 'zazz-gantt-row-complete' : '',
    data: row,
  };
}

function getRowText(row, t) {
  if (row.labelKey && t) return t(row.labelKey, row.labelParams || {});
  return row.displayName || row.name;
}

function toSvarLink(link) {
  return {
    id: link.id,
    source: link.sourceId,
    target: link.targetId,
    type: link.type,
  };
}
```

---

## 9. Definition Of Done

- [ ] All §1 required reading consumed; standards-index verification performed.
- [ ] All §10 Resolved Questions reviewed and logged.
- [ ] Scoped tests green: `cd client && npm run test` and the mock route test.
- [ ] Manual Gantt screenshot/smoke evidence captured in the run log.
- [ ] `cd client && npm run lint` exits 0 or pre-existing issues are documented.
- [ ] `npm run build` exits 0.
- [ ] Scope verification shows D1 did not add production API/database persistence.
- [ ] All AC1-AC14 verified, with evidence cited.
- [ ] Run-log section for D1 is up to date.
- [ ] Verifier sub-agent dispatched and returned all-pass.
- [ ] PR draft body links this specification and lists each AC's verification.

---

## 10. Resolved Questions

Review these before code is written. Log confirmation in the run log.

- **RQ-1** — Use the repo's normal npm semver range for `@svar-ui/react-gantt`, currently
  `^2.7.1`, unless integration reveals a version-specific issue.
- **RQ-2** — Milestone start/end values are date-only planning values. D1 should confirm
  whether SVAR prefers `Date` instances in the adapter and ISO date strings in the API.
- **RQ-3** — Deliverable and task start/end values may be UTC timestamps when time
  precision matters; the adapter normalizes them for SVAR and the user's locale/timezone.
- **RQ-4** — Initial Gantt load contains milestones and deliverables. Task rows lazy-load
  when a deliverable expands and then update from project events while visible.

---

## 11. Run Log Protocol

This specification uses the shared run log:

`.zazz/execution/project-milestones-m1-run-log.md`

Required `D1` sections:

- Standards Verification
- Resolved Question Confirmations
- SVAR Documentation Research
- Final Mocked Gantt Contract
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
Your task is to implement Project Milestones M1 D1: SVAR Gantt UI and mocked contract.

Specification: .zazz/specifications/project-milestones-m1-d1-svar-gantt-ui-contract.md
Shared run log: .zazz/execution/project-milestones-m1-run-log.md

Read the specification end to end before editing. Then read the D1 run-log section.

NON-NEGOTIABLE RULES
1. Follow the specification's Agent Implementation Rules.
2. Review every Resolved Question before writing code; log confirmation in the run log.
3. Verify standards via .zazz/standards/index.yaml before writing code.
4. Use SVAR React Gantt.
5. Implement only the read-only mock-backed Fastify Gantt routes; do not implement
   production database tables, databaseService milestone methods, or CRUD routes in D1.
6. Tests and verification are not optional.

ORDER OF WORK
1. Read the specification, feature doc, standards, SVAR docs, and code references.
2. Review the resolved questions.
3. Start with the adapter test in §8.
4. Implement the mock-backed Fastify routes, adapter, page, route, tab, and realtime refresh.
5. Record the final JSON contract and manual evidence in the run log.
6. Run verification and complete the DoD.
7. Dispatch a verifier sub-agent.
8. Prepare PR-ready output. Do not merge to main.

VERIFIER SUB-AGENT
After your own DoD checklist is green, dispatch a fresh sub-agent:

  "You are verifying Project Milestones M1 D1 in this worktree. Read
  .zazz/specifications/project-milestones-m1-d1-svar-gantt-ui-contract.md and
  .zazz/execution/project-milestones-m1-run-log.md. For each AC, independently verify
  the cited test or command. Confirm D1 uses read-only mock-backed Fastify routes and did
  not implement production API/database persistence. Do not modify code or the run log.
  Return PASS/FAIL per AC with evidence."

Only declare done after the verifier reports all-pass.
```

---

*End of specification. Implementation proceeds from this specification and the run log;
no separate plan is created.*
