---
name: handoff
description: Create or update platform-neutral handoff documents for agents and developers when work needs to be paused, transferred, resumed in another session, or cataloged as follow-up context; use for ephemeral handoff notes, issue catalogs, continuation plans, and cross-agent summaries.
---

# Handoff

Use this skill when a user asks for a handoff document, continuation note, stale-session summary, issue catalog for another agent, or any artifact meant to help another agent or developer resume work.

## Core Rules

- Handoff documents are platform-neutral working notes. Do not make them Codex-specific, Claude-specific, Cursor-specific, or tied to any single agent runtime.
- Store temporary handoff documents under `DOCS_ROOT/ephemeral/` unless the user explicitly specifies another location. In this repo, `DOCS_ROOT` is `.zazz`, so the default location is `.zazz/ephemeral/`.
- Name every handoff document with local date and time down to seconds:

```text
<topic>-handoff-YYYY-MM-DD-HHMMSS.md
```

- Do not commit handoff documents. The generated handoff file must be ignored by git.
- Do not change `.zazz/standards/*` while creating a handoff unless the user explicitly confirms the standards change.

## Workflow

1. Read the current task context, relevant diffs, recent commits, and test or verification results.
2. Identify `DOCS_ROOT`. Use `.zazz` when the repo has one; otherwise use the repository's documented project-doc root.
3. Create `DOCS_ROOT/ephemeral/` if it does not exist.
4. Generate the timestamp from local time unless the user requests another timezone.
5. Write a concise Markdown handoff with enough context for another agent or developer to continue safely.
6. Verify the handoff file is ignored by git before finishing.

## Recommended Content

Include the sections that fit the situation:

- **Context:** Current branch, project area, user intent, and why the handoff exists.
- **Completed:** Commits, pushed branches, schema or seed changes, UI/API behavior already handled.
- **Open Issues:** Bugs, incomplete behavior, questions, or risks that still need investigation.
- **Files To Inspect:** Key files and why they matter.
- **Verification:** Tests run, manual checks performed, and known gaps.
- **Next Steps:** Ordered, actionable work for the next agent or developer.

Keep the document practical. Prefer concrete file paths, commands, observed errors, and reproduction steps over broad narration.
