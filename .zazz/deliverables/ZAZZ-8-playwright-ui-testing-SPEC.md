# Playwright UI Testing Specification (Draft)

**Project**: Zazz Board  
**Deliverable**: playwright-ui-testing  
**Created**: 2026-03-08  
**Status**: Draft  
**Mode**: Development (SPEC only, no API sync)

---

## 1. Problem Statement

Current coverage is strong at API level (Pactum/Vitest), but UI behavior is verified manually. This creates risk for regressions in user workflows (rendering, interactions, role visibility, modal behavior, i18n text presence).

The team needs UI tests that can run in CI/CD reliably and headlessly, while still allowing local interactive debugging when failures happen.

---

## 2. Recommendation

Use **Playwright as the canonical UI automation framework**.

- **CI/CD default**: headless Playwright runs (Chromium) with artifacts (trace/video/screenshot) on failure.
- **Local development**: headed Playwright mode and trace viewer for debugging.
- **Playwright MCP**: optional helper for test authoring/debug workflows; **not** the canonical CI execution path.
- **Owner interaction model**: deliver a simple command-level interface so owners do not need to work directly with Playwright APIs/config internals.

Rationale:
- Playwright is stable for CI, supports robust waiting/assertions, and provides first-class debugging artifacts.
- MCP is useful for interactive agent/operator workflows but should not be the gate in CI.

---

## 3. Goals

- Add deterministic, repeatable UI tests for critical user workflows.
- Run UI tests in CI/CD without human intervention.
- Keep execution time practical with a smoke-first strategy.
- Preserve manual verification as a complementary release check (at least initially).
- Make setup and execution **agent-managed** so a human owner can request outcomes without touching Playwright details.

---

## 4. Non-Goals

- Full UI exhaustiveness in first iteration.
- Replacing API tests with UI tests.
- Browser matrix expansion beyond Chromium in initial rollout.

---

## 5. In Scope

- Add Playwright project configuration under `client/`.
- Add agent-friendly npm scripts/commands for local and CI execution.
- Add minimum critical-path UI tests for:
  - Project list loads for authenticated user.
  - Agent token management entry point opens from project row.
  - Agent token modal core interactions (leader/non-leader visibility behavior, create/list/delete confirmation gating) once ZAZZ-6 lands.
- Add CI workflow job for headless Playwright.
- Capture test artifacts on failure (trace/screenshot/video).
- Define selector strategy (`data-testid`) for stable tests.
- Define test data/fixture strategy tied to seeded DB.
- Add contributor docs that describe **what to run**, not how to author Playwright internals.

---

## 6. Out of Scope

- Migrating all existing manual QA scenarios in one deliverable.
- Visual-diff/snapshot testing.
- Cross-browser matrix (Firefox/WebKit) in first phase.

---

## 7. Technical Design

### 7.1 Tooling

- Framework: Playwright test runner
- Browser: Chromium (headless in CI)
- Base URL: Vite client URL with API running in parallel
- Artifacts: `trace: on-first-retry`, screenshot/video on failure
- Entry points:
  - `npm run test:ui` (headless smoke; default command for owners/agents)
  - `npm run test:ui:debug` (headed debug mode; mostly for code-agent triage)
  - `npm run test:ui:update` (optional maintenance command, agent-only)

### 7.2 Selector Strategy

- Prefer `data-testid` for stable UI anchors.
- Avoid brittle selectors based on icons-only, CSS class names, or translated text where practical.

### 7.3 Fixture Strategy

- Use deterministic seeded DB data.
- Ensure at least one known leader token and one known non-leader token for permission checks.
- Provide reset-and-seed step before CI UI tests.

### 7.4 Test Scope (Initial)

- Smoke suite only (small, high-signal):
  - app boot + authenticated project list
  - open/close key modal flows
  - one permission-visibility assertion per role
  - one destructive action gating assertion (typed confirmation)

---

## 8. CI/CD Strategy

- Add a dedicated UI test job:
  1. Start/verify DB
  2. Reset/seed test DB
  3. Start API + client
  4. Run Playwright headless
  5. Upload artifacts on failure
- Initially keep as:
  - required on mainline PRs touching client or auth routes, or
  - non-blocking for first rollout window then move to blocking (team decision)

---

## 9. Acceptance Criteria

### AC-1: Playwright Foundation
- [ ] Playwright is configured in `client/` and runnable locally.
- [ ] `npm` scripts exist for headless CI and local debug execution.
- [ ] Owners can run UI validation with a single command (`npm run test:ui`) without interacting with Playwright internals.

### AC-2: Deterministic Test Environment
- [ ] UI tests can run against a reset/seeded environment with stable auth fixtures.
- [ ] Fixtures include at least one leader and one non-leader persona token.

### AC-3: Core UI Coverage
- [ ] Critical smoke tests implemented and passing locally.
- [ ] Tests include modal interaction and confirmation-gating checks.

### AC-4: CI/CD Integration
- [ ] UI tests run headlessly in CI.
- [ ] Failure artifacts (trace/screenshot/video) are accessible in CI logs/artifacts.

### AC-5: Documentation
- [ ] Contributor instructions document local run/debug workflow.
- [ ] CI behavior, gating policy, and fixture prerequisites are documented.
- [ ] Documentation is agent-first: owner asks for behavior verification; code agent handles setup/config specifics.

---

## 10. Risks and Mitigations

- Risk: Flaky UI tests due to async rendering/network timing.
  - Mitigation: Use Playwright locators/assertions with explicit waits; avoid sleeps.
- Risk: Seed data drift breaks auth-role scenarios.
  - Mitigation: Keep fixed seed tokens/roles for test personas; validate fixtures in setup.
- Risk: CI runtime increases.
  - Mitigation: Keep smoke suite minimal and parallelize where possible.

---

## 11. Open Questions

- Should first rollout be CI-blocking immediately, or non-blocking for a short stabilization window?
- Should role fixtures be expanded beyond leader/non-leader in phase 1?
- Do we want browser matrix expansion after smoke stabilization?

---

## 12. Recommendation Summary (Decision)

Adopt **Playwright headless in CI/CD** as the canonical UI test path.  
Use headed/local Playwright for debugging.  
Use MCP only as an optional assistant workflow, not as the CI test executor.  
Treat Playwright as an implementation detail: owner-level workflow should be one-command execution and code-agent-managed maintenance.
