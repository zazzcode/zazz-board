# Soft JSDoc Typing for Backend Service and Data Layer — Deliverable Specification

**Worktree / branch:** `add-soft-jsdoc-typing`
**Feature:** Backend JavaScript soft typing
**Milestone:** N/A
**Deliverable:** backend service/data-layer JSDoc typing foundation
**Delivery topology:** single-deliverable branch
**Review artifact:** one PR for this specification
**Approved review shape:** one PR
**Decomposition rationale:** Backend typecheck tooling, shared typedefs, first annotations, CI wiring, and the
standards baseline are one review unit because each part proves the others; stacked PRs would add process overhead
before the first typing contract exists, and including `client/` would mix the deferred frontend rollout into the
backend foundation.
**Integration branch:** `main`
**Merge policy:** PR review required; agents commit/push feature branches only
**Drafted:** 2026-06-19
**Shared run log:** `.zazz/execution/soft-jsdoc-typing-run-log.md`
**Standards improvement notes:** `.zazz/execution/soft-jsdoc-typing-standards-improvements.md`

---

## 0. Capability

Add soft typing to the backend service and data layer using plain JavaScript, JSDoc, and
`tsc --noEmit`. This deliverable creates backend check-only tooling, shared typedefs,
service/data annotations, a selected route-boundary pilot, and improved data/service
standards. It also creates the backend-first JSDoc typing standard required by the
proposal. It explicitly excludes browser client typing.

---

## 1. Required Reading For The Implementor

Read this specification end to end before editing.

### 1.a Proposal Context

- `.zazz/proposals/soft-jsdoc-typing.md` — read `Context`, `Non-Negotiable Constraints`,
  `Recommendation`, `Implementation Complexity`, `Proposed JSDoc Standard`, and
  `Next-Phase Handoff`.

### 1.b Prior Specifications

N/A.

### 1.c Standards

Verify these against `.zazz/standards/index.yaml` before coding:

| Standard | What it governs here |
| --- | --- |
| [system-architecture.md §Stack: JavaScript only](../../standards/system-architecture.md#stack-javascript-only-no-typescript) | JavaScript-only stack and JSDoc direction. |
| [system-architecture.md §Layers](../../standards/system-architecture.md#layers) | API/service/client boundaries. |
| [data-architecture.md §Design philosophy](../../standards/data-architecture.md#design-philosophy-schema-first) | Drizzle schema as source of truth. |
| [data-architecture.md §Conventions](../../standards/data-architecture.md#conventions) | `databaseService`, DB-to-JS mapping, aliases, enum codes. |
| [coding-styles.md §API validation](../../standards/coding-styles.md#api-validation-separate-from-business-logic) | AJV boundary vs handler/business logic. |
| [coding-styles.md §Project-scoped handler pattern](../../standards/coding-styles.md#project-scoped-handler-pattern) | Selected route annotation pilot. |
| [testing.md §Commands](../../standards/testing.md#commands) | Backend test command shape. |
| [code-structure.md §Avoid agentic slop](../../standards/code-structure.md#avoid-agentic-slop) | No duplicated type models or unrelated churn. |
| [docs-hygiene.md §Voice](../../standards/docs-hygiene.md#voice) | Standards-doc RFC-2119 style. |
| [docs-hygiene.md §Cross-document linking](../../standards/docs-hygiene.md#cross-document-linking) | Relative links in standards/docs. |
| [spec-hygiene.md §Specification length](../../standards/spec-hygiene.md#specification-length-is-governed-by-contract-completeness) | Keep this spec organized without line-count compression. |
| [spec-hygiene.md §Link to standards](../../standards/spec-hygiene.md#link-to-standards-and-prior-specifications-do-not-inline-them) | Cite standards sections instead of copying rules. |
| [contextual-split.md](../../standards/contextual-split.md) | Standards split/register discipline. |
| [data-layer.md](../../standards/data-layer.md) | Placeholder to expand for Drizzle/data-access rules. |
| [http-layer.md](../../standards/http-layer.md) | API route standard to cross-link from service-layer rules. |

If another indexed standard matches the file list, stop and surface it before proceeding.

This deliverable also creates and registers `.zazz/standards/service-layer.md` and
`.zazz/standards/jsdoc-typing.md`. Those files do not exist on `main` at the start of
the run, so they are not required reading before implementation. After Phase 5, verify
their contents against the proposal and register both in `.zazz/standards/index.yaml`.

### 1.d Existing Code References

- `api/lib/db/schema.js` — conceptual source of truth for entity fields.
- `api/src/utils/propertyMapper.js` — snake_case/camelCase marshalling boundary.
- `api/src/services/databaseService.js` — primary service/data boundary.
- `api/src/services/tokenService.js`, `realtimeService.js`, `gitStatus.js` — supporting
  service contracts.
- `api/src/middleware/authMiddleware.js` — auth context boundary.
- `api/src/routes/projects.js` — selected route-boundary pilot.
- `api/__tests__/routes/openapi.test.mjs` — existing route/OpenAPI test style.
- `scripts/lint-staged-files.mjs` — staged API ESLint path.

### 1.e Project Orientation

- `AGENTS.md` — worktree workflow, JavaScript-only constraint, commands, and test DB.
- `.zazz/docs/zb-agent-orientation.md` if present — branch discipline. If absent,
  continue with `AGENTS.md` as the orientation source.

---

## 2. Invariants

### INVARIANT 1 — JavaScript Remains The Runtime Source

All runtime source remains `.js` / `.mjs`. No `.ts` or `.tsx` source files are added.

### INVARIANT 2 — Type Tooling Emits Nothing

Type tooling MUST use `noEmit` and MUST NOT generate JavaScript, declarations, source
maps, `dist/`, or other build artifacts.

### INVARIANT 3 — Browser Client Is Out Of Scope

Do not modify `client/`. Frontend/browser SPA typing is deferred.

### INVARIANT 4 — Runtime Behavior Is Preserved

JSDoc annotations and typecheck tooling must not change API behavior, DB schema behavior,
route paths, response shapes, auth behavior, or realtime event semantics.

### INVARIANT 5 — Schema And Mapper Remain The Source Of Truth

Backend typedefs must derive from `api/lib/db/schema.js`,
`api/src/utils/propertyMapper.js`, and existing API response contracts.

---

## 3. Scope

### Approved Review Shape

One PR. Tooling, typedefs, first annotations, and standards updates need to be reviewed
together. Stacked PRs are unnecessary at this stage; including `client/` is rejected.

**Rationale.** The typecheck script is not meaningful without enough typedefs and
annotations to prove the boundary, the annotations are not reviewable without the checker,
and the standards update records the rollout rule while reviewers can still compare it to
the first implementation. Sibling or stacked PRs were rejected because they would force
reviewers to approve tooling, annotations, and standards without the cross-evidence that
this first backend slice needs. A milestone PR that also includes frontend typing was
rejected because the proposal explicitly sequences the browser SPA as Phase 2.

**Review unit owned by this specification.**

- Backend soft JSDoc typing foundation — backend check-only tooling, shared typedefs,
  service/data annotations, one route-boundary pilot, CI typecheck, and standards updates,
  verified by AC1-AC11.

### Strict Scope Constraint

Allowed modification paths:

- `api/`
- `.github/workflows/test.yml`
- `.zazz/standards/`
- `.zazz/docs/specifications/soft-jsdoc-typing_SPEC.md`
- `.zazz/proposals/soft-jsdoc-typing.md` only for direct consistency corrections
- `package.json` / `package-lock.json` only for root scripts or lockfile changes
- `api/package-lock.json` only if the dependency command updates the workspace lockfile

Any need to edit `client/` or another path requires Owner sign-off and spec revision.

### In Scope

| Path | New / Modified | Reason |
| --- | --- | --- |
| `api/jsconfig.json` | New | Backend check-only JS typecheck config. |
| `api/package.json` | Modified | Add API `typecheck` script and dev dependencies if workspace-local. |
| `package.json`, `package-lock.json` | Modified | Root typecheck script and lockfile dependency changes. |
| `api/package-lock.json` | Modified if dependency command updates it | Workspace lockfile consistency. |
| `api/eslint.config.js` | Modified | Add scoped backend JSDoc lint rules. |
| `scripts/lint-staged-files.mjs` | Modified if needed | Preserve staged API ESLint behavior. |
| `.github/workflows/test.yml` | Modified | Run API typecheck in CI. |
| `api/src/types.js` | New | Central backend JSDoc typedefs. |
| `api/src/utils/propertyMapper.js` | Modified | Strengthen mapper JSDoc. |
| `api/src/services/databaseService.js` | Modified | Annotate high-value service/data methods. |
| `api/src/services/tokenService.js` | Modified | Annotate token context/cache contracts. |
| `api/src/services/realtimeService.js` | Modified | Annotate SSE service contracts. |
| `api/src/services/gitStatus.js` | Modified | Annotate task status helper. |
| `api/src/middleware/authMiddleware.js` | Modified | Annotate auth context boundary. |
| `api/src/routes/projects.js` | Modified | Selected route-boundary pilot. |
| `api/src/routes/taskGraph.js` | Modified if explicitly chosen before Phase 4 starts | Optional second route-boundary pilot; leave untouched unless `projects.js` alone is insufficient to prove AC8. |
| `api/__tests__/utils/propertyMapper.test.mjs` | New if no equivalent exists | Lock mapper behavior. |
| `.zazz/standards/data-layer.md` | Modified | Expand Drizzle/data-wrapper standard. |
| `.zazz/standards/service-layer.md` | New | Define service/API marshalling/realtime standard. |
| `.zazz/standards/jsdoc-typing.md` | New | Define JSDoc typing, checker, and annotation-boundary rules. |
| `.zazz/standards/index.yaml` | Modified | Register service-layer and jsdoc-typing; update data-layer metadata. |
| `.zazz/standards/coding-styles.md` | Modified if needed | Cross-link without duplicating rules. |

### Out Of Scope

- `client/`
- TypeScript source files
- generated declarations or build artifacts
- runtime schema-library migration
- DB schema changes
- API behavior changes
- weakening, deleting, or rewriting existing tests to match implementation
- broad annotation of every route or private helper
- `checkJs` for `api/__tests__/` on day one
- typed ESLint via `@typescript-eslint`

---

## 4. Decisions

### D-1 — Use `tsc --noEmit` As The Type Gate

**Decision.** Add TypeScript only as a dev checker for JavaScript.

**Why.** JSDoc without a checker is documentation. `noEmit` preserves the direct-run
JavaScript workflow while catching cross-file shape drift.

### D-2 — Use JSDoc Linting For Annotation Form

**Decision.** Add `eslint-plugin-jsdoc` to backend ESLint config.

**Why.** ESLint already runs locally and in staged hooks. It should catch missing or
malformed boundary annotations, while `tsc --noEmit` handles type correctness.

### D-3 — Type Services/Data Before Routes

**Decision.** Annotate `types.js`, `propertyMapper`, `databaseService`, and support
services before selected routes.

**Why.** Routes should consume service contracts, not invent duplicate data shapes.

### D-4 — Defer Browser Typing

**Decision.** Exclude `client/`.

**Why.** Backend contracts provide the highest safety gain with less React/DOM noise.

### D-5 — Update Standards With The First Implementation

**Decision.** Expand `data-layer.md` and add/register `service-layer.md` and
`jsdoc-typing.md`.

**Why.** Agents need prescriptive rules before broader annotation work spreads. Data
access rules belong in `data-layer.md`, route/service boundary rules belong in
`service-layer.md`, and annotation/checker rules belong in `jsdoc-typing.md`; one mixed
standard would be harder to route from the standards index.

---

## 5. Agent Implementation Rules

### Team Integration

Commit and push only to this feature branch. Do not merge directly to `main`.

### Commands

Prefer root commands:

```bash
npm run lint:api
npm run typecheck:api
set -a && source api/.env && set +a && npm run test
```

Run targeted API tests from the root with `api/.env` sourced:

```bash
set -a && source api/.env && set +a && npm run test --workspace=api -- __tests__/utils/propertyMapper.test.mjs
set -a && source api/.env && set +a && npm run test --workspace=api -- __tests__/routes/openapi.test.mjs
```

API-local debugging commands:

```bash
cd api
set -a && source .env && set +a && NODE_ENV=test npm run test
npm run lint
npm run typecheck
```

Do not run DB-backed tests without `DATABASE_URL_TEST` loaded from `api/.env` or an
equivalent explicit environment.

### Commit And Push

Default to one coherent green commit after DoD and verifier pass. Waypoint commits are
allowed only at green recovery points.

### Scope Verification

Run `git diff main --stat` before handoff. If unrelated pre-existing work appears, name
it and keep this spec's staged/committed slice limited to §3.

### Autonomy Boundaries

Hard constraints: §2 invariants, §3 scope, §4 decisions, §6 acceptance criteria,
applicable standards, and no runtime behavior changes.

Adaptive guidance: exact helper names, exact JSDoc wording, exact test file names, and
exact number of methods annotated when the minimum domain coverage is met and typecheck
is green.

The optional `taskGraph.js` pilot is adaptive only within §3: the agent may include it
when `projects.js` does not sufficiently demonstrate the route-boundary pattern, but it
must log the reason before editing the file.

### Run Log And Standards Notes

Maintain `.zazz/execution/soft-jsdoc-typing-run-log.md` for execution history only:
standards verification, OQ answers, phase completions, deviations, evidence, and
verifier output. Create the file if it does not exist.

Maintain `.zazz/execution/soft-jsdoc-typing-standards-improvements.md` as a separate
consolidated list of potential future standards improvements discovered while touching
backend files. Create it with a brief "No additional candidates yet" entry if no
future-standard candidates are discovered. Do not put that exploratory standards list in
the run log.

### Halt Conditions

Stop and surface to the Owner if:

1. A new open question blocks code.
2. The same test/typecheck failure persists after 3 focused iterations.
3. Dependency installation fails because of network or registry access.
4. `npm run lint:api`, `npm run typecheck:api`, or `npm run test` fails for a non-obvious
   reason after 2 iterations.
5. Required changes fall outside §3.
6. A standards-index lookup reveals an unlisted applicable standard.
7. Typecheck requires a runtime behavior change.
8. JSDoc rules would require annotating every private helper or test file.
9. Existing tests fail and the apparent fix is to weaken or rewrite the test expectation.
10. The agent cannot produce the no-generated-artifacts evidence in AC1/AC11.

---

## 6. Acceptance Criteria

- **AC1 — Check-only type tooling exists.** `api/jsconfig.json` enables `allowJs`,
  `checkJs`, and `noEmit`; no `.ts` / `.tsx` source or generated type artifacts are
  added. Verified by: `npm run typecheck:api`, a node_modules-pruned `find` for
  `*.ts`, `*.tsx`, and `*.d.ts`, and `git status`.
- **AC2 — Typecheck is wired locally and in CI.** Root `npm run typecheck:api`,
  API-local `npm run typecheck`, and CI typecheck all exist. Verified by:
  `npm run typecheck:api` and workflow diff review.
- **AC3 — JSDoc linting enforces boundary hygiene.** Backend ESLint has scoped JSDoc
  rules and staged API lint still works. Verified by: `npm run lint:api`.
- **AC4 — Shared typedefs are centralized.** `api/src/types.js` defines core domain and
  service typedefs for at least `Project`, `Deliverable`, `Task`, `User`, `Tag`,
  `StatusDefinition`, `AgentTokenContext`, `AuthContext`, and relevant payload shapes.
  Verified by: code review and `npm run typecheck:api`.
- **AC5 — Mapper boundary is typed and behavior-locked.** `propertyMapper` has accurate
  JSDoc and tests for nested object/array conversion plus null/undefined pass-through.
  Verified by: `set -a && source api/.env && set +a && npm run test --workspace=api --
  __tests__/utils/propertyMapper.test.mjs`.
- **AC6 — Core service/data methods are typed.** `databaseService` imports shared
  typedefs and annotates representative methods across users, projects, deliverables,
  tasks, statuses, agent tokens, images, and file locks. Verified by:
  `npm run typecheck:api`, `set -a && source api/.env && set +a && npm run test`, and
  run-log note for any justified subset.
- **AC7 — Supporting services are typed.** `tokenService`, `realtimeService`,
  `gitStatus`, and `authMiddleware` expose typed service/auth/realtime contracts.
  Verified by: `npm run typecheck:api`.
- **AC8 — Selected routes demonstrate the pattern.** `api/src/routes/projects.js` is
  annotated for representative Fastify request/reply shapes. `taskGraph.js` remains
  untouched unless the agent logs, before Phase 4 editing, why the second pilot is needed
  to prove the route-boundary pattern. Verified by: `npm run typecheck:api` and
  `set -a && source api/.env && set +a && npm run test --workspace=api --
  __tests__/routes/openapi.test.mjs`.
- **AC9 — Standards are improved.** `data-layer.md` is expanded, `service-layer.md` and
  `jsdoc-typing.md` are added, and both new standards are registered in `index.yaml`
  with accurate `applies_to` paths/activities. Verified by: markdown hygiene checks and
  standards-index diff review.
- **AC10 — Existing backend behavior remains green.** API lint, typecheck, and tests pass
  with no browser changes. Verified by: `npm run lint:api`, `npm run typecheck:api`,
  and `set -a && source api/.env && set +a && npm run test`.
- **AC11 — Scope is clean.** Final diff excludes `client/`, `.ts` / `.tsx`, generated
  artifacts, and unrelated files. Verified by: `git diff main --stat` and targeted
  `find`/`rg` checks.

---

## 7. Test Plan

Reference data sources: existing API seed/test helpers, existing route/OpenAPI tests, and
current `propertyMapper` behavior.

Test-change policy:

- Add the mapper behavior test because this deliverable formalizes the mapper as a typed
  data boundary.
- Do not modify existing PactumJS/OpenAPI tests unless annotation work exposes a real
  product bug or stale test that the Owner approves as a spec deviation.
- If existing behavior tests fail, fix implementation or type annotations first. Do not
  change tests to match a new behavior unless the spec is revised.

Automated tests and commands:

- `api/__tests__/utils/propertyMapper.test.mjs` — verifies AC5 with nested objects,
  arrays, null, undefined, and reverse conversion.
- `npm run typecheck:api` — verifies AC1, AC2, AC4, AC6, AC7, AC8.
- `npm run lint:api` — verifies AC3.
- `set -a && source api/.env && set +a && npm run test --workspace=api --
  __tests__/utils/propertyMapper.test.mjs` — fast TDD verification for AC5.
- `set -a && source api/.env && set +a && npm run test --workspace=api --
  __tests__/routes/openapi.test.mjs` — verifies selected route annotations did not drift
  OpenAPI behavior.
- `set -a && source api/.env && set +a && npm run test` — full backend regression for
  AC10.

Existing coverage intentionally reused:

- Existing PactumJS route tests cover API behavior; do not duplicate unless annotation
  work exposes a real behavior bug.
- Existing OpenAPI tests already prove core route documentation shape.

Manual verification:

- Review `git status --short` and `git diff main --stat`.
- Confirm no generated outputs, `.ts` / `.tsx`, `.d.ts`, or `client/` edits.
- Review standards diff for RFC-2119 voice, relative links, and scoped ownership.

---

## 8. TDD Entry Point + Prescriptive Execution Sequence

### TDD Entry Point

Add `api/__tests__/utils/propertyMapper.test.mjs` first. Minimum test body:

```javascript
import { describe, expect, it } from 'vitest';
import { keysToCamelCase, keysToSnakeCase } from '../../src/utils/propertyMapper.js';

describe('propertyMapper', () => {
  it('converts nested plain objects and arrays between DB and JS key formats', () => {
    expect(keysToCamelCase({
      task_id: 1,
      nested_items: [{ created_at: '2026-06-19' }],
    })).toEqual({
      taskId: 1,
      nestedItems: [{ createdAt: '2026-06-19' }],
    });

    expect(keysToSnakeCase({ taskId: 1 })).toEqual({ task_id: 1 });
  });
});
```

### Phase 1: Tooling Foundation

1. Add dev dependencies: `typescript` and `eslint-plugin-jsdoc` as dev-only dependencies.
2. Add `api/jsconfig.json` with `allowJs`, `checkJs`, `noEmit`, Node ESM settings,
   `types: ["node"]`, `noImplicitAny`, and includes for `src/**/*.js` plus `lib/**/*.js`;
   exclude tests initially.
3. Add API-local `typecheck` and root `typecheck:api` scripts. Root `npm run
   typecheck:api` must delegate to the API workspace; API-local `npm run typecheck`
   must run `tsc` against `api/jsconfig.json`.
4. Run `npm run typecheck:api`; expect initial errors and continue.

### Phase 2: Shared Types And Mapper Contract

1. Add `api/src/types.js` with central typedefs derived from schema, mapper, and current
   API/service contracts.
2. Add the mapper test from the TDD entry point.
3. Strengthen `propertyMapper` JSDoc without behavior changes.
4. Run the mapper test and `npm run typecheck:api`.

### Phase 3: Service/Data Annotations

1. Annotate `databaseService` with shared typedef imports and representative methods
   across the domains named in AC6.
2. Annotate `tokenService`, `realtimeService`, `gitStatus`, and `authMiddleware`.
3. Fix real contract errors; do not change runtime behavior just to silence the checker.
4. Run `npm run typecheck:api`.

### Phase 4: JSDoc Linting And Route Pilot

1. Add scoped `eslint-plugin-jsdoc` rules to `api/eslint.config.js`; exclude tests from
   initial JSDoc requirements. Scope the rules to boundary files in §3 rather than every
   private helper.
2. Confirm `scripts/lint-staged-files.mjs` still runs backend ESLint correctly.
3. Annotate `api/src/routes/projects.js`. If `projects.js` is insufficient to prove the
   route-boundary pattern, log that reason and then annotate `taskGraph.js`; otherwise
   leave `taskGraph.js` untouched.
4. Run `npm run lint:api`, `npm run typecheck:api`, and the OpenAPI test.

### Phase 5: Standards Hardening

1. Expand `.zazz/standards/data-layer.md` with concrete Drizzle/schema/wrapper rules.
2. Add `.zazz/standards/service-layer.md` for services, marshalling, auth context,
   and realtime/SSE boundaries.
3. Add `.zazz/standards/jsdoc-typing.md` for JSDoc typedef placement, import style,
   `tsc --noEmit`, lint scope, allowed `@ts-expect-error`, and forbidden broad
   `@ts-nocheck`.
4. Register both new standards in `.zazz/standards/index.yaml`; cross-link from
   `coding-styles.md` only if needed and without duplicating rules.
5. Run markdownlint on changed docs when available; otherwise manually check the enabled
   rules: trailing whitespace, repeated blank lines, final newline.

### Phase 6: CI And Final Verification

1. Add API typecheck to `.github/workflows/test.yml`.
2. Run:

```bash
npm run lint:api
npm run typecheck:api
set -a && source api/.env && set +a && npm run test
git diff main --stat
find api -path 'api/node_modules' -prune -o \( -name '*.ts' -o -name '*.tsx' -o -name '*.d.ts' \) -print
```

The `find` command must produce no tracked or untracked source/artifact paths outside
`node_modules`. If it prints a legitimate package-owned file, refine the command to
exclude dependency directories and record that refinement in the run log.

---

## 9. Definition Of Done

- [ ] Required reading consumed; standards-index verification performed.
- [ ] No blocking open questions.
- [ ] Dev dependencies installed as dev dependencies only.
- [ ] `api/jsconfig.json` uses `allowJs`, `checkJs`, and `noEmit`.
- [ ] `api/src/types.js` centralizes backend typedefs.
- [ ] Mapper tests are added and green.
- [ ] Service/data annotations satisfy AC6 and AC7.
- [ ] Selected route annotations satisfy AC8.
- [ ] `data-layer.md` expanded; `service-layer.md` and `jsdoc-typing.md` added and registered.
- [ ] CI runs API typecheck.
- [ ] `npm run lint:api`, `npm run typecheck:api`, and `set -a && source api/.env &&
  set +a && npm run test` are green.
- [ ] Scope verification shows no `client/`, `.ts` / `.tsx`, or generated artifact changes.
- [ ] Run log is up to date.
- [ ] Standards improvement notes are recorded separately in
  `.zazz/execution/soft-jsdoc-typing-standards-improvements.md` or the file states that
  no additional future-standard candidates were found.
- [ ] Verifier sub-agent reports all-pass.
- [ ] PR body links this specification and lists AC verification.

---

## 10. Open Questions

No blocking open questions. The Owner has approved backend-first scope and deferred
browser client typing.

If dependency placement, lint strictness, or route pilot scope must materially change,
treat it as a deviation requiring Owner sign-off.

---

## 11. Run Log Protocol

Use `.zazz/execution/soft-jsdoc-typing-run-log.md`. Keep it untracked unless the Owner
or repo policy says otherwise. Create it if absent. Append entries; do not rewrite prior
entries.

Required sections:

- Standards Verification
- OQ Resolutions
- Phase Completions
- Deviations
- Manual Evidence Locations
- QA Findings & Rework
- Issues & Recoveries
- Verifier Sub-Agent Report

Session start protocol: read this spec, read the run log if present, confirm the next
phase from the latest entry, verify no new Owner guidance supersedes §10, then implement.

While inspecting and editing backend files, keep a consolidated list in
`.zazz/execution/soft-jsdoc-typing-standards-improvements.md`. Capture patterns,
inconsistencies, or best practices that should be considered for future standards work.
This file is separate from the run log so execution history stays clean. Do not put this
exploratory list in committed standards documents during this deliverable, and do not
expand scope to implement those extra standards unless they are already required by §8
Phase 5 or the Owner approves a spec revision. Create the file if absent, even if the
only entry is that no additional future-standard candidates were found.

---

## 12. Appendix — Agent Implementation Prompt

Paste this into a fresh implementation session:

```text
You are starting fresh in the feature worktree for branch add-soft-jsdoc-typing.
Implement backend service/data-layer soft JSDoc typing.

Specification: .zazz/docs/specifications/soft-jsdoc-typing_SPEC.md
Run log: .zazz/execution/soft-jsdoc-typing-run-log.md
Standards improvement notes: .zazz/execution/soft-jsdoc-typing-standards-improvements.md

Read the specification end to end first. Then read the run log if it exists, AGENTS.md,
the proposal sections named in §1, the standards in §1.c, and the code references in §1.d.
If the run log or standards improvement notes file is absent, create it when the first
entry is due.

NON-NEGOTIABLE RULES
1. Follow the Agent Implementation Rules in §5.
2. Preserve every invariant in §2.
3. Verify standards via .zazz/standards/index.yaml before writing code.
4. Every AC must have evidence.
5. Do not weaken existing tests to make the implementation pass.

PREFLIGHT
1. Confirm the current directory is the repo root for add-soft-jsdoc-typing.
2. Check dependency state. If `node_modules` is absent, install with `npm ci`. If install
   fails because of sandbox, network, or registry access, request the required permission
   once; if it still fails, halt under §5.
3. Ensure Postgres is available for the full backend suite:
   npm run docker:up:db
4. Ensure the test DB exists and is reset before the full test run:
   docker exec zazz_board_postgres psql -U postgres -c "CREATE DATABASE zazz_board_test;" 2>/dev/null || true
   cd api && DATABASE_URL=postgres://postgres:password@localhost:5433/zazz_board_test npm run db:reset
   cd ..

SUGGESTED CHILD AGENTS
Use child agents when available; keep this main agent responsible for integration, final
diff, and verification.
1. Standards agent: expand data-layer.md, draft service-layer.md and jsdoc-typing.md,
   and update index.yaml.
2. Type boundary agent: create api/src/types.js and annotate propertyMapper/databaseService.
3. Service/route agent: annotate supporting services, auth middleware, and projects route.
4. Verifier agent: independently run AC checks after integration.

Child agents must not commit independently, weaken tests, edit client/, or change runtime
behavior. They report patches/findings back to the main agent, which integrates them.

STANDARDS OBSERVATION
Keep a consolidated list in
.zazz/execution/soft-jsdoc-typing-standards-improvements.md. When touching or inspecting
files, note opportunities to codify coding best practices for this tech stack, especially
Drizzle query patterns, service-layer boundaries, route/service marshalling, auth context,
realtime events, JSDoc typing conventions, and test patterns. Keep these notes separate
from the run log. This is documentation only for a later session; do not expand
implementation scope beyond this specification.

ORDER OF WORK
1. Confirm no new open questions exist.
2. Complete preflight and make sure the DB/test DB are available.
3. Start with the TDD entry point in §8.
4. Execute phases 1-6 in order, using child agents where helpful.
5. Run verification and complete the DoD.
6. Dispatch the verifier sub-agent.
7. Prepare PR-ready output. Do not merge to main.

VERIFIER SUB-AGENT
After your own DoD is green, dispatch:

  "Verify backend service/data-layer soft JSDoc typing in
  the current add-soft-jsdoc-typing worktree. Read
  .zazz/docs/specifications/soft-jsdoc-typing_SPEC.md and the run log if present.
  Review .zazz/execution/soft-jsdoc-typing-standards-improvements.md only to confirm it
  is separate from execution history; do not grade ACs from that file.
  For each AC, independently run the cited test or command. Verify git diff main --stat
  matches scope. Confirm existing tests were not weakened. Do not modify files.
  Return PASS/FAIL per AC with evidence."

Only declare done after verifier all-pass.
```

---

*End of specification. Implementation proceeds from this specification and run log; no
separate plan is created.*
