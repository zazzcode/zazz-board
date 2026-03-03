# Contributor setup
This guide is for developers/committers working on the codebase locally.
## Prerequisites
- Node.js 22+
- Docker Desktop or Colima
## 1) Install local dependencies
From repo root:
```bash
npm install
npm install --workspace=api
cd client && npm install --legacy-peer-deps && cd ..
cp api/.env.example api/.env
```
## 2) Run app stack
```bash
docker compose up --build
```
Local URLs:
- API: `http://localhost:3030`
- Client: `http://localhost:3001`
## 3) Run tests (API)
From `api/`:
```bash
set -a && source .env && set +a && NODE_ENV=test npm run test
```
## 4) Common DB commands
From repo root:
```bash
npm run db:reset
npm run db:seed
npm run db:migrate
```
## 5) Reset local Docker DB (destructive)
```bash
docker compose down -v
docker compose up --build
```
## Notes
- Default DB password is `password`.
- If dependencies in `client/` fail due peer resolution, re-run with `--legacy-peer-deps`.
