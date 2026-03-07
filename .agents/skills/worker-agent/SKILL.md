# Worker Agent Skill

## Mission
Execute an approved deliverable PLAN from start to finish, including:
- just-in-time task realization from plan steps
- dependency relation realization
- implementation with TDD
- status lifecycle management

This role is implementation-first and orchestration-capable.

## First Rule: Use Built-In Execution Optimizations
If the active agent/model supports built-in execution optimizations (multi-agent teams, subagents, structured planning/task tools), you MUST use them.

---

## Mandatory Companion Skill

For any API interaction, you MUST load and follow:
- `.agents/skills/zazz-board-api/SKILL.md`

Live OpenAPI is the route contract source of truth.

---

## Required Inputs

Before execution, you MUST have:
1. Project code
2. Deliverable code
3. Deliverable ID (integer)
4. Approved SPEC path
5. Approved PLAN path

If any required input is missing, stop and ask the Owner.

---

## Core Operating Policy

You MUST execute in this order:

1. Read SPEC and PLAN fully.
2. Build a step map from PLAN (`phaseStep` IDs, dependencies, parallel groups).
3. Validate that the PLAN explicitly identifies parallelizable tasks/steps.
   - If not explicit, pause and ask Owner/Planner for clarification before parallel execution.
4. Compute the dependency-ready set.
5. For each ready task you are about to execute, ensure its board task exists (create/reconcile just in time).
6. Ensure all required `DEPENDS_ON` edges for that task exist before starting.
7. Before moving `READY -> IN_PROGRESS`, acquire required file locks via the lock API.
8. If lock acquire conflicts, set `isBlocked=true` with `blockedReason='FILE_LOCK'`, poll every 3 seconds, and retry acquire until success.
9. When locks are acquired, clear block flags and execute with TDD.
10. Update workflow statuses continuously (`READY`, `IN_PROGRESS`, `COMPLETED`) and keep `isBlocked`/`blockedReason` truthful.
11. If course correction/rework appears after completion, add new follow-up tasks + relations to the graph; do not reopen completed tasks.
12. Recompute which tasks are now dependency-ready and repeat.
13. Stop only when every task in the current deliverable graph is either:
    - `COMPLETED`, or
    - blocked via task flags (`isBlocked=true`) with explicit reason `OWNER_DECISION` or `FILE_LOCK`.

Do not implement tasks that violate dependency ordering.

---

## Just-In-Time Board Sync (Required)

Do not preload all PLAN tasks onto the board at once.

Execution model:
1. Add tasks as the plan is executed.
2. Before starting a task, ensure it exists on the board and is dependency-ready.
3. Maintain relations and statuses in real time while implementation proceeds.
4. When scope changes, append new tasks to the graph instead of rewriting completed history.
5. If PLAN wording changes mid-execution, do not bulk rewrite the board; only add/update what is needed for the next executable work.
6. Blocking is a task property (`isBlocked` + `blockedReason`), not a workflow status column.

This keeps board state aligned with actual execution and avoids plan/backlog drift.

---

## Board API Responsibilities

When executing a deliverable, you are responsible for board state integrity:

1. **Task creation/sync**
   - Create/reconcile tasks just in time for dependency-ready work.
   - Reuse existing matching tasks; do not duplicate.
2. **Relation creation/sync**
   - Create explicit task relations for each required `DEPENDS_ON` edge before work starts.
3. **Status management**
   - Keep workflow status current as execution advances (`READY`, `IN_PROGRESS`, `COMPLETED`).
   - Keep block state current via `isBlocked` + `blockedReason`.
4. **Execution notes**
   - Record blockers, clarifications, and major decisions in task notes/comments.
5. **Course-correction graph updates**
   - Add new tasks + relations for rework discovered during execution.
   - Keep completed tasks completed; do not move backward by reopening done work.
6. **Completion signal**
   - Signal deliverable completion only when all tasks in the current deliverable graph are complete.

If API write operations are unavailable, pause and request Owner direction instead of silently diverging from board truth.

---

## File Lock API (Required)

Before changing any task from `READY` to `IN_PROGRESS`, the worker MUST lock intended files via API.
Do not create or rely on local lock files in `.zazz`; lock ownership source of truth is the Board API.

Routes:
1. `POST /projects/:code/deliverables/:delivId/locks/acquire`
2. `POST /projects/:code/deliverables/:delivId/locks/heartbeat`
3. `POST /projects/:code/deliverables/:delivId/locks/release`
4. `GET /projects/:code/deliverables/:delivId/locks`

Lock workflow:
1. Determine the file list before work starts.
2. Attempt `acquire` for the full file list (atomic batch).
3. If `409 FILE_LOCK_CONFLICT`:
   - keep workflow status unchanged
   - set `isBlocked=true`, `blockedReason='FILE_LOCK'`
   - poll every 3 seconds and retry `acquire`
4. On successful acquire:
   - set `isBlocked=false` and clear `blockedReason`
   - move task to `IN_PROGRESS`
5. While working, send periodic `heartbeat`.
6. On completion or handoff, `release` locks.
7. If worker process crashes/restarts, re-resolve task state from API and reacquire before resuming edits.

---

## Parallel Execution Policy

If subagents/teams are supported, parallelization is required.

### Parallelization algorithm
1. Compute the ready set (dependencies satisfied).
2. From ready tasks, select tasks with no overlapping file ownership.
3. Spawn subagents for as many safe tasks as possible.
4. Assign one task per subagent.
5. Track and merge outputs; update board statuses for each task.
6. Recompute ready set and repeat.

If subagents are not supported, execute the same dependency order in single-agent mode.

Do not run tasks in parallel when they overlap on locked/conflicting files.

---

## TDD and Completion Policy

For every task:
1. Derive tests directly from acceptance criteria.
2. Use a TDD loop (default): `RED -> GREEN -> REFACTOR`.
3. Start by writing/updating a failing test that proves the requirement gap.
4. Implement the minimal code change to make the test pass.
5. Refactor safely while keeping tests green.
6. Run required test suite(s) for the task scope.
7. Do not mark task complete until required tests pass.

If a task cannot be tested, escalate to the Owner as under-specified.

---

## Clarification and Decision Gates (Owner Escalation)

You MUST ask the Owner when:
- instructions are unclear
- requirements are underdefined
- constraints conflict
- multiple materially different implementations are possible and SPEC/PLAN does not decide

When escalating, include:
1. exact ambiguity
2. options considered
3. tradeoffs
4. your recommended option

Until clarified, keep workflow status unchanged, set `isBlocked=true` and `blockedReason='OWNER_DECISION'`, and do not guess.

---

## Status Transition Rules

Use these state rules:
- `TO_DO` -> `READY` when the task is selected for an executable wave
- `READY` -> `IN_PROGRESS` only after required file locks are acquired
- On lock conflict: keep workflow status unchanged, set `isBlocked=true`, `blockedReason='FILE_LOCK'`, poll every 3 seconds
- On owner decision wait: keep workflow status unchanged, set `isBlocked=true`, `blockedReason='OWNER_DECISION'`
- When blocker resolves: set `isBlocked=false`, clear `blockedReason`, then continue normal status flow
- `IN_PROGRESS` -> `COMPLETED` only after required tests pass

Status changes must match real execution state.

---

## Communication Rules

1. Prefer concise, factual updates.
2. Log blockers and decisions in task notes/comments.
3. Ask early; do not accumulate ambiguous assumptions.
4. Keep owner-facing questions actionable and decision-oriented.

---

## Quality Bar

Execution is complete only when all are true:
1. Every executed dependency-ready step has a board task before implementation starts.
2. Every required `DEPENDS_ON` edge exists as a task relation before dependent work begins.
3. Course-correction work is represented as additional graph tasks (not reopened completed tasks).
4. All tasks are either `COMPLETED` or explicitly blocked via `isBlocked=true` with Owner-visible rationale.
5. Required tests for completed tasks pass.
6. Deliverable behavior matches SPEC acceptance criteria.

---

## Environment Variables

```bash
export ZAZZ_API_BASE_URL="http://localhost:3000"
export ZAZZ_API_TOKEN="your-api-token"
export AGENT_ID="worker"
export ZAZZ_WORKSPACE="/path/to/project"
export ZAZZ_STATE_DIR="${ZAZZ_WORKSPACE}/.zazz"
export AGENT_POLL_INTERVAL_SEC=15
export AGENT_HEARTBEAT_INTERVAL_SEC=10
```
