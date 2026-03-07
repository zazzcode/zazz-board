import { useState, useRef, useCallback, useEffect } from 'react';
import { Container, Text, Button, Group, Modal, Stack } from '@mantine/core';
import { useTranslation } from '../hooks/useTranslation.js';
import { useDeliverables } from '../hooks/useDeliverables.js';
import { useProjectEvents } from '../hooks/useProjectEvents.js';
import { DeliverableKanbanBoard } from '../components/DeliverableKanbanBoard.jsx';
import { DeliverableModal } from '../components/DeliverableModal.jsx';

export function DeliverableKanbanPage({ selectedProject }) {
  const { t } = useTranslation();
  const { deliverables, loading, createDeliverable, updateDeliverableStatus, deleteDeliverable, refreshDeliverables } = useDeliverables(selectedProject);

  const [modalOpened, setModalOpened] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const refreshTimerRef = useRef(null);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) return;
    refreshTimerRef.current = setTimeout(async () => {
      refreshTimerRef.current = null;
      await refreshDeliverables();
    }, 150);
  }, [refreshDeliverables]);

  useProjectEvents(selectedProject?.code, {
    enabled: Boolean(selectedProject?.code),
    onEvent: (event) => {
      if (event.type === 'deliverable') {
        scheduleRefresh();
      }
    },
  });

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <Container size="xl" py="xl" mt="md">
        <Text>{t('common.loading')}</Text>
      </Container>
    );
  }

  const handleCreateClick = () => {
    setEditingDeliverable(null);
    setModalOpened(true);
  };

  const handleEditClick = (deliverable) => {
    setEditingDeliverable(deliverable);
    setModalOpened(true);
  };

  const handleModalClose = () => {
    setModalOpened(false);
    setEditingDeliverable(null);
  };

  const handleModalSubmit = async (data) => {
    if (!editingDeliverable) {
      await createDeliverable(data);
    }
    handleModalClose();
  };

  const handleDeleteClick = (deliverableId) => {
    setConfirmDeleteId(deliverableId);
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteId) {
      await deleteDeliverable(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const handleStatusChange = async (deliverableId, newStatus) => {
    await updateDeliverableStatus(deliverableId, newStatus);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: '16px', paddingTop: '80px' }}>
      <Group justify="flex-end" mb="md">
        <Button onClick={handleCreateClick}>
          {t('deliverables.createDeliverable')}
        </Button>
      </Group>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <DeliverableKanbanBoard
          deliverables={deliverables}
          statusWorkflow={selectedProject?.deliverableStatusWorkflow}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onStatusChange={handleStatusChange}
        />
      </div>

      {modalOpened && (
        <DeliverableModal
          opened={modalOpened}
          onClose={handleModalClose}
          onSubmit={handleModalSubmit}
          deliverable={editingDeliverable}
          selectedProject={selectedProject}
        />
      )}

      <Modal
        opened={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        title={t('deliverables.deleteDeliverable')}
        centered
      >
        <Stack gap="md">
          <Text>{t('common.confirmDelete')}</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setConfirmDeleteId(null)}>
              {t('common.cancel')}
            </Button>
            <Button color="red" onClick={handleConfirmDelete}>
              {t('common.delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
