# Task Blaster API — Quick Commands

Start the API (from anywhere):

```
npm --prefix /Users/michael/Dev/task-blaster/task-graph-mvp/api run dev
```

Reseed the dev database to the known state (from anywhere):

```
npm --prefix /Users/michael/Dev/task-blaster/task-graph-mvp/api run db:reset
```

Alternatives using cd:

```
cd /Users/michael/Dev/task-blaster/task-graph-mvp/api && npm run dev
cd /Users/michael/Dev/task-blaster/task-graph-mvp/api && npm run db:reset
```

Defaults
- API base URL: http://localhost:3030
- Postgres (Docker): task_blaster_dev on host port 5433
