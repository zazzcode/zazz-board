import { useState, useMemo } from 'react';
import { Container, Text, Button, Group, Table, ActionIcon, Menu, CopyButton, Tooltip, Badge } from '@mantine/core';
import { IconArrowUp, IconArrowDown, IconEdit, IconTrash, IconCopy, IconCheck } from '@tabler/icons-react';
import { useTranslation } from '../hooks/useTranslation.js';
import { useDeliverables } from '../hooks/useDeliverables.js';
import { DeliverableModal } from '../components/DeliverableModal.jsx';

export function DeliverableListPage({ selectedProject }) {
  const { t, translateDeliverableType, translateDeliverableStatus } = useTranslation();
  const { deliverables, loading, createDeliverable, deleteDeliverable } = useDeliverables(selectedProject);
  
  const [sortBy, setSortBy] = useState('deliverableCode');
  const [sortDirection, setSortDirection] = useState('asc');
  const [modalOpened, setModalOpened] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState(null);

  const sortedDeliverables = useMemo(() => {
    let sorted = [...(deliverables || [])];
    sorted.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [deliverables, sortBy, sortDirection]);

  if (!selectedProject) {
    return <Container size="xl" py="xl"><Text>{t('common.loading')}</Text></Container>;
  }

  if (loading) {
    return <Container size="xl" py="xl"><Text>{t('common.loading')}</Text></Container>;
  }

  const handleSort = (column) => {
    setSortDirection(sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc');
    setSortBy(column);
  };

  const getTypeColor = (type) => {
    const colors = { FEATURE: 'blue', BUG_FIX: 'red', REFACTOR: 'violet', ENHANCEMENT: 'cyan', CHORE: 'gray', DOCUMENTATION: 'teal' };
    return colors[type] || 'gray';
  };

  const getStatusColor = (status) => {
    const colors = { PLANNING: 'blue', IN_PROGRESS: 'yellow', IN_REVIEW: 'orange', STAGED: 'cyan', DONE: 'green', UAT: 'violet', PROD: 'grape' };
    return colors[status] || 'gray';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const SortIcon = ({ column }) => sortBy === column ? (sortDirection === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : null;

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

  const handleDeleteClick = async (deliverableId) => {
    await deleteDeliverable(deliverableId);
  };

  const rows = sortedDeliverables.map((d) => (
    <Table.Tr key={d.id}>
      <Table.Td><Text fw={600} size="sm">{d.deliverableCode}</Text></Table.Td>
      <Table.Td><Text size="sm">{d.name}</Text></Table.Td>
      <Table.Td><Badge size="sm" color={getTypeColor(d.type)}>{translateDeliverableType(d.type)}</Badge></Table.Td>
      <Table.Td><Badge size="sm" color={getStatusColor(d.status)} variant="light">{translateDeliverableStatus(d.status)}</Badge></Table.Td>
      <Table.Td><Text size="xs" c="dimmed">{formatDate(d.updatedAt)}</Text></Table.Td>
      <Table.Td>{d.specFilepath ? <CopyButton value={d.specFilepath}>{({ copied, copy }) => <Tooltip label={copied ? 'Copied' : 'Copy'}><ActionIcon color={copied ? 'green' : 'gray'} onClick={copy} size="xs">{copied ? <IconCheck size={14} /> : <IconCopy size={14} />}</ActionIcon></Tooltip>}</CopyButton> : <Text size="xs">-</Text>}</Table.Td>
      <Table.Td>{d.planFilepath ? <CopyButton value={d.planFilepath}>{({ copied, copy }) => <Tooltip label={copied ? 'Copied' : 'Copy'}><ActionIcon color={copied ? 'green' : 'gray'} onClick={copy} size="xs">{copied ? <IconCheck size={14} /> : <IconCopy size={14} />}</ActionIcon></Tooltip>}</CopyButton> : <Text size="xs">-</Text>}</Table.Td>
      <Table.Td>{d.pullRequestUrl ? <Text component="a" href={d.pullRequestUrl} target="_blank" size="xs" c="blue" style={{textDecoration: 'none'}}>PR #{d.pullRequestUrl.split('/').pop()}</Text> : <Text size="xs">-</Text>}</Table.Td>
      <Table.Td><Text size="xs">{d.completedTaskCount || 0}/{d.taskCount || 0}</Text></Table.Td>
      <Table.Td><Menu><Menu.Target><ActionIcon variant="subtle" size="sm"><IconEdit size={14} /></ActionIcon></Menu.Target><Menu.Dropdown><Menu.Item onClick={() => handleEditClick(d)}>{t('common.edit')}</Menu.Item><Menu.Item color="red" onClick={() => handleDeleteClick(d.id)}>{t('common.delete')}</Menu.Item></Menu.Dropdown></Menu></Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl">
      <Group justify="flex-end" mb="md">
        <Button onClick={handleCreateClick}>{t('deliverables.createDeliverable')}</Button>
      </Group>
      {deliverables.length === 0 ? (
        <Container size="xl" py="xl" ta="center">
          <Text c="dimmed">{t('deliverables.noDeliverables')}</Text>
        </Container>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{cursor: 'pointer'}} onClick={() => handleSort('deliverableCode')}><Group gap={4}><span>{t('deliverables.id')}</span><SortIcon column="deliverableCode" /></Group></Table.Th>
                <Table.Th style={{cursor: 'pointer'}} onClick={() => handleSort('name')}><Group gap={4}><span>{t('deliverables.name')}</span><SortIcon column="name" /></Group></Table.Th>
                <Table.Th style={{cursor: 'pointer'}} onClick={() => handleSort('type')}><Group gap={4}><span>{t('deliverables.type')}</span><SortIcon column="type" /></Group></Table.Th>
                <Table.Th style={{cursor: 'pointer'}} onClick={() => handleSort('status')}><Group gap={4}><span>{t('deliverables.status')}</span><SortIcon column="status" /></Group></Table.Th>
                <Table.Th style={{cursor: 'pointer'}} onClick={() => handleSort('updatedAt')}><Group gap={4}><span>{t('deliverables.updated')}</span><SortIcon column="updatedAt" /></Group></Table.Th>
                <Table.Th>{t('deliverables.specPath')}</Table.Th>
                <Table.Th>{t('deliverables.planPath')}</Table.Th>
                <Table.Th>{t('deliverables.pullRequestUrl')}</Table.Th>
                <Table.Th>{t('deliverables.tasks')}</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </div>
      )}
      {modalOpened && (
        <DeliverableModal
          opened={modalOpened}
          onClose={handleModalClose}
          onSubmit={handleModalSubmit}
          deliverable={editingDeliverable}
          selectedProject={selectedProject}
        />
      )}
    </Container>
  );
}
