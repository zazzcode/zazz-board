# Proposal: Pivot Zazz Board into an agentic software factory

**Scope type**: joint — product-direction (feature evolution) plus a sequenced set of deliverables
**Status**: draft — awaiting Owner sign-off before feature-document authoring
**Proposed by**: Owner (Michael), researched and drafted 2026-08-23 via the `proposal-builder` skill
**Reference model**: Factory AI's Software Factory ([overview](https://docs.factory.ai/software-factory/overview), [automations](https://docs.factory.ai/software-factory/automations)); adjacent: [Warp Factories](https://www.warp.dev/blog/open-infrastructure-for-building-a-software-factory)

## Context and problem statement

Zazz Board today is a spec-driven Kanban orchestrator: projects → deliverables (SPEC → PLAN → approve) → tasks (with a dependency graph) → one PR per deliverable → human review. The Zazz Framework methodology (proposal → spec → plan → worker → QA/review → PR) is dogfooded and working — this very repository was built through it, including a fully unattended worker session with an independent verifier sub-agent.

The market is converging on "agentic software factories": Factory AI ships a six-stage 24/7 autonomous system (Triage, Code-Gen, Validate, Release, Document, Monitor) with trigger-driven automations and a live metrics dashboard; Warp ships factory infrastructure; Z.ai (whose GLM models power our agent harness) provides the model/harness layer but no factory product of its own.

The Owner's direction: pivot Zazz Board into an **agentic software factory solution** in this shape — as an open, spec-driven alternative.

### Factory's model, summarized (from their docs)

- **Stages**: Triage (classify/dedupe/route intake), Code-Gen (request → implementation session via Droid), Validate (review/QA/security gates before merge), Release (deployment gates), Document (AutoWiki keeps repo knowledge current), Monitor (incident response, agent-effectiveness feedback).
- **Automations**: trigger (scheduled cron / Slack / GitHub events) + natural-language instructions + run target (Droid Computer / Slack / GitHub workflow) + visibility; templates map automations to stages; run history per automation.
- **Dashboard**: tickets triaged, PR validations, PRs merged, incidents processed; per-stage throughput, pass rate, queue depth, cycle time; repository/integration coverage and "setup gaps".
- **Character**: app-native (managed in a web UI, not as code artifacts), prompt-delegated (intent expressed as prompts, not explicit specs), no enforced handoffs between stages (coupling via templates).

## Gap analysis: Zazz Board vs the factory model

| Factory capability | Zazz Board today | Gap |
| --- | --- | --- |
| Triage (intake from Slack/Linear/issues) | Owner-driven proposals in `.zazz/proposals/` | No ingestion of external requests; no classification/routing |
| Code-Gen (execution sessions) | Worker skill + agent sessions in harnesses (ZCode/GLM); unattended runs proven | Execution is harness-local, not spawned/tracked by Zazz; no run entities |
| Validate (review/QA/security gates) | `pr-review`, `qa-testing` skills; verifier sub-agent pattern proven | Gates are manual skill invocations, not orchestrated checks wired to PRs |
| Release (deployment gates) | Deliverable status flow (…IN_REVIEW → STAGED → DONE) + PR merge policy | Statuses are bookkeeping, not enforced gates |
| Document (AutoWiki) | docs/standards + `feature-doc-builder`, `architecture-doc-builder`, `doc-check` skills | No scheduled/automatic knowledge refresh |
| Monitor (incidents, agent effectiveness) | Status history stored per deliverable/task (lead-time source data) | No dashboards, metrics, stage health, or feedback loops |
| Automations (triggers + schedules) | None in Zazz (harness-level cron exists per session, not as durable entities) | Missing primitive: trigger → agent run, with history |
| Governance/observability | File locks, agent tokens, run logs | No metrics surface; run logs are gitignored local files |

**What Zazz has that Factory does not**: explicit, versioned specifications as the contract (vs prompts), git-native artifacts (specs/standards/skills in-repo), a real task DAG (DEPENDS_ON / COORDINATES_WITH with readiness computation), worktree-disciplined multi-agent coordination with file locks, and an open-source methodology. These are the differentiators the pivot should amplify, not bury.

## Value proposition and expected outcomes

- Zazz Board becomes the **open, spec-driven control plane** of an agentic software factory: explicit specs instead of delegated prompts, git-native instead of app-native, pluggable execution instead of a closed engine.
- Owners get 24/7 factory behavior (triggered and scheduled agent runs, gated promotion, current docs, live metrics) on top of the governance model they already trust.
- The dogfooded workflow (this repo) becomes the first factory instance — every capability lands self-hosted first.

## Alternatives considered

**A — Orchestrator pivot (recommended).** Zazz Board remains the coordination + governance layer and adds the missing factory primitives: automation entities (triggers/schedules), orchestrated gates, stage metrics, and execution adapters that spawn agent sessions in external harnesses (ZCode/GLM first). Execution stays pluggable; Zazz never rebuilds a Droid Computer.
*Tradeoffs*: requires integration surface to harnesses (API/session spawning) and event infrastructure (webhooks/cron); but preserves the methodology differentiator and the existing codebase's center of gravity.

**B — Full Factory clone (app-native, prompt-first).** Rebuild Zazz as a hosted factory: intake prompts, managed execution environments, dashboards-first.
*Tradeoffs*: abandons the spec-driven/git-native identity that differentiates Zazz; enormous build (execution environments, identity, sandboxing); competes head-on with funded closed products. Rejected.

**C — Integration-only.** Keep Zazz as the board; integrate Factory/Warp as execution backends via their APIs.
*Tradeoffs*: least effort, but the "factory" value (and the data) lives in closed third parties; Zazz stays a spectator in its own workflow. Rejected as the primary path; note that Factory's CI Automations API could still be an *optional* adapter under Approach A.

## Recommended capability sequence (approach A)

- **P1 — Automations primitive**: durable `AUTOMATION` entities (trigger: cron schedule, GitHub webhook event, manual) bound to a deliverable/task or a stage template; each run recorded as `AGENT_RUN` (status, logs location, spawned harness, outcome) replacing today's ephemeral run-log convention where appropriate. This is the keystone — everything else composes on it.
- **P2 — Stage orchestration**: Validate as enforced gates (pr-review/qa/security skills invoked as checks on PR open/update; promotion blocked on pass), Triage intake (issue/Slack/webhook → proposal draft), Document refresh (scheduled doc-check + builders).
- **P3 — Factory observability**: stage dashboard (throughput, pass rate, cycle time from existing status history), automation run history, agent-effectiveness feedback loop.
- **P4 — Execution adapters**: ZCode/GLM session spawning via service accounts; adapter interface for other harnesses later.

Sequencing note: P1 is a natural first deliverable after the general-attachments deliverable (already proposed); P2+ each decompose into their own specs.

## Standards and constraints analysis

- **system-architecture.md**: new capabilities must stay behind the service seam (`databaseService`, automationService, etc.); SSE/realtime extension for run status follows the existing realtime boundaries.
- **data-architecture.md**: schema-first — new tables (`AUTOMATIONS`, `AGENT_RUNS`) defined in `api/lib/db/schema.js` with UPPER_SNAKE naming and audit-column ordering; pre-v1 push workflow continues.
- **service-layer.md / coding-styles.md**: automation contracts as domain-oriented service methods; validation in schemas, business rules in handlers; project-scoped patterns for any new routes.
- **security.md**: service-account credentials and webhook secrets follow the env-only secrets rule (no secrets in tracked files); agent tokens already scope project access.
- **testing.md**: every new route/automation behavior gets PactumJS coverage; scheduled behavior tested via the guard/seam pattern proven in the Neon deliverable.

## Risks and mitigations

- **Scope sprawl** (factory is a product, not a feature): mitigation — the P1→P4 sequence keeps each increment spec-sized; feature-document defines the destination, specs deliver it slice by slice.
- **Execution-adapter fragility** (harness APIs change; long-running sessions are hard): mitigation — adapter interface isolated in one service; P1 works with manual/cron triggers before harness spawning exists.
- **Closed competitors move fast** (Factory, Warp): mitigation — lean into what they lack (open, spec-driven, git-native, self-hosted); avoid feature-parity chases.
- **Event infrastructure weight** (webhooks, queues): mitigation — start cron-poll + GitHub webhooks only; no queue infra in P1.

## Dependencies and sequencing considerations

1. General-attachments deliverable (`.zazz/proposals/general-attachments.md`) — already sequenced after the Neon PR; factory work follows it (or runs in parallel once specs are independent).
2. Neon backend (PR zazz-board#27) — cloud deployment of the factory control plane presumes it.
3. Feature-document authoring (see handoff) before the first factory spec.

## Recommendation

Approach A: position Zazz Board as the **open spec-driven agentic software factory** — keep the methodology and governance as the core, add the automation primitive (P1) as the first factory deliverable, then stage orchestration, observability, and execution adapters in sequence.

## Decision checklist / approval questions

- Endorse the orchestrator positioning (spec-driven control plane over pluggable execution) vs clone or integration-only?
- First increment = P1 automations primitive (recommended), or observability first (dashboard on existing status data)?
- Intake scope for P2 triage: GitHub issues only, or Slack as well?
- Hosted/self-hosted stance: remain self-hosted-first (recommended) with cloud later?

## Open questions

- Should `AGENT_RUNS` replace or wrap today's gitignored run logs (`.zazz/execution/`)? (Run history with log links in the DB is a factory feature; log content may remain local.)
- Harness spawning contract: does the ZCode harness expose a programmatic session API sufficient for adapters, or does P1 stay cron/manual until it does? Needs verification against current ZCode docs.
- Licensing/positioning implications of an open-source factory offering (docs, site) — separate follow-up.

## Sign-off outcome and next-phase handoff

Pending Owner sign-off. On approval, hand off to **`feature-doc-builder`** first (product capability document: "Agentic software factory" — destination, non-goals, milestone roadmap), then `spec-builder` for the P1 automations deliverable. Inputs: this proposal, the Factory docs pages cited above, the Warp Factories blog, the general-attachments proposal (sequencing), and the Neon run log as evidence that unattended agent execution already works end to end.
