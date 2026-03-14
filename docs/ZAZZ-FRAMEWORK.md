# The Zazz Framework
Zazz is a spec-driven framework with an explicit convergence model: agents iteratively refine the specification and implementation until gaps are resolved and the deliverable satisfies the final SPEC.

## Framework Introduction (At a Glance)

Core concepts and capabilities:
- **Desired-state convergence**: work iterates until implementation aligns with the specification.
- **Spec-driven contract**: the SPEC is the authoritative behavior, constraints, and acceptance contract.
- **Structured document flow**: optional Proposal (`-PROP`) → Specification (`-SPEC`) → Plan (`-PLAN`) → build/validate loop.
- **Opinionated documentation contract**: required document types plus opinionated naming and directory structure, with flexible root location.
- **Milestone-centered delivery**: milestones group related deliverables into date-driven capability objectives.
- **Repository/worktree boundary**: each deliverable is executed in exactly one repository (including a monorepo) and one dedicated worktree.
- **Role and context decomposition**: role-scoped and step-scoped context reduces noise and improves agent focus.
- **Iterative spec stewardship**: spec-builder initializes the SPEC; QA validates, surfaces gaps, and drives rule-governed refinements.
- **Flexible runtime model**: supports single-agent, multi-agent, and subagent orchestration depending on runtime capability.
- **Automation-first quality model**: maximize agent-driven convergence, then apply human quality gates at UAT and PR merge.
- **Optional service integration**: Zazz Board services are optional accelerators, not prerequisites for adopting the framework.

## Document Scope

This document defines the **philosophy and operating model** of Zazz.
It is not an implementation guide.

Specifically, this document does not define:
- API route contracts
- storage schemas
- tool-specific command syntax
- execution scripts

Those implementation details belong in skills, standards, API docs, and repository-level technical documentation.

---

## Documentation Architecture Philosophy

Zazz is opinionated about **what documents must exist** and **how they relate**.
Zazz is flexible about **where those documents are stored** in a repository.

Required document contract:
- **Standards set** (required): shared conventions that govern implementation and validation.
- **Specification (`-SPEC`)** (required): authoritative desired-state and acceptance contract for a deliverable.
- **Plan (`-PLAN`)** (required): execution decomposition toward the specification.
- **Proposal (`-PROP`)** (optional, strongly recommended): pre-decision analysis for larger/new/refactor changes.

Recommended supporting artifacts:
- milestone-level acceptance/reference notes for grouped deliverables
- deliverable-level user/release documentation as needed by the milestone

Location flexibility model:
- The framework supports either `.zazz/` or `docs/` (or another repository-defined location) as the documentation root.
- A single configured root should be used per repository for consistency.
- Agents should resolve framework documents from a configured root path, for example `ZAZZ_DOCS_ROOT`.

Baseline structure under the configured root:
- `standards/` for framework standards (single canonical standards location)
- `deliverables/` for deliverable/feature directories that contain `-PROP`, `-SPEC`, and `-PLAN` documents
- optional `milestones/` for milestone-level artifacts

Single-standards-location rule:
- For framework clarity, standards are assumed to live in one canonical standards location under the configured docs root.
- The framework does not require per-subdirectory or per-section standards partitioning.

Feature directory and naming contract:
- Each new deliverable/feature must have its own directory under `deliverables/`.
- That directory is the canonical location for managing the feature over time (initial delivery, QA-driven rework, and later enhancements).
- Feature directory names should use a simple, slashless identifier (recommended: `kebab-case`).
- Deliverable documents for that feature live in that directory and use the framework suffixes (for example `feature-name-PROP.md`, `feature-name-SPEC.md`, `feature-name-PLAN.md`).

---

## Core Philosophy

- Zazz is designed to converge deliverables toward a declared desired state.
- The SPEC defines that desired state (behavior, constraints, and acceptance).
- Tests define the executable verification contract.
- Proposal, planning, execution, QA, and rework are convergence mechanisms.
- Convergence is agent-driven and rule-driven.
- The final deliverable must fully reflect the final SPEC.
- Context engineering is a core design goal: provide agents only the context needed for the current decision/work step.
- Role decomposition and step decomposition exist partly to bound context scope and reduce unnecessary prompt/context load.

---

## Core Entities

Zazz organizes work using the following hierarchy:

`Project -> Milestone -> Deliverable -> Task`

### Project
The long-lived product/application context.
A project may span one or more repositories.

### Milestone
A first-class, date-driven grouping of deliverables, conceptually similar to a Scrum initiative (or grouped epics).

A milestone exists to represent a larger capability or release objective that usually spans multiple deliverables.
A milestone may group deliverables that live in different repositories within the same project.

A milestone has:
- an explicit completion/release date
- milestone-level acceptance criteria
- potential cross-deliverable outputs (for example user documentation or release notes)

### Deliverable
A bounded unit of value with its own SPEC, PLAN context, and acceptance criteria.
One deliverable may represent only part of a milestone capability.
A deliverable is strictly scoped to one repository (including a monorepo) and one dedicated git worktree.
Its implementation and framework documents are versioned in that same repository.

### Task
The smallest execution unit inside a deliverable.

---

## Milestone and Deliverable Relationship Philosophy

- Milestones are grouping and coordination constructs, not just labels.
- Deliverables may be sequenced in series (dependency-gated) or run in parallel (independent).
- Most milestone structures are mixed dependency graphs.
- Milestones may include deliverables from multiple repositories.
- No single deliverable is split across repositories or across multiple worktrees.
- Rework, bug-fix, and enhancement deliverables can belong to the same milestone when they are required for milestone acceptance.

Milestone completion is judged at the milestone level:
- the grouped deliverables satisfy milestone acceptance criteria
- milestone completion aligns to its target date objective

---

## Document Flow Philosophy

Zazz uses the following conceptual flow:

`PROP -> SPEC -> PLAN -> build/validate loop`

### Proposal (`-PROP`, optional)
Used to clarify options, rationale, tradeoffs, and constraints before committing to a SPEC.
Strongly recommended for new capabilities and major refactors.

### Specification (`-SPEC`)
Defines the desired state and acceptance contract.
This is the central convergence target.

### Plan (`-PLAN`)
Defines how work is organized to move toward the SPEC-defined state.
Plan structure may be generated by role-specific agent skills or by runtime-native planning capabilities.

---

## Context Engineering Philosophy

Zazz is intentionally designed to manage context as a first-class concern.

Core context principles:
- Load the **least necessary context** for the current task, role, and decision.
- Avoid broad, undifferentiated context dumps that increase noise and ambiguity.
- Decompose work into explicit roles and steps so each agent operates with focused context windows.
- Use runtime-native capabilities (for example subagents/teams/planning primitives) to isolate context by workstream whenever possible.
- Prefer iterative context refresh over monolithic one-shot prompts for complex deliverables.

Outcome:
- Better reasoning quality, lower context drift, and more predictable convergence to the SPEC-defined target state.

---

## Convergence Loop Philosophy (Spec Stewardship)

Zazz is intentionally iterative:

1. A baseline SPEC is established (typically via spec-builder).
2. Work progresses toward that SPEC.
3. QA validates the implementation against the SPEC and verification evidence.
4. QA identifies gaps, inconsistencies, edge cases, missing tests, and ambiguity.
5. QA drives rule-governed SPEC refinement and explicit rework definition when needed.
6. Rework is generated and resolved.
7. A fresh QA context revalidates against the updated SPEC.
8. Repeat until implementation converges and the final deliverable fully reflects the final SPEC.

Specification stewardship is shared across the lifecycle:
- spec-builder creates the initial SPEC baseline
- QA refines and hardens the SPEC through controlled updates under framework rules
- SPEC change history should remain explicit and traceable

---

## Agent Role Philosophy

Zazz commonly uses these roles:
- `spec-builder-agent`
- `planner-agent`
- `worker-agent`
- `qa-agent`
- optional coordination role (`coordinator-agent`)

The active agent runtime (for example Claude, Codex, Warp, Gemini CLI) may provide built-in planning, orchestration, or subagent/team capabilities.
The framework is role-oriented and convergence-oriented, not tied to a single runtime.

---

## Collaboration Philosophy

Default collaboration model:
- one dedicated worktree per active deliverable branch
- concurrent work coordinated by explicit ownership and dependency awareness
- deliverable execution is single-repo/single-worktree; project and milestone coordination may span repositories

Branch and worktree naming contract:
- Worktree directory name must match the branch name used for that deliverable.
- Branch names must be slashless (no `/`) so branch and worktree names map cleanly to a single directory path.
- Branch/worktree naming should align with the deliverable/feature identifier used in `deliverables/` when practical.

Locking philosophy:
- prefer runtime-native concurrency/ownership guarantees when they are stronger
- use service-level locking (for example Board API locking) when needed for shared-state safety and observability

---

## Service Adoption Philosophy

Zazz supports two valid adoption paths:

1. **Process-only adoption**: apply the framework philosophy and document flow without any board service.
2. **Service-assisted adoption**: add Zazz Board API/UI for orchestration, visibility, and locking support.

Board API integration is optional framework infrastructure, not a prerequisite for framework adoption.

---

## Post-Convergence Human Acceptance

Human involvement is intentionally positioned after convergence, not inside it.
Balance model:
- Maximal automation during convergence: agents and framework rules drive refinement, validation, and rework.
- Deliberate human quality checkpoints after convergence: user acceptance testing (UAT) and PR merge approval.

Post-convergence checkpoints:
1. **UAT checkpoint**: human validation that delivered behavior meets user/business expectations.
2. **PR merge checkpoint**: human review/approval gate for code integration and release readiness.

These checkpoints are quality controls, not convergence controls.

---

## Key Principles

1. Desired-state convergence is the core operating model.
2. SPEC is the authoritative desired-state contract.
3. Milestones are first-class, date-driven groupings of deliverables.
4. Deliverable dependencies (serial/parallel) shape milestone progression.
5. Projects and milestones may span repositories; each deliverable remains single-repo and single-worktree.
6. QA is an independent convergence pressure function: it finds gaps/inconsistencies, flags missing tests, and drives rule-governed refinement and rework.
7. SPEC stewardship is iterative across spec-builder and QA.
8. The final deliverable must fully reflect the final SPEC.
9. Convergence is agent-driven; human acceptance is deliberately scoped to post-convergence UAT and PR merge checkpoints.
10. Context engineering is required: least-necessary context, role-scoped context, and step-scoped context.
11. The framework is opinionated about required document types, but flexible about document storage location via a configured docs root.
12. Each deliverable/feature has a canonical directory under `deliverables/` for lifecycle management over time.
13. Branch/worktree naming is opinionated: worktree equals branch name, and branch names are slashless.
14. Standards are expected in one canonical location under the configured docs root.
15. Framework philosophy is implementation-agnostic.
16. Board services are optional accelerators, not mandatory prerequisites.

---

## Framework Maturity

Pre-1.0 working draft: `0.8.1`
