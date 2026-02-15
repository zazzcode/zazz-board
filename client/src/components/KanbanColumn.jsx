import { Paper, Stack, Text, Badge, Box, Group } from '@mantine/core';
import { useTranslation } from '../hooks/useTranslation.js';
import { TaskCard } from './TaskCard.jsx';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Wrapper that makes each task card sortable + draggable
function SortableTaskCard({ task, onTaskEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', taskId: task.id, status: task.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    onTaskEdit && onTaskEdit(task);
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onDoubleClick={handleDoubleClick}>
      <TaskCard task={task} />
    </div>
  );
}

export function KanbanColumn({ status, tasks, onTaskEdit }) {
  const { t, translateStatus } = useTranslation();

  // Column itself is a droppable so empty columns can receive drops
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { type: 'column', status },
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: 'calc(100vh - 140px)',
      flex: '0 0 320px',
      maxWidth: '320px',
    }}>
      {/* Column title */}
      <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
        <Group gap="xs" align="center">
          <Text fw={600} size="lg">{translateStatus(status)}</Text>
          <Badge size="sm" variant="light">{tasks.length}</Badge>
        </Group>
      </Box>

      {/* Column content */}
      <Paper
        p="md"
        withBorder
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: isOver ? 'rgba(59,130,246,0.08)' : undefined,
          borderColor: isOver ? 'var(--mantine-color-blue-6)' : undefined,
          borderWidth: isOver ? '2px' : undefined,
          transition: 'all 0.2s ease',
        }}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <Box ref={setNodeRef} style={{ flex: 1, overflowY: 'auto', padding: '8px', minHeight: '80px' }}>
            {tasks.length === 0 ? (
              <Box style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                border: '2px dashed #ccc',
                borderRadius: '8px',
                margin: '8px 0',
                minHeight: '100px',
              }}>
                <Text size="sm" c="dimmed" ta="center">{t('kanban.noTasksInColumn')}</Text>
              </Box>
            ) : (
              <Stack gap="xs">
                {tasks.map(task => (
                  <SortableTaskCard key={task.id} task={task} onTaskEdit={onTaskEdit} />
                ))}
              </Stack>
            )}
          </Box>
        </SortableContext>
      </Paper>
    </div>
  );
}
