# System Architecture

## Stack: JavaScript only (no TypeScript)

Full-stack JavaScript. Use `.js` / `.mjs` and JSDoc for types.

**Backend** (api/): Fastify, Drizzle ORM, Pino (logging), JSON Schema + AJV (validation), postgres driver

**Frontend** (client/): React, Vite, Mantine (UI), @xyflow/react (task graph), react-router-dom, @dnd-kit (drag-and-drop), react-i18next, @uiw/react-md-editor

## Layers

- **API**: Fastify routes, JSON Schema validation, auth middleware
- **Services**: `databaseService` (Drizzle), `tokenService`
- **Client**: React, Vite, Mantine, react-router-dom

## Patterns

- Data model: see [data-architecture.md](./data-architecture.md)
- All DB access via `databaseService`; no direct DB access in routes
- Project → Deliverable → Task hierarchy

## Optional cloud deployment

For production deployments, task images can be stored in object storage instead of the database:

- **AWS**: S3 — upload images to a bucket; store metadata and object keys in the DB
- **GCP**: Cloud Storage — same pattern; store metadata and `gs://` URLs or object names in the DB

Configuration (e.g. `STORAGE_BACKEND=s3` or `STORAGE_BACKEND=gcs`) routes the image service to the correct backend. *This functionality is in work.*
