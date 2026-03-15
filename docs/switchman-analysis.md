# Switchman Analysis for Zazz Framework and Zazz Board

## Purpose

Evaluate whether Zazz should:
- use the existing Switchman MCP/CLI capability,
- run upstream Switchman locally as-is, or
- run a forked/customized local version when needed.

This document also covers the SQLite local database model, a concrete 4-worker workflow, and MCP vs CLI-skill efficiency tradeoffs.

## Executive summary

Primary recommendation (phase 1):
1. Use **upstream Switchman as-is locally** for multi-agent coordination (no fork in phase 1).
2. Integrate it through **Zazz CLI skills first** (not deep MCP-first coupling), so all vendors can use the same orchestration contract.
3. Keep Zazz Board task system as the planning/system-of-record layer; mirror lock/lease status from Switchman where needed.
4. Re-evaluate whether a fork/customization is needed after 2–4 weeks of production usage and telemetry.

Framework policy addition for multi-agent mode:
- Switchman coordination **replaces the existing Zazz Board file-locking mechanism** for active multi-agent task execution.
- For any framework run with multiple concurrent agents on implementation tasks, using one of the following is **required**:
  - Switchman MCP integration, or
  - Zazz Switchman CLI adapter skill integration.
- Unmanaged parallel file edits outside MCP/CLI adapter coordination are out of policy.

Why:
- It is already a working OSS implementation with MCP + CLI surface.
- Duplication cost is non-trivial.
- The local SQLite design is strong for single-machine/worktree coordination, but that is also a scope boundary that should be validated against your distributed needs before making it canonical in Zazz.

## Terminology clarification: what “adopt upstream Switchman locally” means

To avoid ambiguity, this analysis uses two explicit modes:

1. **Upstream as-is locally (recommended phase 1)**  
   - Install and run `switchman-dev` directly (CLI/MCP) on your local machine/LAN workflow.  
   - No fork. No copied code.  
   - Zazz integrates via adapter skills and workflow sync.

2. **Forked upstream locally**  
   - Create a fork of `switchman-dev/switchman`, run your fork locally, and maintain your own divergence.  
   - Use this only if you need custom behavior not feasible via normal integration.

When this document says “adopt upstream locally,” it means **mode 1: upstream as-is locally**, not a fork.

## What “Switchman MCP server” is (authoritative source located)

Canonical repo:
- https://github.com/switchman-dev/switchman

Package:
- npm package `switchman-dev` (latest observed: `0.1.7`)
- repo reference in package metadata points to `switchman-dev/switchman`

From package metadata:
- CLI binary: `switchman`
- MCP binary: `switchman-mcp`
- package entrypoints indicate both CLI and MCP are first-class.

## Technical architecture (from repo/docs)

Core positioning in project docs:
- Coordination/governance layer for parallel AI coding agents.
- Explicit support for workspaces/worktrees, claims/leases, queueing, stale recovery, and governed landing.

Implementation signals:
- Language: JavaScript/Node.
- Node requirement in README: Node 22.5+.
- Uses SQLite local repo DB in `.switchman/` (README + code).
- MCP server transport: stdio local subprocess (from `src/mcp/server.js` comments and implementation).

Repository complexity snapshot (current observed):
- ~45 files total in repo tree.
- ~18 source files under `src/`.
- ~11 docs files under `docs/`.
- Approximate analyzed text footprint (selected src/docs/readme files): ~21k lines.

This is not a tiny utility; it is a moderately substantial coordination system.

## SQLite local database model (requested detail)

Evidence from `src/core/db.js`:
- DB directory: `.switchman/`
- DB file: `switchman.db`
- audit key file: `audit.key`
- schema version constant observed: `6`
- SQLite pragmas/config include:
  - `foreign_keys=ON`
  - `synchronous=NORMAL`
  - `busy_timeout` configured
  - WAL mode enabled during initialization
- Busy handling includes retry/backoff logic for locked DB scenarios.

Observed table surface (17 tables):
- `tasks`
- `leases`
- `file_claims`
- `worktrees`
- `conflict_log`
- `audit_log`
- `worktree_snapshots`
- `task_specs`
- `scope_reservations`
- `boundary_validation_state`
- `dependency_invalidations`
- `code_objects`
- `merge_queue`
- `merge_queue_events`
- `operation_journal`
- `policy_overrides`
- `temp_resources`

Interpretation:
- It is more than file locks; it includes policy, stale invalidation, queueing, and audit trail.
- SQLite is used as a local coordination state engine, not just a lock table.

## Why a local SQLite DB does not eliminate the need for Switchman

This is the core distinction:
- **SQLite is the storage layer** (state persistence).
- **Switchman is the coordination engine** (rules + workflows + safety behaviors around that state).

If you query/update the SQLite DB directly, you bypass critical logic that Switchman implements in CLI/MCP flows:
- conflict-safe claim semantics
- lease lifecycle and heartbeat handling
- stale lease reaping policy
- recovery workflows and operator guidance
- governed write enforcement tools
- queue/gate/landing logic
- audit/event consistency behaviors

Practical analogy:
- Using SQLite directly is like editing a scheduler’s internal tables by hand.
- It can work in a narrow case, but you lose invariants enforced by the application layer.

Important project signal from Switchman itself:
- the project is currently **CLI-first + MCP-first** and does **not** present a stable embeddable library API as the primary supported surface.
- treating the DB as your integration API increases coupling risk to schema/version changes.

### So why call Switchman if DB is local?

Because calling Switchman gives you the maintained contract:
- stable operator commands and MCP tools
- policy-aware transitions
- safer forward compatibility as Switchman evolves

### When direct SQLite access might be acceptable

Only for read-only diagnostics/internal experiments where breakage risk is acceptable.

For production coordination flows:
- use Switchman CLI/MCP interfaces,
- not raw SQL against `.switchman/switchman.db`.

## MCP tool surface and lock workflow semantics

Observed MCP tools include:
- `switchman_task_next`
- `switchman_task_add`
- `switchman_task_claim`
- `switchman_task_done`
- `switchman_task_fail`
- `switchman_lease_heartbeat`
- `switchman_scan`
- `switchman_merge_gate`
- `switchman_status`
- plus governed write tools:
  - `switchman_write_file`
  - `switchman_append_file`
  - `switchman_make_directory`
  - `switchman_move_path`
  - `switchman_remove_path`
  - `switchman_monitor_once`

Important behavior:
- Agent asks for next task.
- Agent claims file paths before edits.
- Conflicts are returned if files are already claimed.
- Lease heartbeat and stale-reap policy exist.
- Completion/failure releases claims.
- Optional “governed write gateway” validates lease/path ownership before file mutation.

## Does Switchman replace Zazz Board file locking directly?

It can replace **local** agent contention handling in many cases, but there is a scope caveat:
- Switchman state is local to repo filesystem via SQLite in `.switchman/`.
- Zazz Board locking is API/service-centric and naturally central across distributed hosts.

So the direct replacement question is really:
- if your multi-agent execution is mostly same host/same repo/worktree ecosystem, Switchman is a strong substitute;
- if you need cross-host, service-authoritative lock state, Board-level API locking remains stronger as canonical truth.

Proposed framework stance in this analysis:
- For local/LAN multi-agent execution, adopt Switchman as the lock/lease authority and treat it as the replacement for the current Board-level file-lock mechanism during active execution.
- Board remains authoritative for deliverable/task lifecycle and governance metadata.

## Detailed workflow: 4 worker agents + QA from Zazz Board tasks

This is a practical hybrid workflow that uses existing systems with minimal duplication.

### Phase A: planning source of truth stays in Zazz Board
1. Deliverable + task graph remains in Zazz Board.
2. Manager pulls READY tasks from Board API.
3. Manager creates/mirrors execution tasks in Switchman (`switchman task add`) with priority + scope hints.

### Phase B: parallel execution with Switchman coordination
4. Run `switchman setup --agents 4` for worker workspaces.
5. Each worker agent starts in its own workspace:
   - `switchman_task_next`
   - `switchman_task_claim` for intended files
   - do work
   - heartbeat for long-running tasks
6. If claim conflict occurs:
   - reroute to alternate task/files, or wait/retry based on policy.

### Phase C: QA pass
7. QA agent runs after workers (or on completed slices):
   - claims QA-edit files if needed (tests/spec updates/rework docs)
   - runs verification, merge gate/scan/status checks
   - creates rework tasks (Switchman + Board sync if desired)
8. Workers consume rework tasks similarly.

### Phase D: landing and Board sync
9. Use Switchman queue/gates for controlled landing.
10. Sync final task statuses back to Zazz Board deliverable/task statuses.

### Operational sync strategy
- Board remains business/workflow record.
- Switchman is execution safety/coordination layer.
- A thin adapter (CLI skill) syncs key state transitions:
  - READY -> in Switchman queue
  - done/fail/rework -> reflected back to Board.

## Can we build a CLI skill solution that uses existing Switchman?

Yes — and this is likely the best first implementation.

CLI-skill pattern:
- `zazz-switchman-adapter` skill wraps Switchman CLI commands.
- Skill responsibilities:
  - bootstrap/check (`switchman setup`, `switchman verify-setup`)
  - task ingestion from Board into Switchman queue
  - worker loop helpers (next/claim/heartbeat/done/fail)
  - status + stale recovery helpers
  - sync completion/rework status back to Board

Benefits:
- vendor-neutral: any agent that can run CLI commands can use it.
- avoids deep immediate coupling to one MCP host implementation.
- preserves optional MCP path where available.

## Can this same strategy be used by Claude Code, Cursor, Codex, and Warp?

Yes, with one important distinction:
- the **core strategy** (Switchman coordination + Zazz CLI adapter skill) is portable,
- while the **integration mode** (native MCP vs CLI wrapper) varies by agent platform.

### Claude Code
- Switchman has explicit setup docs for Claude Code with project-local MCP config.
- Strategy fit:
  - MCP-native path: strong
  - CLI-adapter path: also valid

### Cursor
- Switchman has explicit setup docs for Cursor and writes `.cursor/mcp.json`.
- Strategy fit:
  - MCP-native path: strong
  - CLI-adapter path: also valid

### Codex
- Codex docs state MCP servers are supported in CLI and IDE extension.
- Codex also supports project-scoped `.codex/config.toml`, which aligns with repo-local setup patterns.
- Strategy fit:
  - MCP-native path: available
  - CLI-adapter path: strong fallback/baseline, especially for vendor-unified workflows

### Warp (Oz agents)
- Warp docs support MCP servers for agents (including stdio/local process MCP).
- Warp CLI supports passing MCP config via `--mcp`.
- Strategy fit:
  - MCP-native path: available
  - CLI-adapter path: available for workflows that rely on shell command orchestration

### Practical recommendation for cross-agent consistency
1. Make **CLI adapter** the framework default contract (portable baseline).
2. Add **optional MCP acceleration** per platform where native MCP is stable and reduces operator friction.
3. Keep one canonical workflow spec in Zazz skills so behavior is consistent across Claude/Cursor/Codex/Warp.

## MCP vs CLI-skill efficiency comparison

### MCP strengths
- Structured tool calls (less parsing ambiguity).
- Better guardrails for “must claim before write” flows when agents use Switchman write tools.
- Native integration in MCP-capable tools (Claude Code/Cursor).

### CLI-skill strengths
- Works across a broader set of agent vendors/runtimes immediately.
- Fits Zazz’s existing CLI/skill operating model.
- Easier to standardize in framework documentation and automation scripts.

### Efficiency tradeoff (practical)
- For a single MCP-native toolchain, MCP may be cleaner and lower-friction per action.
- For cross-vendor framework portability, CLI skills are typically more operationally efficient overall because you avoid per-vendor MCP integration overhead.

## Token-efficiency assessment (core question)

Short answer:
- **There is no universal rule that MCP is always more token-efficient or CLI is always more token-efficient.**
- For your Zazz use case, a **CLI skill adapter is likely more token-efficient end-to-end** once prompts are standardized and outputs are constrained.

Important framing:
- “Token efficiency” depends on how much text the model must read/write per step.
- Both MCP and CLI can be efficient or inefficient depending on response verbosity and orchestration design.
- The comparison below is an inference from tool behavior and workflow shape, not a benchmark published by Switchman maintainers.

### Where MCP can be token-efficient
- Structured responses can reduce parsing back-and-forth.
- Tool contracts reduce ambiguous natural-language negotiation.
- Fewer “explain the command” turns in MCP-native environments.

### Where MCP can be token-inefficient
- Rich JSON payloads can be verbose.
- High-frequency operations (heartbeat, status polling, repeated claim checks) can add repeated structured payload overhead.
- If agents still require explanatory text around each MCP action, total tokens rise quickly.

### Where CLI skill can be token-efficient
- A well-designed skill can enforce compact command outputs (for example: JSON flags plus minimal fields).
- Common workflows can be wrapped into one skill action pattern, reducing repeated instruction tokens.
- CLI-first skill works consistently across vendors, avoiding additional agent-specific setup chatter.

### Where CLI skill can be token-inefficient
- If commands are run without output constraints, noisy terminal output can exceed MCP payload size.
- If agents repeatedly ask for command clarifications, interaction overhead increases.

### Practical conclusion for Zazz
- If your goal is **framework-wide** efficiency across multiple agent vendors, use a CLI adapter skill as baseline.
- Add MCP-native fast paths only where the host tool has strong native support and low overhead.
- In other words: choose **operational token efficiency** over per-call elegance.

### Measurement plan to validate this (recommended)
Run a 1-week A/B pilot on similar deliverables:
1. Mode A: Switchman via MCP tools.
2. Mode B: Switchman via Zazz CLI adapter skill.
3. Capture for each run:
   - total model input tokens
   - total model output tokens
   - number of coordination turns
   - mean tokens per completed task
   - conflict/retry rate
4. Select the default mode using:
   - lowest median tokens per completed task
   - with no quality or reliability regression.

## Detailed implementation plan: Zazz Switchman CLI adapter skill

Goal:
- Provide a vendor-neutral Zazz skill that uses existing Switchman functionality (no duplication of core lock/lease engine).

Name (proposed):
- `zazz-switchman-cli-adapter`

### Scope
- In scope:
  - Setup/verification helpers
  - Task mirror from Zazz Board to Switchman queue
  - Worker execution loop helpers (next/claim/heartbeat/done/fail)
  - QA/rework helpers
  - Status/recovery helpers
  - Optional landing/gate helpers
- Out of scope (phase 1):
  - Re-implementing Switchman DB, lock engine, or merge queue logic in Zazz
  - Full bi-directional real-time sync daemon

### Phase 0: contract and interface definition
Deliverables:
1. Skill contract doc:
   - command intents
   - required inputs/outputs
   - failure semantics
2. Minimal state mapping spec:
   - Zazz Board task status -> Switchman task/lease state
   - Switchman completion/failure -> Zazz Board updates
3. Output shape standard:
   - compact JSON-first output requirements for token control.

Acceptance criteria:
- Every skill action has deterministic required input and normalized output.
- No direct `.switchman/switchman.db` access in skill logic.

### Phase 1: core command wrappers
Implement wrappers for:
- setup and health:
  - `switchman setup --agents N`
  - `switchman verify-setup`
  - `switchman status --json`
- queue/task:
  - `switchman task add ...`
  - `switchman lease next --json` or equivalent task-next flow
  - `switchman claim ...`
  - `switchman task done ...`
  - `switchman task fail ...`
  - `switchman lease heartbeat ...`
- recovery:
  - `switchman lease reap`
  - `switchman scan`

Adapter behavior requirements:
- enforce compact mode (`--json` where available)
- parse and return only required fields
- normalize errors to stable reason codes:
  - `CLAIM_CONFLICT`
  - `LEASE_STALE`
  - `TASK_NOT_FOUND`
  - `SETUP_INVALID`
  - `COMMAND_FAILED`

### Phase 2: Zazz Board sync integration
Workflow:
1. Fetch READY tasks from Zazz Board.
2. Create/mirror execution tasks in Switchman with trace IDs.
3. On task completion/failure/rework in Switchman, patch Board status.
4. Preserve audit linkage with correlation fields:
   - `boardTaskId`
   - `switchmanTaskId`
   - `deliverableId`
   - `worktree`.

Minimum sync strategy:
- event-driven at key transitions only (not continuous chatter).

### Phase 3: QA + rework loop
Add explicit QA flow support:
1. QA picks validated task set.
2. QA runs checks and records findings.
3. QA creates rework tasks:
   - in Switchman queue for execution
   - mirrored in Board for governance visibility.
4. Rework closure updates both systems.

Policy:
- one-writer-per-file rule remains active.
- overlapping edits trigger serialize/retry flow.

### Phase 4: optimization and hardening
1. Token optimization:
   - strict compact JSON responses
   - avoid verbose status dumps unless requested
2. Reliability:
   - retry strategy for transient CLI failures
   - stale lease recovery policy presets
3. Observability:
   - per-action timing
   - per-task token usage metrics
   - conflict/retry counters.

### Reference workflow (4 workers + QA with adapter)
1. Manager syncs ready Board tasks -> Switchman.
2. Workers 1..4 each:
   - acquire next task
   - claim files
   - execute
   - heartbeat as needed
   - done/fail
3. QA:
   - validates completed slices
   - creates rework where needed
4. Manager:
   - monitors status/recovery
   - syncs outcomes back to Board
   - runs gate/landing commands.

### Security and safety constraints
- Do not expose raw DB operations in skill prompts.
- Keep force-claim operations operator-gated.
- Require explicit approval for destructive landing/recovery commands.

### Test plan (adapter)
1. Unit tests:
   - parser normalization for each wrapped command
   - error mapping correctness
2. Integration tests:
   - claim conflict path
   - stale lease reap path
   - done/fail sync to Board
3. Load tests:
   - 4-worker + QA parallel run over representative deliverable.

### Rollout plan
1. Pilot in one deliverable.
2. Compare MCP-direct vs CLI-adapter (token + reliability metrics).
3. Make CLI adapter default if metrics are equal or better.
4. Keep MCP path optional for tools where it is measurably superior.

Conclusion for Zazz now:
- Use CLI-skill as baseline portability layer.
- Add MCP optimization path where supported.

## Adoption paths for Zazz Framework (generic vendor support)

### Option 1 — Upstream as-is locally (recommended now)
Pros:
- immediate capability
- real implementation already handling leases/claims/stale/queue
- lower time-to-value
- no fork maintenance burden in phase 1

Cons:
- dependency on external project maturity/roadmap
- local SQLite scope may not match all distributed deployments
- governance/compliance behavior is opinionated to Switchman model

### Option 2 — Fork/customize upstream locally
Pros:
- full control
- can apply targeted customizations while preserving upstream core behavior

Cons:
- ongoing fork maintenance and merge burden
- risk of divergence from upstream fixes/features
- higher operational complexity than upstream-as-is

### Recommended trajectory
Phase 1:
- run upstream-as-is + CLI skill adapter.
Phase 2:
- collect telemetry and pain points.
Phase 3:
- if required, move to a focused fork with minimal delta from upstream.

## Cost/complexity estimate for fork/customization

Given observed scope, deeper customization still touches non-trivial subsystems:
- lease lifecycle + stale policy
- conflict detection and claim semantics
- governed write path
- queue/landing behavior
- recovery commands and observability
- policy/audit model

Expected effort trend:
- thin integration (upstream-as-is): low-to-medium
- medium customization in a fork: medium-to-high
- broad behavioral divergence from upstream: high

## Risks and due-diligence items

1. License clarity:
   - Site copy references MIT in marketing text.
   - npm metadata currently reports Apache-2.0.
   - GitHub API currently shows no detected license file.
   - Action: verify with maintainers before hard dependency.

2. Maturity:
   - early-stage repository (recent creation, low stars/contributors at time of analysis).
   - Action: run controlled pilot before full framework dependency.

3. Scope mismatch:
   - local SQLite coordination may not replace service-level distributed locking requirements.
   - Action: define where Board remains authoritative vs where Switchman is authoritative.

## Recommended next steps for Zazz

1. Pilot in one deliverable with 3–4 workers + QA using Switchman via CLI skill adapter.
2. Keep Zazz Board as task/deliverable source of truth; sync status boundaries explicitly.
3. Measure:
   - conflict rate
   - stale lease incidents
   - merge/queue recovery frequency
   - operator overhead versus current Board-lock flow
4. Decide after pilot:
   - continue upstream-as-is, or
   - move to a tightly scoped fork/customization.

## Sources

- Switchman repo: https://github.com/switchman-dev/switchman
- Switchman site: https://switchman.dev
- Switchman README: https://raw.githubusercontent.com/switchman-dev/switchman/main/README.md
- MCP tools doc: https://raw.githubusercontent.com/switchman-dev/switchman/main/docs/mcp-tools.md
- Claude setup doc: https://raw.githubusercontent.com/switchman-dev/switchman/main/docs/setup-claude-code.md
- CLI setup doc: https://raw.githubusercontent.com/switchman-dev/switchman/main/docs/setup-cli-agents.md
- Stale lease policy doc: https://raw.githubusercontent.com/switchman-dev/switchman/main/docs/stale-lease-policy.md
- MCP server source: https://raw.githubusercontent.com/switchman-dev/switchman/main/src/mcp/server.js
- DB source (SQLite schema/pragmas): https://raw.githubusercontent.com/switchman-dev/switchman/main/src/core/db.js
- npm package metadata endpoint: https://registry.npmjs.org/switchman-dev
