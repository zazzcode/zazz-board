# Methodology guides

Supporting methodology guides and workflow cheat sheets, vendored from the upstream
[zazz-skills](https://github.com/zazzcode/zazz-skills) `docs/` directory.

Only the top-level workflow guides are kept here. The methodology section docs
(`methodology/`), the standards library (`standards/` — see `.zazz/standards/`), and
the proposal templates (`proposals/`) are intentionally NOT vendored into this
directory: the standards live under `.zazz/standards/` (see
[../standards/index.yaml](../standards/index.yaml)), and the full methodology
progression lives upstream in `zazz-skills/docs/methodology/`.

## Guides

- [agent-execution-discipline.md](agent-execution-discipline.md) — agent execution discipline
- [worktree-setup.md](worktree-setup.md) — worktree operating model setup
- [wt-cheat-sheet.md](wt-cheat-sheet.md) — Worktrunk cheat sheet
- [using-gh-stack.md](using-gh-stack.md) — stacked PR lanes with `gh-stack`
- [code-review-graph.md](code-review-graph.md) — code review graph guidance
- [human-in-loop-pr-review-strategy.md](human-in-loop-pr-review-strategy.md) — human-in-the-loop PR review strategy

## Sync discipline

These guides are vendored from upstream `zazz-skills/docs/` (top-level `.md` files only)
and should be refreshed periodically:

```bash
# re-sync just the top-level guides (skips methodology/, standards/, proposals/)
SRC=/path/to/zazz-skills/docs
DST=.zazz/docs
for f in "$SRC"/*.md; do cp "$f" "$DST/$(basename "$f")"; done
```

They are reference material; do not edit them locally — update upstream and re-sync.
