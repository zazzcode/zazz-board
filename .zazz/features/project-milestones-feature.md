# Project Milestones Feature

Current milestone: M1 in progress
Next milestone: M2

## Feature Summary

Zazz Board needs one coherent way to relate long-lived feature intent, project
milestones, deliverables, and agent-created tasks. The board already manages execution
well through deliverables and tasks; this feature adds milestone-aware planning and
Gantt-style visualization without changing the core Zazz philosophy:

- owners reason about features, milestones, and deliverables
- agents implement deliverables through tasks
- task and deliverable state remain live execution data
- milestone/Gantt views are projections of the same project-owned work

The M1 implementation focuses on project-level milestones and a Gantt view backed by
[SVAR React Gantt](https://github.com/svar-widgets/react-gantt). This document is the
canonical feature document for project milestones.

## Introduction

Zazz Board currently shows work through deliverable Kanban, task Kanban, task graph, and
deliverable list views. Those views are strong for execution, but they do not answer
time-based planning questions:

- what milestone a deliverable belongs to
- when a milestone starts and ends
- which deliverables sit inside a milestone
- what planned and actual schedule dates each deliverable carries
- how deliverable dependencies affect project sequence

The Gantt view should become the default project landing view because it shows the whole
project shape first. From there, users can move into Kanban, task Kanban, graph, or
deliverables views when they need a focused operational surface.

## Why This Feature Matters

This feature matters because Zazz Board is intended to support not only execution
tracking, but also the product and roadmap context that explains why execution is
happening.

Without a feature and milestone layer:

- deliverables appear as isolated execution units
- stakeholders cannot see how active deliverables roll up into project milestones
- roadmap progress has to be reconstructed manually from docs, board state, and Git
  branches
- there is no consistent way to distinguish milestone-driven work from standalone bug
  fixes, chores, or one-off technical work

The goal is not to turn the board into the primary authoring tool for rich feature
narrative. The goal is to make the board an accurate and useful planning and execution
companion.

## Current State

Today, the system supports:

- projects keyed by `PROJECTS.id` and addressed by project code in most operational URLs
- deliverables keyed to projects through `DELIVERABLES.project_id`
- tasks keyed to deliverables through `TASKS.deliverable_id`
- task dependency and coordination edges through `TASK_RELATIONS`
- deliverable and task workflows
- project-scoped realtime events through `/projects/:code/events`
- project navigation from `/projects` into `/projects/:code/kanban`
- tracked `.zazz/features/` feature documents

The M1 work now adds or is adding:

- project milestone records in the database
- assigning deliverables to milestones
- deliverable-level planning timestamps for Gantt placement
- deliverable-to-deliverable dependency records for Gantt link lines
- project-level Gantt JSON or Gantt CRUD endpoints
- a Gantt tab in the project view switcher
- a default project landing route at `/projects/:code/gantt`
- lazy task expansion under deliverable rows
- milestone-computed completion styling
- database-backed Gantt status and dependency styling metadata

## Source-Of-Truth Model

### Canonical In Git-Managed Feature Docs

The feature document is the canonical source for:

- feature name and purpose
- feature-level current state
- milestone roadmap for the feature document itself
- roadmap narrative for completed, current, and planned increments

One feature key maps to one feature document. If a feature becomes large enough to need
multiple durable documents, typically around 700-800+ lines, the feature key becomes a
directory name under `.zazz/features/`. The split must be by logical sections, not line
number chunks, and the directory must use numbered filenames for organized listings.
The entry point must be `0-feature-summary.md`, matching this document's first section;
it must orient readers to the feature and include a table of contents linking to the
other section documents. Do not create sibling feature documents for the same feature.

### Canonical In The Board Application

The board is the canonical source for:

- projects
- project milestones
- project Gantt settings
- deliverables
- deliverable schedule timestamps and dependency links
- tasks
- workflow state
- operational progress of execution
- metadata associating deliverables to project milestones

### Anti-Duplication Rule

The board must not become a second authoring system for rich feature-document content.
The board may store lightweight metadata needed for display, querying, and grouping, but
it must not become the primary home for stakeholder-facing feature narrative.

## Concepts

### Feature

A long-lived application capability described by one tracked feature document under
`.zazz/features/`, or by a feature-key directory only when the feature explicitly needs
subdocuments.

Features are product-context artifacts, not project timeline containers. A feature can
cross-cut multiple project milestones, and one project milestone may contain deliverables
from several features. M1 does not add database-backed feature records or feature-to-board
sync. That integration should be designed later as its own feature so project milestones
can prove the planning model first.

### Project Milestone

A project-scoped planning container with a start date, end date, and system-managed
default flag. Milestones belong to projects and inherit project access rules. In the
Gantt tree, milestones sort chronologically by start date, then end date, then stable
tie-breakers. Manual milestone ordering is out of scope because mixing arbitrary order
with timeline order would make the planning view harder to read.

Project milestones are dated project-planning containers, not feature milestones. They
sequence deliverables across the whole project and may include work from multiple
features, bug fixes, chores, or technical investments when that is how the project plan
is shaped.

Milestone dates are owner-controlled planning boundaries. A deliverable can start before
its planned milestone window or complete after the milestone end date, but that does not
automatically move the milestone start or end date. The milestone bar represents the
owner's plan until an owner or authorized project action changes the milestone. Future
visualization may show schedule drift inside the milestone bar, such as differently
colored segments for late completion, but that is a separate capability from changing
the milestone's authoritative date range.

Milestones use their own small planning status model rather than reusing the full
deliverable workflow:

- `PLANNING` means the milestone is future-facing and still tentative or not fully
  locked in.
- `PENDING` means the milestone is planned/locked, but its start date has not reached
  the current date yet.
- `IN_PROGRESS` means the milestone has started and still contains incomplete work.
- `DONE` means the milestone has completed, either because all contained deliverables
  are done or because a later owner action explicitly closes it.

M1 does not need owner-authored milestone names. The UI can show generated, localized
display labels: `Default` for the system default row and `Milestone 1`, `Milestone 2`,
`Milestone 3`, etc. for planned milestones based on chronological order.

### Default Milestone

A system-created milestone that contains deliverables not explicitly assigned to a
planned milestone. Its MVP display label is `Default`. The behavior is required so
existing and seed deliverables always fit the Gantt hierarchy.

The default milestone is also the milestone-assignment intake and return bucket. Owners
can add default deliverables into planned milestones, and removing a deliverable from a
planned milestone returns it to the default milestone. The default milestone itself does
not expose a remove action because every deliverable must remain associated with exactly
one milestone.

### Deliverable

A bounded execution slice in the board. In M1, deliverables can be grouped under project
milestones for planning while remaining the unit owners manage directly.

Inside a milestone, deliverables need an owner-controlled display order for the Gantt
tree. That order is separate from milestone chronological ordering. Milestones still sort
by date; deliverables within a milestone can be moved up or down to reflect the owner's
preferred reading and execution sequence.

Deliverables carry the Gantt schedule values that place their bars on the timeline:
`planned_start_at`, `planned_completion_at`, `actual_start_at`, and
`actual_completion_at`. The API may expose those values through Gantt-facing
`startDate`/`endDate` fields, but the database fields follow the existing datetime
`*_at` naming convention.

Deliverables may also depend on other deliverables. Those dependencies are planning data
for Gantt sequencing, separate from task-level execution relations.

### Task

An agent-created execution item under a deliverable. Tasks inherit milestone context
through their deliverable. A task does not get its own milestone foreign key in M1.

Tasks remain dynamic execution detail. Zazz Board tasks represent agent execution work,
not owner or human work items. M1 supports lazy task expansion under a deliverable so the
first Gantt load stays focused on milestones and deliverables while still allowing a
user to inspect the agent task rows for a deliverable with a separate API request. Task
status may still contribute aggregate metadata on deliverable rows, such as task counts
or blocked-task counts.

### Gantt View

The project view at `/projects/:code/gantt`. It displays milestones and deliverables in a
left-side tree with a time-scaled Gantt chart on the right. The production M1 chart is a
project-planning view over milestones and deliverables. Task-focused detail remains in
task Kanban and task graph views unless a later feature deliberately adds task scheduling
to the Gantt. The view uses SVAR React Gantt and keeps SVAR-specific row/link details
behind a Zazz hook or adapter.

### Gantt Contract

The JSON structure the client consumes to render the Gantt view. M1 proves this contract
with mocked data before the persistence model is implemented. The initial contract
returns the project planning projection at once: all milestones, deliverables, and
deliverable-level links needed for first render. The D2 production contract replaces the
mock backing source with database-backed rows and links while preserving the fields the
client consumes. It should add approved production fields such as deliverable schedule
timestamps, normalized status metadata, and task status aggregates without requiring one
Gantt row per task.

The contract should keep calendar dates as date-only ISO strings and use optional
timeline metadata to describe how the client labels the chart scale. The client adapter
must convert those date-only values into the exact task row shape expected by the Gantt
library, including explicit start, inclusive end, and duration values so milestone bars
render from the API date range instead of relying on library inference.

For the M1 mock and seeded production demo data, the preferred shape is a two-week sprint
scale with one-week sublabels:
`timeline.unit = "sprint"`, `timeline.sprintStartDate`, `timeline.sprintLengthWeeks`,
`timeline.sprintLabelPrefix`, and `timeline.weekLabelPrefix`. The API does not store or
return localized sprint/week labels; the client derives labels such as `Sprint 1` and
`W4` from real dates.

### Project Gantt Settings

Project-owned settings that control how the Gantt timeline is presented. These settings
belong to the project because a sprint calendar is shared planning context, not a
personal display preference. The first production settings should cover:

- timeline mode: calendar dates, project weeks, or sprints
- whether date labels are shown in addition to period labels
- whether month, sprint, and week header rows are visible
- period start date used for week/sprint numbering
- sprint length in weeks, limited to `1`, `2`, or `3`
- starting sprint/week number, usually `1`
- whether the default milestone is shown in the Gantt chart
- non-localized label prefixes such as `Sprint` and `W`, with future localization handled
  by the client

The Gantt projection may return a resolved `timeline` object derived from these project
settings so the client can render without knowing the persistence shape. User-level view
preferences may later hide/show columns or choose a default zoom, but they must not
override the project's canonical sprint calendar.

The Gantt display configuration should support users who do not plan by sprint. A project
can hide the sprint header row and show only month/week rows, or hide month and sprint
rows to focus on project weeks. At least one header row must remain visible so the chart
always has a readable time scale.

The default milestone should be hidden by default in the main Gantt chart to avoid
cluttering the roadmap with the assignment intake bucket. Project owners can enable a
`Show default milestone` setting when they need to inspect or test the default bucket and
its children.

For Zazz Board's business calendar, weeks start on Sunday and end on Saturday. Sprint
numbering is year-scoped: `Sprint 1` starts with the first Sunday-start planning week in
January for that year, and sprint numbering resets to `1` the following year. Seed data
and project defaults should use the first Sunday in January as the sprint period start
for the year being demonstrated.

### Client/Server Synchronization Plan

The project Gantt view should use a server-authoritative synchronization model:

- API/database is the durable truth for milestones, deliverables, tasks, Gantt settings,
  statuses, and ordered milestone membership.
- `GET /projects/:code/gantt` returns the render projection the client uses for the
  chart.
- The page-level hook owns the current projection and protects it with request/version
  guards.
- Modals own temporary draft state only while the user is editing.
- Mutations perform server validation, save durable state, and return the updated Gantt
  projection or enough data for the client to replace/reconcile the projection.
- Server-sent events are refresh triggers: the client debounces them and refetches the
  projection rather than treating events as the primary save result.
- `localStorage` is reserved for harmless UI preferences, such as theme, collapsed rows,
  zoom, or last selected view; it must not store authoritative milestone, deliverable,
  status, date, or assignment data.

This plan is intentionally conservative for M1/M2. Ordered deliverable lists and
milestone date changes represent human planning intent, so the first production version
should prefer explicit save-and-replace behavior over clever client-side auto-merging.

### Milestone Editing Interaction

Milestone date editing should have a discoverable primary path and may later gain
timeline shortcuts. The first-generation interaction should use visible controls: a
`Create Milestone` button and an edit action on each milestone row, such as a pencil icon
or row action button, opening a milestone form with start date, end date, and deliverable
assignment fields.

The milestone form should manage assigned deliverables as an ordered list, not only as a
dropdown. In edit mode, the form shows the deliverables currently assigned to the
milestone, one row per deliverable, with enough context to recognize each item such as
code, title, type/status, and optionally planned dates. Owners can move rows up or down
to change their Gantt display order within that milestone.

Adding and removing deliverables should be explicit:

- `Add` opens a selector of eligible deliverables from the default milestone intake
  pool.
- `Remove` detaches the deliverable from the planned milestone and returns it to the
  default milestone.
- The default milestone shows its current deliverables as an ordered list but does not
  allow removing them; it is the fallback container, not a discard list.
- The first production version should not silently pull deliverables out of another
  planned milestone while editing the current milestone. Moving from one planned
  milestone to another can be handled by removing to `Default` first, then adding from
  `Default`, or by a later explicit move flow.

Right-click or control-click on a milestone row/bar is a valid option for a secondary
context menu. That menu could expose actions such as `Edit Milestone`, `Assign
Deliverables`, `Zoom to Milestone`, and later `Delete Milestone`. It should not be the
only edit path because it is less visible and has browser/device differences, but it is a
reasonable power-user interaction if the library integration remains clean.

Direct bar drag/resize is also a possible later shortcut because SVAR supports
interactive task updates and action interception. Zazz should enable that only after the
milestone update API can persist date changes, validate permissions and ranges, and
recover cleanly from failed writes.

### Localization

The Gantt UI must follow the existing multilingual client model. M1 must add
translations for `milestone`, `milestones`, the default milestone label, and the numbered
milestone label pattern in every supported locale:

| Locale | milestone | milestones | default milestone | numbered milestone |
| --- | --- | --- | --- | --- |
| English (`en`) | Milestone | Milestones | Default | Milestone {number} |
| German (`de`) | Meilenstein | Meilensteine | Standard | Meilenstein {number} |
| Spanish (`es`) | Hito | Hitos | Predeterminado | Hito {number} |
| French (`fr`) | Jalon | Jalons | Par défaut | Jalon {number} |

The default and numbered labels should be produced through translation keys such as
`gantt.defaultMilestone` and `gantt.numberedMilestone`, with numbered rows passing
`{ number }` as label parameters. The database should not store localized display text.
When the user changes the active locale, the milestone term changes with the locale and
the ordinal remains the same integer. For example, milestone 1 renders as `Hito 1` in
Spanish and `Meilenstein 1` in German.

### Completion State

Milestones, deliverables, and loaded tasks should visually turn green when completed.
Task completion is based on task status. Deliverable completion is based on deliverable
status. Milestone completion is computed from the deliverables inside it unless a later
milestone introduces an owner-controlled override.

## User Flows And System Flows

### Project Entry Flow

1. A user opens `/projects`.
2. The user clicks a project.
3. The client navigates to `/projects/:code/gantt`, not `/projects/:code/kanban`.
4. The Gantt view loads the milestone hierarchy for the selected project.

### Planning Flow

1. A project owner creates or edits milestones from the Gantt view.
2. Each milestone has a start date and end date. The owner sets dates through a
   milestone form first, opened from `Create Milestone`, a visible milestone-row edit
   action, or a later right-click/control-click context menu.
3. New deliverables appear under the default milestone until the owner assigns them to a
   planned milestone.
4. The owner edits a milestone's deliverable list, adding eligible deliverables from the
   default milestone, removing deliverables back to the default milestone, and moving
   assigned deliverables up or down to set their display order.
5. A later drag/drop flow may move deliverables between milestone rows directly in the
   Gantt tree once the explicit edit flow and API persistence are stable.
6. Milestones appear in chronological order, with the soonest milestone at the top and
   the latest milestone at the bottom.
7. Tasks move with their deliverable because tasks inherit milestone context through the
   deliverable.

### Project Gantt Settings Flow

1. A project owner opens the existing Edit Project modal from the project list.
2. The owner selects the Gantt Configuration tab. Non-owner users may view the tab in
   read-only mode.
3. The owner chooses whether the project timeline is displayed as dates, project weeks,
   or sprints.
4. If the project uses sprints, the owner sets the sprint start date, sprint length, and
   starting sprint number.
5. The project Gantt endpoint returns the same milestone/deliverable rows with resolved
   timeline metadata.
6. The client rerenders the scale headers without changing milestone, deliverable, or
   task dates.

### Execution Visibility Flow

1. Agents update task and deliverable statuses through existing execution flows.
2. Existing project-scoped realtime events reach the Gantt page.
3. The Gantt page refreshes or patches affected milestone and deliverable rows.
4. Deliverable rows show raw workflow status plus normalized visual-state metadata, such
   as not started, in progress, completed, and blocked.
5. Completed deliverables and milestones turn green without requiring a reload.

### Dependency Visibility Flow

1. Owners or seed/reset data define deliverable-to-deliverable dependencies as planning
   relationships.
2. The initial Gantt contract returns those dependencies in `links[]`, with each link
   pointing at deliverable row IDs.
3. The chart draws dependency lines so owners can see sequencing pressure while setting
   planned deliverable dates.
4. Task-level `TASK_RELATIONS` continue to serve execution/detail views such as task
   graph, but they are not the sole source of Gantt dependency lines.

## SVAR React Gantt Research Notes

The chosen library is [SVAR React Gantt](https://github.com/svar-widgets/react-gantt).
The npm package is `@svar-ui/react-gantt`; the current npm version checked during this
draft is `2.7.1`.

The implementation should review the upstream documentation during D1 and capture the
exact row/link contract in the D1 run log. Current documentation research indicates:

- the package imports `Gantt` and themes such as `Willow` from `@svar-ui/react-gantt`
- Vite integration is documented and fits the existing React/Vite client
- the widget consumes `tasks`, `links`, `scales`, and optional `columns`
- the API reference exposes properties for `tasks`, `links`, `columns`, `scales`,
  `projectStart`, `projectEnd`, `readonly`, `taskTemplate`, and related layout controls
- task configuration docs include task types, milestones, summaries, and customization,
  which are the likely fit for milestone and deliverable rows
- backend docs cover saving to a server with `RestDataProvider`, data-request/provide
  actions, and API interception; D1 should decide whether Zazz uses the provider directly
  or keeps its own hook/adapter for more control
- action hooks include add/update/delete task/link, drag/move task, open task,
  request/provide data, and similar events that can support later persistence
- context menu integration should be evaluated for right-click/control-click milestone
  row actions, especially if it can supplement rather than replace visible edit controls
- D1 should validate date handling, dependency direction, row identity, styling hooks,
  and whether milestones can be represented as summary/project rows without fighting the
  component
- D1 should prefer week/sprint scale labels over day-number labels once the mocked data
  spans enough real dates to make day labels noisy
- D1 should validate whether SVAR's lazy `request-data` / `provide-data` actions are the
  right fit for loading tasks under expanded deliverables, or whether Zazz should manage
  expansion through its own hook and task endpoint

## Milestone Overview

| Milestone | Status | Target date | Capability statement | Deliverables |
| --- | --- | --- | --- | --- |
| M1 | Planned | TBD | Users can open a project Gantt view, inspect a milestone/deliverable hierarchy, see deliverable sequencing dependencies, and the team has a proven JSON contract for persistent implementation. | D1 SVAR Gantt UI and mocked contract; D2 Gantt API and database persistence |
| M2 | Proposed | TBD | Users can manage milestones and deliverable assignment through production CRUD flows with realtime updates. | milestone editor hardening; drag/drop reassignment persistence; validation and UX polish |
| M3 | Proposed | TBD | The Gantt view becomes a richer planning and dependency surface. | dependency editing; scheduling helpers; advanced filtering; owner workflow improvements |

## M1: Gantt MVP And Persistence Foundation (Target TBD)

Capability statement: Users can open a project Gantt view, inspect a
milestone/deliverable hierarchy, see deliverable sequencing dependencies, and the team
has a proven JSON contract for persistent implementation.

### Deliverables

- D1: SVAR Gantt UI and mocked API contract
- D2: Gantt API and database persistence

### Outcome Criteria

- `/projects/:code/gantt` exists and is the default destination after selecting a project.
- The project view switcher includes `Gantt` directly before `Kanban`.
- The client renders a milestone -> deliverable tree in SVAR React Gantt.
- Deliverable rows can be expanded to lazy-load agent task rows from a separate API
  endpoint.
- The Gantt opens focused near the current date and shows a faint grey dashed current
  date line while preserving manual horizontal scrolling.
- M1 D1 implements a real Fastify `GET /projects/:code/gantt` route backed by fixed
  mock data under an API mock-data directory.
- M1 D1 documents the JSON the UI needs, including rows, links, status/completion fields,
  date fields, and dependency line behavior.
- M1 D2 implements the schema/API only after D1 confirms the widget contract and field
  inventory.
- Existing deliverables have a default milestone in seeded and reset data.
- Deliverables have schedule timestamps for planned and actual start/completion.
- Milestone bars render from owner-controlled milestone dates, not from child
  deliverable dates.
- Deliverable dependencies are persisted and returned as Gantt `links[]`.
- Project-scoped URLs and access checks remain the access boundary.
- Realtime task and deliverable status changes update the Gantt view the same way they
  update other project views.

### Data Model Recommendation

D1 should not commit database structure. It should prove the contract with a real Fastify
route backed by fixed mock data and document what the widget actually needs.

D2 should add the persistence model:

- `MILESTONES`
  - `id` serial primary key
  - `project_id` required FK to `PROJECTS.id`, cascade delete
  - `start_date` and `end_date` date-only fields for milestone planning
  - `is_default` boolean
  - standard audit fields
  - unique default milestone per project
- M1 does not require a free-form milestone name column; display labels are generated
  from `is_default` or chronological ordinal and localized in the client. If D1 proves
  the API should return display metadata, prefer non-localized fields such as
  `label_key` and `label_params` over storing translated text.
- no milestone `position` field in the initial recommendation; milestone display order
  should be computed from `start_date`, `end_date`, and stable tie-breakers unless D1
  proves SVAR requires a widget-only ordering field
- `DELIVERABLES.milestone_id`
  - nullable during migration/push workflow only if needed
  - should point at a project-owned milestone before API responses treat the row as valid
  - must not allow cross-project assignment
- deliverables need a milestone-scoped order field, such as
  `DELIVERABLES.milestone_position`, so the owner can control the order of deliverables
  within a milestone without changing milestone chronological ordering
- deliverables need schedule timestamp fields for Gantt placement and execution
  comparison:
  - `planned_start_at`
  - `planned_completion_at`
  - `actual_start_at`
  - `actual_completion_at`
- no new task milestone FK in M1; tasks inherit milestone context through their
  deliverable
- M1 may expose task schedule rows through lazy deliverable expansion. Those rows remain
  agent execution detail and inherit milestone context through their deliverable.
- deliverable dependencies should be first-class planning records in M1, such as
  `DELIVERABLE_RELATIONS`, so the Gantt projection can return `links[]` before task rows
  exist. `TASK_RELATIONS` remain task execution/detail data.
- project-level Gantt settings should persist separately from individual milestones. A
  dedicated `PROJECT_GANTT_SETTINGS` table or a validated project-owned JSON column are
  both acceptable in D2 if the API validates the same public contract. Preferred fields:
  `timeline_mode`, `show_date_labels`, `show_month_header`, `show_sprint_header`,
  `show_week_header`, `period_start_date`, `sprint_length_weeks`,
  `period_number_start`, `sprint_label_prefix`, `week_label_prefix`, and
  `show_default_milestone`. `sprint_length_weeks` should be constrained to `1`, `2`, or
  `3`, and at least one header visibility flag should be true.

### API Recommendation

Use project code in every URL:

- `GET /projects/:code/gantt` returns all milestones, deliverables, and deliverable
  dependency links for the project in one response.
- `GET /projects/:code/milestones` lists milestones.
- `POST /projects/:code/milestones` creates a milestone.
- `PUT /projects/:code/milestones/:milestoneId` updates milestone fields.
- `DELETE /projects/:code/milestones/:milestoneId` deletes an empty non-default
  milestone in M1. Later milestones may add a guided archive/delete flow that first
  moves deliverables back to the default milestone.
- `PATCH /projects/:code/gantt/deliverables/:deliverableId/milestone` moves a deliverable
  between milestones.
- `PUT /projects/:code/milestones/:milestoneId/deliverables` replaces a milestone's
  ordered deliverable list. In the first production contract, the request may include
  deliverables already assigned to that milestone plus deliverables from the default
  milestone. Removing a deliverable from a planned milestone returns it to the default
  milestone.
- `GET /projects/:code/gantt/settings` returns project Gantt display settings.
- `PUT /projects/:code/gantt/settings` updates project Gantt display settings and causes
  future Gantt projections to return resolved timeline metadata.

D1 implements `GET /projects/:code/gantt` as a real Fastify route backed by mock data.
The mock data should live in a clearly named API mock-data directory and be selected by
project code. The initial route returns one project-level payload, not one payload per
milestone. The starter mock set should include fixed milestone IDs for the selected
project:

- `milestone:default` displayed as `Default`
- `milestone:one` displayed as `Milestone 1`
- `milestone:two` displayed as `Milestone 2`
- `milestone:three` displayed as `Milestone 3`
- optional additional generated milestones, such as `milestone:four` through
  `milestone:six`, when the mock needs a more realistic roadmap range

The mock hierarchy should include deliverables under both `Default` and named milestones,
plus deliverable dependency links, so the UI proves default grouping, planned milestone
grouping, completion styling, real-date timeline scaling, and dependency lines before the
database model exists. D2 keeps the same route contract and replaces the mock backing
source with database-backed services.

## M2: Milestone Management Hardening (Target TBD)

Capability statement: Users can manage milestones and deliverable assignment through
production CRUD flows with realtime updates.

### Deliverables

- milestone create/edit/delete UI
- project Gantt configuration persistence behind the owner-only Edit Project modal tab
- custom owner-authored milestone names if approved after the generated-label MVP
- ordered deliverable assignment list in the milestone editor, including add from
  default, remove to default, and move up/down inside the milestone
- production drag/drop deliverable reassignment
- validation for default milestone behavior and date ranges
- realtime refresh optimization for Gantt-specific events

### Outcome Criteria

- project owners can manage milestone dates without direct database work
- project owners can manage each milestone's ordered deliverable list without editing
  raw data or accidentally stealing deliverables from another planned milestone
- if custom names are approved, project owners can manage those names through localized
  UI without storing translated text in the database
- deliverable movement between milestones persists immediately and survives reload
- failure states keep editors open and preserve user input
- cross-project milestone assignment is rejected by API and tests

## M3: Advanced Planning And Dependency UX (Target TBD)

Capability statement: The Gantt view becomes a richer planning surface for sequencing,
dependency interpretation, and milestone-level decision making.

### Deliverables

- owner-facing dependency editing for first-class deliverable dependencies
- schedule helpers for rolling dates from deliverables/tasks up to milestones
- filters for status, assignee/agent, milestone, deliverable type, and blocked work
- print/export or stakeholder presentation mode if needed

### Outcome Criteria

- owners can reason about schedule risk without leaving the project view
- dependency edits have clear validation and do not conflict with existing task graph
  semantics
- large projects remain scannable

## Planned Future Evolution

After M1, feature integration should be treated as a separate future capability. Project
milestones are dated project containers, and features are long-lived product context that
can cross-cut those containers. A future feature-to-board integration may let users
associate deliverables with feature records or feature documents, but one project
milestone should still be able to contain deliverables from multiple features. The MVP
should avoid solving feature sync until the project Gantt behavior is proven.

## Resolved M1 Questions And Follow-Ups

- Milestone dates are date-only planning values. D1 should still confirm the exact value
  shape SVAR prefers before locking the JSON contract.
- Deliverable schedule values live on `DELIVERABLES` as timestamp fields:
  `planned_start_at`, `planned_completion_at`, `actual_start_at`, and
  `actual_completion_at`.
- Initial production Gantt load returns milestones, deliverables, and deliverable
  dependency links. Task rows load only when a deliverable expands and remain agent
  execution rows under that deliverable.
- Deliverable dependencies are first-class planning records for the Gantt projection.
  Task relations remain execution-detail data for task-focused views.
- Milestone owner dates are authoritative; child deliverable dates never resize a
  milestone bar automatically. Schedule variance visualization is deferred.
- Feature documents live in `.zazz/features/`; deliverable specifications live in
  `.zazz/specifications/`.
- Feature documents can cross-cut project milestones. Database-backed feature integration
  is deferred to a separate future capability.

## Deliverable Handoff Considerations

M1 has two deliverable specifications:

- `.zazz/specifications/project-milestones-m1-d1-svar-gantt-ui-contract.md`
- `.zazz/specifications/project-milestones-m1-d2-gantt-api-database.md`

Later milestones should revise this feature document before adding new deliverable
specifications. Do not create another sibling feature document for this feature unless
the feature is intentionally converted to a `.zazz/features/project-milestones-feature/`
directory with logically separated, numbered subdocuments and a `0-feature-summary.md`
entry point with a table of contents.
