# Zazz Board API

Quick commands for API development. Values match `docker-compose.yml` at project root.

## Docker Compose reference

| Service  | Container           | Host port | DB / URL                    |
|----------|---------------------|-----------|-----------------------------|
| postgres | zazz_board_postgres | 5433      | `zazz_board_db`             |
| api      | zazz_board_api      | 3030      | http://localhost:3030       |

## Database setup (first time)

**Prerequisites**: Docker must be running.

1. **Start PostgreSQL** (from project root):
   ```bash
   npm run docker:up:db
   ```

2. **Reset and seed** (from `api/` or project root):
   ```bash
   npm run db:reset
   ```
   Drops all tables, recreates schema from `lib/db/schema.js`, seeds data.

## Quick commands

### Start the API

From project root:
```bash
npm run dev:api
```

From `api/`:
```bash
npm run dev
```

### Reset and seed database

```bash
cd api && npm run db:reset
```

### Seed only (tables must exist)

```bash
cd api && npm run db:seed
```

### Check database state

```bash
docker compose exec postgres psql -U postgres -d zazz_board_db -c "\dt"

docker compose exec postgres psql -U postgres -d zazz_board_db -c \
  "SELECT 'USERS' as tbl, count(*) FROM \"USERS\" \
   UNION ALL SELECT 'PROJECTS', count(*) FROM \"PROJECTS\" \
   UNION ALL SELECT 'TASKS', count(*) FROM \"TASKS\";"
```

## Configuration

- **API**: http://localhost:3030
- **Postgres** (from host): localhost:5433, database `zazz_board_db`
- **api/.env**: `DATABASE_URL=postgres://postgres:password@localhost:5433/zazz_board_db`

## Environment

- `DATABASE_URL` — Dev database (see `api/.env.example`)
- `DATABASE_URL_TEST` — Test database (`zazz_board_test`) when `NODE_ENV=test`
- `PORT` — 3030

## Troubleshooting

**Database doesn't exist:**
```bash
docker compose exec postgres psql -U postgres -c "CREATE DATABASE zazz_board_db;" 2>/dev/null || true
cd api && npm run db:reset
```

**drizzle-kit "please install drizzle-orm":**
```bash
ln -sf ./api/node_modules/drizzle-orm ./node_modules/drizzle-orm
```

**Connection refused:**
- `docker ps | grep zazz_board_postgres`
- `DATABASE_URL` in `api/.env` must use `localhost:5433`

**Port in use:**
```bash
lsof -ti:3030 | xargs kill -9
```
