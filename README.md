# Task Blaster

A Kanban-style orchestration management application for coordinating AI agents and human users in software projects.

**Stack**: Fastify API (JavaScript) + React client (JavaScript) + PostgreSQL 15 + Drizzle ORM + Docker Compose

## Quick Start

### Prerequisites
- Node.js 22+ and npm
- Docker Desktop running (PostgreSQL 15 runs in a container on port 5433)

### Initial Setup

1. **Install dependencies**
   ```bash
   # From project root
   npm install
   npm install --workspace=api
   cd client && npm install && cd ..
   ```

2. **Configure environment**
   ```bash
   cp api/.env.example api/.env
   # Edit api/.env: replace 'your_secure_password' with 'password' in both DATABASE_URL lines
   ```

3. **Start PostgreSQL**
   ```bash
   npm run docker:up:db
   ```

4. **Create and seed the database** (nuke-and-recreate workflow — no migrations in this phase)
   ```bash
   cd api && npm run db:reset && cd ..
   ```

### Running the Application

**Option 1: Run both API and client together (recommended)**
```bash
npm run dev
```

**Option 2: Run API and client in separate terminals**

Terminal 1 - API Server (port 3030):
```bash
npm run dev:api
```

Terminal 2 - Client (port 3001):
```bash
npm run dev:client
```

**Access the application:**
- Client: http://localhost:3001
- API: http://localhost:3030

### Database Operations

```bash
# From the api/ directory:
npm run db:reset     # Drop all tables, recreate from schema, seed fresh data
npm run db:seed      # Seed data only (tables must already exist)
```

### Running Tests

```bash
# From the api/ directory — must source .env first
set -a && source .env && set +a && NODE_ENV=test npm run test
```

See [api/__tests__/README.md](./api/__tests__/README.md) for full test setup, writing tests, and troubleshooting.

## Common Issues

**Port already in use:**
```bash
lsof -ti:3030 | xargs kill -9   # API
lsof -ti:3001 | xargs kill -9   # Client
```

**`drizzle-kit push` errors with "please install drizzle-orm":**
```bash
# npm workspace issue — create symlink from project root:
ln -sf ./api/node_modules/drizzle-orm ./node_modules/drizzle-orm
```

**Missing dependencies:**
```bash
npm install                    # Root dependencies
npm install --workspace=api    # API dependencies
cd client && npm install       # Client dependencies
```

## Documentation

- **[AGENTS.md](./AGENTS.md)** — Detailed step-by-step playbook for DB reset, running tests, running the app, and troubleshooting. **Start here if you're an agent or new developer.**
- **[api/__tests__/README.md](./api/__tests__/README.md)** — Test framework guide: Vitest + PactumJS usage and API, helpers, writing tests, and CI/CD.
