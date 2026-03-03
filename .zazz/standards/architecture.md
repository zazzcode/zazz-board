# Architecture

## Layers

- **API**: Fastify routes, JSON Schema validation, auth middleware
- **Services**: `databaseService` (Drizzle), `tokenService`
- **Client**: React, Vite, Mantine, react-router-dom

## Patterns

- Schema-first data design; see [data-architecture.md](./data-architecture.md)
- All DB access via `databaseService`; no direct DB access in routes
- Project → Deliverable → Task hierarchy
