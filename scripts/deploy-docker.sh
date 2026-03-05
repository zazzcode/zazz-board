#!/usr/bin/env bash
# Deploy this worktree to Docker Desktop.
# Stops existing zazz-board containers, rebuilds from this repo, starts the stack.
# DB data persists in zazz_board_postgres_data volume.

set -e
cd "$(dirname "$0")/.."

echo "Stopping and removing existing zazz-board containers..."
docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true
# Remove by name in case they were started from a different compose project
for c in zazz_board_postgres zazz_board_api zazz_board_client; do
  docker rm -f "$c" 2>/dev/null || true
done

echo "Building images (API + client)..."
docker compose build --no-cache api client

echo "Starting stack..."
docker compose up -d

echo ""
echo "Deployed. API: http://localhost:3030  Client: http://localhost:3001"
echo "Logs: npm run docker:logs"
