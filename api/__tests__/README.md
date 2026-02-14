# API Integration Tests

This directory contains API integration tests for Task Blaster using **Vitest** and **PactumJS**.

## Quick Start

### Prerequisites
- Node.js 22+ and npm
- Docker Desktop running (PostgreSQL 15 container on port 5433)
- Database container running: `npm run docker:up:db` from project root
- Test database created and seeded (see Environment Setup below)
- `api/.env` configured with correct `DATABASE_URL_TEST` (see [AGENTS.md](../../AGENTS.md) for setup)

### Run Tests

```bash
# From api/ directory - MUST source .env first
set -a && source .env && set +a && NODE_ENV=test npm run test

# Or use npm scripts directly (after sourcing .env)
npm run test              # Run all tests once
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

### From Project Root
```bash
npm run test             # Runs tests via workspace
npm run test:watch      # Watch mode via workspace
```

## Environment Setup

### Database Strategy

Task Blaster uses **separate databases** for development and testing:

| Database | Purpose | Cleared by Tests? |
|----------|---------|------------------|
| `task_blaster_dev` | Developer's working database | No |
| `task_blaster_test` | Automated test suite | Yes (before each test) |

**Key Point**: Tests use `DATABASE_URL_TEST` (not `DATABASE_URL`) to ensure complete isolation from your development data.

### First-Time Setup

```bash
# 1. Create test database
docker exec task_blaster_postgres psql -U postgres -c "CREATE DATABASE task_blaster_test;"

# 2. Nuke and recreate schema + seed data (from api/ directory)
#    This uses drizzle-kit push --force to create tables from schema.js, then runs all seeders
DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_test npm run db:reset

# 3. Verify test database
docker exec task_blaster_postgres psql -U postgres -d task_blaster_test -c "\dt"
```

> **Note**: During this development phase there are no incremental migrations. `db:reset` drops everything and recreates from the Drizzle schema. See [AGENTS.md](../../AGENTS.md) for full details.

### Resetting Test Database

If tests fail or data becomes corrupted:

```bash
# Drop and recreate
docker exec task_blaster_postgres psql -U postgres -c "DROP DATABASE IF EXISTS task_blaster_test;"
docker exec task_blaster_postgres psql -U postgres -c "CREATE DATABASE task_blaster_test;"

# Recreate schema and seed (from api/ directory)
DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_test npm run db:reset
```

### Safety Mechanisms

Tests include **6 safety guards** to prevent accidental data deletion:

1. **NODE_ENV check** - Must be `test` for destructive operations
2. **DATABASE_URL_TEST validation** - Must point to `task_blaster_test` exactly
3. **Runtime DB query** - Confirms connection to correct database
4. **Startup validation** - Fails fast before running any tests
5. **Per-operation validation** - Checks in `clearTaskData()` before deletes
6. **Seed script guards** - Blocks seeding stage/prod databases

If any check fails, tests exit immediately with a clear error message.

## Test Setup

### Architecture

Tests use:
- **Vitest**: ESM-native test runner with Jest-compatible API (`describe`, `it`, `expect`, `beforeEach`, `afterAll`)
- **PactumJS**: HTTP API testing library with a chainable fluent DSL for building requests and asserting responses (see "PactumJS Usage" below)
- **pactum-supertest**: Bridge package that wires PactumJS to make real HTTP requests against a running server
- **Fastify**: The actual API server, started on `127.0.0.1:3031` during tests (same code as production, just on a different port)
- **Docker PostgreSQL**: Real Postgres 15 database for true integration testing (port 5433)
- **Separate test database**: `task_blaster_test` (completely isolated from dev)

### Setup Flow

1. **Vitest Setup** (`setup.pactum.mjs`) — runs once before all test files
   - Validates environment (NODE_ENV, DATABASE_URL_TEST, runtime DB name check)
   - Creates Fastify app instance via `createTestServer()`
   - Starts HTTP listener on `127.0.0.1:3031`
   - Sets PactumJS base URL to `http://127.0.0.1:3031`
   - Initializes token service cache with seeded users

2. **Per-Test Cleanup** (`beforeEach` in each test file)
   - Calls `clearTaskData()` which deletes all rows from `TASK_TAGS` and `TASKS`
   - Ensures test isolation — each test starts with a clean task slate
   - Seeded `PROJECTS`, `USERS`, `TAGS`, `STATUS_DEFINITIONS`, and `COORDINATION_REQUIREMENT_DEFINITIONS` remain for speed

3. **Teardown** (`afterAll` in `setup.pactum.mjs`)
   - Closes Fastify HTTP listener and DB connections

## Test Helpers

### `helpers/testServer.js`
Server setup and management:
- `createTestServer()` - Create Fastify app without listening
- `getTestToken()` - Get seeded test user token (Michael's UUID)

**Token**: `550e8400-e29b-41d4-a716-446655440000` (seeded in database)

### `helpers/testDatabase.js`
Database utilities for test data:
- `clearTaskData()` - Delete all TASKS and TASK_TAGS (run before each test)
- `createTestTask(projectId, overrides)` - Create a test task with optional field overrides
- `getTaskById(id)` - Query task by ID for assertions
- `getTasksByStatus(projectId, status)` - Query tasks by status

**Example**:
```javascript
// Create a task in TO_DO status
const task = await createTestTask(1, { status: 'TO_DO', title: 'Fix bug' });

// Verify it was created
expect(task.status).toBe('TO_DO');
expect(task.title).toBe('Fix bug');
```

## PactumJS Usage

PactumJS is the HTTP API testing library used in this project. It provides a chainable fluent DSL for constructing HTTP requests and asserting responses. Every test uses `spec()` as its entry point.

**Docs**: https://pactumjs.github.io

### How it works

1. Import `spec` from pactum
2. Chain an HTTP method (`.get()`, `.post()`, `.put()`, `.patch()`, `.delete()`)
3. Chain request builders (`.withHeaders()`, `.withJson()`, `.withQueryParams()`, etc.)
4. Chain response assertions (`.expectStatus()`, `.expectJsonLike()`, `.expectJsonSchema()`, etc.)
5. `await` the entire chain — PactumJS sends the real HTTP request and validates the response

```javascript
import { spec } from 'pactum';

// Every spec() call is a complete HTTP request → response → assertion cycle
await spec()
  .get('/projects')                          // HTTP method + path
  .withHeaders('TB_TOKEN', VALID_TOKEN)      // Add request headers
  .expectStatus(200)                         // Assert HTTP status
  .expectJsonLike([{ code: 'WEBRED' }]);     // Assert response body (partial match)
```

### Request Builders

```javascript
// GET with query params
await spec().get('/tasks').withQueryParams({ projectId: 1, status: 'TO_DO' })

// POST with JSON body
await spec().post('/tasks').withHeaders('TB_TOKEN', TOKEN).withJson({ title: 'New task', projectId: 1 })

// PUT with JSON body
await spec().put('/tasks/1').withHeaders('TB_TOKEN', TOKEN).withJson({ title: 'Updated title' })

// PATCH with JSON body
await spec().patch('/tasks/1/status').withHeaders('TB_TOKEN', TOKEN).withJson({ status: 'DONE' })

// DELETE
await spec().delete('/tasks/1').withHeaders('TB_TOKEN', TOKEN)
```

### Response Assertions

```javascript
await spec()
  .get('/endpoint')
  .expectStatus(200)                           // HTTP status code
  .expectJson({ key: 'value' })               // Exact full JSON match
  .expectJsonLike({ partial: 'match' })       // Partial match (ignores extra fields)
  .expectJsonSchema({                         // JSON Schema validation
    type: 'object',
    required: ['id', 'title'],
    properties: {
      id: { type: 'number' },
      title: { type: 'string' }
    }
  })
  .expectHeaderContains('content-type', 'application/json');
```

**Key distinction**: `.expectJson()` requires an exact match. `.expectJsonLike()` allows partial matching (the response can have extra fields). **Use `.expectJsonLike()` in most tests** since API responses often include timestamps and other dynamic fields.

### Storing Response Values

You can capture response values for later assertions using `returns()`:
```javascript
const taskId = await spec()
  .post('/tasks')
  .withHeaders('TB_TOKEN', TOKEN)
  .withJson({ title: 'New task', projectId: 1 })
  .expectStatus(201)
  .returns('id');  // Extract 'id' from response body

// Use captured value in next request
await spec()
  .get(`/tasks/${taskId}`)
  .withHeaders('TB_TOKEN', TOKEN)
  .expectStatus(200);
```

### Authentication

All routes in this API require the `TB_TOKEN` header:
```javascript
const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

await spec()
  .patch('/tasks/1/status')
  .withHeaders('TB_TOKEN', VALID_TOKEN)
  .withJson({ status: 'IN_PROGRESS' })
  .expectStatus(200);
```

Missing or invalid token returns `401 Unauthorized`.

### Testing Error Responses

```javascript
// 401 — no token
await spec().get('/tasks').expectStatus(401);

// 404 — not found
await spec().get('/tasks/99999').withHeaders('TB_TOKEN', TOKEN).expectStatus(404)
  .expectJsonLike({ error: 'Task not found' });

// 400 — validation error
await spec().post('/tasks').withHeaders('TB_TOKEN', TOKEN)
  .withJson({ title: '' })  // invalid
  .expectStatus(400);
```

## Writing Tests

### Basic Test Structure

Every test file follows this pattern:

```javascript
import { spec } from 'pactum';
import { createTestTask, getTaskById, clearTaskData } from '../helpers/testDatabase.js';

const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

describe('PATCH /tasks/:id/status', () => {
  // Clear task data before each test for isolation
  beforeEach(async () => {
    await clearTaskData();
  });

  it('should change task status', async () => {
    // 1. Setup: Create test data directly in DB via helpers
    const task = await createTestTask(1, { status: 'TO_DO' });

    // 2. Act: Make HTTP request via PactumJS spec()
    await spec()
      .patch(`/tasks/${task.id}/status`)
      .withHeaders('TB_TOKEN', VALID_TOKEN)
      .withJson({ status: 'IN_PROGRESS' })
      .expectStatus(200)
      .expectJsonLike({ id: task.id, status: 'IN_PROGRESS' });

    // 3. Assert: Optionally verify side effects in DB
    const updated = await getTaskById(task.id);
    expect(updated.status).toBe('IN_PROGRESS');
  });
});
```

**Pattern**: Setup data with DB helpers → Make HTTP request with `spec()` → Assert response inline → Optionally verify DB state with Vitest `expect()`.

## Current Test Coverage

**File**: `routes/tasks.status.test.mjs`

Tests for `PATCH /tasks/:id/status` endpoint:

### Authentication (3 tests)
- ✅ Requires authentication (401 without token)
- ✅ Rejects invalid token (401)
- ✅ Accepts valid token in header

### Validation (3 tests)
- ✅ Returns 404 for non-existent task
- ✅ Returns 400 for invalid status value
- ✅ Requires status in request body

### Status Changes (3 tests)
- ✅ Changes TO_DO → IN_PROGRESS
- ✅ Changes IN_PROGRESS → DONE
- ✅ Changes TO_DO → REVIEW

### Position Calculation (3 tests)
- ✅ Places task at bottom of empty column
- ✅ Places task at bottom of non-empty column
- ✅ Maintains correct position across multiple moves

### Data Integrity (3 tests)
- ✅ Preserves other task fields (title, priority, assignee, etc.)
- ✅ Updates `updatedAt` timestamp
- ✅ Returns complete task object

**Total**: 15 tests, all passing ✅

## Database & Seeded Data

### Test Database
- Real PostgreSQL 15 instance in Docker
- Uses existing database from `npm run docker:up:db`
- Connection: `localhost:5433` (see `api/.env`)

### Seeded Data
- **5 projects** (WEBRED, MOBDEV, APIMOD, DATAMIG, SECURE) — Project 1 (WEBRED) commonly used in tests
- **5 users** — User 1 is Michael (token: `550e8400-e29b-41d4-a716-446655440000`)
- **5 coordination requirement definitions**, **8 status definitions**, **10 tags**
- **6 task relations** in APIMOD project (DEPENDS_ON + COORDINATES_WITH)
- Seeded via `api/scripts/seeders/` during `db:reset`

### Test Isolation
Tests clear task data before each run but **reuse seeded projects and users** for speed:
```javascript
beforeEach(async () => {
  await clearTaskData();  // Remove only task data
  // Projects and users remain for faster test setup
});
```

## Troubleshooting

### Tests fail with "DATABASE_URL_TEST not set"
You forgot to source the `.env` file:
```bash
set -a && source .env && set +a && NODE_ENV=test npm run test
```

### Tests fail with "SAFETY CHECK FAILED"
The test database isn't set up correctly:
1. Check `DATABASE_URL_TEST` points to `task_blaster_test` in `api/.env`
2. Create test database: `docker exec task_blaster_postgres psql -U postgres -c "CREATE DATABASE task_blaster_test;"`
3. Run migrations and seed (see Environment Setup above)

### Tests fail with "Task not found"
Ensure database container is running: `npm run docker:up:db`

### Port 3031 already in use
Another process is listening on port 3031. Either:
- Kill the process: `lsof -ti:3031 | xargs kill -9`
- Change port in `setup.pactum.mjs` (line 6)

### Token cache initialization fails
Database connection issue. Verify:
- Docker container is running: `docker ps | grep postgres`
- Database URL in `api/.env` is correct
- Seeded users exist: `psql -c "SELECT id, full_name FROM users;"`

### Tests hang or timeout
Increase timeout in `vitest.config.mjs` (line 9): `testTimeout: 20000`

## Environment Configuration

**File**: `api/.env`

Required variables:
```bash
# Developer's working database (not touched by tests)
DATABASE_URL=postgres://postgres:password@localhost:5433/task_blaster_dev

# Test database (used ONLY when NODE_ENV=test)
# Cleared and re-seeded by tests - do not use for manual work
DATABASE_URL_TEST=postgres://postgres:password@localhost:5433/task_blaster_test
```

**How it works**:
- Tests set `NODE_ENV=test` which triggers use of `DATABASE_URL_TEST`
- Your dev database (`DATABASE_URL`) is never touched by tests
- You must source the `.env` file before running tests: `set -a && source .env && set +a`

**File**: `api/vitest.config.mjs`

Test configuration:
- Test pattern: `__tests__/**/*.test.{js,mjs}`
- Setup files: `__tests__/setup.pactum.mjs`
- Timeout: 20 seconds per test
- Environment: Node.js

## Adding New Tests

### 1. Create test file
```bash
touch api/__tests__/routes/NEW_ENDPOINT.test.mjs
```

### 2. Structure
- Import helpers: `testDatabase`, `spec` from pactum
- Use `beforeEach` to clear data
- Write describe/it blocks with PactumJS specs

### 3. Example
```javascript
import { spec } from 'pactum';
import { clearTaskData, createTestTask } from '../helpers/testDatabase.js';

describe('GET /tasks/:id', () => {
  beforeEach(async () => {
    await clearTaskData();
  });

  it('should return task by id', async () => {
    const task = await createTestTask(1);
    await spec()
      .get(`/tasks/${task.id}`)
      .withHeaders('TB_TOKEN', '550e8400-e29b-41d4-a716-446655440000')
      .expectStatus(200)
      .expectJsonLike({ id: task.id });
  });
});
```

### 4. Run tests
```bash
npm run test:watch
# Tests auto-run when files change
```

## CI/CD Integration

Tests are designed to work in GitHub Actions with Docker services:

```yaml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_DB: task_blaster
      POSTGRES_PASSWORD: password
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5433:5432
```

Future phases will add:
- In-memory database option for speed
- Matrix testing (Vitest with/without HTTP mode)
- Coverage reporting

## Performance

Current baseline (15 tests):
- **Setup**: ~290ms (token init, Fastify startup)
- **Tests**: ~230ms
- **Total**: ~580ms

Benchmarks:
- Per-test average: ~15ms
- Database operations: <5ms per operation
- Network I/O: ~10-20ms per request

## Resources

- [Vitest Documentation](https://vitest.dev)
- [PactumJS Documentation](https://pactumjs.github.io)
- [Fastify Testing](https://www.fastify.io/docs/latest/Guides/Testing/)
- [Task Blaster API Routes](../src/routes/)

## Future Enhancements

### Phase 2: Pactum-Fastify Adapter
Remove port binding by implementing PactumJS core adapter:
- `app.inject()` integration
- No port required
- ~20-30% faster tests
- See `add-vitest-pactumjs-API-tests.md` for details

### Phase 3: In-Memory Database
- SQLite for local tests
- Faster setup/teardown
- Optional Docker for CI/CD

### Phase 4: Expanded Coverage
- All CRUD endpoints
- Projects, tags, users
- Error handling & edge cases
- Performance/load tests
