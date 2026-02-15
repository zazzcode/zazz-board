import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, pointerWithin } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn.jsx';
import { TaskCard } from './TaskCard.jsx';
import { useMemo, useState } from 'react';

export function KanbanBoard({ taskStatuses, getTasksByStatus, onTaskEdit, onDragEnd }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [activeId, setActiveId] = useState(null);

  // Flat task lookup for DragOverlay
  const allTasks = useMemo(
    () => taskStatuses.flatMap(s => getTasksByStatus(s)),
    [taskStatuses, getTasksByStatus]
  );
  const activeTask = activeId ? allTasks.find(t => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={(e) => setActiveId(e.active?.id ?? null)}
      onDragEnd={(e) => { onDragEnd(e); setActiveId(null); }}
      onDragCancel={() => setActiveId(null)}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          gap: '16px',
          height: '100%',
          paddingBottom: '16px',
        }}
      >
        {taskStatuses.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={getTasksByStatus(status)}
            onTaskEdit={onTaskEdit}
          />
        ))}
      </div>

      {/* Floating card that follows the cursor during drag */}
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div style={{ width: 288, pointerEvents: 'none', opacity: 0.9 }}>
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
