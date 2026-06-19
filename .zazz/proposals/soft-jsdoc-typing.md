# Proposal: Soft Typing for JavaScript with JSDoc

**Status**: Draft
**Scope**: Technical direction for `api/` and `client/`
**Branch**: `add-soft-jsdoc-typing`
**Owner**: Michael Woytowitz
**Docs root**: `.zazz/`

## Context

Zazz Board is intentionally JavaScript-only. That is a product and engineering constraint,
not an accident: source files should stay directly runnable as `.js` / `.jsx`, without a
TypeScript migration, transpilation step, generated build artifact, or parallel source
format.

At the same time, the codebase is large enough that plain JavaScript has real costs:

- Refactors can silently break callers when function shapes change.
- The API has an important snake_case DB to camelCase JS boundary that is documented but
  not machine-checked.
- Client hooks and component props are often discoverable only by reading implementation.
- AI-authored diffs can introduce shape errors that lint and tests may not catch early.

The proposal is to add **soft typing**: type information written as JSDoc comments,
validated by tooling, while runtime code remains plain JavaScript.

## Decision This Proposal Should Enable

Decide whether to adopt JSDoc-based soft typing across the repo, and if so:

1. Which enforcement model to use.
2. How strict the initial rollout should be.
3. How to sequence implementation across backend/data code and the frontend SPA.
4. What standard agents and humans should follow when adding annotations.

## Scope

This is a technical-direction proposal for both runtime surfaces:

- Backend: Fastify API, Drizzle/database service layer, middleware, routes, and shared
  utilities under `api/`.
- Frontend: React/Vite browser SPA hooks, utilities, components, and pages under
  `client/`.

It does not approve implementation by itself. Approval should hand off to deliverable
specs for the backend phase and frontend phase.

## Non-Negotiable Constraints

- No `.ts` or `.tsx` source files.
- No JavaScript transpilation for the API.
- No generated JavaScript, declarations, source maps, or build output from type tooling.
- The authored `.js` / `.jsx` remains the runnable source.
- The `typescript` package may exist as a devDependency only for `tsc --noEmit`.
- Type checking must be outside the runtime path.
- The solution must apply to both `api/` and `client/`.

This means TypeScript is acceptable as a **checker**, not as a language migration or build
pipeline.

## Goals

- Catch type and shape errors before review or runtime.
- Improve IDE hover, autocomplete, and navigation for plain JavaScript.
- Document service-layer contracts, route contracts, React hook return values, and
  component props.
- Formalize shared domain shapes such as `Task`, `Deliverable`, `Project`, and `User`.
- Preserve the direct-edit JavaScript workflow.

## Non-Goals

- Convert runtime source to TypeScript.
- Add a build or emit step to local development, CI, or production.
- Replace AJV / JSON Schema validation at the HTTP boundary.
- Type-check all test files on day one.
- Generate declaration files for package publishing.

## Business Justification

- Reduce review time by catching shape errors before a human reviewer has to find them.
- Reduce regression risk from refactors and AI-authored changes.
- Preserve the fast JavaScript authoring loop the project values.
- Improve onboarding by making contracts visible in editors instead of only in prose or
  implementation details.

## Technical Justification

- TypeScript can check `.js` / `.jsx` files with JSDoc and `checkJs`.
- `noEmit: true` prevents generated files, keeping the checker out of the runtime path.
- ESLint already exists in both surfaces, so JSDoc form checks fit the current toolchain.
- The backend already has strong runtime boundary validation through AJV; JSDoc fills the
  separate gap inside JavaScript logic and cross-file contracts.

## Expected Outcomes

- A local `typecheck` command for API and client work.
- CI failure on real type errors without producing build artifacts.
- Shared domain typedefs for core Zazz Board entities.
- Better IDE feedback for service calls, route handlers, hooks, and component props.
- A new `.zazz/standards/jsdoc-typing.md` standard so agents and humans annotate the same
  way.

## Options Considered

| Option | Summary | Pros | Cons |
| --- | --- | --- | --- |
| A. Documentation-only JSDoc | Add comments without a type checker. | Lowest tooling cost; improves human readability. | Does not catch type errors; comments can drift; not enough for the stated goal. |
| B. ESLint JSDoc rules only | Use `eslint-plugin-jsdoc` to require and validate tags. | Fast; fits existing ESLint and pre-commit flow; catches missing or malformed docs. | Checks comment form, not type correctness; cannot catch cross-file shape errors. |
| C. `tsc --noEmit` only | Use TypeScript's checker on `.js` / `.jsx` with JSDoc. | Real type checking; no emitted files; powers IDE feedback. | Does not enforce annotation hygiene by itself; can produce noisy first-run errors. |
| D. Hybrid JSDoc lint + `tsc --noEmit` | Use ESLint for annotation form and `tsc --noEmit` for correctness. | Best coverage; fast staged-file checks plus real CI type checking; still no build output. | Adds two dev tools and requires a rollout standard to prevent noisy over-annotation. |
| E. Full TypeScript migration | Convert source to `.ts` / `.tsx`. | Strongest type-system ergonomics. | Violates project constraints and owner preference; creates migration and build-pipeline burden. |

## Recommendation

Adopt **Option D: Hybrid JSDoc lint + `tsc --noEmit`**, rolled out in two implementation
phases:

1. **Phase 1: Backend API and data layer.**
2. **Phase 2: Frontend browser SPA client.**

This is the best fit because it separates two different concerns:

- `eslint-plugin-jsdoc` enforces that annotations exist and are well-formed.
- `tsc --noEmit` verifies that the annotated JavaScript is type-consistent.

Both tools are check-only. Neither tool changes runtime source or writes build output.

## Why Not ESLint-Only?

An ESLint-only approach sounds attractive because it feels closer to linting than type
checking. The tradeoff is that JSDoc lint rules validate the comment, not the program.
They can tell us a function is missing `@param`, but they cannot reliably tell us that a
route passed a `Deliverable` where a `Task` is expected.

Real soft typing requires a type checker somewhere. Using `tsc --noEmit` is the simplest
honest version: invoke the checker directly, emit nothing, and keep JavaScript as the
runtime artifact.

## Enforcement Model

| Level | Tool | Scope | Runs | Purpose |
| --- | --- | --- | --- | --- |
| 1. Annotation form | `eslint-plugin-jsdoc` | Staged files | Pre-commit via existing `lint-staged` flow | Require and validate useful JSDoc on touched files. |
| 2. Type correctness | `tsc --noEmit` | Package or whole project | CI on PR/push, plus local `npm run typecheck` | Catch type mismatches, implicit `any`, and cross-file shape drift. |
| 3. Editor feedback | TS language server | Current workspace | Live while editing | Show squiggles, hover, autocomplete, and navigation. |

No pre-push typecheck is recommended initially. CI already provides the full-project gate,
and pre-push checks tend to feel slow enough that contributors bypass them.

## Implementation Complexity

The work is not equally hard across the repo. The backend has the most important data
contracts and the clearest payoff. The frontend has more prop and DOM noise, so it should
follow after the backend pattern and standard are proven.

### Phase 1: Backend API and Data Layer

**Goal**: Type the data boundary, service contracts, and route handlers.

**Why first**

- The backend owns the source-of-truth domain shapes.
- `databaseService` centralizes DB access and snake_case to camelCase mapping.
- Route handlers are natural typed boundaries: params, body, reply shape.
- The backend has less DOM-style nullability noise than the browser client.

**Main work**

1. Add backend check config:
   - `api/jsconfig.json`
   - `allowJs: true`
   - `checkJs: true`
   - `noEmit: true`
   - `noImplicitAny: true`
   - Node/Fastify type support
2. Add backend scripts:
   - `npm run typecheck --workspace=api` or equivalent repo script.
   - CI step in the existing test workflow.
3. Add JSDoc linting to `api/eslint.config.js`.
4. Create shared backend typedefs, likely `api/src/types.js`.
5. Annotate in this order:
   - `api/src/services/databaseService.js`
   - `api/src/utils/propertyMapper.js`
   - `api/src/services/*.js`
   - `api/src/middleware/*.js`
   - `api/src/routes/*.js`
6. Triage first-run type errors.
7. Exclude `api/__tests__/` initially unless the team chooses to include tests in a later
   tightening pass.

**Complexity**

Medium. The work touches important shared files, but the contracts are relatively concrete:
database rows, mapped domain objects, route params, request bodies, and service return
values.

**Expected payoff**

High. This phase catches the most expensive drift: DB shape, service shape, route contract,
and agent-generated backend mistakes.

### Future Drizzle-Aligned Typing Work

The current backend rollout should stay on the stable Drizzle line already in this branch:
`drizzle-orm@0.45.2`. Drizzle 1.0 is not part of the initial soft-typing deliverable.

After the JSDoc baseline is established, a separate follow-on proposal or deliverable
should evaluate Drizzle-specific typing improvements:

1. **Stable `0.45.x` cleanup with `getTableColumns`.**
   Drizzle `0.45.2` exposes `getTableColumns`, which can help build schema-derived
   select projections without duplicating column maps by hand. This may pair well with
   JSDoc typedefs because projections stay closer to `api/lib/db/schema.js`, but it
   should be adopted only where it preserves existing response shapes exactly.
2. **Drizzle 1.0 integration after stable release.**
   Once Drizzle 1.0 is stable, evaluate first-class validation-schema imports such as
   Drizzle-provided Zod/Valibot/TypeBox/ArkType helpers. These could reduce duplication
   between database schema, payload validation, and JSDoc typedefs, but they should not
   replace Fastify/AJV route validation without a dedicated API-validation design.
3. **Relational Queries Builder/version 2 evaluation.**
   Drizzle's RQB material refers to Relational Queries changes in the v1 beta/RC line,
   including centralized relation definitions through APIs such as `defineRelations`.
   That may eventually improve relation-query ergonomics, but it is a data-layer
   migration topic, not a prerequisite for JSDoc soft typing.

These items belong in future work because each one changes data-access patterns or
dependency posture. The soft-typing foundation should first make the current JavaScript
contracts explicit and checkable.

### Phase 2: Frontend Browser SPA Client

**Goal**: Type React hook returns, component props, and client-side domain objects.

**Why second**

- The frontend should consume the backend domain types once they are clarified.
- React components can create annotation volume quickly; a backend-first standard reduces
  churn.
- Browser and DOM APIs can produce noisy nullability checks that should not shape the
  entire proposal.

**Main work**

1. Add client check config:
   - `client/jsconfig.json`
   - `allowJs: true`
   - `checkJs: true`
   - `noEmit: true`
   - relaxed initial DOM nullability if needed
2. Add client scripts:
   - `npm run typecheck --workspace=client` or equivalent repo script.
   - CI step after the backend check is stable.
3. Add JSDoc linting to `client/eslint.config.js`.
4. Create shared client typedefs, likely `client/src/types.js`.
5. Annotate in this order:
   - `client/src/hooks/*.js`
   - mutation and API client utilities
   - graph and modal components
   - page-level components
6. Triage DOM and React-specific noise.
7. Tighten strictness later once the baseline is stable.

**Complexity**

Medium-high. The client has more files with prop bags, hook return objects, callbacks, and
DOM edge cases. The work is manageable if hooks and shared types come first.

**Expected payoff**

Medium-high. The biggest wins are safer hook contracts, clearer mutation flows, and better
component-callsite feedback.

## Standards and Constraints Analysis

- `system-architecture.md` already says the stack is JavaScript only and uses JSDoc for
  types. This proposal formalizes that direction.
- `coding-styles.md` requires Prettier, ESLint, camelCase JavaScript, and snake_case DB
  columns. Shared JSDoc typedefs make that boundary explicit.
- `data-architecture.md` says the database schema is the source of truth and all DB access
  goes through `databaseService`. Backend typedefs should be derived from that schema and
  the `propertyMapper` boundary, not invented independently.
- `coding-styles.md` keeps AJV / JSON Schema at the HTTP validation boundary. JSDoc should
  not duplicate request validation; it documents and checks the JavaScript logic layer.
- `testing.md` keeps API behavior verified with Vitest and PactumJS. Type checking is an
  additional static gate, not a replacement for integration tests.

## Proposed JSDoc Standard

Create `.zazz/standards/jsdoc-typing.md` and register it in `.zazz/standards/index.yaml`
early in Phase 1.

The standard should define:

- What must be annotated:
  - exported functions
  - service-layer functions
  - shared domain typedefs
  - React hooks
  - component prop bags
- What can rely on inference:
  - short private helpers
  - obvious local variables
  - implementation details with no useful boundary contract
- Where shared types live:
  - `api/src/types.js`
  - `client/src/types.js`
- How to import types:
  - use JSDoc `import(...)` references
  - do not redefine the same shape in many files
- How to handle exceptions:
  - prefer `// @ts-expect-error` for genuine one-line exceptions
  - avoid blanket `// @ts-nocheck`
  - temporary exclusions must have a follow-up plan

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| First typecheck produces too many errors. | Start with backend phase, high-value files, and explicit exclusions for tests or known noisy files. |
| JSDoc becomes verbose. | Annotate boundaries, exports, hooks, and shared shapes; let local implementation details rely on inference. |
| Types drift from runtime data. | Centralize typedefs and derive them from DB schema, JSON Schema, and `propertyMapper` behavior. |
| Client DOM checks create noise. | Begin with relaxed client nullability and tighten after the baseline is stable. |
| Contributors perceive this as TypeScript in disguise. | Keep all source as `.js` / `.jsx`, enforce `noEmit`, and document that TypeScript is only a checker. |
| CI gets slower. | Run JSDoc lint on staged files locally and full typecheck in CI; only add typed ESLint rules if they prove necessary. |
| Drizzle future work expands the first backend slice. | Keep Phase 1 on `drizzle-orm@0.45.2`; evaluate Drizzle 1.0, RQB v2, and schema-derived validators in separate follow-on work. |

## Decision Checklist

- Approve the hybrid enforcement model: JSDoc lint for form, `tsc --noEmit` for type
  correctness.
- Approve the two-phase rollout: backend/data first, frontend SPA second.
- Confirm test files are excluded from initial type checking.
- Confirm backend starts with `noImplicitAny: true`.
- Confirm client may start with relaxed DOM nullability.
- Confirm shared typedef files live at `api/src/types.js` and `client/src/types.js`.
- Approve a dedicated `.zazz/standards/jsdoc-typing.md` before broad annotation work.

## Open Questions

- Should typecheck run as one root command, separate workspace commands, or both?
- Should client and API type checks become required in the same PR, or should Phase 1 land
  first with only the API gate?
- Should typedefs be manually authored for v1, or should a future task generate starter
  typedefs from JSON Schema / OpenAPI?
- After Drizzle 1.0 is stable, should the team evaluate Drizzle-generated validation
  schemas and Relational Queries Builder/version 2 as a separate data-layer proposal?
- Are there specific files that should remain temporarily excluded during the first pass?

## Recommendation Summary

Proceed with the hybrid JSDoc soft-typing approach.

The proposal preserves the JavaScript workflow the project wants: edit `.js` / `.jsx`, run
it directly, and produce no build artifacts from type tooling. It also gives the repo a
real type-safety gate instead of relying on comments alone.

Backend/data should go first because it defines the core domain contracts and offers the
highest risk reduction. The frontend should follow as a second phase after the shared
typing standard and backend typedefs are stable.

## Next-Phase Handoff

**Sign-off outcome**: Draft, not yet approved.

If approved, hand off to `spec-builder` for two deliverable specs:

1. **Backend API and data-layer soft typing**
   - backend `jsconfig`
   - backend JSDoc lint rules
   - backend `typecheck` script and CI gate
   - `api/src/types.js`
   - service, mapper, middleware, and route annotations
2. **Frontend SPA soft typing**
   - client `jsconfig`
   - client JSDoc lint rules
   - client `typecheck` script and CI gate
   - `client/src/types.js`
   - hook, utility, component, and page annotations

The first spec should also include the new `.zazz/standards/jsdoc-typing.md` standard so
later annotation work follows one consistent rule set.

## Discussion Log / Notable Arguments

- Owner preference is clear: keep JavaScript source directly runnable and avoid a
  TypeScript migration.
- The key distinction is checker vs compiler. `tsc --noEmit` is acceptable only because it
  emits nothing and does not create a parallel runtime artifact.
- ESLint-only JSDoc was considered but is not enough because it checks comments, not type
  correctness.
- Backend-first sequencing is preferred because data and route contracts define the
  highest-value shared shapes.
- Drizzle 1.0 and RQB v2 are useful future investigation areas, but they should not
  complicate the first backend soft-typing deliverable.

## References

- TypeScript Handbook: Type Checking JavaScript Files
  https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html
- TypeScript Handbook: JSDoc Reference
  https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
- `eslint-plugin-jsdoc`
  https://github.com/gajus/eslint-plugin-jsdoc
- Webpack JSDoc + `checkJs` migration example
  https://github.com/webpack/webpack/pull/6862
- Drizzle ORM: latest releases
  https://orm.drizzle.team/docs/latest-releases
- Drizzle ORM: goodies / typed table columns
  https://orm.drizzle.team/docs/goodies
- Drizzle ORM: upgrading to v1 RC
  https://orm.drizzle.team/docs/upgrade-v1
- Drizzle ORM: Relational Queries v1 to v2
  https://orm.drizzle.team/docs/relations-v1-v2
