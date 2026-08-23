# System Architecture

## Stack: JavaScript only (no TypeScript)

- **Runtime**: Node.js 24 LTS (`v24.18.0`)
- Full-stack JavaScript (ESM). Use `.js` / `.mjs` and JSDoc for types

**Backend** (api/): Fastify, Drizzle ORM, Pino (logging), JSON Schema + AJV (validation), postgres driver (PostgreSQL 15 — local Docker or Neon)

**Frontend** (client/): React, Vite, Mantine (UI), @xyflow/react (task graph), react-router-dom, @dnd-kit (drag-and-drop), react-i18next, @uiw/react-md-editor

## Layers

- **API**: Fastify routes, JSON Schema validation (see [coding-styles.md](./coding-styles.md#api-validation-separate-from-business-logic)), auth middleware
- **Services**: `databaseService` (Drizzle), `tokenService`
- **Client**: React, Vite, Mantine, react-router-dom

## Patterns

- Data model: see [data-architecture.md](./data-architecture.md)
- All DB access via `databaseService`; no direct DB access in routes
- Project → Deliverable → Task hierarchy

## Database and attachment storage backends

The app runs unchanged on either backend, selected purely by environment configuration:

- **Local (default)**: PostgreSQL 15 in Docker (port 5433); attachments stored as base64 in the `IMAGE_DATA` table.
- **Neon**: Neon serverless Postgres under the same Drizzle schema (pooled endpoint for runtime, direct endpoint for DDL — see `api/lib/db/connectionOptions.js`), plus Neon Object Storage (S3-compatible, private bucket) for attachments: object bytes in the bucket, with the object key and storage backend recorded per row in `IMAGE_METADATA` (reads dispatch per row by `storage_type`). Setup: [neon-setup.md](../docs/neon-setup.md).

`STORAGE_BACKEND=local|neon` routes the attachment service to the correct backend; `neon` fails fast at startup when the storage environment is incomplete. `s3` (AWS) and `gcs` (GCP) are reserved values for future providers — the pattern is identical: metadata and object keys in the DB, bytes in object storage.
