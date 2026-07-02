# Ephemeral Worktree Notes

This directory is reserved for temporary working files created by the repository owner, a user, or an agent while
working inside a feature worktree.

Files placed here are local execution notes, scratch artifacts, drafts, transcripts, experiments, or other
work-in-progress materials. They are not part of the durable project record and are not expected to be tracked by Git.

The directory and this README are intentionally committed so every checkout has a visible place for this kind of
short-lived work. The repository `.gitignore` excludes new files under this path from tracking while keeping this
README visible and versioned. Commit files from this directory only when there is an explicit decision to promote a
specific artifact into the repository history.

## Ignore Behavior

This repository intentionally ignores scratch files under this directory:

```gitignore
.zazz/ephemeral/**
!.zazz/ephemeral/
!.zazz/ephemeral/README.md
```

This keeps the directory and README tracked while leaving any new scratch files under `.zazz/ephemeral/` untracked by
default. The negated README rule is included so future intentional edits to this file remain visible to Git.

If a file from this directory should become part of the durable repository record, explicitly force-add it:

```bash
git add -f .zazz/ephemeral/<file>
```

## Handoff Documents

Handoff documents are cross-agent working notes. They must be usable by any agent platform or developer that opens this
repo, so do not make them Codex-specific.

Name every handoff document with a local timestamp down to seconds:

```text
<topic>-handoff-YYYY-MM-DD-HHMMSS.md
```

Example:

```text
gantt-ui-handoff-2026-07-02-132600.md
```

This timestamp is required so multiple handoffs from the same day sort chronologically and the newest handoff is obvious.
