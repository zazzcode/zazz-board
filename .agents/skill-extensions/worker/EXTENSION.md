# Worker Skill Extension

This file is repo-specific companion guidance for the base `worker` skill.
Read it after `.agents/skills/worker/SKILL.md` and treat it as additive guidance for this repository.

## Codex Harness Guidance

This project is using Codex worker agents.

When the approved PLAN or planning algorithm allows safe parallel execution:

- prefer using the harness capability that spawns subagents for independent tasks
- maximize parallel execution only when dependency order and file ownership rules remain valid
- keep file ownership disjoint across subagents whenever possible
- if tasks overlap in files or require tightly coupled edits, serialize them instead of forcing parallelism
- the parent worker remains responsible for integration, verification, and truthful board state updates

## Intent

This extension exists to push the worker toward safe harness-aware parallelism in this repo.
It supplements the base worker skill and does not weaken its locking, testing, escalation, or truthfulness requirements.
