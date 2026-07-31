---
name: spec-driven-development
description: >-
  Apply or explain the end-to-end spec-driven development lifecycle: creating and
  greenlighting specs, implementing through an AC/TDD loop, owner steering during
  implementation, run logs, Implementation Feedback Iterations, automated review/QA,
  PR feedback, and final human sign-off. Use when the user asks about SDD methodology,
  how spec/run-log/changelog artifacts relate, when to update a greenlit spec, or how
  agents, subagents, owners, QA, and reviewers should coordinate around an approved
  specification.
---

# Spec-Driven Development

Use this skill for the lifecycle around deliverable specifications from greenlight
through merge. It does not replace `spec-builder`, `worker`, `qa-testing`, or
`pr-review`; it defines how those roles fit together and how their artifacts relate.
A worker is the implementation unit: one lead agent, delegated subagents, or both.

If the user is primarily asking to draft or refine the initial deliverable
specification, use `spec-builder`. If the user is asking how an approved spec moves
through implementation, steering, review, feedback, rework, and sign-off, use this skill.

## Core Model

A deliverable specification is the product contract for one deliverable. Once the Owner
greenlights it for implementation, keep the original specification body intact as
contract history.

Implementation proceeds through an acceptance-criteria loop:

1. read the greenlit specification and required references
2. verify applicable standards from the repo standards index
3. start with the specified TDD entry point
4. implement in small slices
5. run the verifying tests or manual checks named by the ACs
6. repeat until each greenlit AC has evidence

Owner steering, review feedback, and QA findings may change the final deliverable during
that loop or during review. When accepted feedback changes product behavior, UX, API
contract, validation, or bug-fix behavior in the same deliverable context, record it in
the specification's `Implementation Feedback Iterations` section.

## Lifecycle

0. **Create and refine the spec.** The Owner and `spec-builder` shape the original
   specification contract until it is greenlit. Detailed authoring rules live in
   `spec-builder`; this skill treats the greenlit spec as the lifecycle input.
1. **Implement through the AC/TDD loop.** The worker satisfies the greenlit ACs and
   collects evidence, using subagents when the active model/harness supports them.
2. **Owner steering during implementation.** The Owner may redirect behavior while the
   agent is implementing. Accepted product-contract changes become Implementation
   Feedback Iterations.
3. **Owner review and hands-on testing.** The Owner tries the implemented deliverable
   and gives feedback. Accepted product-contract changes become Implementation Feedback
   Iterations.
4. **Automated agentic review.** QA, standards, and spec-compliance agents review the
   implementation. Accepted product-contract changes become Implementation Feedback
   Iterations; ordinary review notes stay in PR/review artifacts.
5. **Rework and reverification.** The worker resolves accepted feedback and reruns
   targeted evidence.
6. **Final human sign-off.** The Owner reviews the final behavior and PR evidence before
   merge.

Steps 2-5 may repeat. Treat the lifecycle as a controlled feedback loop, not a strict
waterfall.

## Artifact Boundaries

- **Specification body**: the greenlit original contract. Do not silently rewrite it
  after implementation starts.
- **Implementation Feedback Iterations**: append-only changelog in the spec for accepted
  product-contract changes in the same deliverable context.
- **Run log**: detailed mutable execution history, attempts, QA notes, evidence, and
  recovery notes. A run-log entry may source a feedback-iteration item, but routine
  run-log entries do not belong in the spec.
- **PR body/review thread**: reviewer-facing summary, unresolved review conversation,
  and final evidence. It should summarize material feedback iterations.
- **Commit history**: implementation history. Do not rely on commits alone to explain
  product-contract changes.

## Feedback Iteration Trigger

Add or update an `Implementation Feedback Iterations` entry when accepted owner steering,
human testing, QA/UAT, PR review, or automated agentic review changes any of these within
the same deliverable context:

- feature behavior or acceptance expectations
- UX behavior, user-facing copy with product meaning, or workflow affordances
- API contract, schema, route behavior, or validation behavior
- bug-fix behavior discovered during implementation, review, or testing
- reviewer-requested behavior that explains why the final deliverable differs from the
  greenlit specification

Do not use the section for pure refactors, formatting, README/process/skill cleanup,
PR-body edits, test-only cleanup with no behavior-contract impact, routine verification
notes, or ordinary implementation progress.

## Entry Shape

Use this structure:

```markdown
### I-N — Short Behavior Name

**Source.** Owner steering, user testing, PR review, QA finding, or discovered bug with date/context.

**Context.** What gap, bug, or refinement was discovered.

**Improvement.** What changed in product behavior, UX, API contract, validation, or bug handling.

**Boundary.** What did not change, especially where the original specification contract remains intact.

**Verification.** Automated tests, manual check, live API/schema check, or review evidence.
```

Keep entries concise and product-focused. If the note would not help a future reviewer
understand why final behavior differs from the greenlit specification, keep it out of the
spec.

## When To Create A New Spec Instead

Create or request a separate specification when accepted feedback:

- creates a new deliverable boundary
- requires a separate review artifact
- changes the approved branch/PR topology
- introduces a new feature context
- makes the original specification misleading even with an append-only changelog
- is primarily docs/process/tooling work and that work is not the deliverable's
  user-facing product capability

## Coordination With Other Skills

- Use `spec-builder` to create the initial deliverable specification or to make
  Owner-approved revisions to the specification artifact.
- Use `worker` to implement an approved specification as the lead agent, delegated
  subagents, or both.
- Use `qa-testing` for verification, UAT-style evidence, and test-quality findings.
- Use `pr-review` for formal standards/spec compliance review.
- Use this skill when the question is about the lifecycle, artifact boundaries, feedback
  loops, or whether accepted feedback belongs in the spec, run log, PR, commit history,
  or a new specification.
