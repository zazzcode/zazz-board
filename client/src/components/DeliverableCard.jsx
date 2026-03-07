import { Card, Text, Badge, Group, Box, ActionIcon, Menu, Progress, Modal, Button, Stack } from '@mantine/core';
import { useDraggable } from '@dnd-kit/core';
import { IconDots, IconEdit, IconTrash, IconCheck, IconExternalLink } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation.js';

export function DeliverableCard({ deliverable, onEdit, onDelete, isOverlay }) {
  const { t, translateDeliverableType } = useTranslation();
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: deliverable.id });
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTypeColor = (type) => {
    const typeColors = {
      'FEATURE': 'blue',
      'BUG_FIX': 'red',
      'REFACTOR': 'violet',
      'ENHANCEMENT': 'cyan',
      'CHORE': 'gray',
      'DOCUMENTATION': 'teal'
    };
    return typeColors[type] || 'gray';
  };

  const totalTasks = (deliverable.taskCount || 0);
  const completedTasks = (deliverable.completedTaskCount || 0);
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const handleDoubleClick = () => {
    if (!isOverlay) {
      onEdit(deliverable);
    }
  };

  const handleDeleteClick = () => {
    setDeleteModalOpened(true);
  };

  const handleConfirmDelete = () => {
    onDelete(deliverable.id);
    setDeleteModalOpened(false);
  };

  return (
    <>
      <Card
        ref={isOverlay ? undefined : setNodeRef}
        shadow="sm"
        padding="0"
        mb="xs"
        withBorder
        onDoubleClick={handleDoubleClick}
        style={{
          cursor: isDragging || isOverlay ? 'grabbing' : 'grab',
          opacity: isDragging && !isOverlay ? 0.5 : 1,
          transform: isDragging && !isOverlay ? 'rotate(2deg)' : 'rotate(0deg)',
          transition: 'opacity 0.2s, transform 0.2s',
          position: 'relative',
          overflow: 'visible',
        }}
        {...(!isOverlay && attributes)}
        {...(!isOverlay && listeners)}
      >
        {/* Blue ID badge at top - matching TaskCard style */}
        <Box style={{ display: 'flex', justifyContent: 'center', marginTop: '-10px', marginBottom: '4px' }}>
          <Badge
            size="sm"
            style={{
              backgroundColor: 'var(--mantine-color-blue-6)',
              color: 'white',
              fontWeight: 700,
              fontSize: '11px',
              textTransform: 'none',
            }}
          >
            {deliverable.deliverableCode}
          </Badge>
        </Box>

        {/* Type badge in top right */}
        <Box
          style={{ position: 'absolute', top: '12px', right: '8px', zIndex: 1 }}
          title={translateDeliverableType(deliverable.type)}
        >
          {!isOverlay && (
            <Menu shadow="md" position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="subtle" size="xs" color="gray">
                  <IconDots size={14} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconEdit size={14} />}
                  onClick={() => onEdit(deliverable)}
                >
                  {t('common.edit')}
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTrash size={14} />}
                  color="red"
                  onClick={handleDeleteClick}
                >
                  {t('common.delete')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Box>

        <Box style={{ padding: '0 12px 12px 12px' }}>
          <Group gap="xs" mb="xs">
            <Badge size="sm" color={getTypeColor(deliverable.type)}>
              {translateDeliverableType(deliverable.type)}
            </Badge>
          </Group>

          <Text fw={500} mb="sm" size="sm" lineClamp={2} pr="20px">
            {deliverable.name}
          </Text>

          {totalTasks > 0 && (
            <Box mb="sm">
              <Group justify="space-between" gap="xs" mb={4}>
                <Text size="xs" c="dimmed">
                  {t('deliverables.tasks')}
                </Text>
                <Text size="xs" fw={500}>
                  {completedTasks}/{totalTasks}
                </Text>
              </Group>
              <Progress value={progress} size="sm" color={progress === 100 ? 'green' : 'blue'} />
            </Box>
          )}

          {deliverable.pullRequestUrl && (
            <Group gap="xs" mb="sm">
              <ActionIcon
                component="a"
                href={deliverable.pullRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="light"
                size="sm"
                color="blue"
              >
                <IconExternalLink size={14} />
              </ActionIcon>
              <Text size="xs" c="blue" component="a" href={deliverable.pullRequestUrl} target="_blank" style={{ textDecoration: 'none' }}>
                PR #{deliverable.pullRequestUrl.split('/').pop()}
              </Text>
            </Group>
          )}

          {deliverable.approvedByName && (
            <Group gap="xs" mb="sm">
              <IconCheck size={14} color="green" />
              <Text size="xs" c="green">
                {t('deliverables.approvedBy')}: {deliverable.approvedByName}
              </Text>
            </Group>
          )}

          {deliverable.updatedAt && (
            <Text size="xs" c="dimmed">
              {t('deliverables.updated')}: {formatDate(deliverable.updatedAt)}
            </Text>
          )}
        </Box>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        title={t('deliverables.deleteDeliverable')}
        centered
      >
        <Stack gap="md">
          <Text>
            {t('common.confirmDelete')} <strong>{deliverable.deliverableCode}</strong>?
          </Text>
          <Text size="sm" c="dimmed">
            This will also delete all tasks associated with this deliverable.
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setDeleteModalOpened(false)}>
              {t('common.cancel')}
            </Button>
            <Button color="red" onClick={handleConfirmDelete}>
              {t('common.delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
