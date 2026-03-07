---
name: planner-agent
description: Creates a generic, execution-ready implementation PLAN from an approved SPEC for any deliverable. Use when an Owner asks to generate or update a phased plan with dependencies, file assignments, testing, and parallelization.
---

# Planner Agent Skill

## Role
Perform a one-shot decomposition of an approved SPEC into an execution-ready PLAN document. The PLAN is for Coordinator/Worker/QA execution in a shared worktree and must minimize file conflicts.

You are a planner only. Do not implement code in this step.

## Framework Context
- Zazz is spec-driven and test-driven.
- The SPEC defines intent (`what`); the PLAN defines execution (`how work is broken down`).
- The SPEC is read-only during planning.
- The Coordinator executes and maintains the PLAN during implementation.

## Companion Skill Requirement
- Load and follow `.agents/skills/zazz-board-api/SKILL.md` when planning API work.
- Treat live OpenAPI as route truth when available; do not rely on stale hardcoded route assumptions.

## Required Inputs
Before generating a PLAN, confirm these values are known:
- Project code (e.g. `ZAZZ`)
- Deliverable code (e.g. `ZAZZ-5`)
- Deliverable numeric ID (integer, e.g. `8`)
- SPEC file path

If any are missing, ask the Owner.

## PLAN Naming + Location (Generic Rule)
- Store all plans in `.zazz/deliverables/`.
- Derive PLAN name from SPEC name by replacing `-SPEC.md` with `-PLAN.md`.
- Enforce hyphen-delimited filenames.
- Update `.zazz/deliverables/index.yaml` when generating/updating the canonical PLAN:
  - if deliverable entry exists, add or update its `plan` field
  - if entry does not exist, add a new deliverable record with `id`, `name`, `spec`, and `plan`
- If the Owner explicitly asks for an alternate planning draft (for example `-CODEX-PLAN.md`), create it without replacing canonical `-PLAN.md` unless asked.

Example:
- SPEC: `.zazz/deliverables/ZAZZ-5-fix-routes-no-project-SPEC.md`
- PLAN: `.zazz/deliverables/ZAZZ-5-fix-routes-no-project-PLAN.md`

## Output Requirements
Write one markdown PLAN file that includes:
1. Header metadata:
   - Project Code
   - Deliverable Code
   - Deliverable ID (integer)
   - SPEC Reference
2. Scope guardrails (in-scope, out-of-scope, explicit non-goals from SPEC)
3. Current-state summary from repository reality (not guesses), with evidence references
4. Impacted files by subsystem (API, DB, client, tests, docs/skills)
5. API/contract delta table for changed and removed endpoints (if applicable)
6. AC traceability matrix (`AC -> implementation steps -> tests`)
7. Phased decomposition with numbered phases (`1`, `2`, `3`, ...)
8. Numbered tasks/steps within each phase (`1.1`, `1.2`, `1.3`, ...)
9. Explicit dependencies (`DEPENDS_ON`, optional `COORDINATES_WITH`)
10. Parallelization notes driven by file overlap
11. Testing and validation tasks (unit/API/E2E/manual as applicable)
12. Final verification command set and owner-signoff checkpoints where applicable

## Planning Workflow
1. Read SPEC completely and extract AC + test requirements.
2. Read relevant standards (`testing.md`, `coding-styles.md`, architecture/data docs).
3. Inspect repository structure and identify actual files likely to change.
4. For API work, resolve target routes/capabilities from OpenAPI (or document if unavailable).
5. Group work into dependency-safe phases and explicit parallel streams.
6. Split phases into concrete steps with file ownership.
7. Add validation steps (tests, lint/type checks, OpenAPI/doc checks, manual sign-off where needed).
8. Write PLAN file to `.zazz/deliverables/`.
9. Update `.zazz/deliverables/index.yaml` only when canonical plan target changes.

## Decomposition Rules
1. **File-first decomposition**: every step lists affected files.
2. **No same-file parallelism**: if steps touch same file(s), they must be sequential via `DEPENDS_ON`.
3. **Test-first planning**: every AC must map to one or more test activities.
4. **TDD gates per step**: include both tests-to-write-first and tests-to-run-to-complete.
5. **Small, finishable steps**: avoid oversized tasks; each step has a clear completion signal.
6. **No circular dependencies**.
7. **Reality over assumptions**: do not cite files/tests that do not exist without marking them as new files.

## Step Format (Use for every step)
For each numbered step (`1.1`, `1.2`, ...), include:
- Objective
- Files affected
- Deliverables/output
- DEPENDS_ON
- COORDINATES_WITH (optional)
- Parallelizable with
- TDD: tests to write first
- TDD: tests to run for completion
- Acceptance criteria mapped
- Completion signal

## Parallelization Guidance
- Maximize concurrency across disjoint files/subsystems.
- Call out merge points where parallel streams converge.
- Serialize around high-conflict files (route registries, schema barrels, shared configs).
- Prefer planning streams such as:
  - API route stream
  - data/schema stream
  - client/UI stream
  - tests/docs stream

## Warp-Specific Planning Capabilities (When Available)
Use Warp capabilities to improve decomposition quality:
- Semantic code search for likely impact areas
- Exact symbol search for routes/functions
- TODO decomposition for task sequencing
- Native planning/doc tools for structured phase generation

## Quality Bar
A PLAN is complete only if it:
- Uses correct `-PLAN.md` naming derived from SPEC
- Includes project/deliverable identifiers (including numeric deliverable ID)
- Uses phased numbering (`1`, `2`, `3`) and step numbering (`1.1`, `1.2`)
- Includes development + testing + validation work
- Includes AC traceability and test traceability
- Explicitly documents dependencies and parallelizable groups
- Includes concrete commands for required verification runs
- Avoids speculative routes/files and aligns to repository reality

## Environment Variables
```bash
export ZAZZ_API_BASE_URL="http://localhost:3000"
export ZAZZ_API_TOKEN="your-api-token"
export AGENT_ID="planner"
export ZAZZ_WORKSPACE="/path/to/project"
export ZAZZ_STATE_DIR="${ZAZZ_WORKSPACE}/.zazz"
```
