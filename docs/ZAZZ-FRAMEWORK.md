# The Zazz Framework

Zazz is an opinionated, spec-driven framework for building software deliverables with agents.

This document defines the **current implementation focus** and the **future capability roadmap**.

---

## Current Focus (Active Development Phase)

The active framework scope is intentionally strict:

1. `spec-builder-agent`
2. `planner-agent`
3. `worker-agent`
4. `zazz-board-api` (required companion skill for all active agents)

All implementation guidance in this document is optimized for these four capabilities only.

---

## What Zazz Is

Zazz combines:
- A delivery framework (SPEC → PLAN → implementation execution and agent skills)
- An opinionated set of required documents and processes for building software applications
- An observability and coordination platform (Zazz Board API + UI)

Work is organized as:
- `Project -> Deliverable -> Task`

Primary artifacts:
- SPEC: `.zazz/deliverables/{name}-SPEC.md`
- PLAN: `.zazz/deliverables/{name}-PLAN.md`

---

## Core Process (Current Phase)

## Stage 0: SPEC Creation

Actors:
- Deliverable Owner
- `spec-builder-agent`

Output:
- Approved SPEC with testable acceptance criteria and test requirements.

Rules:
- Requirements must be explicit and testable.
- If a requirement is ambiguous, refine before planning.

## Stage 1: Planning

Actor:
- `planner-agent`

Output:
- Execution-ready PLAN with:
  - phases and steps
  - file assignments
  - dependency edges
  - parallelizable groups
  - test command matrix

Rules:
- PLAN must be repository-grounded (no speculative files/routes).
- PLAN must call out which tasks can run in parallel.

## Stage 2: Execution

Actor:
- `worker-agent` (single or multi-agent team mode depending on platform capability)

Required companion:
- `zazz-board-api` skill

Output:
- Completed deliverable implementation with task lifecycle tracked in Zazz Board.

Rules:
- Worker reads SPEC + PLAN before implementation.
- Worker executes in TDD mode (tests required per task).
- Worker uses the board API during execution (not as a one-time preload) to keep task lifecycle and dependencies accurate.

Implementation-phase board policy:
- Add tasks just in time: create/reconcile only the dependency-ready tasks that are about to be worked.
- Before a task starts, ensure it exists on the board, has required relations, and is `READY`.
- As work proceeds, transition workflow status truthfully (`READY`, `IN_PROGRESS`, `COMPLETED`) and keep `isBlocked`/`blockedReason` accurate.
- If course correction is needed after a completed task, add new follow-up tasks and relations to the task graph; do not reopen or rewrite completed tasks.
- If PLAN wording changes during execution, avoid full board resync; update only the next executable tasks and relations.
- Signal deliverable completion only when all tasks currently on the deliverable task graph are complete.

---

## Worker Agent Responsibilities (Expanded)

The worker agent is not a narrow code-only role in the current phase. It is a delivery executor with orchestration responsibilities.

Mandatory responsibilities:

1. Read the deliverable PLAN and SPEC first.
2. Add and update board tasks incrementally while executing (no bulk upfront task creation).
3. Ensure `DEPENDS_ON` relationships exist for each task before that task starts.
4. Keep workflow statuses and block flags accurate while executing.
5. Implement each task with TDD and evidence.
6. Escalate ambiguity to the Owner before making unclear design decisions.
7. If multiple valid approaches exist, present options and request Owner direction.
8. When rework is discovered, extend the task graph with new tasks instead of rolling back completed tasks.

The worker must not silently guess when requirements are underdefined.

---

## Multi-Agent / Agent-Team Execution Policy

If the runtime supports subagents or teams (for example Codex multi-agent or Claude teams), the worker agent must use that capability to maximize safe parallelism.

Policy:

1. Identify all tasks that are dependency-ready.
2. From those, select tasks with non-overlapping file ownership.
3. Spawn subagents for as many safe parallel tasks as possible.
4. Keep status transitions synchronized in board state.
5. Reconcile outputs and continue to next ready task wave.

If the runtime does not support subagents, execute the same dependency order in single-agent mode.

---

## Zazz Board API Requirement

The `zazz-board-api` skill is mandatory for the active agent set.

All active agents must use API capabilities to:
- discover deliverables/tasks
- create/update tasks when required by plan execution
- create/update task relationships
- update task status as execution progresses
- capture task notes relevant to decisions, blockers, and clarifications

OpenAPI is the source of truth for route resolution.

---

## Task Lifecycle Policy

At minimum, worker execution must keep these states accurate:
- `TO_DO` (optional, project-dependent)
- `READY`
- `IN_PROGRESS`
- `COMPLETED`

Rules:
- Do not mark a task complete before required tests pass.
- Use task-level blocking flags (`isBlocked`, `blockedReason`) when waiting on Owner clarification/decision or file-lock contention.
- Preserve dependency integrity when advancing tasks.

---

## Clarification and Decision Policy

Worker agent must pause and ask the Owner when:
- instructions are unclear
- requirements are incomplete
- constraints conflict
- more than one materially different solution is valid and plan/spec does not decide

When asking, include:
1. the exact ambiguity
2. concrete options
3. tradeoffs and recommended option

Do not continue past decision gates without explicit clarification.

---

## Future Capabilities (Not Current Active Scope)

The following personas remain part of the framework roadmap but are not the current implementation focus:

- `coordinator-agent`
- `qa-agent`
- additional specialized personas

Current status:
- These personas are in **research/planning phase** for future framework expansion.
- Existing references to them should be treated as forward-looking architecture, not present-day required workflow.

When these personas are activated in a future phase, this document will be expanded with their production operating policies.

---

## Key Principles (Current Phase Summary)

1. SPEC defines intent.
2. PLAN defines executable decomposition.
3. Worker executes PLAN and keeps board state truthful.
4. TDD is required for task completion.
5. Dependencies are explicit and enforced.
6. Parallelism is maximized safely (dependency + file-overlap aware).
7. Ambiguity is escalated to the Owner, not guessed.
8. API contract truth comes from live OpenAPI.
9. Task graph evolves during implementation; course corrections are added as new tasks.

---

## Version

Version: `1.3.0`  
Last Updated: `2026-03-07`  
Status: `Active - Core Agent Phase (Spec Builder + Planner + Worker + Board API)`
