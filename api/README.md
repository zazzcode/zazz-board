# Task Blaster API

This document covers quick commands for API development.

## Database Setup (First Time)

**Prerequisites**: Docker must be running.

1. **Start PostgreSQL container** (from project root):
   ```bash
   npm run docker:up:db
   ```

2. **Create the dev database** (run once):
   ```bash
   docker exec task_blaster_postgres psql -U postgres -c "CREATE DATABASE task_blaster_dev;"
   ```

3. **Reset and seed the database** (from `api/` directory):
   ```bash
   npm run db:reset
   ```
   This drops all tables, recreates the schema from Drizzle ORM, and seeds initial data.

## Quick Commands

### Start the API

From project root:
```bash
npm run dev:api
```

Or from `api/` directory:
```bash
npm run dev
```

Or with Node watch flag:
```bash
node --watch src/server.js
```

### Reset and Seed Database

From `api/` directory:
```bash
npm run db:reset
```

What `db:reset` does:
1. Drops all tables (IMAGE_DATA, TASK_RELATIONS, TASKS, PROJECTS, USERS, etc.)
2. Drops custom enum types
3. Runs `drizzle-kit push --force` to recreate schema from `lib/db/schema.js`
4. Seeds all data (users → tags → status definitions → projects → deliverables → tasks → task relations)

### Seed Data Only (Without Reset)

If tables already exist and you just want to reseed:
```bash
cd api && npm run db:seed
```

### Check Database State

```bash
# List all tables
docker exec task_blaster_postgres psql -U postgres -d task_blaster_dev -c "\dt"

# Count rows in key tables
docker exec task_blaster_postgres psql -U postgres -d task_blaster_dev -c \
  "SELECT 'USERS' as table_name, count(*) FROM \"USERS\" \
   UNION ALL SELECT 'PROJECTS', count(*) FROM \"PROJECTS\" \
   UNION ALL SELECT 'TASKS', count(*) FROM \"TASKS\" \
   UNION ALL SELECT 'TASK_RELATIONS', count(*) FROM \"TASK_RELATIONS\";"
```

## Configuration

- **API base URL**: http://localhost:3030
- **PostgreSQL (Docker)**: `task_blaster_postgres` container
  - Host: localhost:5433 (container port 5432)
  - Username: postgres
  - Password: password (from docker-compose)
  - Dev database: `task_blaster_dev`
  - Test database: `task_blaster_test`

## Environment

API reads from `api/.env`:
- `DATABASE_URL` — Connection string for dev database
- `DATABASE_URL_TEST` — Connection string for test database (used when `NODE_ENV=test`)
- `NODE_ENV` — Set to `development` (or `test` when running tests)
- `PORT` — Default 3030

## Troubleshooting

**Database doesn't exist:**
```bash
docker exec task_blaster_postgres psql -U postgres -c "CREATE DATABASE task_blaster_dev;"
cd api && npm run db:reset
```

**Drizzle-kit errors with "please install drizzle-orm":**
```bash
ln -sf ./api/node_modules/drizzle-orm ./node_modules/drizzle-orm
```

**Connection refused:**
- Check Docker is running: `docker ps | grep task_blaster_postgres`
- Check `.env` DATABASE_URL points to localhost:5433

**Port already in use:**
```bash
lsof -ti:3030 | xargs kill -9
```
