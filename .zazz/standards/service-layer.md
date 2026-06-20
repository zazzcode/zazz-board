---
last_updated_at: 2026-06-19
status: active
---

# Service layer

## Scope

This standard governs backend services under `api/src/services/`, auth context attached
by `api/src/middleware/authMiddleware.js`, service-to-route contracts, data marshalling,
and realtime/SSE service boundaries.

## Service boundaries

Fastify routes MUST call services for business operations instead of reaching into data,
token, filesystem, or realtime internals directly. `databaseService` owns Drizzle access,
`tokenService` owns token lookup and token-project cache state, and `realtimeService`
owns project-scoped SSE subscribers ([system-architecture.md](./system-architecture.md#layers);
[data-layer.md](./data-layer.md#database-access-boundary)).

Services SHOULD expose domain-oriented methods such as `getProjectByCode`,
`createDeliverable`, `updateTask`, or `publish`. Routes SHOULD translate HTTP params,
bodies, and reply codes around those methods; they MUST NOT duplicate service internals.

### Desired ✅

```javascript
const project = await dbService.getProjectByCode(code);
publishEvent(project.code, { type: 'task', eventType: 'task.updated' });
```

## Marshalling contracts

Services that return API-facing data MUST return camelCase JavaScript objects. Services
that accept route payloads SHOULD accept camelCase input and translate to DB snake_case at
the data boundary ([data-layer.md](./data-layer.md#field-mapping-and-aliases)).

Service methods that return one optional entity MUST return the entity or `null`, not
`undefined`, when the resource is absent. Methods that enforce business rules MAY throw
`Error` objects for the route handler to map to HTTP status codes
([coding-styles.md](./coding-styles.md#business-error-mapping)).

## Auth context

`authMiddleware` MUST attach stable user context fields to the Fastify request before
protected handlers run: `request.user`, `request.tokenType`, and agent-token fields when
the token type is `agent`. Agent tokens MUST be restricted to their project context before
the handler performs the operation.

Routes SHOULD treat auth context as already validated by middleware. A route MAY still
perform resource ownership checks when the route's business rule requires verifying that a
resource belongs to the project named in the URL
([coding-styles.md](./coding-styles.md#project-scoped-handler-pattern)).

## Realtime boundaries

Realtime publication MUST flow through `realtimeService.publish(projectCode, payload)`.
SSE subscription management MUST stay inside the realtime service except for the route
code that wires Fastify's raw response stream to a subscriber. Event payloads SHOULD be
lightweight, project-scoped, and named with a stable `eventType` when clients distinguish
event kinds (`api/src/services/realtimeService.js`; `api/src/routes/projects.js`).

Broken subscribers MUST be removed without failing the whole broadcast. Heartbeats and
connection cleanup SHOULD be handled by the route that owns the raw HTTP stream.

## JSDoc service contracts

Exported service methods, middleware functions, and realtime subscriber payloads MUST have
JSDoc when their input or return shape is not obvious from a local literal. Shared domain
and service typedefs MUST be imported from central type files instead of redefined in each
service ([jsdoc-typing.md](./jsdoc-typing.md)).

## Review evidence

PRs that change service behavior MUST include the API tests, route tests, typecheck, or
manual evidence that proves route response shape, auth behavior, and realtime event names
did not drift. Data-service changes also inherit the evidence requirements in
[data-layer.md](./data-layer.md#review-evidence).

## Halt conditions

Agents MUST stop and ask for direction when a service change requires a route response
shape change, weakens agent-token project scoping, moves DB access out of
`databaseService`, or changes realtime event semantics outside the requested scope.

## Related standards

- [data-layer.md](./data-layer.md) - Drizzle access, schema, and mapping rules.
- [http-layer.md](./http-layer.md) - route schemas and handler boundaries.
- [jsdoc-typing.md](./jsdoc-typing.md) - annotation placement and typecheck rules.
- [coding-styles.md](./coding-styles.md) - API validation and business error mapping.
- [testing.md](./testing.md) - backend verification commands.
