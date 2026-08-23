# Proposal: Pivot Zazz Board into an agentic software factory

**Scope type**: joint — product-direction (feature evolution) plus a sequenced set of deliverables
**Status**: draft — awaiting Owner sign-off before feature-document authoring
**Proposed by**: Owner (Michael); origin idea [zazz-board discussion #26](https://github.com/zazzcode/zazz-board/discussions/26) (2026-08-22); researched and drafted 2026-08-23 via the `proposal-builder` skill
**Methodology backbone**: [zazzcode/zazz-skills](https://github.com/zazzcode/zazz-skills) — canonical Zazz operating model this repo vendors

## Context and problem statement

Zazz Board today is a spec-driven Kanban orchestrator: projects → deliverables (SPEC → PLAN → approve) → tasks (with a dependency graph) → one PR per deliverable → human review. The Zazz Framework methodology (proposal → spec → plan → worker → QA/review → PR) is dogfooded and working — this very repository was built through it, including a fully unattended worker session with an independent verifier sub-agent. The methodology home is **zazz-skills**: an MIT-licensed "operating model for the agentic software delivery lifecycle" whose pipeline — `project.md` → architecture → proposals → features → specifications → spec-driven execution with Owner steering → deterministic quality gates → code generation → testing → draft-first PR packaging → human review/merge — already *is* a software-factory pipeline, defined agent-first and kept human-governed. (The `planner`/PLAN stage in this repo is a zazz-board extension beyond what upstream zazz-skills documents today.)

The Owner's originating insight ([discussion #26](https://github.com/zazzcode/zazz-board/discussions/26)): *"the new challenge is not creating the software and writing the code but maintaining quality"* — across acceptance-criteria functionality, code hygiene, performance, and security. The product's job becomes **ingesting and tracking deliverables spec-first, and assuring quality across the lifecycle**, not generating code itself. That discussion gated the pivot on running the board on Neon DB — a gate the current branch (PR zazz-board#27) satisfies, pending merge.

Meanwhile the market is converging on "agentic software factories" from two directions, summarized below from their own materials.

### Reference model: Factory AI Software Factory

- **Stages**: Triage (classify/dedupe/route intake), Code-Gen (request → implementation session via Droid), Validate (review/QA/security gates before merge), Release (deployment gates), Document (AutoWiki keeps repo knowledge current), Monitor (incident response, agent-effectiveness feedback).
- **Automations**: trigger (scheduled cron / Slack / GitHub events) + natural-language instructions + run target (Droid Computer / Slack / GitHub workflow) + visibility; templates map automations to stages; run history per automation.
- **Dashboard**: tickets triaged, PR validations, PRs merged, incidents processed; per-stage throughput, pass rate, queue depth, cycle time; repository/integration coverage and "setup gaps".
- **Character**: app-native (managed in a web UI, not as code artifacts), prompt-delegated (intent as prompts, not explicit specs), no enforced handoffs between stages (coupling via templates).

### Reference model: Warp Factories

- **Factory definitions as code**: version-controlled like Terraform — rollback, canary, testable, open to agentic self-modification; a factory spans repos, agent definitions, Skills, MCPs, permissions.
- **Agents**: default Triage / Spec (human interaction for ambiguous changes) / Implement / Review, plus custom agents; a **Foreman** orchestrator spawns subagents and picks model/harness per cost and quality.
- **Intake & interop**: Slack/Teams, Linear/Jira, GitHub/GitLab, terminals/IDEs via the **Factory MCP** — any agent (Claude Code, Codex, Cursor) can push/pull work.
- **Verification & observability**: computer-use agents reproduce issues (verification videos saved to PRs); control-room app with live/interactive runs; metrics API/MCP (throughput, cost, quality, ROI).
- **Self-improvement**: evals/scorers; observer agents score runs and open PRs improving the factory's own code; benchmarks compare model/harness configs.
- **Sovereignty**: BYO inference/hosting, self-hosted data exhaust, zero data retention; multi-model, multi-harness (GLM included). **Access**: closed beta with usage credits for qualified orgs.

### Three-way landscape

| Dimension | Factory AI Software Factory | Warp Factories | Zazz Board (proposed) |
| --- | --- | --- | --- |
| Character | App-native, prompt-delegated | Infra-as-code, platform-required | Open source, spec-driven control plane |
| Intent contract | Natural-language prompts | Factory definitions as code (Terraform-like) | Versioned SPEC/PLAN documents (git-native) |
| Execution | Proprietary Droid + Droid Computers | Warp agents + any harness via Factory MCP | Pluggable harnesses (ZCode/GLM 5.3+, Cursor) via agent API |
| Orchestration | Stage templates, no enforced handoffs | Foreman orchestrator, subagents | Task DAG + deliverable lifecycle + gates (already built) |
| QA / Test Ops | Validate stage (review/QA/security) | Verification via computer use; metrics | Quality-signal ingestion + Test Ops at the factory level (proposed — see P3) |
| Knowledge/docs | AutoWiki stage | — | Docs standards + builder skills (manual today) |
| Self-improvement | Monitor feedback loop | Evals/scorers; agents PR factory improvements | Future (candidate beyond P4) |
| Observability | Live stage dashboard | Control room + metrics API | Status history exists; dashboards are P3 |
| Openness/sovereignty | Closed SaaS | Closed beta; BYO inference, data exhaust | Fully open (MIT methodology, self-hostable board) |

Sharpened takeaway: **Warp is nearer to Zazz's intended positioning than Factory is** (as-code, multi-harness, sovereignty) — which makes Zazz's differentiator *openness plus built-in methodology*. Warp's factory definitions still require Warp's platform and closed-beta access; Zazz's equivalent artifacts are Markdown specs and skills anyone can run, with Zazz Board as the self-hosted control plane.

## Scope and non-goals

**In scope**: the factory pivot as product direction — automation primitive, stage gates, quality-signal ingestion and Test Ops observability, factory dashboards, execution-harness adapters, triage intake — each landing as its own spec-sized deliverable under the existing methodology.

**Non-goals**:

- Not a code-generation engine — execution stays in pluggable agent harnesses; Zazz orchestrates and governs.
- Not a Playwright-specific test dashboard — [PiWi](https://piwitests.dev) occupies that niche; Zazz Test Ops operates at the factory level, runner-agnostic (see P3), because the board controls the whole pipeline rather than one test framework.
- Not a CI system replacement — Zazz consumes CI/test results and gates promotion on them.
- Not rebuilding sandboxed execution computers (Droid-Computer equivalents) in v1 of the pivot.
- Not multi-tenant SaaS in this proposal — self-hosted first; hosting is a later business decision.

## Business justification

- **Timing**: the Owner's originating insight — engineering cost is shifting from writing code to maintaining quality — matches where both funded competitors are investing (Factory's Validate/Monitor stages; Warp's verification and evals). An open, self-hosted answer has no incumbent yet.
- **Credibility**: the methodology is proven in public — this repository, the zazz-skills repo, and an end-to-end unattended agent delivery with independent verification. That is more working spec-driven factory evidence than most projects can show.
- **Wedge**: every closed competitor forces platform adoption; Zazz's artifacts are plain Markdown + git + MIT skills. Self-hosting appeal (sovereignty, data exhaust) is Warp's stated differentiator against SaaS — Zazz can offer it without a beta gate.
- **Neon prerequisite already met**: the pivot was gated on running the board on Neon DB; PR zazz-board#27 delivers exactly that (cloud control plane ready).

## Technical justification

Existing groundwork already covers the hard governance core: deliverable lifecycle with approve gates and status history (lead-time source data), task dependency graph (`DEPENDS_ON`/`COORDINATES_WITH` with readiness), file locks and agent tokens for multi-agent worktree discipline, realtime SSE, REST API + `zazzctl` CLI as an integration surface, standards index driving agent behavior, the skills library (spec-builder → qa-testing → pr-review), and the proven verifier-sub-agent pattern for independent QA. The Neon backend makes the board itself cloud-deployable.

What is genuinely new, and therefore the build: durable automation entities with recorded runs, quality-signal ingestion, gate wiring (block promotion on checks), dashboards/metrics, and harness adapters. None of these require re-architecture — they extend the existing service seam and schema under current standards.

## Value proposition and expected outcomes

- Zazz Board becomes the **open, spec-driven control plane** of an agentic software factory: explicit specs instead of delegated prompts, git-native instead of app-native, pluggable execution instead of a closed engine.
- Owners get 24/7 factory behavior (triggered and scheduled agent runs, gated promotion, current docs, live quality metrics) on top of the governance model they already trust — with humans keeping product direction, review discipline, and merge authority.
- Quality becomes the product: acceptance-criteria evidence, test-run history, flakiness, and gate outcomes are first-class, queryable board data — not ephemeral CI artifacts or local run logs.
- The dogfooded workflow (this repo) remains the first factory instance; every capability lands self-hosted first.

## Alternatives considered

**A — Orchestrator pivot (recommended).** Zazz Board remains the coordination + governance layer and adds the missing factory primitives: automation entities (triggers/schedules), quality-signal ingestion and Test Ops, orchestrated gates, stage metrics, and execution adapters that spawn agent sessions in external harnesses (ZCode/GLM 5.3+ first, Cursor per the origin discussion). Execution stays pluggable; Zazz never rebuilds a Droid Computer.
*Tradeoffs*: requires integration surface to harnesses and event infrastructure (webhooks/cron); preserves the methodology differentiator and the existing codebase's center of gravity.

**B — Full Factory clone (app-native, prompt-first).** Rebuild Zazz as a hosted factory: intake prompts, managed execution environments, dashboards-first.
*Tradeoffs*: abandons the spec-driven/git-native identity that differentiates Zazz; enormous build (execution environments, identity, sandboxing); head-on competition with funded closed products. Rejected.

**C — Integration-only.** Keep Zazz as the board; integrate Factory/Warp as execution backends via their APIs.
*Tradeoffs*: least effort, but the factory value (and the data) lives in closed third parties; Zazz stays a spectator in its own workflow. Rejected as the primary path; their APIs (e.g. Factory's CI Automations API) can still be optional adapters under Approach A.

## Tradeoff analysis

The decisive costs are timing and duplication. The project is pre-v1 with no client upload/ops surface yet: adding factory primitives now means they shape the product before habits (or schema) calcify around Kanban-only. Approach A pays incrementally and each increment is independently valuable (automations help today; Test Ops dashboards help today); B pays everything up front and forfeits the differentiator; C pays nothing but cedes the category. Within A, the sharpest internal tension is build-order: Test Ops observability is the most user-visible value but depends on signal ingestion; automations are the least visible but compose everything — hence automations first, quality ingestion alongside the gates that consume it.

## Standards and constraints analysis

- **system-architecture.md**: new capabilities stay behind the service seam (`databaseService`, automationService, qualitySignalService); SSE/realtime extension for run status follows the existing realtime boundaries.
- **data-architecture.md**: schema-first — new tables (`AUTOMATIONS`, `AGENT_RUNS`, quality-signal tables) defined in `api/lib/db/schema.js` with UPPER_SNAKE naming and audit-column ordering; pre-v1 push workflow continues.
- **service-layer.md / coding-styles.md**: automation and adapter contracts as domain-oriented service methods; validation in schemas, business rules in handlers; project-scoped patterns for any new routes.
- **security.md**: service-account credentials and webhook secrets follow the env-only secrets rule (no secrets in tracked files); agent tokens already scope project access.
- **testing.md**: every new route/automation behavior gets PactumJS coverage; scheduled behavior tested via the guard/seam pattern proven in the Neon deliverable.

## Risks and mitigations

- **Scope sprawl** (a factory is a product, not a feature): mitigation — P1→P5 sequence keeps each increment spec-sized; the feature document defines the destination, specs deliver it slice by slice.
- **Execution-adapter fragility** (harness APIs change; long-running sessions are hard): mitigation — adapter interface isolated in one service; P1 works with manual/cron triggers before harness spawning exists.
- **Closed competitors move fast** (Factory, Warp): mitigation — lean into what they lack (open, spec-driven, git-native, self-hosted); avoid feature-parity chases.
- **Event infrastructure weight** (webhooks, queues): mitigation — start cron-poll + GitHub webhooks only; no queue infra in P1.
- **Quality-signal sprawl** (every runner emits different shapes): mitigation — one normalized ingestion contract (run → suite → case → outcome + evidence link), runner adapters translate; reject runner-specific schema leakage.

## Dependencies and sequencing considerations

1. Neon backend (PR zazz-board#27) — the origin discussion's gate; merge first.
2. General-attachments deliverable (`.zazz/proposals/general-attachments.md`) — already sequenced next after the Neon PR; factory work follows it (or runs in parallel once specs are independent).
3. Feature-document authoring (see handoff) before the first factory spec.

## Recommendation

Approach A: position Zazz Board as the **open spec-driven agentic software factory** — keep the methodology and governance as the core, add the factory primitives in this sequence:

- **P1 — Automations primitive**: durable `AUTOMATION` entities (trigger: cron schedule, GitHub webhook event, manual) bound to a deliverable/task or a stage template; each run recorded as `AGENT_RUN` (status, logs location, spawned harness, outcome), replacing today's ephemeral run-log convention where appropriate. Borrow Warp's factory-as-code insight: automations should be expressible (and reviewable) as in-repo artifacts, not just dashboard rows — the database records state, the artifact is the source of truth. Keystone — everything composes on it.
- **P2 — Stage orchestration**: Validate as enforced gates (pr-review/qa/security skills invoked as checks on PR open/update; promotion blocked on pass), Triage intake (issue/webhook → proposal draft), Document refresh (scheduled doc-check + builders).
- **P3 — Quality-signal ingestion + Test Ops observability**: runner-agnostic ingestion of test/verifier runs (normalized run → suite → case → outcome + evidence link) from CI and from Zazz's own verifier/QA agent runs; **Playwright adapter first** (per Owner sequencing — e2e is where test-ops pain concentrates and where the PiWi baseline points), Vitest/PactumJS and other runners next on the same contract; PiWi-inspired UX — persistent history beyond CI artifact expiry, pass-rate/duration/stability trends, failure clustering ("error fingerprints"), flakiness scoring with root-cause class — at the factory level and tied to deliverables/acceptance criteria, since the board controls the whole pipeline rather than one framework; stage dashboards (throughput, pass rate, cycle time from existing status history), automation run history.
- **P4 — Execution adapters**: ZCode (GLM 5.3+) session spawning via service accounts first; Cursor (per the origin discussion) and others behind the same adapter interface.
- **P5 (candidate) — Self-improvement loop**: observer agents score runs and open factory-improvement PRs (Warp's eval loop; Factory's Monitor feedback). Decide after P3 data exists.

## Decision checklist / approval questions

- Endorse the orchestrator positioning (spec-driven control plane over pluggable execution) vs clone or integration-only?
- First increment = P1 automations primitive (recommended), or observability first (dashboard on existing status data)?
- Test Ops scope confirmation: runner-agnostic factory-level ingestion contract with **Playwright supported first, then Vitest and other runners** (Owner sequencing, 2026-08-23) — correct?
- Intake scope for P2 triage: GitHub issues only, or Slack as well?
- Hosted/self-hosted stance: remain self-hosted-first (recommended) with cloud later?

## Open questions

- Should `AGENT_RUNS` replace or wrap today's gitignored run logs (`.zazz/execution/`)? (Run history with log links in the DB is a factory feature; log content may remain local.)
- Automations as DB entities, in-repo artifacts, or both (DB records state; artifact is source of truth — Warp's factory-as-code argues artifact-first)? Decide during P1 spec authoring.
- Quality-signal contract shape: minimum viable normalized schema for run/suite/case/outcome/evidence. Runner sequencing settled (Playwright first, Vitest and others after); the open part is the contract itself and the Playwright report ingestion path (native reporter vs CI artifact parsing).
- Harness spawning contract: does the ZCode harness expose a programmatic session API sufficient for adapters, or does P1 stay cron/manual until it does? Needs verification against current ZCode docs. Same question for Cursor automation surfaces.
- Is a "Zazz Factory MCP" (any external agent pushing/pulling board work, mirroring Warp's Factory MCP) part of the end state, given `zazzctl` + REST API already cover CLI-first access?
- Licensing/positioning implications of an open-source factory offering (docs, site) — separate follow-up.

## Discussion log / notable arguments

- **2026-08-22, [zazz-board discussion #26](https://github.com/zazzcode/zazz-board/discussions/26)** (Owner, sole participant, no replies yet): origin of the pivot — board as agentic-software-factory UI for spec ingestion and deliverable tracking; quality-maintaining as the central challenge; gated on Neon DB; Test Ops named with PiWi as baseline; harness targets ZCode (GLM 5.3+) and Cursor (grok 4.6+).
- **2026-08-23, drafting session**: Owner refined Test Ops scope — PiWi operates at a different level (Playwright-specific test dashboards); Zazz should not worry about building Playwright coverage per se and should aim **beyond any single framework**, since the board controls the whole pipeline. Recorded as the runner-agnostic, factory-level Test Ops direction in P3 and the non-goals. Owner also requested exhaustive URL references (see Sources) for later re-reading. Sequencing follow-up the same day: **start with Playwright support, then expand to Vitest and other testing runners** — adapter order recorded in P3 and the decision checklist; the ingestion contract stays runner-agnostic from day one.

## Sign-off outcome and next-phase handoff

Pending Owner sign-off. On approval, hand off to **`feature-doc-builder`** first (product capability document: "Agentic software factory" — destination, non-goals, milestone roadmap mapping P1–P5), then `spec-builder` for the P1 automations deliverable. Inputs: this proposal, discussion #26, the Factory/Warp/PiWi references below, the general-attachments proposal (sequencing), and the Neon run log (`.zazz/execution/neon-db-integration-run-log.md`, machine-local) as evidence that unattended agent execution already works end to end.

## Sources

Researched 2026-08-23; all URLs accessed on that date.

Origin and methodology:

- Origin idea (gated on Neon DB; quality-first; Test Ops/PiWi; harness targets): <https://github.com/zazzcode/zazz-board/discussions/26>
- Zazz methodology home (operating model + skills): <https://github.com/zazzcode/zazz-skills>
- Zazz Board reference implementation: <https://github.com/zazzcode/zazz-board>

Factory AI:

- Software Factory overview (six stages, dashboard, coverage): <https://docs.factory.ai/software-factory/overview>
- Custom Automations (trigger + prompt + run target; templates; run history): <https://docs.factory.ai/software-factory/automations>
- Company site: <https://factory.ai/>
- Background (founders, funding): <https://sequoiacap.com/companies/factory>, <https://sequoiacap.com/podcast/training-data-factory>, <https://techcrunch.com/2023/11/02/factory-wants-to-use-ai-to-automate-the-software-dev-lifecycle/>

Warp:

- Warp Factories announcement (factory-as-code, Foreman, Factory MCP, evals, sovereignty): <https://www.warp.dev/blog/open-infrastructure-for-building-a-software-factory>
- TechCrunch coverage (out-of-the-box factory): <https://techcrunch.com/2026/08/18/warps-new-system-is-an-out-of-the-box-software-factory-for-ai-development/>
- Latent Space interview with Warp's CEO ("every major software project will soon run on an automated factory"): <https://www.latent.space/p/software-factories>
- Additional coverage: <https://thenewstack.io/warp-software-factory-infrastructure/>, <https://www.eweek.com/news/warp-ai-software-factory/>

Test Ops reference:

- PiWi (self-hosted, Playwright-only test dashboard — persistent history, failure clustering/error fingerprints, flakiness scoring, evidence retention, MCP server): <https://piwitests.dev>

Z.ai ecosystem (engine/harness layer):

- ZCode harness: <https://zcode.z.ai/en>; agents docs (remote multi-agent control): <https://zcode.z.ai/en/docs/agents>
- GLM Coding Plan (GLM in Claude Code, Cline, OpenCode, etc.): <https://z.ai/subscribe>
- GLM-5 (agentic engineering; ZCode): <https://z.ai/blog/glm-5>; GLM-5.1 coverage (autonomous for hours): <https://www.computerworld.com/article/4155606/z-ai-unveils-glm-5-1-enabling-ai-coding-agents-to-run-autonomously-for-hours.html>; GLM-5.2 (long-horizon): <https://z.ai/blog/glm-5.2>; GLM-5.3 (frontier coding): <https://z.ai/blog/glm-5.3>
- Z.ai platform: <https://z.ai/>
