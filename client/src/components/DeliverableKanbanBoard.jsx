import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, pointerWithin } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { DeliverableColumn } from './DeliverableColumn.jsx';
import { DeliverableCard } from './DeliverableCard.jsx';
import { useState } from 'react';

export function DeliverableKanbanBoard({ deliverables = [], statusWorkflow = [], onEdit, onDelete, onStatusChange }) {
  const columns = statusWorkflow && statusWorkflow.length > 0
    ? statusWorkflow
    : ['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'STAGED', 'DONE'];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [activeId, setActiveId] = useState(null);

  const getDeliverablesByStatus = (status) => {
    return deliverables
      .filter(d => d.status === status)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  };

  const activeDeliverable = activeId ? deliverables.find(d => d.id === activeId) : null;

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over) return;

    const draggingDeliverable = deliverables.find(d => d.id === active.id);
    if (!draggingDeliverable) return;

    const newStatus = over.id.replace(/^status-/, '');

    if (newStatus !== draggingDeliverable.status) {
      await onStatusChange(draggingDeliverable.id, newStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={(e) => setActiveId(e.active?.id ?? null)}
      onDragEnd={(e) => { handleDragEnd(e); setActiveId(null); }}
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
        {columns.map(status => (
          <DeliverableColumn
            key={status}
            status={status}
            deliverables={getDeliverablesByStatus(status)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDeliverable ? (
          <div style={{ width: 320, pointerEvents: 'none', opacity: 0.9 }}>
            <DeliverableCard deliverable={activeDeliverable} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}