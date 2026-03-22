# Features, Milestones, and Deliverables Management

Current milestone: M1 planned  
Next likely milestone: M2

## 1. Introduction

Zazz Board already manages deliverables and tasks well, but it does not yet
provide a first-class way to view work in the broader context of long-lived
features and milestone progression.

The product gap is not just missing data fields. The board currently lacks a
durable feature layer that helps Product Owners, Project Owners, and
stakeholders answer questions such as:

- What feature is this deliverable advancing?
- What milestone of that feature are we currently executing?
- Which deliverables collectively move a milestone forward?
- Which deliverables are intentionally standalone and not part of a feature
  roadmap?

This feature introduces feature-aware and milestone-aware organization while
preserving an important Zazz boundary: the canonical feature narrative lives in
Git-managed feature documents, while the board remains the operational system
for execution slices such as deliverables and tasks.

## 2. Why This Feature Matters

This feature matters because Zazz Board is intended to support not only
execution tracking, but also the product and roadmap context that explains why
execution is happening.

Without a feature and milestone layer:

- deliverables appear as isolated execution units
- stakeholders cannot easily see how planned and active deliverables roll up
  into a larger capability
- roadmap progress has to be reconstructed manually from docs, board state, and
  Git branches
- there is no consistent way to distinguish milestone-driven deliverables from
  standalone bug fixes, chores, or one-off technical work

The goal is not to turn the board into the primary authoring tool for feature
planning. The goal is to make the board an accurate and useful display and
execution companion for a Git-native roadmap model.

## 3. Current State

Today, the system supports:

- project-level organization
- deliverables as bounded execution slices
- tasks under deliverables
- deliverable and task workflows
- SPEC and PLAN path tracking for deliverables
- worktree and branch metadata on deliverables

Today, the system does not support:

- a tracked `.zazz/features/` directory in this repo
- a first-class feature view in the board
- milestone definitions or milestone visualization in the board
- a way to associate deliverables to a feature
- a way to associate deliverables to a milestone within a feature
- a way to distinguish milestone-grouped deliverables from intentionally
  standalone deliverables in roadmap views

## 4. Product Boundary and Source-of-Truth Model

This feature must preserve a clear boundary between durable product definition
and execution state.

### 4.1 Canonical in Git-managed feature docs

The feature document is the canonical source for:

- feature name and purpose
- feature-level current state
- milestone definitions
- milestone order and intended outcome
- roadmap narrative for completed, current, and planned milestones

### 4.2 Canonical in the board application

The board is the canonical source for:

- deliverables
- tasks
- workflow state
- operational progress of execution
- metadata associating deliverables to a feature and optionally to a milestone

### 4.3 Explicit anti-duplication rule

The board must not become a second authoring system for rich feature-document
content.

The board may store or cache lightweight metadata needed for display, querying,
and grouping, but the board must not become the primary home for:

- feature narrative
- milestone narrative
- detailed roadmap explanation
- stakeholder-facing feature documentation

## 5. Feature-Level Success Criteria

This feature is successful when:

1. Zazz Board can show a durable feature and milestone structure without
   requiring the feature document content to be duplicated into the database.
2. Stakeholders can see which deliverables are advancing a milestone and which
   deliverables are intentionally standalone.
3. Milestone meaning remains authored in the feature document, not in a second
   board-only roadmap editor.
4. The board can visualize roadmap progress while still reflecting live
   deliverable status from the execution system.
5. Deliverables can remain outside both feature and milestone context when they
   represent standalone bug fixes, chores, maintenance, or other work that does
   not belong in a feature roadmap.

## 6. Core Concepts

### Feature

A long-lived application capability described by a tracked Feature Requirements
Document under `.zazz/features/`.

### Milestone

A meaningful increment of a feature that describes an outcome or capability
slice. Milestones belong to a feature and are defined in the feature document.

### Deliverable

A bounded execution slice in the board. A deliverable may:

- belong to a feature and a milestone
- belong to a feature but not a milestone
- belong to neither feature nor milestone

A deliverable must not belong to a milestone without also belonging to that
milestone's parent feature.

### Standalone deliverable

A deliverable intentionally outside feature-roadmap structure, such as a bug
fix, maintenance task, infrastructure chore, or tactical refactor.

## 7. User and System Flows

### 7.1 Product and roadmap authoring flow

1. Product Owner or Project Owner creates or updates a feature document in Git.
2. The feature document defines the feature's current state and milestone
   roadmap.
3. The feature document remains the stakeholder-facing explanation of what the
   feature is and what each milestone means.

### 7.2 Execution association flow

1. A deliverable is created in the board as an execution slice.
2. The deliverable may optionally be associated to a feature.
3. The deliverable may optionally be associated to a milestone within that
   feature.
4. The board uses those associations to show which deliverables contribute to
   a milestone.

### 7.3 Standalone deliverable flow

1. A deliverable is created in the board for work that is not part of a feature
   roadmap.
2. The deliverable is left unassociated with both feature and milestone.
3. The board continues to support and display it as valid standalone work.

### 7.4 Roadmap visibility flow

1. A stakeholder opens the board's feature view.
2. The board displays the feature, its milestones, and linked deliverables.
3. The board shows live deliverable state under each milestone while the
   milestone's meaning remains defined by the feature doc.

## 8. Milestone Overview

| Milestone | Status | Outcome |
| --- | --- | --- |
| M1 | Planned | Introduce feature docs in the repo, a board-level feature and milestone display model, and lightweight metadata support for associating deliverables to a feature and optional milestone. |
| M2 | Proposed | Add richer milestone visualization such as tree, roadmap, or Gantt-style views and improve the presentation of milestone progress across linked deliverables. |
| M3 | Proposed | Refine synchronization, validation, and operational workflows between Git-authored feature documents and board-managed deliverable associations. |

## 9. Milestone Details

### M1: Feature docs plus board display and association model

M1 is the smallest meaningful milestone because it establishes the foundational
separation of concerns:

- feature and milestone definition remain in Git docs
- deliverable execution and milestone association remain in the board

M1 outcome criteria:

- the repo has a real `.zazz/features/` directory with tracked feature docs
- the board can represent features and milestones as display concepts
- the board can store metadata associating deliverables to a feature and
  optionally to a milestone
- standalone deliverables remain first-class and valid
- the system enforces that a milestone association cannot exist without the
  parent feature association
- the board can render milestone-grouped deliverables without requiring the
  feature document to list tactical deliverables

M1 non-goals:

- a rich in-board editor for feature or milestone narrative
- storing full feature-document content in the board database
- forcing all deliverables into a milestone structure
- solving every detail of synchronization or ingestion in the first increment

### M2: Rich roadmap visualization

M2 should improve how the board presents milestone progression, likely through a
tree, roadmap, or Gantt-like view that helps stakeholders understand sequence,
current execution focus, and completed vs planned increments.

Likely outcome criteria:

- visual hierarchy for feature -> milestone -> linked deliverables
- clear separation of planned, active, and completed milestone progress
- stronger stakeholder-friendly roadmap presentation

### M3: Synchronization and validation hardening

M3 should address the operational mechanics of how Git-authored feature and
milestone definitions are reflected in the board.

Likely outcome criteria:

- durable sync or import strategy for feature and milestone metadata
- validation rules that prevent inconsistent feature/milestone associations
- clearer operational flows for keeping docs and board metadata aligned

## 10. Risks, Constraints, and Non-Goals

### Risks

- feature and milestone metadata could drift if the board and docs evolve
  without a disciplined synchronization strategy
- teams may be tempted to move milestone narrative into the board because it is
  operationally convenient
- milestone grouping could become too rigid if the model does not preserve
  standalone deliverables

### Constraints

- the feature document must remain the stakeholder-facing source of milestone
  meaning
- the board must not duplicate full feature-document content
- the board must continue to support bug fixes, chores, and other standalone
  deliverables

### Non-goals

- replacing GitHub or Git-managed docs as the roadmap authoring surface
- requiring every deliverable to belong to a feature
- requiring every feature-linked deliverable to belong to a milestone

## 11. Open Questions

1. How should feature and milestone metadata be synchronized or imported from
   Git-managed docs into the board's display model?
2. Should the board support a cached projection of feature and milestone
   metadata, or should it resolve everything dynamically from docs?
3. What is the right structured format inside the feature document for exposing
   milestone metadata clearly to both humans and the board?
4. Should milestone status in the board be purely computed from linked
   deliverables, partially owner-set, or displayed separately from milestone
   narrative status in the feature doc?

## 12. Deliverable Handoff Considerations

Likely deliverable slices for this feature include:

- repository scaffolding for `.zazz/features/` and feature discovery
- backend metadata model for features, milestones, and deliverable association
- board UI for feature and milestone display
- validation and synchronization behavior between Git docs and board metadata

These should become deliverable SPECs later. This feature document intentionally
does not prescribe the final tactical deliverable breakdown.
