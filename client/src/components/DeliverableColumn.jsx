import { Box, Text, Stack, Badge, Group } from '@mantine/core';
import { useDroppable } from '@dnd-kit/core';
import { DeliverableCard } from './DeliverableCard.jsx';
import { useTranslation } from '../hooks/useTranslation.js';

export function DeliverableColumn({ status, deliverables = [], onEdit, onDelete }) {
  const { t, translateDeliverableStatus } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: `status-${status}` });

  const getStatusColor = (status) => {
    const statusColors = {
      'PLANNING': 'blue',
      'IN_PROGRESS': 'yellow',
      'IN_REVIEW': 'orange',
      'STAGED': 'cyan',
      'DONE': 'green',
      'UAT': 'violet',
      'PROD': 'grape'
    };
    return statusColors[status] || 'gray';
  };

  return (
    <Box
      ref={setNodeRef}
      style={{
        minWidth: 340,
        height: '100%',
        backgroundColor: isOver ? 'var(--mantine-color-gray-1)' : 'transparent',
        borderRadius: '8px',
        border: isOver ? '2px dashed var(--mantine-color-blue-5)' : '1px solid var(--mantine-color-gray-3)',
        padding: '12px',
        paddingTop: '20px',
        display: 'flex',
        flexDirection: 'column',
        transition: 'background-color 0.2s, border-color 0.2s',
        overflow: 'visible',
      }}
    >
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <Text fw={600} size="md">
            {translateDeliverableStatus(status)}
          </Text>
          <Badge variant="dot" color={getStatusColor(status)}>
            {deliverables.length}
          </Badge>
        </Group>
      </Group>

      <Box
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '4px',
          overflow: 'visible',
        }}
      >
        <Stack gap="sm" style={{ overflow: 'visible' }}>
          {deliverables.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              {t('deliverables.noDeliverables')}
            </Text>
          ) : (
            deliverables.map(deliverable => (
              <DeliverableCard
                key={deliverable.id}
                deliverable={deliverable}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </Stack>
      </Box>
    </Box>
  );
}