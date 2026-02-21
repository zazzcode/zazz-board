/**
 * Graph Layout Utilities
 *
 * Pure functions that convert the API graph response into React Flow
 * nodes and edges with explicit positions.
 *
 * API response shape:
 *   { tasks[], relations[], completionCriteriaStatus, taskGraphLayoutDirection }
 *
 * relations[].relationType: 'DEPENDS_ON' | 'COORDINATES_WITH'
 */

// ── Layout constants ──────────────────────────────────────────────
export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 80;
export const SYNC_NODE_SIZE = 36;
export const X_GAP = 280;   // horizontal gap between columns (LR) or rows (TB)
export const Y_GAP = 130;   // vertical gap between rows (LR) or columns (TB)

// ── Status colours (mirrors TaskCard / Kanban) ────────────────────
const STATUS_COLORS = {
  PENDING: '#868e96',     // gray (waiting on deps)
  TO_DO: '#868e96',       // gray
  READY: '#228be6',       // blue
  IN_PROGRESS: '#fab005', // yellow
  QA: '#be4bdb',          // violet
  COMPLETED: '#40c057',   // green
  IN_REVIEW: '#be4bdb',   // violet
  READY_FOR_DEPLOY: '#15aabf', // cyan
  TESTING: '#15aabf',     // cyan
  DONE: '#40c057',        // green
  ICEBOX: '#495057',      // dark gray
};

export function getStatusColor(status) {
  return STATUS_COLORS[status] || '#868e96';
}

// ── Main entry point ──────────────────────────────────────────────
/**
 * generateGraphLayout(tasks, relations, direction)
 *
 * @param {Array} tasks        – from API: { id, taskId, title, status, priority, assigneeName, coordinationCode }
 * @param {Array} relations    – from API: { taskId, relatedTaskId, relationType }
 * @param {string} direction   – 'LR' (left-to-right, default) or 'TB' (top-to-bottom)
 * @param {string|null} completionCriteriaStatus – project setting
 * @param {string[]} statusWorkflow – project status workflow array
 * @returns {{ nodes: Array, edges: Array }}
 */
export function generateGraphLayout(tasks, relations, direction = 'LR', completionCriteriaStatus = null, statusWorkflow = []) {
  if (!tasks || tasks.length === 0) return { nodes: [], edges: [] };

  // ── 1. Build adjacency structures ────────────────────────────
  const dependsOn = new Map();       // taskId → Set of prerequisite task ids
  const dependedOnBy = new Map();    // taskId → Set of dependent task ids
  const coordinationPairs = [];      // [{ a, b }]  (deduplicated)
  const coordinationGroups = buildCoordinationGroups(tasks, relations);

  for (const rel of relations) {
    if (rel.relationType === 'DEPENDS_ON') {
      if (!dependsOn.has(rel.taskId)) dependsOn.set(rel.taskId, new Set());
      dependsOn.get(rel.taskId).add(rel.relatedTaskId);

      if (!dependedOnBy.has(rel.relatedTaskId)) dependedOnBy.set(rel.relatedTaskId, new Set());
      dependedOnBy.get(rel.relatedTaskId).add(rel.taskId);
    } else if (rel.relationType === 'COORDINATES_WITH') {
      // Only keep one direction (a < b) to avoid duplicates
      const a = Math.min(rel.taskId, rel.relatedTaskId);
      const b = Math.max(rel.taskId, rel.relatedTaskId);
      const key = `${a}-${b}`;
      if (!coordinationPairs.some(p => `${p.a}-${p.b}` === key)) {
        coordinationPairs.push({ a, b });
      }
    }
  }

  // ── 2. Topological sort to assign depth (column for LR) ─────
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const depth = assignDepths(tasks, dependsOn, coordinationGroups);

  // ── 3. Identify sync points (tasks with 2+ dependencies) ────
  const syncPoints = [];
  for (const [tId, deps] of dependsOn) {
    if (deps.size >= 2) {
      syncPoints.push({ targetTaskId: tId, prereqIds: [...deps] });
    }
  }

  // ── 4. Assign rows using barycenter heuristic (minimizes crossings) ─
  const { rowAssignment } = assignRows(tasks, depth, dependsOn, coordinationGroups);

  // ── 5. Generate React Flow nodes ────────────────────────────
  const nodes = [];
  const syncNodePositions = new Map(); // syncNodeId → { x, y }

  for (const task of tasks) {
    const col = depth.get(task.id) || 0;
    const row = rowAssignment.get(task.id) || 0;
    const pos = positionForCell(col, row, direction);

    const isBlocked = computeIsBlockedPastReady(task, dependsOn, taskMap, completionCriteriaStatus, statusWorkflow);
    const isCoordinated = coordinationGroups.some(g => g.has(task.id));
    const isComplete = computeIsComplete(task, completionCriteriaStatus, statusWorkflow);

    nodes.push({
      id: `task-${task.id}`,
      type: 'taskNode',
      position: pos,
      data: {
        task,
        isBlocked,
        isCoordinated,
        isComplete,
      },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  }

  // ── 5b. Sync-point nodes ────────────────────────────────────
  // Position each sync point between the rightmost prereq and the target,
  // vertically centered among the prereq tasks (not averaged with target).
  for (const sp of syncPoints) {
    const prereqPositions = sp.prereqIds.map(pid => {
      const col = depth.get(pid) || 0;
      const row = rowAssignment.get(pid) || 0;
      return positionForCell(col, row, direction);
    });
    const targetCol = depth.get(sp.targetTaskId) || 0;
    const targetRow = rowAssignment.get(sp.targetTaskId) || 0;
    const targetPos = positionForCell(targetCol, targetRow, direction);

    let syncX, syncY;
    if (direction === 'TB') {
      // TB: depth → Y axis, row → X axis
      const maxPrereqY = Math.max(...prereqPositions.map(p => p.y));
      const avgPrereqX = prereqPositions.reduce((s, p) => s + p.x, 0) / prereqPositions.length;
      syncX = avgPrereqX + NODE_WIDTH / 2 - SYNC_NODE_SIZE / 2;
      syncY = (maxPrereqY + NODE_HEIGHT + targetPos.y) / 2 - SYNC_NODE_SIZE / 2;
    } else {
      // LR: depth → X axis, row → Y axis
      const maxPrereqX = Math.max(...prereqPositions.map(p => p.x));
      const avgPrereqY = prereqPositions.reduce((s, p) => s + p.y, 0) / prereqPositions.length;
      syncX = (maxPrereqX + NODE_WIDTH + targetPos.x) / 2 - SYNC_NODE_SIZE / 2;
      syncY = avgPrereqY + NODE_HEIGHT / 2 - SYNC_NODE_SIZE / 2;
    }

    const syncId = `sync-${sp.targetTaskId}`;
    syncNodePositions.set(syncId, { x: syncX, y: syncY });

    nodes.push({
      id: syncId,
      type: 'syncPointNode',
      position: { x: syncX, y: syncY },
      data: { count: sp.prereqIds.length },
      width: SYNC_NODE_SIZE,
      height: SYNC_NODE_SIZE,
    });
  }

  // ── 6. Generate React Flow edges ────────────────────────────
  const edges = [];

  // Dependency edges (use left/right handles)
  for (const [tId, deps] of dependsOn) {
    const hasSyncPoint = deps.size >= 2;

    if (hasSyncPoint) {
      const syncId = `sync-${tId}`;
      // Prereqs → sync point
      for (const depId of deps) {
        edges.push({
          id: `dep-${depId}-${syncId}`,
          source: `task-${depId}`,
          sourceHandle: 'right',
          target: syncId,
          type: 'default',
          animated: true,
          style: { stroke: '#868e96', strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed', color: '#868e96' },
        });
      }
      // Sync point → target
      edges.push({
        id: `dep-${syncId}-${tId}`,
        source: syncId,
        target: `task-${tId}`,
        targetHandle: 'left',
        type: 'default',
        animated: true,
        style: { stroke: '#868e96', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed', color: '#868e96' },
      });
    } else {
      // Single dependency — direct edge
      for (const depId of deps) {
        edges.push({
          id: `dep-${depId}-${tId}`,
          source: `task-${depId}`,
          sourceHandle: 'right',
          target: `task-${tId}`,
          targetHandle: 'left',
          type: 'default',
          animated: true,
          style: { stroke: '#868e96', strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed', color: '#868e96' },
        });
      }
    }
  }

  // Coordination edges (use top/bottom handles for vertical lines)
  for (const { a, b } of coordinationPairs) {
    // Determine which task is above (lower row) vs below (higher row)
    const rowA = rowAssignment.get(a) ?? 0;
    const rowB = rowAssignment.get(b) ?? 0;
    const upper = rowA <= rowB ? a : b;
    const lower = rowA <= rowB ? b : a;

    edges.push({
      id: `coord-${a}-${b}`,
      source: `task-${upper}`,
      sourceHandle: 'bottom',
      target: `task-${lower}`,
      targetHandle: 'top',
      type: 'coordinationEdge',
      data: { coordinationCode: taskMap.get(a)?.coordinationCode },
    });
  }

  return { nodes, edges };
}

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Build coordination groups: each group is a Set of task IDs that are
 * mutually coordinated (transitive closure via COORDINATES_WITH).
 */
function buildCoordinationGroups(tasks, relations) {
  const parent = new Map();
  const find = (x) => {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)));
    return parent.get(x);
  };
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const rel of relations) {
    if (rel.relationType === 'COORDINATES_WITH') {
      union(rel.taskId, rel.relatedTaskId);
    }
  }

  const groups = new Map();
  for (const rel of relations) {
    if (rel.relationType === 'COORDINATES_WITH') {
      const root = find(rel.taskId);
      if (!groups.has(root)) groups.set(root, new Set());
      groups.get(root).add(rel.taskId);
      groups.get(root).add(rel.relatedTaskId);
    }
  }

  return [...groups.values()];
}

/**
 * Assign depth (column index for LR) using BFS from root tasks.
 * Root tasks = tasks with no DEPENDS_ON relations.
 *
 * After initial depth assignment, coordinated tasks are equalized to the
 * same depth (the max within the group) and downstream depths are
 * re-propagated so the graph stays consistent.
 */
function assignDepths(tasks, dependsOn, coordinationGroups) {
  const depth = new Map();
  const taskIds = new Set(tasks.map(t => t.id));

  // Root tasks: no DEPENDS_ON or all dependencies are outside the task set
  const roots = tasks.filter(t => {
    const deps = dependsOn.get(t.id);
    if (!deps || deps.size === 0) return true;
    return [...deps].every(d => !taskIds.has(d));
  });

  // BFS to assign max depth
  for (const root of roots) {
    depth.set(root.id, 0);
  }

  // Multiple passes to propagate max-depth through dependency chains
  const propagateDepths = () => {
    let changed = true;
    while (changed) {
      changed = false;
      for (const [tId, deps] of dependsOn) {
        if (!taskIds.has(tId)) continue;
        const prereqDepths = [...deps].filter(d => depth.has(d)).map(d => depth.get(d));
        if (prereqDepths.length === 0) continue;
        const newDepth = Math.max(...prereqDepths) + 1;
        if (!depth.has(tId) || depth.get(tId) < newDepth) {
          depth.set(tId, newDepth);
          changed = true;
        }
      }
    }
  };

  propagateDepths();

  // Solo tasks (no relations at all) get depth 0
  for (const t of tasks) {
    if (!depth.has(t.id)) depth.set(t.id, 0);
  }

  // ── Equalize coordinated groups ──────────────────────────────
  // Coordinated tasks must appear in the same column (same depth).
  // Push all members to the max depth in the group, then re-propagate
  // so that downstream tasks shift accordingly.
  let coordChanged = false;
  for (const group of coordinationGroups) {
    const groupDepths = [...group].filter(id => depth.has(id)).map(id => depth.get(id));
    if (groupDepths.length === 0) continue;
    const maxGroupDepth = Math.max(...groupDepths);
    for (const id of group) {
      if (depth.has(id) && depth.get(id) < maxGroupDepth) {
        depth.set(id, maxGroupDepth);
        coordChanged = true;
      }
    }
  }

  // Re-propagate downstream if any coordinated task was bumped forward
  if (coordChanged) {
    propagateDepths();
  }

  return depth;
}

/**
 * Assign row positions within each depth column.
 * Uses barycenter heuristic: tasks are sorted by the average row of their
 * dependencies in the previous column, which minimizes edge crossings.
 * Coordinated tasks are kept together on consecutive rows.
 */
function assignRows(tasks, depth, dependsOn, coordinationGroups) {
  // Group tasks by depth
  const byDepth = new Map();
  for (const t of tasks) {
    const d = depth.get(t.id) || 0;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d).push(t);
  }

  const rowAssignment = new Map();
  const maxRowPerDepth = new Map();

  // Process depths in order (left to right)
  const sortedDepths = [...byDepth.keys()].sort((a, b) => a - b);

  for (const d of sortedDepths) {
    const tasksAtDepth = byDepth.get(d);

    if (d === 0) {
      // Depth 0 (roots): sort by task number for a stable baseline
      tasksAtDepth.sort((a, b) => {
        const numA = parseInt(String(a.taskId).split('-').pop()) || 0;
        const numB = parseInt(String(b.taskId).split('-').pop()) || 0;
        return numA - numB;
      });
    } else {
      // Barycenter: sort by average row of dependencies (from previous columns)
      const barycenter = (task) => {
        const deps = dependsOn.get(task.id);
        if (!deps || deps.size === 0) return Infinity; // no deps → push to bottom
        const depRows = [...deps]
          .filter(did => rowAssignment.has(did))
          .map(did => rowAssignment.get(did));
        if (depRows.length === 0) return Infinity;
        return depRows.reduce((a, b) => a + b, 0) / depRows.length;
      };

      tasksAtDepth.sort((a, b) => {
        const ba = barycenter(a);
        const bb = barycenter(b);
        if (ba !== bb) return ba - bb;
        // Tie-break: keep coordinated tasks adjacent by group, then by task number
        const numA = parseInt(String(a.taskId).split('-').pop()) || 0;
        const numB = parseInt(String(b.taskId).split('-').pop()) || 0;
        return numA - numB;
      });
    }

    let row = 0;
    const assigned = new Set();

    for (const task of tasksAtDepth) {
      if (assigned.has(task.id)) continue;

      // Check if this task is part of a coordination group at this depth
      const group = coordinationGroups.find(g => g.has(task.id));
      if (group) {
        // Place coordinated tasks on consecutive rows (stacked vertically in LR)
        const groupTasksAtDepth = tasksAtDepth.filter(t => group.has(t.id) && !assigned.has(t.id));
        for (const gt of groupTasksAtDepth) {
          rowAssignment.set(gt.id, row);
          assigned.add(gt.id);
          row++;
        }
      } else {
        rowAssignment.set(task.id, row);
        assigned.add(task.id);
        row++;
      }
    }
    maxRowPerDepth.set(d, row);
  }

  return { rowAssignment, maxRowPerDepth };
}

/**
 * Convert a (column, row) cell into pixel coordinates.
 * direction = 'LR': column → X, row → Y
 * direction = 'TB': column → Y, row → X
 */
function positionForCell(col, row, direction) {
  if (direction === 'TB') {
    return {
      x: row * (NODE_WIDTH + Y_GAP),
      y: col * (NODE_HEIGHT + X_GAP),
    };
  }
  // LR (default)
  return {
    x: col * (NODE_WIDTH + X_GAP),
    y: row * (NODE_HEIGHT + Y_GAP),
  };
}

/**
 * Determine if a task has reached or passed the completion criteria status.
 */
function computeIsComplete(task, completionCriteriaStatus, statusWorkflow) {
  if (!statusWorkflow || statusWorkflow.length === 0) return false;
  const criteriaStatus = completionCriteriaStatus || 'DONE';
  const criteriaIndex = statusWorkflow.indexOf(criteriaStatus);
  if (criteriaIndex < 0) return false;
  const taskIndex = statusWorkflow.indexOf(task.status);
  return taskIndex >= criteriaIndex;
}

/**
 * Determine if a task should show the yellow "blocked" outline.
 * True when: task has unmet dependencies AND its status is past READY in the workflow.
 */
function computeIsBlockedPastReady(task, dependsOn, taskMap, completionCriteriaStatus, statusWorkflow) {
  if (!statusWorkflow || statusWorkflow.length === 0) return false;

  const deps = dependsOn.get(task.id);
  if (!deps || deps.size === 0) return false;

  const readyIndex = statusWorkflow.indexOf('READY');
  const taskStatusIndex = statusWorkflow.indexOf(task.status);

  // Only show blocked if task is past READY
  if (readyIndex < 0 || taskStatusIndex <= readyIndex) return false;

  const criteriaStatus = completionCriteriaStatus || 'DONE';
  const criteriaIndex = statusWorkflow.indexOf(criteriaStatus);
  if (criteriaIndex < 0) return false;

  // Check if any dependency has NOT met completion criteria
  for (const depId of deps) {
    const depTask = taskMap.get(depId);
    if (!depTask) continue;
    const depIndex = statusWorkflow.indexOf(depTask.status);
    if (depIndex < criteriaIndex) {
      return true; // At least one dependency is unmet
    }
  }

  return false;
}
