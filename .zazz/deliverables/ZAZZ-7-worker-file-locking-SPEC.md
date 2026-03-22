# ZAZZ-7 Worker File Locking SPEC (Draft)

Status: Draft  
Date: 2026-03-07  
Owner: Zazz Framework

## 1) Objective

Provide a language-agnostic file-lock mechanism for worker/sub-agent coordination.

Source of truth for active locks must be the Zazz Board API + PostgreSQL (not local filesystem).

This enables workers in any stack (Node, Python, Go, Java, etc.) to use the same lock contract.

## 2) Scope

### In scope (Phase 1)

1. Add DB table for file-lock leases.
2. Add project+deliverable-scoped API routes for lock lifecycle:
   - acquire (batch, atomic)
   - heartbeat
   - release
   - list active locks
3. Add OpenAPI/Swagger schemas for all routes.
4. Add API tests for core lock behavior.
5. Update worker skill to require lock API usage before moving a task from `READY` to `IN_PROGRESS`.
6. Worker behavior when lock conflict occurs:
   - set task `isBlocked=true` with `blockedReason='FILE_LOCK'` (workflow status stays in its column)
   - poll lock API every 3 seconds until files are available

### Out of scope (Phase 2 / future)

1. Redis caching for lock reads.
2. Redis/pub-sub or SSE lock-release push notifications.
3. Distributed queue/webhook orchestration.

## 3) Problem Statement

Local lock files are not portable across agent vendors and runtimes.

A framework-level coordination primitive must be API-first and runtime-neutral.

## 4) Functional Requirements

### FR-1: Lock data model

The system must persist lock records with at least:

- projectId
- deliverableId
- taskId
- phaseStep (optional)
- agentName
- filePath
- acquiredAt
- heartbeatAt
- leaseExpiresAt

### FR-2: Batch atomic acquire

`acquire` accepts multiple file paths.

Behavior:

1. Reclaim expired locks first.
2. If any requested file is actively locked by another owner, acquire fails entirely.
3. If no conflicts, all requested locks are acquired/refreshed in one operation.

### FR-3: Conflict response

On conflict, API returns lock-owner detail for each blocked file.

### FR-4: Heartbeat

Heartbeat extends lease expiry for an owner/task lock set.

### FR-5: Release

Release removes locks for the owner/task (optionally scoped to provided file paths).

### FR-6: Active lock listing

List endpoint returns only active locks after expiry cleanup.

### FR-7: Polling strategy

If acquire conflicts, worker polls list/acquire every 3 seconds until available.

## 5) Non-Functional Requirements

1. Contract must be language-agnostic over HTTP.
2. Lock logic must be deterministic and race-safe enough for MVP transaction semantics.
3. Expiry reclamation must prevent dead locks when agents crash.

## 6) API Contract (Phase 1)

All routes are under deliverable scope:

- `GET /projects/:code/deliverables/:delivId/locks`
- `POST /projects/:code/deliverables/:delivId/locks/acquire`
- `POST /projects/:code/deliverables/:delivId/locks/heartbeat`
- `POST /projects/:code/deliverables/:delivId/locks/release`

### Acquire request body

- `taskId` (number, required)
- `phaseStep` (string, optional)
- `agentName` (string, required)
- `filePaths` (string[], required, min 1)
- `ttlSeconds` (number, optional; default 30)

### Conflict semantics

Acquire returns `409` with:

- `error: "FILE_LOCK_CONFLICT"`
- `conflicts: [{ filePath, taskId, agentName, phaseStep, leaseExpiresAt }]`

### Polling guidance

On `409`, worker should:

1. set task `isBlocked=true` and `blockedReason='FILE_LOCK'` (do not use `BLOCKED` as workflow status)
2. poll every 3 seconds
3. retry acquire until success
4. clear `isBlocked`, clear `blockedReason`, then move to `IN_PROGRESS`

## 7) Data Model (Phase 1)

New table `FILE_LOCKS`.

Constraints:

1. One active lock row per deliverable + file path.
2. Foreign keys to project, deliverable, task.
3. Lease timestamps are required for stale-lock cleanup.

## 8) Acceptance Criteria

1. Lock routes are documented in OpenAPI and available in Swagger.
2. Acquire succeeds for unlocked file set.
3. Acquire returns `409 FILE_LOCK_CONFLICT` when another task/agent holds any requested file.
4. Heartbeat extends lease expiry.
5. Release removes locks and unblocks subsequent acquire.
6. Expired locks are reclaimed automatically on lock operations.
7. Worker skill explicitly mandates lock acquire before `READY -> IN_PROGRESS` and 3-second polling on lock conflict.

## 9) Future Evolution (Phase 2)

After Phase 1 stabilizes:

1. Add Redis cache for hot lock reads.
2. Add pub/sub (and optionally SSE fan-out) so workers can react to lock release events instead of polling.
3. Keep PostgreSQL as source of truth.
