import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  useMantineColorScheme,
} from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from '../hooks/useTranslation.js';
import { useProjectEvents } from '../hooks/useProjectEvents.js';
import { useProjectGantt } from '../hooks/useProjectGantt.js';
import { ProjectGantt } from '../components/gantt/ProjectGantt.jsx';

const REFRESH_EVENT_TYPES = new Set(['deliverable', 'task', 'relation']);
const EMPTY_MILESTONE_FORM = {
  name: '',
  startDate: '',
  endDate: '',
  deliverableIds: [],
};

function getDeliverableFormId(row) {
  return String(row.deliverableId || row.id);
}

function getDeliverableFormLabel(row) {
  return row.displayName || row.deliverableCode || row.id;
}

function normalizeGanttEntityId(id) {
  return String(id || '').replace(/^:/, '');
}

function reorderGanttRows(rows) {
  const milestones = rows.filter((row) => row.entityType === 'milestone');
  const deliverables = rows.filter((row) => row.entityType === 'deliverable');
  const otherRows = rows.filter((row) => row.entityType !== 'milestone' && row.entityType !== 'deliverable');
  const deliverablesByParent = new Map();

  deliverables.forEach((deliverable, index) => {
    const parentId = normalizeGanttEntityId(deliverable.parentId);
    const existing = deliverablesByParent.get(parentId) || [];
    existing.push({ ...deliverable, originalIndex: index });
    deliverablesByParent.set(parentId, existing);
  });

  return [
    ...milestones.flatMap((milestone) => {
      const milestoneId = normalizeGanttEntityId(milestone.id);
      const children = (deliverablesByParent.get(milestoneId) || [])
        .sort((left, right) => {
          const leftPosition = Number.isFinite(left.milestonePosition) ? left.milestonePosition : left.originalIndex;
          const rightPosition = Number.isFinite(right.milestonePosition) ? right.milestonePosition : right.originalIndex;
          return leftPosition - rightPosition;
        })
        .map((deliverable) => {
          const row = { ...deliverable };
          delete row.originalIndex;
          return row;
        });

      return [milestone, ...children];
    }),
    ...otherRows,
  ];
}

function getDefaultMilestoneId(rows) {
  return normalizeGanttEntityId(rows.find((row) => row.entityType === 'milestone' && row.isDefault)?.id);
}

function getVisibleGanttData(ganttData, rows) {
  if (!ganttData) return null;
  if (ganttData.timeline?.showDefaultMilestone) return { ...ganttData, rows };

  const defaultMilestoneId = getDefaultMilestoneId(rows);
  if (!defaultMilestoneId) return { ...ganttData, rows };

  const hiddenIds = new Set(
    rows
      .filter((row) => (
        normalizeGanttEntityId(row.id) === defaultMilestoneId
        || normalizeGanttEntityId(row.parentId) === defaultMilestoneId
      ))
      .map((row) => normalizeGanttEntityId(row.id))
  );

  return {
    ...ganttData,
    rows: rows.filter((row) => !hiddenIds.has(normalizeGanttEntityId(row.id))),
    links: (ganttData.links || []).filter((link) => (
      !hiddenIds.has(normalizeGanttEntityId(link.sourceId))
      && !hiddenIds.has(normalizeGanttEntityId(link.targetId))
    )),
  };
}

export function GanttPage({ selectedProject }) {
  const { t } = useTranslation();
  const { colorScheme } = useMantineColorScheme();
  const isDarkTheme = colorScheme === 'dark';
  const toolbarBorderColor = isDarkTheme ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-3)';
  const toolbarBackground = isDarkTheme ? 'var(--mantine-color-dark-8)' : 'var(--mantine-color-gray-0)';
  const projectCode = selectedProject?.code;
  const { ganttData, loading, error, refreshGantt, loadDeliverableTasks } = useProjectGantt(projectCode);
  const refreshTimerRef = useRef(null);
  const loadedDraftProjectRef = useRef(null);
  const [milestoneModalOpened, setMilestoneModalOpened] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState(EMPTY_MILESTONE_FORM);
  const [deliverableToAddId, setDeliverableToAddId] = useState(null);
  const [draftRows, setDraftRows] = useState([]);
  const workingRows = useMemo(() => (
    draftRows.length > 0 ? draftRows : (ganttData?.rows || [])
  ), [draftRows, ganttData?.rows]);
  const workingGanttData = useMemo(
    () => getVisibleGanttData(ganttData, workingRows),
    [ganttData, workingRows]
  );

  const allDeliverables = useMemo(() => workingRows
    .filter((row) => row.entityType === 'deliverable')
    .map((row) => ({
      id: getDeliverableFormId(row),
      label: getDeliverableFormLabel(row),
      status: row.status,
      parentId: normalizeGanttEntityId(row.parentId),
    })), [workingRows]);

  const defaultMilestoneId = useMemo(() => (
    getDefaultMilestoneId(workingRows)
  ), [workingRows]);

  const editingMilestoneId = normalizeGanttEntityId(editingMilestone?.id);
  const editingDefaultMilestone = Boolean(editingMilestoneId && editingMilestoneId === defaultMilestoneId);

  const selectedDeliverables = useMemo(() => milestoneForm.deliverableIds.map((deliverableId) => {
    const deliverable = allDeliverables.find((item) => item.id === deliverableId);
    return deliverable || { id: deliverableId, label: deliverableId };
  }), [allDeliverables, milestoneForm.deliverableIds]);

  const availableDeliverableOptions = useMemo(() => {
    const selectedIds = new Set(milestoneForm.deliverableIds);
    return allDeliverables
      .filter((deliverable) => !selectedIds.has(deliverable.id))
      .filter((deliverable) => (
        !deliverable.parentId
        || deliverable.parentId === defaultMilestoneId
        || deliverable.parentId === editingMilestoneId
      ))
      .map((deliverable) => ({
        value: deliverable.id,
        label: deliverable.label,
      }));
  }, [allDeliverables, defaultMilestoneId, editingMilestoneId, milestoneForm.deliverableIds]);

  const getMilestoneName = useCallback((milestone) => {
    if (!milestone) return '';
    if (milestone.displayName) return milestone.displayName;
    if (milestone.labelKey) return t(milestone.labelKey, milestone.labelParams || {});
    return milestone.id || '';
  }, [t]);

  const openCreateMilestone = useCallback(() => {
    setEditingMilestone(null);
    setMilestoneForm(EMPTY_MILESTONE_FORM);
    setDeliverableToAddId(null);
    setMilestoneModalOpened(true);
  }, []);

  const openEditMilestone = useCallback((milestone) => {
    const milestoneId = normalizeGanttEntityId(milestone.id);
    const deliverableIds = workingRows
      .filter((row) => row.entityType === 'deliverable' && normalizeGanttEntityId(row.parentId) === milestoneId)
      .map((row) => String(row.deliverableId || row.id));

    setEditingMilestone({ ...milestone, id: milestoneId });
    setMilestoneForm({
      name: getMilestoneName(milestone),
      startDate: milestone.startDate || '',
      endDate: milestone.endDate || '',
      deliverableIds,
    });
    setDeliverableToAddId(null);
    setMilestoneModalOpened(true);
  }, [getMilestoneName, workingRows]);

  const closeMilestoneModal = useCallback(() => {
    setMilestoneModalOpened(false);
    setEditingMilestone(null);
    setMilestoneForm(EMPTY_MILESTONE_FORM);
    setDeliverableToAddId(null);
  }, []);

  const addDeliverableToMilestone = useCallback(() => {
    if (!deliverableToAddId) return;

    setMilestoneForm((prev) => {
      if (prev.deliverableIds.includes(deliverableToAddId)) return prev;
      return {
        ...prev,
        deliverableIds: [...prev.deliverableIds, deliverableToAddId],
      };
    });
    setDeliverableToAddId(null);
  }, [deliverableToAddId]);

  const removeDeliverableFromMilestone = useCallback((deliverableId) => {
    setMilestoneForm((prev) => ({
      ...prev,
      deliverableIds: prev.deliverableIds.filter((id) => id !== deliverableId),
    }));
  }, []);

  const moveDeliverableInMilestone = useCallback((deliverableId, direction) => {
    setMilestoneForm((prev) => {
      const deliverableIds = [...prev.deliverableIds];
      const index = deliverableIds.indexOf(deliverableId);
      const nextIndex = index + direction;
      if (index === -1 || nextIndex < 0 || nextIndex >= deliverableIds.length) return prev;

      [deliverableIds[index], deliverableIds[nextIndex]] = [deliverableIds[nextIndex], deliverableIds[index]];
      return { ...prev, deliverableIds };
    });
  }, []);

  const saveMilestoneForm = useCallback(() => {
    if (!editingMilestone) return;

    const selectedIds = new Set(milestoneForm.deliverableIds);
    const selectedPositions = new Map(milestoneForm.deliverableIds.map((deliverableId, index) => [deliverableId, index]));

    setDraftRows((currentRows) => {
      const sourceRows = currentRows.length > 0 ? currentRows : (ganttData?.rows || []);
      const updatedRows = sourceRows.map((row) => {
        if (row.entityType === 'milestone' && normalizeGanttEntityId(row.id) === editingMilestoneId) {
          return {
            ...row,
            displayName: milestoneForm.name || row.displayName,
            startDate: milestoneForm.startDate || row.startDate,
            endDate: milestoneForm.endDate || row.endDate,
          };
        }

        if (row.entityType !== 'deliverable') return row;

        const deliverableId = getDeliverableFormId(row);
        const rowParentId = normalizeGanttEntityId(row.parentId);

        if (selectedIds.has(deliverableId)) {
          return {
            ...row,
            parentId: editingMilestoneId,
            milestonePosition: selectedPositions.get(deliverableId),
          };
        }

        if (!editingDefaultMilestone && rowParentId === editingMilestoneId) {
          return {
            ...row,
            parentId: defaultMilestoneId,
            milestonePosition: Number.MAX_SAFE_INTEGER,
          };
        }

        return row;
      });

      return reorderGanttRows(updatedRows);
    });
    closeMilestoneModal();
  }, [
    closeMilestoneModal,
    defaultMilestoneId,
    editingDefaultMilestone,
    editingMilestone,
    editingMilestoneId,
    ganttData?.rows,
    milestoneForm.deliverableIds,
    milestoneForm.endDate,
    milestoneForm.name,
    milestoneForm.startDate,
  ]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) return;
    refreshTimerRef.current = setTimeout(async () => {
      refreshTimerRef.current = null;
      await refreshGantt();
    }, 150);
  }, [refreshGantt]);

  useProjectEvents(projectCode, {
    enabled: Boolean(projectCode),
    onEvent: (event) => {
      if (REFRESH_EVENT_TYPES.has(event.type)) {
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

  useEffect(() => {
    if (ganttData?.rows && loadedDraftProjectRef.current !== ganttData.projectCode) {
      loadedDraftProjectRef.current = ganttData.projectCode;
      setDraftRows(ganttData.rows);
    }
  }, [ganttData?.projectCode, ganttData?.rows]);

  if (loading && !ganttData) {
    return (
      <Center style={{ height: 'calc(100vh - 80px)' }}>
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">{t('common.loading')}</Text>
        </Stack>
      </Center>
    );
  }

  if (error) {
    return (
      <Center style={{ height: 'calc(100vh - 80px)', padding: 24 }}>
        <Alert color="red" title={t('gantt.errorTitle')}>
          {error}
        </Alert>
      </Center>
    );
  }

  if (!ganttData) {
    return (
      <Center style={{ height: 'calc(100vh - 80px)' }}>
        <Text c="dimmed">{t('gantt.empty')}</Text>
      </Center>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', paddingTop: 60 }}>
      <Group
        justify="space-between"
        px="md"
        py="xs"
        style={{
          borderTop: `1px solid ${toolbarBorderColor}`,
          borderBottom: `1px solid ${toolbarBorderColor}`,
          background: toolbarBackground,
        }}
      >
        <Group gap="xs">
          <Button
            size="xs"
            leftSection={<IconPlus size={15} />}
            onClick={openCreateMilestone}
          >
            {t('gantt.createMilestone')}
          </Button>
        </Group>
        <Text size="xs" c="dimmed">
          {t('gantt.timelineLabel')}
        </Text>
      </Group>
      <ProjectGantt
        projectGantt={workingGanttData}
        loadDeliverableTasks={loadDeliverableTasks}
        t={t}
        onEditMilestone={openEditMilestone}
      />

      <Modal
        opened={milestoneModalOpened}
        onClose={closeMilestoneModal}
        title={editingMilestone ? t('gantt.editMilestone') : t('gantt.createMilestone')}
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label={t('gantt.fields.name')}
            placeholder={t('gantt.fields.generatedName')}
            value={milestoneForm.name}
            onChange={(event) => setMilestoneForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              type="date"
              label={t('gantt.fields.startDate')}
              value={milestoneForm.startDate}
              onChange={(event) => setMilestoneForm((prev) => ({ ...prev, startDate: event.target.value }))}
            />
            <TextInput
              type="date"
              label={t('gantt.fields.endDate')}
              value={milestoneForm.endDate}
              onChange={(event) => setMilestoneForm((prev) => ({ ...prev, endDate: event.target.value }))}
            />
          </SimpleGrid>
          <Stack gap="xs">
            <Text fw={500} size="sm">{t('gantt.fields.deliverables')}</Text>
            <Stack gap={6}>
              {selectedDeliverables.length === 0 ? (
                <Text size="sm" c="dimmed">{t('gantt.noAssignedDeliverables')}</Text>
              ) : selectedDeliverables.map((deliverable, index) => (
                <Group
                  key={deliverable.id}
                  justify="space-between"
                  wrap="nowrap"
                  gap="xs"
                  px="sm"
                  py={6}
                  style={{
                    border: `1px solid ${isDarkTheme ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-3)'}`,
                    borderRadius: 6,
                    background: isDarkTheme ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-gray-0)',
                  }}
                >
                  <Box style={{ minWidth: 0, flex: 1 }}>
                    <Text size="sm" truncate>
                      {index + 1}. {deliverable.label}
                    </Text>
                    {deliverable.status && (
                      <Text size="xs" c="dimmed">{deliverable.status}</Text>
                    )}
                  </Box>
                  <Group gap={4} wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      aria-label={t('gantt.moveDeliverableUp', { name: deliverable.label })}
                      disabled={index === 0}
                      onClick={() => moveDeliverableInMilestone(deliverable.id, -1)}
                    >
                      <IconArrowUp size={15} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      aria-label={t('gantt.moveDeliverableDown', { name: deliverable.label })}
                      disabled={index === selectedDeliverables.length - 1}
                      onClick={() => moveDeliverableInMilestone(deliverable.id, 1)}
                    >
                      <IconArrowDown size={15} />
                    </ActionIcon>
                    {!editingDefaultMilestone && (
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        aria-label={t('gantt.removeDeliverable', { name: deliverable.label })}
                        onClick={() => removeDeliverableFromMilestone(deliverable.id)}
                      >
                        <IconTrash size={15} />
                      </ActionIcon>
                    )}
                  </Group>
                </Group>
              ))}
            </Stack>
            {!editingDefaultMilestone && (
              <Group align="flex-end" gap="xs" wrap="nowrap">
                <Select
                  label={t('gantt.addDeliverable')}
                  placeholder={t('gantt.fields.selectDeliverables')}
                  data={availableDeliverableOptions}
                  value={deliverableToAddId}
                  onChange={setDeliverableToAddId}
                  searchable
                  clearable
                  nothingFoundMessage={t('gantt.noAvailableDeliverables')}
                  style={{ flex: 1 }}
                />
                <Button
                  leftSection={<IconPlus size={15} />}
                  onClick={addDeliverableToMilestone}
                  disabled={!deliverableToAddId}
                >
                  {t('common.add')}
                </Button>
              </Group>
            )}
          </Stack>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeMilestoneModal}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveMilestoneForm} disabled={!editingMilestone}>{t('common.save')}</Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
