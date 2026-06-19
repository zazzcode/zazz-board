# Zazz Board Project - Agent Orientation

This is the **first-read orientation** for agents working in a `zazz-board`
feature worktree. It covers worktree layout, dev policy, and agent discipline.
Everything else — Worktrunk/worktree commands, stacked-branch workflow, env
hygiene — lives in the vendored guides under `.zazz/docs/` and the standards
under `.zazz/standards/` (gated by `.zazz/standards/index.yaml`).

**Scope rule**: Load `zb-agent-orientation.md` at the start of every session for
repo layout and dev policy. Load other guides **only when the task matches**
their content — do not pull every document into context by default.

## Repo Layout

This directory is a **worktree container**: a shared bare Git repository under
`.bare/` plus a set of sibling worktrees — `main/` (the integration worktree,
read-only) and one folder per feature branch. Worktrunk is used optionally for
worktree lifecycle management; the base capability is `git worktree`.

```text
/Users/michael/Dev/zazz-board/
├── .bare/            ← shared bare Git object store (do not edit unless repo plumbing)
├── main/             ← integration worktree (GitHub main, READ-ONLY)
├── <feature-1>/      ← sibling feature worktree (this is where you work)
├── <feature-2>/      ← sibling feature worktree
└── ...
```

Each sibling worktree's `.git` is a pointer into `.bare/worktrees/<name>`
(`gitdir: /Users/michael/Dev/zazz-board/.bare/worktrees/<name>`), so `main/` and
all feature worktrees share one object store. `git worktree list` confirms the
layout.

Inside any worktree the tracked layout is:

```text
├── .agents/skills/     # Zazz agent skills (vendored from zazz-skills + local-only)
├── .zazz/              # DOCS_ROOT: project.md, standards/, deliverables/, docs/,
│                       #   specifications/, architecture/, features/, proposals/,
│                       #   execution/ (gitignored runtime records)
├── api/                # Fastify, routes/, services/, lib/db/schema.js, __tests__/
├── client/             # React, Vite, Mantine
├── scripts/            # zazzctl, sync-skills-from-zazz-skills.sh, deploy-docker.sh
├── docker-compose.yml   # Postgres on host 5433
└── package.json
```

Rules:

- `.bare/` holds shared Git metadata. Do not edit unless the task is repo plumbing.
- The `main` worktree is **read-only**. Do not edit, merge, or commit in `main`.
- Create a sibling feature worktree per branch (see Worktree Setup below).
- Root-level agent guidance (`AGENTS.md`, `WARP.md`) and `.zazz/` are tracked
  project files; treat them as such.

## `main` Worktree Policy

The `main` worktree mirrors GitHub `main` and is the source for new sibling
worktrees. Do not use it for feature work.

Rules:

- do not create, edit, delete, or reformat tracked files in `main/`
- do not leave untracked files in `main/`
- do not use `main/` as a scratchpad
- do not run feature work from `main/`
- never merge into `main` locally — main must reflect GitHub after `git pull`
- if `main/` shows local changes, stop and determine why before continuing
- from time to time, the developer may copy new or modified agent skills and
  other untracked files into `main/` so they propagate to new worktrees

Before starting work, verify `main` is clean and current:

```bash
cd <path-to-main-worktree>
git status --short --branch
git fetch origin main
git rev-list --left-right --count HEAD...FETCH_HEAD
```

- `0 0` means local `main` matches GitHub `main`
- any nonzero count means `main` is ahead or behind; stop and investigate
- any untracked or modified file in `main/` means stop and investigate

After that, create or switch to a sibling feature worktree for implementation.

## Agent Behavior

Favor verification over assumption.

- do not guess when the repository, files, or Git state can be checked directly
- verify assumptions before acting on them
- ask the user a focused question if something important cannot be verified safely
- expect the developer to edit files while the agent is working; this is normal
- if a file changes unexpectedly, first ask whether the developer changed it
- do not treat concurrent developer edits as corruption, agent failure, or a
  reason to improvise a recovery plan
- do not invent project conventions, branch intent, or file purpose
- distinguish clearly between confirmed facts and working assumptions
- do not create ad-hoc `rules` files; standards and guardrails belong in
  tracked markdown documents under `.zazz/standards/`
- when searching, prefer `rg`; when checking repository state, prefer
  `git status --short --branch`

### Command Shape Discipline

Approval matching is literal enough that command shape matters.

- reuse the same command wrappers instead of inventing new shell forms
- prefer a small stable set of command shapes across a session
- batch related work into fewer commands when possible
- if a command must be rerun with a slightly different target, keep the wrapper
  and argument order the same

Preferred command shapes in this repo:

```bash
# API tests (always source api/.env; the api test script already sets NODE_ENV=test)
cd api && set -a && source .env && set +a && npm run test
cd api && set -a && source .env && set +a && npm run test -- __tests__/routes/<file>.test.mjs

# Lint (root runs api + client + markdown; or scope to one)
npm run lint                       # lint:api + lint:client + lint:md
npm run lint:client                # cd client && eslint .
npm run lint:md                    # markdownlint-cli2

# Database (Postgres via Docker on 5433)
npm run docker:up:db               # start Postgres only
npm run db:reset                   # dev DB: drop, push schema, re-seed (routine in development)
npm run db:push                    # push schema changes, preserves data (api: drizzle-kit push --force)
npm run db:seed                    # seed only (tables must exist)

# Run the app
npm run dev          # API + client
npm run dev:api      # API on :3030
npm run dev:client   # client on :3001

# GitHub
gh pr view ...
gh pr edit ...
```

Do not vary wrappers casually just because a command is technically equivalent.
Doing so creates avoidable approval prompts and interrupts long-running work.

## Markdown Document Standards

When creating or editing markdown documents, write for technical decision-making.
This is engineering documentation, not narrative prose.

- be concise, direct, and specific
- state the purpose of the document near the top
- keep the document scoped to the task, PR, incident, or decision at hand
- prefer facts, decisions, status, risk, and verification over background narration
- avoid filler, motivational language, rhetorical framing, and repeated explanations
- do not restate the same point in multiple sections unless the distinction is
  operationally useful
- once an item is resolved, mark it as `Implemented`, `Done`, `Rejected`, or
  `Deferred`; do not keep arguing the resolved decision
- separate current required actions from follow-on work
- include risk only when it affects a decision; keep risk statements short and concrete
- remove obsolete recommendations after implementation, or rewrite them as
  completed actions
- edit documents in place when updating them; do not delete and recreate
  documents as a shortcut because it loses useful continuity and costs more
  context than a targeted edit
- if a document needs to be recreated as a variant, copy it first and edit the
  copy; delete the original only when the user explicitly asks for deletion
- keep headings and bullets functional; avoid decorative structure
- use links, file paths, commands, commit SHAs, and test results when they clarify the record

## Branch Scope Discipline

Agents frequently confuse the full repository state with the branch's
intended change set. The active worktree contains the entire codebase, but
the task is scoped to the diff between this branch and `main`.

### Critical invariant: `main` is always green

`main` is the integration branch. Every PR targets `main`, and CI blocks merge
unless all checks pass. Therefore **it is impossible for `main` to contain a
pre-existing test failure**. If you see a failing test on your branch, it
was introduced by this branch — either in the failing file directly, or by a
change in a dependency that the test exercises.

Do not dismiss a failure as "pre-existing" or "unrelated" without proving
that your branch did not cause it.

### Worktree scope

The active feature worktree is the project root for file operations, test runs,
and commits. Confirm your current directory before editing files or running git
commands. If you are outside the intended worktree, stop and move to the correct
directory first.

### Verify scope before acting

Always determine what this branch actually changes before running tests,
linters, or applying fixes.

```bash
# Show exactly which files differ between this branch and main
git diff main --stat
```

If a file does not appear in that diff, it is **out of scope for edits**. Do
not modify it. However, if running the full test suite shows a failure in an
unmodified file, your branch likely changed a dependency that the test relies
on. Treat the failure as caused by this branch until proven otherwise.

For stacked branches, scope formatting and linting to the current slice of the
stack, not every file changed between the full stack and `main`. Parent-branch
files may appear in `git diff main`, but they are already owned by lower stack
branches. Do not run auto-fixers, formatters, or lint repairs against parent
slice files unless the user explicitly asks to change that lower branch. If
you are not sure which files belong to the current slice, inspect the top commit
or ask the user before running a fixer.

### Worktree branch cleanup

Feature branches are normally owned by the developer. A push rejection on a
branch usually means the local worktree branch and the remote copy of the same
branch have different history shapes, not that another developer changed the
files.

Do not reflexively merge the remote branch into the local branch. First verify:

- current worktree path and branch name
- `origin/main` ancestry
- local branch vs `origin/<branch>` divergence
- exact conflicted file names, if any

If a rebase or merge reports conflicts, stop and tell the user the specific
file paths before choosing a resolution. Do not assume the remote side is
another developer's change, and do not silently pick "ours" or "theirs" for
conflicted files.

### Agent-created worktrees (Cursor / Claude)

`git worktree list` may show checkouts under `<feature-worktree>/.claude/worktrees/`.
These are tool-created, not the developer's feature worktrees. The developer's real
checkout is the sibling folder (for example `add-soft-jsdoc-typing/`), not
`.claude/worktrees/<random-name>/`.

Rules:

- do not create additional worktrees unless the user or `wt-cheat-sheet.md` asks
- do not treat `.claude/worktrees/` as the project root for commits or pushes
- if cleanup is requested, remove only the agent path with
  `git worktree remove --force <path>`, then `git worktree prune`; do not remove
  the sibling feature worktree the developer is using
- untracked `.claude/worktrees/` after removal is normal; do not commit it

### Common mistakes to avoid

1. **Running the full test suite without scoping.**
   Running the full Vitest suite without filtering executes every test in
   `api/__tests__/`. A failure is real and caused by this branch unless proven
   otherwise, but it may be in a dependency rather than the file you edited.
   Scope the test run to the changed paths first to isolate direct issues, then
   run the full suite to catch regressions:
   ```bash
   # API — test only the file you touched
   cd api && set -a && source .env && set +a && npm run test -- __tests__/routes/<file>.test.mjs
   ```

2. **Calling unrelated failures "pre-existing".**
   By definition, there are no pre-existing failures on `main`. A failing test
   in `deliverables.test.mjs` when your diff only shows `tasks.test.mjs` means
   your branch changed something that breaks that test (e.g., a shared helper,
   a common import, or a schema change). Investigate the root cause before
   declaring it out of scope.

3. **Changing shared configuration files for branch-specific issues.**
   If a linter complains about a new helper, do not add a global ignore rule to
   a shared ESLint or markdownlint config. Use a per-file override instead
   (`// eslint-disable-next-line ...` on the line, or a markdownlint
   `<!-- markdownlint-disable -->` control). This keeps the branch's
   footprint minimal and avoids unintended side effects on other worktrees.

4. **Mixing services in a single commit when only one is in scope.**
   If the branch diff only shows `api/` files, do not touch `client/` files,
   even for "quick" formatting fixes. Keep each commit scoped to the service
   and files that the branch actually changes.

5. **Fixing lint or formatting in a parent slice of a stacked branch.**
   On stacked branches, do not treat every lint complaint in
   `git diff main...HEAD` as permission to edit that file. A parent slice may
   already be pushed, reviewed, and green in CI. Auto-fix only files owned by
   the current explicit slice of the stack. If ESLint, markdownlint, or any
   other fixer reports an issue in a parent-slice file, stop and report it
   instead of changing it.

6. **Running formatters across the whole branch when the task is one file.**
   `git diff main --name-only` lists every file the **PR branch** changes, not
   the files the **current task** changes. A one-line fix on a long-lived branch
   must not trigger ESLint or markdownlint across that entire list. Doing so
   auto-edits unrelated paths and creates false "recovery" work.

### Decision checklist

Before editing any file, ask:

- Does this file belong to the current explicit slice of the stack? If no, stop
  — do not edit it, even for formatting or lint fixes.
- Does `git diff main -- <file>` show any changes? If no, stop — do not edit it.
- Did this branch change a shared dependency (import, helper, schema) that the
  failing test relies on? If yes, the failure is in scope.
- Can I fix this with an inline override instead of a shared config change?
  If yes, prefer the inline override.

## Standards, Skills and Guardrails

- `.agents/skills/` in the active worktree is the authoritative local agent
  skill set. Framework skills are vendored from `zazz-skills`; local-only
  skills (`worker`, `database-baseline-refresh`) are owned by this repo.
- Load only the skills needed for the current task. If the user asks for
  `pr-builder`, `qa-testing`, `worker`, `psql`, or any other named skill, check
  `<worktree>/.agents/skills/<name>/SKILL.md` before deciding the skill is
  unavailable.
- Skills are refreshed via `./scripts/sync-skills-from-zazz-skills.sh`. The
  script's `IGNORE_SKILLS` list marks upstream skills this repo does not vendor
  (currently `sqlcmd`, `jira-api`); `LOCAL_ONLY_SKILLS` marks repo-owned skills
  the sync never touches (`worker`, `database-baseline-refresh`). Do not locally
  edit vendored skills — update upstream and re-sync.
- Project standards are tracked under `.zazz/standards/`. Read
  `.zazz/standards/index.yaml` and load only the standard documents relevant to
  the current session. Repo-specific standards (`system-architecture`,
  `data-architecture`, `testing`, `coding-styles`) take precedence over the
  generic methodology standards and the placeholder stack standards. See
  `.zazz/standards/contextual-split.md` for the tier model.
- `.cursor/rules/` carries always-applied rules for Cursor (e.g. worktree
  workflow). AGENTS.md is the primary reference for agents and developers.

## Database Safety

Zazz Board uses PostgreSQL 15 (via Docker, host port 5433). The project is still
in development, so the **dev** database is regularly dropped and re-seeded from
the canonical seed baseline. This is a normal, expected operation here — not a
last resort. `npm run db:reset` drops the tables, pushes the latest schema via
Drizzle, and re-seeds (`api/scripts/reset-and-seed.js`). The seed scripts carry
their own guards (environment checks, stage/prod seeding blocks).

The safety boundary is **which database** an action targets, not whether the
action is destructive in the abstract.

- the **dev** DB (`DATABASE_URL` → `zazz_board_db` by default) is disposable:
  dropping, resetting, and re-seeding it is routine during development. Run
  `npm run db:reset` (or `npm run docker:reset:seed` against the Docker DB) as
  needed. If real accumulated dev data must be preserved across a schema
  change, use `npm run db:push` instead, or use the `database-baseline-refresh`
  skill.
- the **test** DB (`DATABASE_URL_TEST` → `zazz_board_test`) is owned by the
  test suite. Tests run only against it under `NODE_ENV=test` and re-seed it
  themselves. Do not point `DATABASE_URL` at the test DB for manual work.
- never point `DATABASE_URL` or `DATABASE_URL_TEST` at a **production**
  database. The seed scripts block stage/prod seeding, but treat that as a
  backstop, not a license — confirm the target before running any DB command.
- never run `db:reset` against a database whose data you cannot afford to lose
  without confirming the target first.
- do not assume a failing command means the database is corrupt; prefer logs,
  connection checks, and read-only `psql` queries before any recovery step
  (see the `psql` skill for safe diagnostic commands).
- for bulk destructive actions outside the normal reset/reseed flow (manual
  `DROP`/`TRUNCATE`, schema-wide deletes), confirm the target DB and ask the
  user before running.

### Routine dev-DB reset (normal in development)

```bash
# Start Postgres (host 5433)
npm run docker:up:db
# Drop, push latest schema, and re-seed the dev DB (destructive, dev-only)
npm run db:reset
# Or, against the Docker Compose DB while containers run:
npm run docker:reset:seed
```

Confirm `DATABASE_URL` points at the dev DB before running. If you need to
preserve live dev data across a schema change, use `npm run db:push` instead, or
run the `database-baseline-refresh` skill to preserve, upgrade, and re-freeze the
baseline.

## Local Ignores

Put machine-local ignore rules in local exclude files, not in the team-tracked
`.gitignore`.

| Scope | Path |
|-------|------|
| Every worktree | `.git/info/exclude` |
| One worktree only | `<worktree>/.git/info/exclude` (per worktree in a linked worktree setup) |

`.zazz/.gitignore` additionally ignores runtime files under `.zazz/execution/`
and agent lock/audit artifacts.

Staging rule:

- Treat `.gitignore` and local exclude rules as authoritative commit boundaries.
  Do not use `git add -f`, `git add --force`, or any equivalent command to
  stage ignored or locally excluded files. If an ignored file seems like it
  should be tracked, stop and ask the developer to change the ignore policy or
  confirm a different destination first.

Local-only notes and generated artifacts:

- Keep local conventions, run notes, draft PR text, timing captures, and
  handoff notes in local-only notes unless the user explicitly asks for a
  tracked project document. `.zazz/execution/` is gitignored and is the right
  place for run logs, handoff notes, QA findings, and recovery notes.
- Keep generated artifacts out of tracked source, tests, and docs unless the
  task explicitly requires a tracked fixture or reference file.

## Worktree Setup

Zazz Board uses a `.bare` worktree container. Create a sibling feature worktree
from `main` (run this from the container root or any existing worktree):

```bash
git worktree add -b <branch> ../<worktree-name> main
cp ../main/.env ./.env
cp ../main/api/.env ./api/.env
cmp -s ../main/.env ./.env
cmp -s ../main/api/.env ./api/.env
```

Always copy both env files from `main` and verify parity. If a branch adds or
changes env settings, ask the user whether those changes should also be applied
to the `main` worktree before assuming automatic propagation.

Worktrunk is optional for worktree lifecycle management; the base capability is
native `git worktree`. For Worktrunk commands and the worktree lifecycle, see
`.zazz/docs/wt-cheat-sheet.md`. For stacked branches, see
`.zazz/docs/using-gh-stack.md`.

## Document Routing

Load guides under `.zazz/docs/` and standards under `.zazz/standards/` based on
the current task. Do not pull every document into context by default.

| When the task involves... | Load |
|---------------------------|------|
| Orientation, dev policy, repo layout | `zb-agent-orientation.md` (this file) |
| Worktree/worktrunk commands, worktree lifecycle | `.zazz/docs/wt-cheat-sheet.md` |
| Stacked-branch workflow, dependent PRs | `.zazz/docs/using-gh-stack.md` |
| Human-in-the-loop PR review | `.zazz/docs/human-in-loop-pr-review-strategy.md` |
| Code review graph guidance | `.zazz/docs/code-review-graph.md` |
| Agent execution discipline | `.zazz/docs/agent-execution-discipline.md` |
| Project rules (stack, layers, DB, testing, coding) | `.zazz/standards/` via `.zazz/standards/index.yaml` |
| Full API route list, DB setup, troubleshooting | `AGENTS.md` |
| Syncing skills from upstream | `scripts/sync-skills-from-zazz-skills.sh` + README §Updating skills |

## Pre-commit and Local Verification

This repo uses `husky` + `lint-staged` (see `.husky/` and
`scripts/lint-staged-files.mjs`). CI runs the same checks that run locally on
staged files. A common reason for CI failure after local testing is that only
part of the validation pipeline was run.

### Development vs. pre-push workflow

During active development, iterate with scoped tests. Do not run the full
pipeline on every commit.

```bash
# Fast feedback during development, scoped to the file you are changing
cd api && set -a && source .env && set +a && npm run test -- __tests__/routes/<file>.test.mjs
npm run lint:client
```

Run the full suite before a **full PR push** when the user is finishing a
slice or explicitly asks for pre-push verification:

```bash
# Full API test suite (requires docker:up:db and the zazz_board_test DB)
cd api && set -a && source .env && set +a && npm run test
# Full lint (api + client + markdown)
npm run lint
```

### Scoped formatting and linting (default for small edits)

Match verification to **what changed in this session**, not the entire branch
diff against `main`.

**Determine the file set**

```bash
# Uncommitted work (most common during the day)
git status --short

# Already staged
git diff --cached --name-only

# Last commit only (after commit, before push)
git diff-tree --no-commit-id --name-only -r HEAD
```

Use the path(s) the user named, plus paths from the commands above. Do **not**
default to `git diff main --name-only` or running formatters across all files
for a one-file task.

**Run lint/format only on those paths**

```bash
# Client lint is eslint . ; scope by passing a path
npm run lint:client -- -- src/path/to/<file>.jsx
# Or invoke eslint directly on one file
cd client && npx eslint src/path/to/<file>.jsx
# Markdown lint one file
npx markdownlint-cli2 path/to/<file>.md
```

`lint-staged` runs automatically on staged files via the husky pre-commit hook,
so for a normal commit you do not need to invoke formatters manually — just
stage the intended files.

**After any formatter or lint run**

```bash
git status --short
```

- If only the intended file(s) changed, proceed.
- If other tracked files changed, stop. Run `git restore -- <unintended-path>`
  (or ask the user) before commit or push. Do not commit drive-by formatter
  edits "while we're here."

**Commit and push discipline**

- one logical change → one commit on the files that change belongs in
- never merge into `main` locally; push the branch and merge on GitHub
- if push is rejected (non-fast-forward), verify divergence with
  `git fetch origin <branch>` and `git rev-list --left-right --count HEAD...FETCH_HEAD`
  before `git pull --rebase`; do not force-push unless the user explicitly asks
- after push, confirm `0 0` on `HEAD...FETCH_HEAD` and a clean
  `git status --short` before declaring done
- do not commit unless the user explicitly asks you to

### What each check catches

| Check | What it catches | Common miss |
|-------|-----------------|-------------|
| ESLint | Unused vars, undefined names, React hook rules | Missing `// eslint-disable` |
| markdownlint-cli2 | Markdown formatting (headings, lists, line length) | Auto-fix output drift |
| Vitest (PactumJS) | API behavior, route contracts, auth/validation errors | Tests not isolated; missing `beforeEach` clear |
| OpenAPI spec test | Generated spec validity + core agent route docs | Schema/response drift |

### Decision checklist before pushing

- Did I run checks on the **task file set** (or the full suite only when the user
  asked for pre-push / PR-wide verification)?
- After any auto-fixer, does `git status --short` show only intended paths?
- Did I run the full Vitest suite before this push, or only a subset? (Full
  suite is for PR-wide pushes, not one-file fixes.)
- If I renamed a function or changed a schema, did I update all callsites?
  (`rg old_name`)
- Are there unstaged changes a formatter created that I need to commit?
  (`git status --short`)
