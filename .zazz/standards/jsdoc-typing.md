---
last_updated_at: 2026-06-19
status: active
---

# JSDoc typing

## Scope

This standard governs soft typing for JavaScript source in `api/` and future JavaScript
typing work in `client/`. Runtime source MUST remain `.js`, `.mjs`, or `.jsx`; TypeScript
MUST be used only as a checker with `noEmit` ([system-architecture.md](./system-architecture.md#stack-javascript-only-no-typescript)).

## Check-only tooling

Type tooling MUST NOT emit JavaScript, declaration files, source maps, build directories,
or generated runtime artifacts. Backend typecheck configuration MUST use `allowJs`,
`checkJs`, and `noEmit`. The `typescript` package MAY exist only as a development
dependency for `tsc --noEmit`.

JSDoc linting SHOULD enforce annotation form on boundary files. It MUST NOT require noisy
annotations on every private helper or local variable before the boundary contracts are
typed.

## Annotation boundaries

Exported functions, service methods, middleware functions, route handler request and
reply contracts, shared domain typedefs, React hooks, and component prop bags MUST be
annotated when those surfaces are in scope for a typing change. Short private helpers and
obvious local variables SHOULD rely on inference unless an annotation clarifies a real
contract.

JSDoc MUST describe runtime truth. Code MUST NOT change API behavior, DB shape, auth
semantics, or realtime payloads only to satisfy the checker.

### Desired ✅

```javascript
/**
 * @param {import('./types.js').ProjectCreateInput} projectData
 * @returns {Promise<import('./types.js').Project>}
 */
async function createProject(projectData) {
  return dbService.createProject(projectData);
}
```

## Shared typedef placement

Shared backend typedefs MUST live in `api/src/types.js`. Future shared client typedefs
MUST live in `client/src/types.js`. A file MAY define a local typedef only when the shape
is private to that file and does not represent a domain entity, route payload, service
contract, auth context, or realtime event payload.

Domain typedefs MUST be derived from `api/lib/db/schema.js`, route JSON Schemas,
`api/src/utils/propertyMapper.js`, and existing API response contracts. The same entity
shape MUST NOT be redefined independently in multiple files
([data-layer.md](./data-layer.md#schema-source-of-truth)).

## Import style

Type references SHOULD use inline JSDoc `import(...)` expressions or top-of-file
`@typedef` aliases. Type imports MUST NOT create runtime imports solely for types.

### Desired ✅

```javascript
/** @typedef {import('../types.js').Task} Task */
```

## Suppressions and exclusions

Use `// @ts-expect-error` only for a narrow, intentional checker mismatch. The comment
MUST sit on the line immediately before the expression and MUST state why the runtime
contract is still valid.

`// @ts-nocheck` is forbidden in authored source unless the owner approves a temporary
file-level exclusion with a follow-up plan. Type errors MUST NOT be suppressed by widening
shared typedefs to `Object`, `*`, or `any` when the real contract is known.

## Review evidence

PRs that add or change JSDoc typing MUST include the relevant `typecheck` command and any
lint command that enforces JSDoc form. Backend service/data typing MUST also include the
behavioral test evidence required by [data-layer.md](./data-layer.md#review-evidence) and
[service-layer.md](./service-layer.md#review-evidence).

## Halt conditions

Agents MUST stop and ask for direction when typecheck requires a runtime behavior change,
a broad file-level `@ts-nocheck`, generated type artifacts, typed ESLint adoption, or a
migration from JavaScript source to TypeScript source.

## Related standards

- [system-architecture.md](./system-architecture.md) - JavaScript-only stack.
- [data-layer.md](./data-layer.md) - schema-derived data contracts.
- [service-layer.md](./service-layer.md) - service, auth, and realtime contracts.
- [http-layer.md](./http-layer.md) - route validation and handler boundaries.
- [testing.md](./testing.md) - backend command evidence.
