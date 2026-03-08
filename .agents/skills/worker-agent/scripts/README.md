# zazzctl Setup (Worker Skill)

This directory contains the canonical worker adapter:
- `zazzctl`

Use this script as the standard board API adapter for worker agents across projects and worktrees.

## Requirements
- POSIX shell (`/bin/sh`)
- `curl`
- `jq`
- network access to Zazz Board API

## Environment
Set these variables before use:

```bash
export ZAZZ_API_BASE_URL="http://localhost:3030"
export ZAZZ_API_TOKEN="${ZAZZ_API_TOKEN:-550e8400-e29b-41d4-a716-446655440000}"
export ZAZZ_PROJECT_CODE="ZAZZ"
# Optional: pretty JSON output (1 default, 0 compact)
export ZAZZCTL_PRETTY=1
```

## Install Patterns

### Same repo (recommended)
Use the checked-in script directly:

```bash
./.agents/skills/worker-agent/scripts/zazzctl help now
```

### Convenience wrapper in repo root
Optional wrapper file at `scripts/zazzctl` can delegate to this script.

### Other project/worktree
Copy only this script into your target repo, then make it executable:

```bash
cp /path/to/source/.agents/skills/worker-agent/scripts/zazzctl ./scripts/zazzctl
chmod +x ./scripts/zazzctl
```

## Worker Protocol Commands

Claim task + lock files:

```bash
./scripts/zazzctl exec begin \
  --deliverable-id 8 \
  --task-id 25 \
  --agent-name worker-1 \
  --file api/src/routes/fileLocks.js
```

Send heartbeat and note while working:

```bash
./scripts/zazzctl exec tick \
  --deliverable-id 8 \
  --task-id 25 \
  --agent-name worker-1 \
  --note "RED test added for lock conflict path"
```

Complete task and release locks:

```bash
./scripts/zazzctl exec complete \
  --deliverable-id 8 \
  --task-id 25 \
  --agent-name worker-1 \
  --status COMPLETED
```

## Exit Codes
- `0`: success (`2xx`)
- `2`: usage/dependency error
- `10`: `409 FILE_LOCK_CONFLICT`
- `20`: other `4xx`
- `30`: `5xx`/network/unexpected

## Notes
- API is the source of truth for locks and task state.
- Do not use local lock files for worker coordination.
- Prefer `zazzctl` over ad-hoc `curl` for worker board interactions.
