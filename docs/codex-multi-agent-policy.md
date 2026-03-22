# Codex Multi-Agent Policy (Phase 1)

This repository uses Codex multi-agent mode in a limited, framework-aligned way.

## Official references (source of truth)

- Multi-agent guide: https://developers.openai.com/codex/multi-agent/
- Multi-agent concepts: https://developers.openai.com/codex/concepts/multi-agents
- Codex config reference: https://developers.openai.com/codex/config-reference
- Approvals and sandbox: https://developers.openai.com/codex/sandbox

## Contention management assessment

Based on current Codex docs, treat multi-agent contention handling as helpful but not lock-safe:

- Codex agents can parallelize workstreams.
- Codex docs also warn that write-heavy parallel tasks can still produce edit conflicts.

Policy decision:
- We do not assume deterministic built-in file-lock semantics across subagents.
- Primary strategy is explicit file ownership + dependency sequencing.
- API-backed lock coordination is fallback only for external concurrency risk.

## Scope for this repository

Initial rollout roles:
- `worker`: implementation tasks
- `qa`: verification plus rework creation/spec updates
- `monitor` (optional): non-writing progress/blocker monitoring

We intentionally defer broader role fanout patterns until this phase is stable.

## When to spawn multiple agents

Spawn parallel agents only when all are true:
1. Work is clearly scoped and independent.
2. File ownership is disjoint.
3. Acceptance criteria and test expectations are clear.
4. Merge/apply order is straightforward.

Good fits:
- Independent worker tasks from an approved plan.
- QA validation after worker changes are integrated.
- Read-only monitoring/reporting.

## When NOT to spawn multiple agents

Do not spawn parallel agents when any apply:
- Spec/plan/acceptance criteria are ambiguous or changing.
- Overlapping file edits are likely.
- Strict serial ordering is required (migrations, deep refactors, hotfix surgery).
- The task is small enough for one agent.

## Write-conflict policy

1. One writer per file at a time.
2. Declare file ownership before spawning worker agents.
3. If ownership overlaps, serialize with explicit dependency edges.
4. QA should avoid concurrent edits with workers in the same file set.
5. If external concurrency risk exists, use API-backed lock coordination before proceeding.

## Approval and sandbox expectations

- Default approval mode: `on-request`.
- Worker sandbox: `workspace-write` (network disabled by default).
- QA sandbox: `workspace-write` with network enabled (required for Board API calls and rework updates).
- Monitor sandbox: `read-only`.
- Risky or out-of-sandbox actions require explicit human approval.

## Operational limits

- `max_threads` and `max_depth` remain conservative in phase 1.
- Raise limits only after repeated low-conflict runs and team agreement.

## Relationship to Zazz Framework

This policy aligns with the framework’s role-oriented execution model while constraining initial parallelization to Worker + QA patterns for predictable convergence and lower merge risk.
