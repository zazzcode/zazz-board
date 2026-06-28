# Role-Based Access Control

## Feature Summary

Zazz Board needs role-based access control so multiple humans and agents can collaborate
inside a project without every authenticated user having the same authority. The system
started with a project-owner mental model, but project milestones, deliverables, Gantt
planning, agent tokens, and shared status workflows now require a clearer permission
model.

Current milestone: M1 proposed  
Next milestone: M1 RBAC discovery and policy baseline  
Services affected: Fastify API, React client, PostgreSQL schema, token/auth services

## Introduction

The board now supports work that naturally involves several people:

- project owners define project-level settings and planning structure
- humans create and update deliverables
- planners organize deliverables into milestones
- agents create and update tasks under deliverables
- reviewers inspect progress without necessarily being allowed to change plans

Without RBAC, collaboration gets awkward: two users can fight over milestone structure,
deliverable ownership, project settings, and agent-token management. The product needs a
stable authorization model that is enforced on the server and reflected clearly in the
client UI.

## Why This Feature Matters

RBAC protects project planning from accidental or unauthorized edits while still allowing
more than one human to participate. It also gives agents a narrower execution surface:
agent tokens can remain project-scoped and task/deliverable-focused without granting
project administration rights.

The goal is not to add enterprise administration complexity immediately. The goal is to
create a project-scoped permission model that can grow from the current project leader
rule into a set of explicit roles.

## Current State

The current authorization model has several useful pieces, but it is not yet RBAC:

- `authMiddleware` validates `TB_TOKEN` or `Authorization: Bearer` and attaches
  `request.user` plus `request.tokenType`.
- `tokenService` caches user tokens and project-scoped agent tokens.
- Agent tokens are blocked from user-token-only routes and are restricted to their
  configured project.
- `PROJECTS.leader_id` acts as the current project owner field.
- Project status workflow and deliverable status workflow updates are server-checked as
  project-leader-only operations.
- Agent token management lets users manage their own project agent tokens, while project
  leaders can manage tokens for other users.
- The Project modal renders project details, status workflow, and Gantt configuration as
  read-only for non-leaders.
- Deliverable create/update/delete/status/approve routes currently require
  authentication and project scoping, but they do not yet check a project role.
- Project create/update/delete routes currently require authentication but do not yet
  enforce a specific project-owner/admin permission.
- Gantt mock routes require authentication, but the mock settings update route does not
  yet enforce project-owner permissions.

This means access control is partly implicit, partly UI-only, and partly route-local.
RBAC should centralize the policy vocabulary and make server-side checks authoritative.

## Concepts

### Authenticated User

A human user authenticated by a user token. Human users can hold project-scoped roles.

### Agent Token

A project-scoped token used by agents. Agent tokens act on behalf of a user but should
not automatically inherit every human permission. In early RBAC, agent tokens should stay
focused on execution permissions for their project.

### Project Role

A role assignment connecting a user to a project. Roles are project-scoped because a
user may own one project, contribute to another, and view a third.

### Permission

A stable action string checked by the API and optionally surfaced to the client as a
capability. Examples:

- `project.settings.update`
- `project.members.manage`
- `project.agent_tokens.manage_all`
- `deliverable.create`
- `deliverable.update`
- `deliverable.status.update`
- `milestone.create`
- `milestone.update`
- `milestone.deliverables.reorder`
- `gantt.settings.update`

### Capability

The client-facing result of server-side authorization. The client may use capabilities
to disable controls, hide unsafe actions, and explain read-only state, but the server
remains authoritative.

## Proposed Initial Roles

| Role | Purpose | Typical Permissions |
| --- | --- | --- |
| Project Owner | Final authority for a project. Maps to current `PROJECTS.leader_id` during migration. | Manage project settings, members, workflows, Gantt settings, milestones, deliverables, and agent tokens. |
| Project Admin | Trusted human who can help operate the project but may not transfer ownership. | Manage members except owner transfer, workflows, milestones, deliverables, and Gantt settings. |
| Planner | Human who can shape the roadmap and milestone organization. | Create/edit milestones, assign/reorder deliverables in milestones, edit Gantt settings if allowed by policy. |
| Deliverable Contributor | Human who can define and update deliverables. | Create/update deliverables, move deliverable status, attach specs/plans, manage their own agent tokens. |
| Reviewer | Read-oriented collaborator. | View project, milestones, deliverables, tasks, graph, and Gantt. |
| Agent | Automation actor scoped to a project. | Create/update assigned tasks and execution metadata within project scope. |

Open question: whether `Planner` should be allowed to edit project-level Gantt settings
or only milestone/deliverable placement. The conservative default is owner/admin only
for project Gantt settings.

## Permission Areas

### Project Administration

- create project
- update project details
- transfer ownership
- delete/archive project
- manage project members
- manage status workflows
- manage project Gantt settings

### Milestone And Gantt Planning

- create milestones
- edit milestone dates/status/name
- delete/archive milestones
- assign deliverables to milestones
- reorder deliverables within a milestone
- show/hide default milestone setting

### Deliverables

- create deliverables
- update deliverable details
- delete/archive deliverables
- update deliverable status
- approve deliverable plan
- assign deliverable owner/contributors if that concept is added later

### Tasks And Agent Execution

- create tasks under deliverables
- update task status/notes/metadata
- manage task dependencies
- acquire/release file locks
- manage own agent tokens
- manage project-wide agent tokens

### Read Access

- list projects visible to the user
- view project details
- view deliverables
- view tasks
- view Gantt and graph projections
- subscribe to project realtime events

## User Flows

### Owner Adds A Planner

1. Project owner opens project settings.
2. Owner adds a user to the project with `Planner` role.
3. The planner can open the Gantt view and edit milestones.
4. The planner cannot transfer project ownership or manage all agent tokens unless given
   a higher role.

### Contributor Creates A Deliverable

1. Contributor opens a project where they have deliverable permissions.
2. Contributor creates a deliverable and fills out its spec/plan metadata.
3. Contributor can update that deliverable according to project policy.
4. If they lack milestone permissions, they cannot place it into a milestone directly;
   the deliverable remains in the default milestone until a planner/owner moves it.

### Reviewer Views Roadmap

1. Reviewer opens a project in read-only mode.
2. Reviewer can view Kanban, task Kanban, graph, deliverables, and Gantt.
3. Edit controls are hidden or disabled with clear read-only state.
4. API rejects any attempted mutation with `403`.

### Agent Works Within Project Scope

1. Human user creates an agent token for a project.
2. Agent uses the token on project-scoped execution routes.
3. API allows task/deliverable execution actions permitted for agent tokens.
4. API rejects project administration, member management, and cross-project access.

## Milestone Overview

| Milestone | Status | Target date | Capability statement | Deliverables |
| --- | --- | --- | --- | --- |
| M1 | Proposed | TBD | The team agrees on RBAC roles, permissions, and current-state gaps before schema/API work begins. | RBAC feature document; permission matrix proposal; current access audit |
| M2 | Proposed | TBD | The API persists project membership and can answer project-scoped permission checks. | project membership schema; role assignment routes; authorization helper/service; migration/backfill from `leader_id` |
| M3 | Proposed | TBD | Critical project, deliverable, milestone, Gantt, and token routes enforce permissions server-side. | permission checks on project settings/workflows; deliverable routes; milestone/Gantt routes; agent-token rules |
| M4 | Proposed | TBD | The client renders capability-driven UI states for owners, planners, contributors, reviewers, and agents. | project member UI; read-only controls; capability payloads/hooks; UI tests |
| M5 | Proposed | TBD | RBAC supports richer collaboration policies without broad route rewrites. | custom roles or role templates; audit events; ownership transfer; contributor-specific deliverable policies |

## M1 — RBAC Discovery And Policy Baseline

Target date: TBD  
Capability statement: The team can review a shared RBAC model and create implementation
specifications without re-litigating role vocabulary.

Deliverables:

- RBAC feature document
- current access-control audit
- first-pass permission matrix
- decision on project-scoped roles vs global roles
- decision on how agent tokens map to permissions

Outcome criteria:

- Current leader-only behavior is documented.
- Current broad authenticated-user mutation surfaces are documented.
- Initial roles and permission areas are explicit.
- Open questions are concrete enough for owner decisions.

## M2 — Project Membership And Permission Foundation

Target date: TBD  
Capability statement: The backend can persist who belongs to each project and answer
whether a user can perform a project-scoped action.

Deliverables:

- `PROJECT_MEMBERS` or equivalent project role-assignment schema
- backfill that maps `PROJECTS.leader_id` to Project Owner
- permission catalog constants
- authorization helper/service, for example `requireProjectPermission`
- project membership CRUD routes
- route tests for owner/admin/member/viewer cases

Outcome criteria:

- Project membership is project-scoped.
- Project Owner remains compatible with existing `leader_id` behavior.
- Permission checks are server-side and reusable.
- Agent tokens remain project-scoped and cannot manage members.

## M3 — Server-Side Enforcement Across Core Routes

Target date: TBD  
Capability statement: Mutating API routes enforce RBAC consistently for project,
deliverable, milestone, Gantt, task, and agent-token actions.

Deliverables:

- project settings/workflow permission checks
- deliverable CRUD/status/approve permission checks
- milestone and Gantt settings permission checks
- task and file-lock permission checks for human and agent tokens
- agent-token management permission checks
- negative API tests for `403` across representative routes

Outcome criteria:

- UI-only read-only logic is no longer trusted as protection.
- Mutating routes share the same authorization helper/service.
- Cross-project access remains rejected.
- Agent tokens cannot perform project administration.

## M4 — Capability-Driven Client UX

Target date: TBD  
Capability statement: The React client shows the right controls for each user's
permissions and explains read-only states without relying on hidden assumptions.

Deliverables:

- project capability payload from API
- client hook for project permissions/capabilities
- Project modal, Deliverables, Kanban, Gantt, Graph, and Agent Tokens UI updates
- read-only/disabled states with clear copy
- focused UI tests for owner, planner, contributor, and reviewer capabilities

Outcome criteria:

- Client controls match server capabilities.
- Mutations still fail safely with `403` if a user bypasses the UI.
- Non-editors can inspect project state without confusing disabled forms.

## M5 — Advanced Collaboration Policies

Target date: TBD  
Capability statement: The project can evolve beyond fixed roles if needed while keeping
authorization logic centralized.

Deliverables:

- optional custom roles or role templates
- audit events for permission and membership changes
- ownership transfer flow
- deliverable-level contributor policies if approved
- role/permission documentation in project settings

Outcome criteria:

- Role changes are auditable.
- Ownership transfer is explicit and safe.
- Any custom-role extension uses the same permission catalog.

## Current Risks And Constraints

- RBAC must be enforced on the API, not only in React.
- Role checks should not be hand-coded differently in every route.
- Project-scoped roles should not break project-scoped agent token behavior.
- Existing `leader_id` behavior must migrate cleanly.
- Broad "everyone can edit everything" behavior should be tightened incrementally to
  avoid blocking current development workflows unexpectedly.
- Permissions must be understandable to humans using the UI; a role matrix that only
  engineers can interpret will fail the product need.

## Non-Goals

- Organization-wide enterprise SSO or identity-provider integration.
- Fine-grained field-level permissions for every form field in the first milestone.
- Custom per-deliverable ACLs in the first RBAC implementation.
- Replacing token authentication with a new login/session system.
- Rewriting all routes before the permission model is approved.

## Open Questions

- Should `Project Admin` exist separately from `Project Owner` in the first
  implementation, or should we start with Owner, Planner, Contributor, Reviewer?
- Should `Planner` be able to edit project-level Gantt settings, or only milestones and
  deliverable placement?
- Can contributors place their own deliverables into milestones, or must a planner/owner
  perform milestone placement?
- Should deliverable approval require Owner/Admin/Planner, or can the deliverable author
  approve their own plan?
- Should project creation be open to any authenticated user, or limited to a global
  application role?
- Should users see all projects, or only projects where they have membership/read access?
- What is the minimum permission set for agent tokens once task execution becomes fully
  permissioned?

## Deliverable Handoff Considerations

The first implementation specification should be backend-first. It should introduce the
project membership/permission foundation and backfill from `PROJECTS.leader_id` before
trying to update every UI surface. After the server can answer permissions, UI work can
consume capability payloads and progressively replace leader-only checks with
capability-driven controls.
