import { useCallback } from 'react';

/**
 * @dnd-kit drag-end handler.
 *
 * Rules:
 *   1. Reorder within the same column — always allowed.
 *   2. Move exactly one column to the RIGHT — allowed (advance status).
 *   3. Skip columns or move left — rejected (card snaps back).
 */
export function useDragAndDrop({ tasks, getTasksByStatus, refreshTasks, selectedProject, taskStatuses }) {

  // Resolve which column a task belongs to by its id
  const findTaskStatus = useCallback((taskId) => {
    const task = tasks.find(t => t.id === taskId);
    return task?.status ?? null;
  }, [tasks]);

  // Resolve the target status from a droppable (could be a column or a task inside a column)
  const resolveTargetStatus = useCallback((overId, overData) => {
    if (overData?.type === 'column') return overData.status;
    if (overData?.type === 'task')   return overData.status;
    // overId might be 'column-STATUS'
    if (typeof overId === 'string' && overId.startsWith('column-')) return overId.slice(7);
    // Last resort: look up by task id
    return findTaskStatus(overId);
  }, [findTaskStatus]);

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;
    if (!over) return; // dropped outside any droppable

    const activeId     = active.id;
    const sourceStatus = active.data?.current?.status ?? findTaskStatus(activeId);
    const targetStatus = resolveTargetStatus(over.id, over.data?.current);

    if (!sourceStatus || !targetStatus) return;

    // ── Column-move validation ───────────────────────────────────────
    if (sourceStatus !== targetStatus) {
      const srcIdx = taskStatuses.indexOf(sourceStatus);
      const tgtIdx = taskStatuses.indexOf(targetStatus);
      if (tgtIdx !== srcIdx + 1) return; // snap back — invalid move
    }

    try {
      const token = localStorage.getItem('TB_TOKEN');
      if (!token) { console.error('No access token found'); return; }

      // ── Same-column reorder ──────────────────────────────────────
      if (sourceStatus === targetStatus) {
        // If dropped on the column droppable itself (not a task) — nothing useful to reorder
        if (over.data?.current?.type === 'column' && activeId === over.id) return;

        const columnTasks = getTasksByStatus(sourceStatus);
        const fromIndex = columnTasks.findIndex(t => t.id === activeId);
        let toIndex;

        if (over.data?.current?.type === 'task') {
          toIndex = columnTasks.findIndex(t => t.id === over.id);
        } else {
          // Dropped on empty column area → end of list
          toIndex = columnTasks.length - 1;
        }

        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

        const newOrder = [...columnTasks];
        const [moved] = newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, moved);

        const positionUpdates = newOrder.map((task, i) => ({ taskId: task.id, newPosition: (i + 1) * 10 }));

        const resp = await fetch(
          `http://localhost:3030/projects/${selectedProject.code}/kanban/tasks/column/${sourceStatus}/positions`,
          { method: 'PATCH', headers: { 'TB_TOKEN': token, 'Content-Type': 'application/json' }, body: JSON.stringify({ positionUpdates }) }
        );
        if (resp.ok) await refreshTasks();
        return;
      }

      // ── Cross-column move ────────────────────────────────────────
      const targetTasks = getTasksByStatus(targetStatus);

      // Figure out insertion index from what we landed on
      let insertIndex;
      if (over.data?.current?.type === 'task') {
        insertIndex = targetTasks.findIndex(t => t.id === over.id);
        if (insertIndex === -1) insertIndex = targetTasks.length;
      } else {
        insertIndex = targetTasks.length; // end of target column
      }

      // Compute sparse position
      let newPosition;
      if (targetTasks.length === 0) {
        newPosition = 10;
      } else if (insertIndex === 0) {
        newPosition = Math.floor((targetTasks[0].position || 10) / 2) || 5;
      } else if (insertIndex >= targetTasks.length) {
        newPosition = (targetTasks[targetTasks.length - 1].position || 0) + 10;
      } else {
        const before = targetTasks[insertIndex - 1];
        const after  = targetTasks[insertIndex];
        newPosition  = Math.floor(((before.position || 0) + (after.position || 0)) / 2);
        if (newPosition === before.position || newPosition === after.position) newPosition = before.position + 1;
      }

      const resp = await fetch(
        `http://localhost:3030/projects/${selectedProject.code}/kanban/tasks/${activeId}/position`,
        { method: 'PATCH', headers: { 'TB_TOKEN': token, 'Content-Type': 'application/json' }, body: JSON.stringify({ newPosition, status: targetStatus }) }
      );
      if (resp.ok) await refreshTasks();
    } catch (err) {
      console.error('Drag end error:', err);
    }
  }, [tasks, getTasksByStatus, refreshTasks, selectedProject, taskStatuses, findTaskStatus, resolveTargetStatus]);

  return { handleDragEnd };
}
