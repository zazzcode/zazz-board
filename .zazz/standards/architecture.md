# Architecture

## Layers

- **API**: Fastify routes, JSON Schema validation, auth middleware
- **Services**: `databaseService` (Drizzle), `tokenService`
- **Client**: React, Vite, Mantine, react-router-dom

## Patterns

- Schema-first DB (Drizzle schema in `api/lib/db/schema.js`); no migrations in this phase—`npm run db:reset` drops and recreates
- All DB access via `databaseService`; no direct DB access in routes
- Project → Deliverable → Task hierarchy
