# Ephemeral Worktree Notes

This directory is reserved for temporary working files created by the repository owner, a user, or an agent while
working inside a feature worktree.

Files placed here are local execution notes, scratch artifacts, drafts, transcripts, experiments, or other
work-in-progress materials. They are not part of the durable project record and are not expected to be tracked by Git.

The directory and this README are intentionally committed so every checkout has a visible place for this kind of
short-lived work. After the directory exists on `main`, local worktree configuration should exclude new files under
this path from tracking. Commit files from this directory only when there is an explicit decision to promote a specific
artifact into the repository history.

## Local Exclude Setup

After this README has been merged to `main` and the local `main` worktree has been updated, add the directory contents
to the bare repository's local exclude file:

```gitignore
.zazz/ephemeral/*
!.zazz/ephemeral/README.md
```

For this checkout layout, the exclude file is:

```text
/Users/michael/Dev/zazzcode/zazz-board/.bare/info/exclude
```

This keeps the directory and README tracked while leaving any new scratch files under `.zazz/ephemeral/` untracked by
default. The negated README rule is included so the local exclude does not hide future intentional edits to this file.

If a file from this directory should become part of the durable repository record, explicitly force-add it:

```bash
git add -f .zazz/ephemeral/<file>
```
